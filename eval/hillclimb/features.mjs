import { readFileSync, writeFileSync, existsSync, cpSync, appendFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { parseDrops } from './parse-drops.mjs';
import { normalize, boundRegex, expandFinite } from '../../scripts/dictionaries/lib.mjs';
import { ROOT,CACHE,OUT,json,save,jsonl,snapshot,loader,hash } from './common.mjs';
const base=snapshot();const featureEngine=resolve(CACHE,'feature-engine');
if(!existsSync(featureEngine)) {cpSync(base,featureEngine,{recursive:true});appendFileSync(resolve(featureEngine,'index.ts'),'\nexport { customSpans };\n');}
const s=await loader();
try {
 const {packs}=await s.load(resolve(featureEngine,'packs/index.ts'));
 const first=packs.flatMap(p=>p.rules);
 const {buildContext,isProtectedSpan,structureOf}=await s.load(resolve(featureEngine,'context.ts'));
 const {compilePhrases}=await s.load(resolve(featureEngine,'compile.ts'));
 const {customSpans}=await s.load(resolve(featureEngine,'index.ts'));
 const candidates=[],map=new Map(),skipped=[];
 function add(kind,value,category,origin,position) {
  if(kind==='phrase')value=normalize(value);
  const key=JSON.stringify([kind,value,position||'']);
  if(map.has(key)){map.get(key).origins.push(origin);return;}
  const id=`measured.${kind}-${hash(key).slice(0,12)}`;
  const c={kind:'phrase',id,category,label:'Measured AI-writing cue',weight:1,repeat:'once',evidence:['formatting','robotic-rhythm','bypass-tricks'].includes(category)?'style':'phrase',...(kind==='phrase'?{phrases:[value]}:{patterns:[value]}),...(position?{position}:{}),origins:[origin]};
  map.set(key,c);candidates.push(c);
 }
 for(const name of ['zeroslop','paech-sampler','paech-essays','vale-ai-tells','slop-radar','kobak']) {
  const {pack}=await s.load(resolve(base,`packs/vendor/${name}.ts`));
  for(const r of pack.rules)for(const [kind,values]of [['phrase',r.phrases||[]],['pattern',r.patterns||[]]])for(const value of values)add(kind,value,r.category,{source:name,state:'kept',ruleId:r.id},r.position);
 }
 for(const item of parseDrops(readFileSync(resolve(base,'packs/vendor/DROPPED.md'),'utf8'),{legacySeparator:process.argv.includes('--legacy-separator')})) {
  let {ref,value,reason}=item;
  if(/^(?:regex-rejected|regex-time|conditional-rider|rider-trigger)/.test(reason)){skipped.push({ref,reason});continue;}
  const source=ref.split(':')[0];
  const origin={source,state:'dropped',reason,ref};
  const pattern=/[\\[\]{}()|?+*^$]/.test(value);
  const category=reason.startsWith('format-or-grammar-alone')?'formatting':source==='paech-essays'&&ref.includes('phrases')?'template-phrases':value.includes(' ')?'template-phrases':'ai-vocabulary';
  const position=ref.includes('OpeningCliches')?'opening':ref.includes('ClosingPleasantries')?'closing':undefined;
  if(!pattern)add('phrase',value,category,origin,position);
  else {const finite=expandFinite(value);if(finite)for(const v of finite)add('phrase',v,category,origin,position);
    else try{add('pattern',boundRegex(value),category,origin,position);}catch(e){skipped.push({ref,reason:`regex-safety:${e.message}`});}}
 }
 const serialFirst=first.map(({detect,...r})=>r);
 const rules=[...serialFirst,...candidates];
 const previous=resolve(CACHE,'entries.json');
 if(existsSync(previous)&&hash(JSON.stringify(json(previous)))!==hash(JSON.stringify(rules))&&['train','dev'].some(split=>existsSync(resolve(CACHE,`features-${split}.jsonl`))))throw Error('Candidate semantics changed under an existing feature cache. Preserve this frozen experiment; use --legacy-separator only to reproduce v1, or start a separately isolated experiment.');
 save(previous,rules);
 save(resolve(OUT,'candidates.json'),{firstParty:first.length,literals:candidates.filter(c=>c.phrases).length,regexes:candidates.filter(c=>c.patterns).length,total:rules.length,skipped});
 console.log('candidates',rules.length,'first-party',first.length,'skipped',skipped.length);
 const parsed=ts.createSourceFile('artifacts.ts',readFileSync(resolve(ROOT,'tests/unit/engine/artifacts.test.ts'),'utf8'),ts.ScriptTarget.Latest,true);
 let frozen=[];function walk(n){if(ts.isCallExpression(n)&&n.arguments.length===1&&ts.isArrayLiteralExpression(n.arguments[0])&&n.arguments[0].elements.length===12){const a=n.arguments[0].elements;if(a.every(x=>ts.isArrayLiteralExpression(x)&&x.elements.length===2&&ts.isStringLiteralLike(x.elements[1])))frozen=a.map((x,i)=>({id:`frozen-${i+1}`,text:x.elements[1].text}));}ts.forEachChild(n,walk);}walk(parsed);
 if(frozen.length!==12)throw Error('Expected the 12 shared-grammar artifacts');save(resolve(CACHE,'frozen.json'),frozen);
 const phraseRules=[...first.filter(r=>r.kind==='phrase'),...candidates];
 const ruleIndex=new Map(rules.map((r,i)=>[r.id,i]));
 const match=compilePhrases(phraseRules);
 const customs=first.filter(r=>r.kind==='custom');
 for(const split of ['train','dev']) {
  const file=resolve(CACHE,`features-${split}.jsonl`);if(existsSync(file)) {console.log(`reusing ${split} features`);continue;}
  const temporary=file+'.partial';writeFileSync(temporary,'');let n=0;
  for await(const row of jsonl(resolve(CACHE,`${split}.jsonl`))) {
   if(row.family==='base')continue;
   const ctx=buildContext({text:row.text}),prot=structureOf(ctx).protectedSpans;
   const hits=[];
   for(const [r,h]of match(ctx)) {const active=h.spans.some(span=>!isProtectedSpan(prot,span));hits.push([ruleIndex.get(r.id),h.scale||1,h.spans,false,active]);}
   for(const r of customs) {const h=r.detect(ctx);if(!h)continue;const spans=customSpans(ctx,h,r.id);const active=!spans.length||spans.some(span=>!isProtectedSpan(prot,span));hits.push([ruleIndex.get(r.id),h.scale||1,spans,h.scale===undefined,active]);}
   // Text and all offsets remain strictly in the ignored cache.
   appendFileSync(temporary,JSON.stringify({id:row.id,source_id:row.source_id,words:row.words,domain:row.domain,model:row.model,decoding:row.decoding,repetition_penalty:row.repetition_penalty,label:row.label,hits})+'\n');
   if(++n%5000===0)console.log(`${split}: ${n}`);
  }
  renameSync(temporary,file);
 }
}finally{await s.close();}
