import { resolve } from 'node:path';
import { existsSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { loadCorpus } from '../lib/corpus.mjs';
import { CACHE,OUT,ROOT,json,save,jsonl,loader,metrics } from './common.mjs';
const prefix=process.argv.includes('--correction')?'corrected':'final';
const s=await loader();
try {
 const engine=await s.load(resolve(CACHE,'engine-variant/index.ts'));
 const proposal=json(resolve(OUT,'proposal.json'));
 const frozen=json(resolve(CACHE,'frozen.json')).map(r=>({id:r.id,score:engine.analyzePost({text:r.text}).score}));
 if(frozen.some(r=>r.score<80))throw Error('Frozen fingerprint regression');
 save(resolve(OUT,'frozen.json'),frozen);
 for(const split of ['dev','test','external']) {
  const target=resolve(CACHE,`${prefix}-${split}.jsonl`),receipt=resolve(CACHE,`lock-${prefix}-${split}.json`);
  if(existsSync(target)){if(json(receipt).proposal!==proposal.packSha256)throw Error('Holdout already used for another candidate');console.log(`reusing final ${split}`);continue;}
  if(existsSync(receipt))throw Error(`${split} has incomplete one-shot receipt`);
  save(receipt,{started:new Date().toISOString(),proposal:proposal.packSha256,id:proposal.id});
  let source;
  if(split==='external'){const cfg=json(resolve(ROOT,'eval/config.json'));const corpus=await loadCorpus([...cfg.files,...cfg.optionalFiles.filter(existsSync)],cfg);source=corpus.items;save(resolve(OUT,'external-inputs.json'),{receipts:corpus.receipts,duplicates:corpus.duplicates,missing:cfg.optionalFiles.filter(x=>!existsSync(x))});}
  else source=jsonl(resolve(CACHE,`${split}.jsonl`));
  const rows=[];
  for await(const r of source){const t=performance.now();const report=engine.analyzePost({text:r.text});const ms=performance.now()-t;const {text,...meta}=r;rows.push({...meta,domain:r.domain||r.original_domain||r.genre,model:r.model||r.generator||'unknown',score:report.score,shameable:report.shameable,ms});}
  const m=metrics(rows);
  if(split==='dev') {const selected=json(resolve(OUT,'best-dev.json')).metrics;for(const f of ['fp','shameFP','tp40','tp60'])if(m.overall[f]!==selected.overall[f])throw Error(`Public candidate replay mismatch ${f}`);}
  writeFileSync(target,rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  save(resolve(OUT,`${prefix}-${split}.json`),m);save(receipt,{...json(receipt),completed:new Date().toISOString(),count:rows.length});
  console.log(split,JSON.stringify(m.overall));
 }
}finally{await s.close();}
