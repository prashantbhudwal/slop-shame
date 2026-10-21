#!/usr/bin/env node
import { registerHooks } from 'node:module';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { timeRegex, validatePacks } from './lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Native TS stripping plus a small resolver for this repo's extensionless TS
// imports. No transpiler process, bundles, persistent loaders or new packages.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const path of [base + '.ts', resolve(base, 'index.ts')]) {
        if (existsSync(path)) return nextResolve(pathToFileURL(path).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const names = ['zeroslop', 'paech-sampler', 'paech-essays', 'vale-ai-tells', 'slop-radar', 'kobak'];
const vendorPacks = [];
for (const name of names) vendorPacks.push((await import(pathToFileURL(resolve(root, `src/lib/engine/packs/vendor/${name}.ts`)).href)).pack);
validatePacks(vendorPacks);

let createEngine, builtIn, buildContext;
try {
  ({ createEngine } = await import(pathToFileURL(resolve(root, 'src/lib/engine/index.ts')).href));
  ({ packs: builtIn } = await import(pathToFileURL(resolve(root, 'src/lib/engine/packs/index.ts')).href));
  ({ buildContext } = await import(pathToFileURL(resolve(root, 'src/lib/engine/context.ts')).href));
} catch (error) {
  const result = { status: 'engine-unavailable', fallback: 'All vendor packs passed the local schema, uniqueness, regex compilation and 10KB timing validator. No real-engine performance result is claimed.', error: String(error) };
  if (!process.argv.includes('--no-write')) writeFileSync(resolve(root, 'src/lib/engine/packs/vendor/BENCHMARK.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2)); process.exitCode = 1;
}

if (createEngine) {
  const fixtures = readdirSync(resolve(root, 'tests/fixtures/posts')).filter((f) => f.endsWith('.json')).sort().flatMap((file) => JSON.parse(readFileSync(resolve(root, 'tests/fixtures/posts', file), 'utf8')));
  const filler = 'The team reviewed the report on Tuesday and wrote down the remaining questions before the next meeting with our customers'.split(' ');
  const probePhrases = vendorPacks.flatMap((pack) => pack.rules.flatMap((rule) => rule.phrases ?? [])).filter((phrase) => phrase.split(' ').length >= 3);
  const posts = Array.from({ length: 2000 }, (_, i) => {
    const source = fixtures[i % fixtures.length];
    const injection = i % 3 === 0 ? `. ${probePhrases[i % probePhrases.length]}.` : '';
    const text = source.text + injection;
    const words = buildContext({ text }).wordCount;
    const target = Math.max(words, [50, 100, 200, 300, 400][i % 5]);
    const padding = Array.from({ length: target - words }, (_, j) => filler[j % filler.length]).join(' ');
    return { text: `${text}\n\n${padding}`, hashtags: source.hashtags, authorHeadline: source.authorHeadline };
  });
  function measure(packs, rounds = 1) {
    const start = performance.now(); const engine = createEngine(packs); const creationMs = performance.now() - start;
    for (const post of posts.slice(0, 200)) engine.analyze(post);
    const samples = []; let checksum = 0;
    for (let round = 0; round < rounds; round++) {
      const begin = performance.now(); let sum = 0;
      for (const post of posts) sum += engine.analyze(post).score;
      samples.push((performance.now() - begin) / posts.length); checksum = sum;
    }
    samples.sort((a, b) => a - b);
    return { creationMs, msPerPost: samples[Math.floor(samples.length / 2)], rounds: samples, checksum };
  }
  // Warm full construction outside the creation measurement.
  createEngine([...builtIn, ...vendorPacks]);
  const baseline = measure(builtIn, 3);
  const all = measure([...builtIn, ...vendorPacks], 3);
  const vendorsOnly = measure(vendorPacks, 3);
  const perPack = vendorPacks.map((pack) => ({ pack: pack.id, ...measure([...builtIn, pack]) }));
  const regexTimes = vendorPacks.flatMap((pack) => pack.rules.flatMap((rule) => (rule.patterns ?? []).map((source) => ({ rule: rule.id, worstWarmed10KBMs: timeRegex(source) })))).sort((a, b) => b.worstWarmed10KBMs - a.worstWarmed10KBMs);
  const human = [...JSON.parse(readFileSync(resolve(root, 'scripts/dictionaries/human-controls.json'), 'utf8')), { id: 'redis-6.0.0-readme (pre-LLM)', text: readFileSync(resolve(root, 'data/dictionaries/human-control-redis/README.md'), 'utf8') }];
  const vendorEngine = createEngine(vendorPacks);
  const humanHits = human.map((post) => ({ id: post.id, signals: vendorEngine.analyze({ text: post.text }).signals.map((s) => s.ruleId) })).filter((post) => post.signals.length);
  const result = {
    status: all.msPerPost < 0.5 ? 'passed' : 'over-budget', measuredAt: new Date().toISOString(), node: process.version,
    sample: { posts: posts.length, minWords: Math.min(...posts.map((p) => buildContext(p).wordCount)), maxWords: Math.max(...posts.map((p) => buildContext(p).wordCount)), description: 'Project synthetic human/AI/mixed fixtures padded to 50-400 words; one third contain an additional vendor phrase. No cached reports.' },
    counts: { packs: vendorPacks.length, phrases: vendorPacks.flatMap((p) => p.rules).reduce((n, r) => n + (r.phrases?.length ?? 0), 0), patterns: regexTimes.length },
    baseline, all, vendorsOnly, perPack, slowestPack: [...perPack].sort((a, b) => b.msPerPost - a.msPerPost)[0]?.pack,
    regex: { maxWarmed10KBMs: regexTimes[0]?.worstWarmed10KBMs ?? 0, slowest: regexTimes.slice(0, 5) },
    syntheticHumanControlsWithVendorHits: humanHits,
  };
  if (!process.argv.includes('--no-write')) writeFileSync(resolve(root, 'src/lib/engine/packs/vendor/BENCHMARK.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'passed' || humanHits.length || result.regex.maxWarmed10KBMs >= 1) process.exitCode = 1;
}
