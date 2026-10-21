// Veto/reporting only. This file never fits a parameter or reads the mixed source.
import { readFileSync, readdirSync, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, OUT, SCRATCH, jsonl, loader, save } from './common.mjs';

const s = await loader();
try {
  const { buildContext } = await s.load(resolve(s.engine, 'context.ts'));
  const { createEngine } = await s.load(resolve(s.engine, 'index.ts'));
  const { packs } = await s.load(resolve(s.engine, 'packs/index.ts'));
  const { structural } = await s.load(resolve(s.engine, 'packs/measured/structural.ts'));
  const { features } = await s.load(resolve(OUT, 'features.ts'));
  const { features: visibleFeatures } = await s.load(resolve(OUT,'visible-features.ts'));
  const { features: specificFeatures } = await s.load(resolve(OUT,'specific-features.ts'));
  const specs = Object.assign({}, ...['thresholds.json','visible-thresholds.json','specifics-thresholds.json'].map(name => JSON.parse(readFileSync(resolve(OUT,name),'utf8')).features));
  const engines = { baseline: createEngine(packs), ...Object.fromEntries(structural.rules.map(rule => [rule.id, createEngine([...packs, { ...structural, rules: [rule] }])])), combined: createEngine([...packs, structural]) };
  const split = JSON.parse(readFileSync(resolve(ROOT, 'data/eval/raw/normalized/linkedin-influencers-split.json'), 'utf8'));
  function evaluate(row, group, human) {
    if (human) assert.equal(split.authors[row.author], 'veto');
    const ctx = buildContext({ text: row.text }), values = {...features(ctx),...visibleFeatures(ctx),...specificFeatures(ctx)};
    const hits = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value !== null && value * specs[name].threshold.direction >= specs[name].threshold.threshold * specs[name].threshold.direction]));
    const predictions = Object.fromEntries(Object.entries(engines).map(([name, e]) => {
      const r = e.analyze({ text: row.text }); return [name, { score: r.score, shameable: r.shameable }];
    }));
    return { id: row.id ?? `${row.model}:${row.effort??''}:${row.promptId}`, group, model: row.model ?? 'human', natural: !human && Number(String(row.promptId).match(/\d+$/)?.[0]) % 2 === 0, values, hits, predictions };
  }
  const humans = [], ai = [], loweffort = [];
  for await (const row of jsonl(resolve(SCRATCH, 'input-linkedin-veto.jsonl'))) humans.push(evaluate(row, row.author, true));
  assert.equal(humans.length, 8189);
  for (const name of ['claude-opus-5-5.jsonl','gemini-3.8-flash.jsonl','gpt-6.1-sol.jsonl','grok-4.7.jsonl']) {
    for await (const row of jsonl(resolve(ROOT, 'data/eval/generated/linkedin-ai', name))) ai.push(evaluate(row, row.model, false));
  }
  assert.equal(ai.length, 120);
  for (const name of readdirSync(resolve(ROOT,'data/eval/generated/linkedin-ai-loweffort')).filter(name => name.endsWith('.jsonl')).sort()) {
    for await (const row of jsonl(resolve(ROOT,'data/eval/generated/linkedin-ai-loweffort',name))) loweffort.push(evaluate(row,`${row.model} / ${row.effort}`,false));
  }
  function group(rows) {
    const count = rows.length;
    const result = { count, features: {}, engines: {} };
    for (const name of Object.keys(specs)) {
      const observed = rows.map(r=>r.values[name]).filter(v=>v!==null);
      result.features[name] = { hits: rows.filter(r => r.hits[name]).length, rate: rows.filter(r => r.hits[name]).length / count,
        mean:observed.length?observed.reduce((a,b)=>a+b,0)/observed.length:null,zero:observed.filter(v=>v===0).length };
    }
    const baseline = rows.filter(r => r.predictions.baseline.score >= 40).length;
    for (const name of Object.keys(engines)) {
      const positive = rows.filter(r => r.predictions[name].score >= 40).length;
      result.engines[name] = { positive, rate: positive / count, delta: positive - baseline,
        newPositive: rows.filter(r => r.predictions[name].score >= 40 && r.predictions.baseline.score < 40).length,
        removedPositive: rows.filter(r => r.predictions[name].score < 40 && r.predictions.baseline.score >= 40).length,
        shame: rows.filter(r => r.predictions[name].shameable).length };
    }
    return result;
  }
  const result = { veto: group(humans), authors: {}, modern: group(ai), models: {}, natural: group(ai.filter(r => r.natural)), ordinary: group(ai.filter(r => !r.natural)),
    loweffort: group(loweffort), loweffortModels: {},
    policy: 'Frozen train thresholds and editorial weights. Human veto can reject only. Modern/low-effort AI reporting only. Holdout bodies not decoded/scored.' };
  for (const author of [...new Set(humans.map(r => r.group))].sort()) result.authors[author] = group(humans.filter(r => r.group === author));
  for (const model of [...new Set(ai.map(r => r.model))].sort()) result.models[model] = group(ai.filter(r => r.model === model));
  for (const model of [...new Set(loweffort.map(r => r.group))].sort()) result.loweffortModels[model] = group(loweffort.filter(r => r.group === model));
  save(resolve(OUT, 'linkedin.json'), result);
  const output = createWriteStream(resolve(SCRATCH, 'linkedin-reporting-predictions.jsonl'));
  for (const row of [...humans, ...ai, ...loweffort]) if (!output.write(JSON.stringify(row) + '\n')) await once(output, 'drain');
  output.end(); await once(output, 'finish');
  console.log(JSON.stringify({ veto: result.veto.engines, modern: result.modern.engines, features: Object.fromEntries(structural.rules.map(r => {
    const f = r.id.replace('measured-structural.', '').replaceAll('-', '_');
    return [f, { veto: result.veto.features[f], modern: result.modern.features[f] }];
  })) }, null, 2));
} finally { await s.close(); }
