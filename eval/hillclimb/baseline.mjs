import { existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadCorpus } from '../lib/corpus.mjs';
import { ROOT,CACHE,OUT,json,save,jsonl,snapshot,loader,metrics } from './common.mjs';
const base=snapshot(), s=await loader();
try {
 const engine=await s.load(resolve(base,'index.ts'));
 for(const split of ['dev','test','external']) {
  const target=resolve(CACHE,`baseline-${split}.jsonl`);
  if(existsSync(target)) {console.log(`Locked baseline ${split} already evaluated; reusing`);continue;}
  // Receipt written before touching the holdout: failures require explicit audit, never silently rerun.
  const receipt=resolve(CACHE,`lock-baseline-${split}.json`);
  if(existsSync(receipt))throw Error(`${split} has an incomplete one-shot receipt`);
  save(receipt,{started:new Date().toISOString(),engine:json(resolve(CACHE,'engine.json')).sha256});
  let corpus;
  if(split==='external') {const cfg=json(resolve(ROOT,'eval/config.json'));corpus=(await loadCorpus([...cfg.files,...cfg.optionalFiles.filter(existsSync)],cfg)).items;}
  const source=split==='external'?corpus:jsonl(resolve(CACHE,`${split}.jsonl`));
  const rows=[];for(let i=0;i<100;i++)engine.analyzePost({text:'This is a plain warmup sentence. '.repeat(50)});
  for await(const r of source) {const t=performance.now();const report=engine.analyzePost({text:r.text});const ms=performance.now()-t;const {text,...meta}=r;rows.push({...meta,domain:r.domain||r.original_domain||r.genre,model:r.model||r.generator||'unknown',score:report.score,shameable:report.shameable,ms});}
  writeFileSync(target,rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  const m=metrics(rows),times=rows.map(x=>x.ms).sort((a,b)=>a-b);
  m.timing={meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],worstMs:times.at(-1)};
  save(resolve(OUT,`baseline-${split}.json`),m);save(receipt,{...json(receipt),completed:new Date().toISOString(),count:rows.length});
  console.log(split,JSON.stringify(m.overall),'macro',m.macroRecall40);
 }
}finally{await s.close();}
