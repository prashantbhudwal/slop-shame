import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {ROOT,CACHE,OUT,json,save,jsonl,loader} from './common.mjs';
const rules=json(resolve(OUT,'rules.json')),dict=new Map(json(resolve(OUT,'dictionary-entries.json')).map(r=>[r.id,r]));
const names=['targetTune','humanFit','permissiveFit','polishedFit','raidDev','linkedinVeto','wayback','contextControls'];
const stats=Object.fromEntries(rules.map(r=>[r.id,Object.fromEntries(names.map(n=>[n,{hits:0,count:0,bucket:[0,0,0]}]))]));
const totals={},wordTotals={};const formatted={};
const s=await loader();try{
 const {isProtectedSpan}=await s.load(resolve(ROOT,'src/lib/engine/context.ts'));
 const {ruleSchema,platformHabit,LAYOUT_RULES}=await s.load(resolve(ROOT,'src/lib/engine/scorecard-schema.ts'));
 for(const name of names){totals[name]=[0,0,0];wordTotals[name]=0;formatted[name]=0;
  for await(const row of jsonl(resolve(CACHE,`raw-${name}.jsonl`))){const b=row.wordCount<100?0:row.wordCount<250?1:2;totals[name][b]++;wordTotals[name]+=row.wordCount;if(row.text.includes('\n'))formatted[name]++;
   row.signals.forEach((signal,i)=>{let end=-1,count=0;const ev=row.evidence[i];for(const span of ev.spans.toSorted((a,b)=>a[0]-b[0]||b[1]-a[1])){if(span[0]<end||isProtectedSpan(row.protectedSpans,span)||ev.kind==='fingerprint'&&(isProtectedSpan(row.protectedSpans,[span[0],span[0]+1])||isProtectedSpan(row.protectedSpans,[span[1]-1,span[1]])))continue;end=span[1];count++;}if(!count&&ev.spans.length)return;const st=stats[signal.ruleId][name];st.hits++;st.count+=count||1;st.bucket[b]++;});
  }
 }
 const table={},details=[];
 for(const r of rules){const d=dict.get(r.id);const raw=stats[r.id];const kind=r.evidence??(['formatting','robotic-rhythm','bypass-tricks'].includes(r.category)?'style':'phrase');
  const vocabulary=d?.vocabulary||r.id.startsWith('ai-vocabulary.tier');
  const once=r.kind==='custom'&&!vocabulary&&!['robotic-rhythm.rule-of-three','robotic-rhythm.parallel-pair'].includes(r.id)||!!r.position||r.repeat==='once';
  const model=ruleSchema(r.id,r.category,r.weight,kind,once);
  const humanNames=names.filter(n=>n!=='targetTune');const totalHits=humanNames.reduce((a,n)=>a+raw[n].hits,0);
  const curator=d?.curatorGun||kind==='fingerprint'||model.gun;
  const book=d?.book?.ratePerMillionTokens;
  const gun=!vocabulary&&(curator||d&&raw.targetTune.hits>0)&&totalHits===0&&!(book>0);
  model.gun=!!gun;model.tier=gun?'gun':vocabulary?'vocabulary':'habit';
  if(gun)model.family='gun:'+r.id;else if(model.family==='artifact')model.family='draft-habit';
  model.dictionary=!!d;
  // Presence priors are gamma-smoothed within each supported length bucket.
  // LinkedIn, Wayback, polished and dev never enter these estimators.
  if(model.mode==='post')model.rate=totals.humanFit.map((n,b)=>(raw.humanFit.bucket[b]+raw.permissiveFit.bucket[b]+.5)/(n+totals.permissiveFit[b]+50));
  else if(vocabulary&&book!=null)model.rate=book/1e6;
  else model.rate=(raw.humanFit.count+raw.permissiveFit.count+.5)/(wordTotals.humanFit+wordTotals.permissiveFit+5000);
  if(d){model.weight=vocabulary?Math.min(.35,r.weight*.05):r.weight*.35;if(gun)model.weight=Math.max(6,r.weight*.7);}
  if(gun)model.weight=Math.max(6,model.weight);
  if(!d&&vocabulary)model.weight=Math.min(.5,r.weight*.15);
  // Shared list/CTA/cadence units prevent cross-category duplicate witnesses.
  const matcher=(r.phrases??r.patterns??[]).join(' ');
  const list = d && (/emoji|bullet|list|outline|header/i.test(d.origins.map(o=>o.ref).join(' ')) || /\bhere (?:are|is)\b|\b(?:three|four|five|six|seven|eight|nine|ten|[1-9]) (?:ways|lessons|tips|habits|steps|rules|things|strategies)\b/i.test(matcher));
  if(list&&!gun){model.family='list-structure';model.bundle='list';model.priority=5;}
  if(d&&!gun&&(r.position==='closing'||/agree\?|thoughts\?|follow me|follow for|save this|bookmark this|drop a comment|dm me|comment.*send/i.test(matcher))){model.family='engagement';model.bundle='cta';model.priority=5;}
  const layout=LAYOUT_RULES.has(r.id)||!!(d&&r.patterns?.some(p=>p.includes('\\n')));
  const validatedFormatted=formatted.humanFit+formatted.raidDev+formatted.wayback;
  if(layout&&validatedFormatted<500)model.disabled='Insufficient formatted human negatives';
  const fixed=(!d&&platformHabit(r.id))||!!(d&&!gun&&(r.category==='engagement-bait'||model.family==='list-structure'));
  if(fixed)model.weight=Math.min(model.weight,.7);
  table[r.id]=model;
  details.push({id:r.id,category:r.category,dictionary:!!d,tier:model.tier,gunCandidate:!!curator,gunDemoted:!!curator&&!gun,human: Object.fromEntries(humanNames.map(n=>[n,raw[n].hits])),targetHits:raw.targetTune.hits,bookRate:book??null,mode:model.mode,baseRate:model.rate,prior:model.weight,source:d?.origins[0]?.source??'first-party',sources:[...new Set(d?.origins.map(o=>o.source)??['first-party'])],fixed,layout,disabled:model.disabled});
 }
 writeFileSync(resolve(ROOT,'src/lib/engine/scorecard.ts'),`// Generated offline by eval/v2; no post text.\nimport type { EvidenceRule } from './scorecard-schema';\nexport const THRESHOLD = 2.5;\nexport const SCORECARD: Readonly<Record<string,EvidenceRule>> = ${JSON.stringify(table)};\n`);
 save(resolve(OUT,'entry-evidence.json'),{totals,wordTotals,formatted,entries:details});
 console.log({rules:rules.length,guns:details.filter(r=>r.tier==='gun').length,dictionaryGuns:details.filter(r=>r.dictionary&&r.tier==='gun').length,demoted:details.filter(r=>r.gunDemoted).length,disabled:details.filter(r=>r.disabled).length});
}finally{await s.close();}
