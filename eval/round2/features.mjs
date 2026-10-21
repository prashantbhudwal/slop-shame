// Cache raw production matcher outputs on authorized development data only.
import { resolve } from 'node:path';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import {ROOT,CACHE,OUT,loader,datasets,save,digest} from './common.mjs';
const engine=resolve(ROOT,'src/lib/engine'), scratch=resolve(CACHE,'feature-engine');
cpSync(engine,scratch,{recursive:true});
const index=resolve(scratch,'index.ts');
writeFileSync(index,'// @ts-nocheck -- offline raw-output instrumentation, not product source\n'+readFileSync(index,'utf8').replace('if (!ctx.wordCount) return scoreSignals([], ctx, []);','if (!ctx.wordCount) return {ctx, signals: [], evidence: []};').replace('return scoreSignals(signals, ctx, evidence);','return {ctx, signals, evidence};'));
const s=await loader();
try {
 const {createEngine}=await s.load(index),{packs}=await s.load(resolve(scratch,'packs/index.ts'));
 const {structureOf}=await s.load(resolve(scratch,'context.ts'));
 const {scoreSignals}=await s.load(resolve(scratch,'score.ts'));
 const e=createEngine(packs),rules=packs.flatMap(p=>p.rules).map(({detect,...r})=>r);
 save(resolve(CACHE,'rules.json'),rules);
 const sets=await datasets({train:true});const totals={};
 for(const [name,rows]of Object.entries(sets)) {
  const out=[];
  for(const {text,...meta}of rows) {
   const raw=e.analyze({text});const st=structureOf(raw.ctx);
   const reference=scoreSignals(raw.signals,raw.ctx,raw.evidence);
   out.push({...meta,text:raw.ctx.text,wordCount:raw.ctx.wordCount,signals:raw.signals,evidence:raw.evidence,protectedSpans:st.protectedSpans,referenceScore:reference.score,referenceShameable:reference.shameable});
  }
  writeFileSync(resolve(CACHE,`features-${name}.jsonl`),out.map(r=>JSON.stringify(r)).join('\n')+'\n');totals[name]=out.length;console.log(name,out.length);
 }
 save(resolve(OUT,'features.json'),{engineHash:digest(engine),totals,ruleCount:rules.length});
} finally {await s.close();}
