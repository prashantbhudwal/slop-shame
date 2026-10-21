// Aggregate dev attribution and candidate-cache parity; never opens test/external text.
import { resolve } from 'node:path';
import { CACHE,OUT,json,save,jsonl,loader,metrics } from './common.mjs';
const s=await loader();
try {
 const {buildContext}=await s.load(resolve(CACHE,'feature-engine/context.ts'));
 const {scoreSignals}=await s.load(resolve(CACHE,'feature-engine/score.ts'));
 const {analyzePost}=await s.load(resolve(CACHE,'engine-variant/index.ts'));
 const entries=json(resolve(CACHE,'entries.json')),best=json(resolve(CACHE,'best.json'));
 const features=new Map();for await(const r of jsonl(resolve(CACHE,'features-dev.jsonl')))features.set(r.id,r);
 const contributions=new Map(),mismatches=[];
 for await(const row of jsonl(resolve(CACHE,'dev.jsonl'))) {
  if(row.family==='base')continue;
  const report=analyzePost({text:row.text}),f=features.get(row.id),signals=[],evidence=[];
  for(const [j,scale,spans,customOnce] of f.hits){const w=best.weights[j];if(!w)continue;const r=entries[j];signals.push({ruleId:r.id,category:r.category,label:r.label,weight:w*scale,matches:[]});evidence.push({weight:w*scale,spans,kind:r.evidence,baseWeight:w,repeat:r.kind==='phrase'?(r.repeat||'once'):customOnce?'once':undefined,construction:r.category==='negation-pivot'&&!!r.patterns?.length});}
  const ctx=buildContext({text:row.text});
  const cached=ctx.wordCount?scoreSignals(signals,ctx,evidence):scoreSignals([],ctx,[]);
  if(cached.score!==report.score||cached.shameable!==report.shameable)mismatches.push({id:row.id,cachedScore:cached.score,publicScore:report.score,cachedSignals:cached.signals.map(r=>r.ruleId),publicSignals:report.signals.map(r=>r.ruleId)});
  for(const signal of report.signals) {
   if(!contributions.has(signal.ruleId))contributions.set(signal.ruleId,{id:signal.ruleId,aiPosts:0,humanPosts:0,aiFlaggedPosts:0,humanFPPosts:0,aiPoints:0,humanPoints:0});
   const stat=contributions.get(signal.ruleId);stat[row.label==='ai'?'aiPosts':'humanPosts']++;stat[row.label==='ai'?'aiPoints':'humanPoints']+=signal.weight;
   if(report.score>=40)stat[row.label==='ai'?'aiFlaggedPosts':'humanFPPosts']++;
  }
 }
 save(resolve(OUT,'dev-contributions.json'),[...contributions.values()].sort((a,b)=>b.aiPoints-a.aiPoints));
 save(resolve(OUT,'replay.json'),{devPublicVsCachedScoreMismatches:mismatches.length,threshold40Mismatches:mismatches.filter(r=>(r.cachedScore>=40)!==(r.publicScore>=40)).length,note:'Public API predictions are authoritative; cached binary/span search is validated on baseline and final threshold decisions.'});
 save(resolve(CACHE,'replay-mismatches.json'),mismatches);console.log('Dev score mismatches',mismatches.length);
}finally{await s.close();}
