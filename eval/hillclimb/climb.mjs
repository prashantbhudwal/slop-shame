import { resolve } from 'node:path';
import { existsSync,writeFileSync,appendFileSync,readFileSync as fsRead } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { ROOT,CACHE,OUT,json,save,jsonl,loader,metrics,gates,hash } from './common.mjs';
const s=await loader();
try {
 const engineDir=resolve(CACHE,'feature-engine');
 const {buildContext}=await s.load(resolve(engineDir,'context.ts'));
 const {scoreSignals}=await s.load(resolve(engineDir,'score.ts'));
 const {createEngine}=await s.load(resolve(engineDir,'index.ts'));
 const {packs}=await s.load(resolve(engineDir,'packs/index.ts'));
 const original=new Map(packs.flatMap(p=>p.rules).map(r=>[r.id,r]));
 const entries=json(resolve(CACHE,'entries.json')),stats=json(resolve(OUT,'entry-stats.json'));
 const fits=json(resolve(CACHE,'fits.json'));
 const base=json(resolve(OUT,'baseline-dev.json'));
 const entriesSha256=hash(JSON.stringify(entries));
 const texts=new Map();for await(const r of jsonl(resolve(CACHE,'dev.jsonl')))if(r.family!=='base')texts.set(r.id,r.text);
 const dev=[];for await(const r of jsonl(resolve(CACHE,'features-dev.jsonl')))dev.push({...r,ctx:buildContext({text:texts.get(r.id)})});
 texts.clear();
 const frozen=json(resolve(CACHE,'frozen.json'));
 const baselineRows=new Map();for await(const r of jsonl(resolve(CACHE,'baseline-dev.jsonl')))baselineRows.set(r.id,r);
 function score(row,weights) {
   if(!row.ctx.wordCount)return scoreSignals([],row.ctx,[]);
   const signals=[],evidence=[];
   for(const h of row.hits) {
     const [j,scale,spans,customOnce]=h,w=weights[j];if(!w)continue;
     const r=entries[j];
     signals.push({ruleId:r.id,category:r.category,label:r.label,weight:w*scale,matches:[]});
     evidence.push({weight:w*scale,spans,kind:r.evidence,baseWeight:w,repeat:r.kind==='phrase'?(r.repeat||'once'):customOnce?'once':undefined,construction:r.category==='negation-pivot'&&!!r.patterns?.length});
   }
   return scoreSignals(signals,row.ctx,evidence);
 }
 // Prove replay matches the public API before using cached raw outputs for search.
 let mismatches=0;const old=entries.map(r=>original.get(r.id)?.weight||0);
 for(const r of dev) {const got=score(r,old),want=baselineRows.get(r.id);if(got.score!==want.score||got.shameable!==want.shameable)mismatches++;}
 if(mismatches)throw Error(`Cached replay differs from public baseline on ${mismatches} docs`);
 console.log('Replay exactly matches public analyzePost on',dev.length,'dev docs');
 const runsFile=resolve(OUT,'runs.jsonl');
 const priorRuns=existsSync(runsFile)?readRuns():new Map();
 function readRuns(){return new Map(requireLines(runsFile).map(r=>[r.id,r]));}
 function requireLines(f){return readFile(f).trim().split('\n').filter(Boolean).map(JSON.parse);}
 // fs read imported dynamically to keep the runner dependency-free.
 function readFile(f){return fsRead(f,'utf8');}
 let best=existsSync(resolve(CACHE,'best.json'))?json(resolve(CACHE,'best.json')):null;
 if(best?.entriesSha256!==entriesSha256)best=null;
 const candidates=[];
 for(const fit of fits.configs)for(const scale of [.35,.5,.7,1,1.4,2,3,4,6])for(const cap of [3])candidates.push({fit,scale,cap});
 // Fine search below is sequential; every attempted configuration is logged, no test access.
 async function attempt({fit,scale,cap=3,firstPartyMix=0,styleScale=1}) {
  const id=`${entriesSha256.slice(0,8)}-${fit.id}-scale${scale}-cap${cap}-mix${firstPartyMix}-style${styleScale}`;
  if(priorRuns.has(id))return;
  const weights=entries.map((r,j)=>{
   const orig=original.get(r.id);if(orig?.evidence==='fingerprint')return orig.weight;
   const learned=Math.min(cap,fit.weights[j]*scale);
   const w=orig?learned+firstPartyMix*orig.weight:learned;
   return Math.round(w*(orig&&(orig.evidence==='style'||['formatting','robotic-rhythm','bypass-tricks'].includes(orig.category))?styleScale:1)*1000)/1000;
  });
  const t=performance.now();const rows=dev.map(r=>{const report=score(r,weights);return {...r,ctx:undefined,hits:undefined,score:report.score,shameable:report.shameable};});
  const m=metrics(rows);
  const candidatePacks=packs.map(p=>({...p,rules:p.rules.filter(r=>weights[entries.findIndex(e=>e.id===r.id)]>0).map(r=>({...r,weight:weights[entries.findIndex(e=>e.id===r.id)]}))}));
  const added=entries.flatMap((r,j)=>j>=original.size&&weights[j]>0?[{...r,weight:weights[j]}]:[]);
  const engine=createEngine([...candidatePacks,{id:'measured',name:'Measured dictionary',description:'Train-only measured proposal',rules:added}]);
  const frozenScores=frozen.map(r=>engine.analyze({text:r.text}).score);
  const passed=gates(m,base)&&frozenScores.every(x=>x>=80);
  const record={id,entriesSha256,method:fit.method,scale,cap,firstPartyMix,styleScale,rules:weights.filter(Boolean).length,passed,frozenScores,metrics:m,seconds:(performance.now()-t)/1000};
  appendFileSync(runsFile,JSON.stringify(record)+'\n');priorRuns.set(id,record);
  if(passed&&(!best||m.macroRecall40>best.metrics.macroRecall40+1e-12||m.macroRecall40===best.metrics.macroRecall40&&m.overall.fp<best.metrics.overall.fp)) {
   best={...record,fitId:fit.id,weights,engineSha256:json(resolve(CACHE,'engine.json')).sha256,prior:fits.prior};save(resolve(CACHE,'best.json'),best);
   console.log('NEW BEST',id,JSON.stringify(m.overall));
  }
  if(priorRuns.size%10===0)console.log('tried',priorRuns.size,'latest recall',m.overall.recall40,'FP',m.overall.fp,'gate',passed);
 }
 for(const c of candidates)await attempt(c);
 if(!best)throw Error('No dev-feasible candidate; extend conservative search');
 const fit=fits.configs.find(f=>f.id===best.fitId),scale=best.scale;
 for(const factor of [.8,.9,1.05,1.1,1.2])for(const cap of [2,3,4])await attempt({fit,scale:Math.round(scale*factor*10000)/10000,cap});
 for(const styleScale of [0,.5])for(const factor of [.9,1,1.1])await attempt({fit,scale:Math.round(best.scale*factor*10000)/10000,cap:best.cap,styleScale});
 save(resolve(OUT,'best-dev.json'),{...best,weights:undefined});
 save(resolve(CACHE,'climb-complete.json'),{entriesSha256,best:best.id,attempted:priorRuns.size,completed:new Date().toISOString()});
 console.log('Best',best.id,JSON.stringify(best.metrics.overall),'macro',best.metrics.macroRecall40);
}finally{await s.close();}
