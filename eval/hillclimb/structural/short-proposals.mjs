// Fixed proposals only. Never modifies score.ts or fits on external samples.
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { CACHE, ROOT, OUT, SCRATCH, eligible, splitPath, jsonl, loader, save } from './common.mjs';
const s = await loader();
try {
  const { createEngine } = await s.load(resolve(s.engine,'index.ts'));
  const { buildContext, structureOf } = await s.load(resolve(s.engine,'context.ts'));
  const { packs } = await s.load(resolve(s.engine,'packs/index.ts'));
  const engine = createEngine(packs), kinds = new Map(packs.flatMap(p => p.rules).map(r => [r.id,r.evidence ?? (['formatting','robotic-rhythm','bypass-tricks'].includes(r.category) ? 'style' : 'phrase')]));
  const datasets = { train:[], dev:[], veto:[], loweffort:[], modern:[] };
  const curve = (points,k) => Math.round(100 * -Math.expm1(-points/k));
  function evaluate(row, label, group) {
    const report = engine.analyze({text:row.text}), ctx = buildContext({text:row.text});
    let phrase=0, style=0;
    for (const signal of report.signals) { if (kinds.get(signal.ruleId)==='style') style+=signal.weight; else phrase+=signal.weight; }
    let last = ctx.sentences.length-1; const st=structureOf(ctx);
    while (last>=0 && st.sentenceSpans[last][0]>=st.bodyEnd) last--;
    const closingQuestion=last>=0 && /\?["”')]*$/.test(ctx.sentences[last]);
    const short=ctx.wordCount>=40 && ctx.wordCount<80;
    const density = short && phrase>=3 ? Math.max(report.score,curve(phrase+style,11.5)) : report.score;
    const bonus = short && report.score===39 && phrase>=4 && (closingQuestion || ctx.hashtags.length>=2) ? Math.min(.25,Math.max(0,phrase-style)) : 0;
    const corroborated = Math.max(report.score,curve(phrase+style+bonus,12));
    return {label,group,score:report.score,density,corroborated,short,phrase,style,closingQuestion,hashtags:ctx.hashtags.length,shame:report.shameable,
      densityShame:report.shameable || density>=40 && phrase>=4 && ctx.wordCount>=40,
      corroboratedShame:report.shameable || corroborated>=40 && phrase>=4 && ctx.wordCount>=40};
  }
  for (const split of ['train','dev']) for await(const row of jsonl(splitPath(split))) if(eligible(row)) datasets[split].push(evaluate(row,row.label,row.domain));
  for await(const row of jsonl(resolve(SCRATCH,'input-linkedin-veto.jsonl'))) datasets.veto.push(evaluate(row,'human',row.author));
  for(const [dataset,folder] of [['loweffort','linkedin-ai-loweffort'],['modern','linkedin-ai']]) {
    const dir=resolve(ROOT,'data/eval/generated',folder);
    const files=dataset==='modern'?['claude-opus-5-5.jsonl','gemini-3.8-flash.jsonl','gpt-6.1-sol.jsonl','grok-4.7.jsonl']:readdirSync(dir).filter(n=>n.endsWith('.jsonl')).sort();
    for(const name of files) for await(const row of jsonl(resolve(dir,name))) datasets[dataset].push(evaluate(row,'ai',`${row.model}${row.effort?' / '+row.effort:''}`));
  }
  function metrics(rows) {
    const result={rows:rows.length,human:rows.filter(r=>r.label==='human').length,ai:rows.filter(r=>r.label==='ai').length,
      short39:rows.filter(r=>r.short&&r.score===39).length,
      short39Phrase6:rows.filter(r=>r.short&&r.score===39&&r.phrase>=6).length,
      short39QuestionOrPair:rows.filter(r=>r.short&&r.score===39&&(r.closingQuestion||r.hashtags>=2)).length};
    for(const name of ['score','density','corroborated']) result[name]={fp:rows.filter(r=>r.label==='human'&&r[name]>=40).length,tp:rows.filter(r=>r.label==='ai'&&r[name]>=40).length,
      newFP:rows.filter(r=>r.label==='human'&&r.score<40&&r[name]>=40).length,
      addedAI:rows.filter(r=>r.label==='ai'&&r.score<40&&r[name]>=40).length,
      shameFP:rows.filter(r=>r.label==='human'&&r[name==='score'?'shame':name+'Shame']).length};
    return result;
  }
  const result={policy:'Predeclared, not fitted: density K=11.5 only at 40–79 words with >=3 counted phrase points; corroboration adds <=0.25 style evidence only at score39/40–79 words/>=4 phrase points and a final prose question or >=2 hashtags. Style support remains bounded by independent phrase points. Neither proposal is implemented.',datasets:{}};
  for(const [name,rows]of Object.entries(datasets)) result.datasets[name]={overall:metrics(rows),groups:Object.fromEntries([...new Set(rows.map(r=>r.group))].sort().map(group=>[group,metrics(rows.filter(r=>r.group===group))]))};
  save(resolve(OUT,'short-proposals.json'),result);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result.datasets).map(([k,v])=>[k,v.overall])),null,2));
} finally {await s.close();}
