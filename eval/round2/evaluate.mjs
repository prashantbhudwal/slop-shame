// One-shot baseline/final public API evaluations. Dev is repeatable; holdouts lock.
import { resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { ROOT,CACHE,OUT,json,save,loader,datasets,digest,summarize } from './common.mjs';
const mode=process.argv[2]; if(!['baseline','dev','final'].includes(mode)) throw Error('baseline | dev | final');
const locked=mode!=='dev', receipt=resolve(CACHE,`lock-${mode}.json`);
if(locked&&existsSync(receipt)) throw Error('One-shot lock exists: '+receipt);
const enginePath=mode==='baseline'?resolve(CACHE,'engine-base'):resolve(ROOT,'src/lib/engine');
const engineHash=digest(enginePath);
if(mode==='final'&&json(resolve(OUT,'frozen.json')).engineHash!==engineHash)throw Error('Candidate changed after freeze');
if(locked) save(receipt,{started:new Date().toISOString(),engineHash});
const sets=await datasets({final:locked});
const s=await loader();
try {
 const {analyzePost}=await s.load(resolve(enginePath,'index.ts')); const results={engineHash,created:new Date().toISOString(),sets:{}};
 for(const [name,rows] of Object.entries(sets)) {
   const predictions=rows.map(({text,...meta})=>{const report=analyzePost({text});return {...meta,score:report.score,shameable:report.shameable,signals:report.signals};});
   writeFileSync(resolve(CACHE,`${mode}-${name}.jsonl`),predictions.map(r=>JSON.stringify(r)).join('\n')+'\n');
   results.sets[name]=summarize(predictions); console.log(name,JSON.stringify(results.sets[name].overall));
 }
 if(digest(enginePath)!==engineHash) throw Error('Engine changed during scoring');
 save(resolve(OUT,`${mode}.json`),results);
 if(locked) save(receipt,{...json(receipt),completed:new Date().toISOString()});
} finally {await s.close();}
