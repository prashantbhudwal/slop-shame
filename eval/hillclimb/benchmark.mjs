import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { CACHE,OUT,jsonl,loader,save } from './common.mjs';
const s=await loader();
try {
 const results={node:process.version,gcAvailable:!!global.gc,words:300};
 const inputs=[];let human=0,ai=0;
 for await(const r of jsonl(resolve(CACHE,'dev.jsonl'))) {
  if(r.family==='base'||(r.label==='human'?human>=100:ai>=100))continue;
  const words=r.text.trim().split(/\s+/u);if(words.length<300)continue;
  inputs.push({text:words.slice(0,300).join(' ')});if(r.label==='human')human++;else ai++;
  if(human===100&&ai===100)break;
 }
 for(const name of ['engine-base','engine-variant']) {
  const e=await s.load(resolve(CACHE,name,'index.ts')), {packs}=await s.load(resolve(CACHE,name,'packs/index.ts'));
  const create=[];for(let i=0;i<40;i++){const t=performance.now();e.createEngine(packs);create.push(performance.now()-t);}
  for(let i=0;i<2500;i++)e.analyzePost(inputs[i%inputs.length]);
  global.gc?.();
  const times=[],perInput=[];
  for(const input of inputs){const trials=[];for(let j=0;j<5;j++){const t=performance.now();e.analyzePost(input);const ms=performance.now()-t;trials.push(ms);times.push(ms);}trials.sort((a,b)=>a-b);perInput.push(trials[2]);}
  times.sort((a,b)=>a-b);create.sort((a,b)=>a-b);
  results[name]={samples:inputs.length,calls:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],worstMs:times.at(-1),worstPerInputMedianMs:Math.max(...perInput),createMeanMs:create.reduce((a,b)=>a+b,0)/create.length,createWorstMs:create.at(-1)};
 }
 results.pass=results['engine-variant'].meanMs<.5&&results['engine-variant'].worstMs<1&&results['engine-variant'].createWorstMs<30;
 save(resolve(OUT,'performance.json'),results);console.log(JSON.stringify(results,null,2));
}finally{await s.close();}
