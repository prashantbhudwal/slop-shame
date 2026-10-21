import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { CACHE, OUT, eligible, splitPath, jsonl, loader, save } from './common.mjs';

const s = await loader();
try {
  const { buildContext, structureOf } = await s.load(resolve(s.engine, 'context.ts'));
  const { createEngine } = await s.load(resolve(s.engine, 'index.ts'));
  const { packs } = await s.load(resolve(s.engine, 'packs/index.ts'));
  const { structural } = await s.load(resolve(s.engine, 'packs/measured/structural.ts'));
  const inputs = []; let h = 0, a = 0;
  for await (const row of jsonl(splitPath('dev'))) {
    if (!eligible(row) || (row.label === 'human' ? h >= 100 : a >= 100)) continue;
    const ctx = buildContext({ text: row.text });
    if (ctx.wordCount < 300) continue;
    const input = { text: ctx.text.slice(0, structureOf(ctx).wordSpans[299][1]) };
    if (buildContext(input).wordCount !== 300) throw Error('Expected exactly 300 engine words');
    inputs.push(input); if (row.label === 'human') h++; else a++;
    if (h === 100 && a === 100) break;
  }
  const base = createEngine(packs), variant = createEngine([...packs, structural]);
  let sink = 0;
  for (let i = 0; i < 3000; i++) { sink += base.analyze(inputs[i % inputs.length]).score; sink += variant.analyze(inputs[i % inputs.length]).score; }
  const directRounds = [], baseRounds = [], variantRounds = [], deltas = [];
  for (let round = 0; round < 11; round++) {
    // Fresh context keys every time: do not time a WeakMap cache hit as extraction.
    const contexts = Array.from({ length: 1000 }, (_, i) => buildContext(inputs[i % inputs.length]));
    const t = performance.now();
    for (const ctx of contexts) for (const rule of structural.rules) sink += Number(!!rule.detect(ctx));
    directRounds.push((performance.now() - t) / contexts.length);
    const trials = {};
    for (const name of (round % 2 ? ['variant', 'base'] : ['base', 'variant'])) {
      const engine = name === 'base' ? base : variant;
      const start = performance.now();
      for (let i = 0; i < 1000; i++) sink += engine.analyze(inputs[i % inputs.length]).score;
      trials[name] = (performance.now() - start) / 1000;
    }
    baseRounds.push(trials.base); variantRounds.push(trials.variant); deltas.push(trials.variant - trials.base);
  }
  const stats = values => {
    const sorted = [...values].sort((a, b) => a - b);
    return { meanMs: values.reduce((a, b) => a + b, 0) / values.length, medianMs: sorted[Math.floor(sorted.length / 2)], minMs: sorted[0], maxMs: sorted.at(-1) };
  };
  const result = { node: process.version, inputs: inputs.length, human: h, ai: a, engineWords: 300, rounds: 11, callsPerRound: 1000,
    warmupPerEngine: 3000, directPackFreshContexts: stats(directRounds), baseEngine: stats(baseRounds), plusPackEngine: stats(variantRounds), pairedDelta: stats(deltas),
    directRounds, deltas, sink };
  result.pass = result.directPackFreshContexts.meanMs < .05 && result.pairedDelta.meanMs < .05;
  save(resolve(OUT, 'performance.json'), result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally { await s.close(); }
