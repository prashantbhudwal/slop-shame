import { copyFileSync, mkdirSync, readFileSync, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { CACHE, ROOT, OUT, SCRATCH, eligible, splitPath, jsonl, loader, save } from './common.mjs';

const s = await loader();
try {
  mkdirSync(resolve(s.engine, 'packs/measured'), { recursive: true });
  copyFileSync(resolve(ROOT, 'src/lib/engine/packs/measured/structural.ts'), resolve(s.engine, 'packs/measured/structural.ts'));
  const { structural } = await s.load(resolve(s.engine, 'packs/measured/structural.ts'));
  const { buildContext, isProtectedSpan, structureOf } = await s.load(resolve(s.engine, 'context.ts'));
  const { createEngine } = await s.load(resolve(s.engine, 'index.ts'));
  const { packs } = await s.load(resolve(s.engine, 'packs/index.ts'));
  const specs = Object.assign({}, ...['thresholds.json','visible-thresholds.json','specifics-thresholds.json'].map(name => JSON.parse(readFileSync(resolve(OUT,name),'utf8')).features));
  const engines = { baseline: createEngine(packs), ...Object.fromEntries(structural.rules.map(rule => [rule.id, createEngine([...packs, { ...structural, rules: [rule] }])])), combined: createEngine([...packs, structural]) };
  const rows = [], integrity = {};
  save(resolve(OUT, 'rules.json'), structural.rules.map(({ detect, ...r }) => r));
  for (const split of ['train', 'dev']) {
    const values = jsonl(resolve(CACHE, `structural-values-${split}.jsonl`))[Symbol.asyncIterator]();
    const visible = jsonl(resolve(CACHE, `visible-values-${split}.jsonl`))[Symbol.asyncIterator]();
    const specifics = jsonl(resolve(CACHE, `specifics-values-${split}.jsonl`))[Symbol.asyncIterator]();
    const output = createWriteStream(resolve(CACHE, `structural-features-${split}.jsonl`));
    const sources = new Set(); let n = 0;
    for await (const row of jsonl(splitPath(split))) {
      if (!eligible(row)) continue;
      const { value: featureRow, done } = await values.next();
      assert(!done); assert.equal(featureRow.id, row.id);
      for (const iterator of [visible,specifics]) { const extra = await iterator.next(); assert(!extra.done); assert.equal(extra.value.id,row.id); Object.assign(featureRow.features,extra.value.features); }
      const ctx = buildContext({ text: row.text }), prot = structureOf(ctx).protectedSpans;
      const hits = [];
      for (const rule of structural.rules) {
        const hit = rule.detect(ctx), name = rule.id.replace('measured-structural.', '').replaceAll('-', '_');
        const expected = featureRow.features[name] !== null && specs[name].threshold.direction * featureRow.features[name] >= specs[name].threshold.direction * specs[name].threshold.threshold;
        assert.equal(!!hit, expected, `${split} ${row.id} ${name}: extractor/runtime parity`);
        if (hit) hits.push([rule.id, hit.scale ?? 1, hit.spans, hit.scale === undefined, hit.spans.some(span => !isProtectedSpan(prot, span))]);
      }
      const thresholdHits = Object.entries(featureRow.features).filter(([name, value]) => value !== null && specs[name].threshold.direction * value >= specs[name].threshold.direction * specs[name].threshold.threshold).map(([name]) => name);
      const record = { ...featureRow, threshold_hits: thresholdHits, hits };
      if (!output.write(JSON.stringify(record) + '\n')) await once(output, 'drain');
      sources.add(row.source_id); n++;
      if (split === 'dev') {
        const predictions = Object.fromEntries(Object.entries(engines).map(([name, engine]) => {
          const r = engine.analyze({ text: row.text }); return [name, { score: r.score, shameable: r.shameable }];
        }));
        rows.push({ id: row.id, source_id: row.source_id, domain: row.domain, model: row.model, label: row.label, predictions });
      }
      if (n % 10000 === 0) console.log(`${split}: ${n}`);
    }
    assert((await values.next()).done);
    assert((await visible.next()).done); assert((await specifics.next()).done);
    output.end(); await once(output, 'finish');
    integrity[split] = { rows: n, sources: sources.size, sourceIds: sources };
  }
  const overlap = [...integrity.train.sourceIds].filter(id => integrity.dev.sourceIds.has(id));
  assert.equal(overlap.length, 0);
  for (const value of Object.values(integrity)) delete value.sourceIds;
  const base = new Map();
  for await (const row of jsonl(resolve(CACHE, 'baseline-dev.jsonl'))) if (eligible(row)) base.set(row.id, row);
  for (const row of rows) {
    assert.equal(row.predictions.baseline.score, base.get(row.id)?.score, 'Frozen baseline score reproduction');
    assert.equal(row.predictions.baseline.shameable, base.get(row.id)?.shameable, 'Frozen baseline shame reproduction');
  }
  integrity.baselineParity = rows.length;
  integrity.extractorRuntimeParity = integrity.train.rows + integrity.dev.rows;
  integrity.sourceOverlap = overlap.length;
  save(resolve(OUT, 'integrity.json'), integrity);
  const output = createWriteStream(resolve(SCRATCH, 'predictions-dev.jsonl'));
  for (const row of rows) if (!output.write(JSON.stringify(row) + '\n')) await once(output, 'drain');
  output.end(); await once(output, 'finish');
  function metrics(subset, name) {
    const humans = subset.filter(r => r.label === 'human'), ai = subset.filter(r => r.label === 'ai');
    const fp = humans.filter(r => r.predictions[name].score >= 40).length, tp = ai.filter(r => r.predictions[name].score >= 40).length;
    return { human: humans.length, ai: ai.length, fp, tp, fpRate: humans.length ? fp / humans.length : null, recall: ai.length ? tp / ai.length : null, shameFP: humans.filter(r => r.predictions[name].shameable).length };
  }
  const result = {};
  for (const name of Object.keys(engines)) {
    result[name] = { overall: metrics(rows, name), domain: {}, model: {} };
    for (const domain of [...new Set(rows.map(r => r.domain))].sort()) result[name].domain[domain] = metrics(rows.filter(r => r.domain === domain), name);
    for (const model of [...new Set(rows.filter(r => r.label === 'ai').map(r => r.model))].sort()) result[name].model[model] = metrics(rows.filter(r => r.model === model || r.label === 'human'), name);
  }
  save(resolve(OUT, 'incremental.json'), result);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([name, v]) => [name, v.overall])), null, 2));
} finally { await s.close(); }
