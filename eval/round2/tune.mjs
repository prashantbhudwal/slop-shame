// Inspectable coordinate search. LinkedIn rows are a reject-only dev gate:
// never read their wording/contributions and never use them to fit a weight.
import {resolve} from 'node:path';
import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {ROOT,CACHE,OUT,loader,json,save,jsonl,digest} from './common.mjs';
const s=await loader();
try {
 const scoreFile=resolve(CACHE,'replay-score.ts');
 writeFileSync(scoreFile,'// @ts-nocheck -- offline minimal-context replay, not product source\n'+readFileSync(resolve(CACHE,'feature-engine/score.ts'),'utf8').replace("from './rule-types'",`from '${resolve(CACHE,'feature-engine/rule-types')}'`).replace("from './context'",`from '${resolve(CACHE,'feature-engine/context')}'`).replace("from './tiers'",`from '${resolve(CACHE,'feature-engine/tiers')}'`).replace("from './types'",`from '${resolve(CACHE,'feature-engine/types')}'`).replace('structureOf(ctx).protectedSpans','ctx.protectedSpans'));
 const {scoreSignals}=await s.load(scoreFile);
 const rules=json(resolve(CACHE,'rules.json')),ruleMap=new Map(rules.map(r=>[r.id,r]));
 const sets={};
 for(const name of ['targetTune','raidDev','raidTrain','permissive','polished','linkedinVeto']) {
  sets[name]=[];for await(const row of jsonl(resolve(CACHE,`features-${name}.jsonl`)))sets[name].push({...row,ctx:{text:row.text,wordCount:row.wordCount,protectedSpans:row.protectedSpans}});
 }
 let parity=0;for(const rows of Object.values(sets))for(const r of rows){const a=scoreSignals(r.signals,r.ctx,r.evidence);if(a.score!==r.referenceScore||a.shameable!==r.referenceShameable)throw Error('Replay mismatch '+r.id);r.referenceContributions=new Set(a.signals.map(s=>s.ruleId));parity++;}
 console.log('Exact default-policy replay parity',parity);
 const policy={k:12,caps:{},styleMax:39,familyBonus:0,shortK:12,...(process.argv.includes('--mixed-families')?{includeStyleFamilies:true}:{})};
 const defaults=Object.fromEntries(rules.map(r=>[r.id,r.weight]));
 // A rule may decrease ONLY if it contributed to an actual human false alarm
 // in authorized fitting controls. LinkedIn is deliberately excluded here.
 const evidence={};
 for(const name of ['raidTrain','raidDev','permissive','polished'])for(const r of sets[name])if(r.label==='human'&&(name!=='polished'||r.mode==='light')&&r.referenceScore>=40)for(const sig of r.signals)if(r.referenceContributions.has(sig.ruleId)){(evidence[sig.ruleId]??=[]).push({dataset:name,id:r.id,score:r.referenceScore});}
 const floors=Object.fromEntries(rules.map(r=>[r.id,r.evidence==='fingerprint'?r.weight:evidence[r.id]?Math.min(r.weight,.25):r.weight]));
 save(resolve(OUT,'asymmetric-floors.json'),{defaults,floors,humanFalseAlarmEvidence:evidence});
 function report(r,weights,pol) {
  const signals=[],hits=[];
  for(let i=0;i<r.signals.length;i++) {
   const sig=r.signals[i],old=ruleMap.get(sig.ruleId).weight,w=weights[sig.ruleId]??old;
   if(!w)continue;signals.push({...sig,weight:sig.weight*w/old});const e=r.evidence[i];hits.push({...e,weight:e.weight*w/old,baseWeight:e.baseWeight===undefined?undefined:w});
  }
  return scoreSignals(signals,r.ctx,hits,pol);
 }
 function evalRows(rows,w,p) {
  let human=0,fp=0,shame=0,tp=0,obvious=0,some=0;const domains={};
  const pk=JSON.stringify(p);
  for(const r of rows){
   const key=pk+'|'+r.signals.map(sig=>w[sig.ruleId]).join(',');
   r.memo??=new Map();let encoded=r.memo.get(key);
   if(encoded===undefined){const a=report(r,w,p);encoded=a.score*2+Number(a.shameable);r.memo.set(key,encoded);}
   const score=encoded>>1,shameable=encoded%2;
   if(r.label==='human'){human++;const d=domains[r.domain||r.source||'unknown']??={n:0,fp:0};d.n++;if(score>=40){fp++;d.fp++;}if(shameable)shame++;}else if(score>=40){tp++;if(r.smell==='obvious')obvious++;if(r.smell==='some')some++;}
  }
  return {human,fp,shame,tp,obvious,some,domains};
 }
 const light=sets.polished.filter(r=>r.mode==='light');
 const raidHuman=sets.raidDev.filter(r=>r.label==='human');
 // The first-party search retains every rule. Train positives participate as
 // a deterministic source-hash subsample; dev chat recall breaks exact ties.
 const train=sets.raidTrain.filter(r=>r.label==='ai'&&parseInt(r.id.replace(/-/g,'').slice(0,4),16)%12===0);
 const humanTrain=sets.raidTrain.filter(r=>r.label==='human');
 const cache=new Map();let tries=0;
 function evaluate(weights,pol,{veto=true}={}) {
  const key=JSON.stringify([weights,pol]);if(cache.has(key))return cache.get(key);
  const target=evalRows(sets.targetTune,weights,pol),raid=evalRows(raidHuman,weights,pol),permissive=evalRows(sets.permissive,weights,pol),polished=evalRows(light,weights,pol);
  const pp=Object.values(permissive.domains).reduce((sum,d)=>sum+Math.max(0,d.fp-(d.n===160?6:0)),0);
  const domainExcess=Object.values(raid.domains).reduce((sum,d)=>sum+Math.max(0,d.fp-Math.floor(d.n*.025)),0);
  const violation=Math.max(0,raid.fp-29)+domainExcess+pp+polished.fp*4;
  // Veto cannot change the objective or weights. It only rejects a config.
  const li=evalRows(sets.linkedinVeto,weights,pol);
  const feasible=violation===0&&li.fp<=22&&li.shame<=20;
  const fitTrain=evalRows(humanTrain,weights,pol),chat=evalRows(train,weights,pol);
  const value=target.obvious*10000+target.some*100+chat.tp*.001-fitTrain.fp*.00001;
  const item={id:++tries,weights:{...weights},policy:structuredClone(pol),target,raid,permissive,polished,linkedin:li,fitTrain,chat,violation,feasible,value};cache.set(key,item);
  appendFileSync(resolve(OUT,'runs.jsonl'),JSON.stringify(item)+'\n');return item;
 }
 function better(a,b) {
  if(a.feasible!==b.feasible)return a.feasible;
  if(!a.feasible&&a.violation!==b.violation)return a.violation<b.violation;
  return a.value>b.value;
 }
 let weights={...defaults};
 // Human-evidence initialization, never AI absence: remove large verdicts
 // from ordinary enumerations and contrast formulas before recall search.
 for(const [id,w]of Object.entries({'robotic-rhythm.rule-of-three':1,'negation-pivot.not-x-but-y':3,'negation-pivot.not-only':1.5,'template-phrases.transition':.75,'template-phrases.filler':1.5,'ai-vocabulary.tier1':1.5}))if(evidence[id])weights[id]=w;
 let best=evaluate(weights,policy);console.log('start',JSON.stringify({id:best.id,obvious:best.target.obvious,some:best.target.some,raid:best.raid.fp,li:best.linkedin.fp,light:best.polished.fp,violation:best.violation}));
 // Search is deterministic and bounded. No test/external inputs are loaded.
 const ids=rules.filter(r=>r.evidence!=='fingerprint').map(r=>r.id);
 for(let round=0;round<2;round++) {
  let changed=false;
  for(const id of ids) {
   const original=defaults[id],current=best.weights[id];
   // Common word/idiom rules retain their editorial upper bound. A single
   // collocation must not become a verdict by winning the RAID tie-break.
   const strongDraft=/^pasted-output\.(?:unfilled-slot|markdown-bold|markdown-heading|writing-advice|assistant-offer)$/.test(id);
   const ceiling=id.startsWith('pasted-output.')?(strongDraft?Math.max(6,original):3):original;
   const options=[floors[id],original,original*.5,original*1.5,original*2,original*3,3,4,6,8].filter(w=>w>=floors[id]&&w<=ceiling&&w!==current);
   let local=best;
   for(const w of [...new Set(options)]) {const candidate=evaluate({...best.weights,[id]:w},best.policy);if(better(candidate,local))local=candidate;}
   if(local!==best){best=local;changed=true;console.log('coordinate',round,id,best.weights[id],JSON.stringify({obvious:best.target.obvious,some:best.target.some,raid:best.raid.fp,li:best.linkedin.fp,light:best.polished.fp,violation:best.violation}));save(resolve(OUT,'best.json'),best);}
  }
  for(const k of [10,11.5,12,14])for(const shortK of [k,11.5])for(const familyBonus of [0,.5,1]) {
   const p={...best.policy,k,shortK,familyBonus},candidate=evaluate(best.weights,p);if(better(candidate,best)){best=candidate;changed=true;save(resolve(OUT,'best.json'),best);console.log('policy',JSON.stringify(p),best.target.obvious,best.target.some);}
  }
  // Category/style alternatives are predeclared and validated exactly like weights.
  for(const styleMax of [25,32,39])for(const cap of [4,6,8,12]) {
   const p={...best.policy,styleMax,caps:{...best.policy.caps,'ai-vocabulary':cap,'template-phrases':cap,'robotic-rhythm':cap,formatting:cap}};
   const candidate=evaluate(best.weights,p);if(better(candidate,best)){best=candidate;changed=true;save(resolve(OUT,'best.json'),best);}
  }
  if(!changed)break;
 }
 save(resolve(OUT,'best.json'),{...best,replayParity:parity,tries,engineHash:digest(resolve(ROOT,'src/lib/engine')),method:'Three bounded coordinate passes; editorial asymmetric floors; target-tune obvious then some; train chat tie-break; all dev gates for every config; LinkedIn reject-only.'});
 console.log('BEST',JSON.stringify(best));
} finally {await s.close();}
