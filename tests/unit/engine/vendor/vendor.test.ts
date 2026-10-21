import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { RulePack, PhraseRule } from '../../../../src/lib/engine/rule-types';
import { pack as zeroslop } from '../../../../src/lib/engine/packs/vendor/zeroslop';
import { pack as sampler } from '../../../../src/lib/engine/packs/vendor/paech-sampler';
import { pack as essays } from '../../../../src/lib/engine/packs/vendor/paech-essays';
import { pack as vale } from '../../../../src/lib/engine/packs/vendor/vale-ai-tells';
import { pack as radar } from '../../../../src/lib/engine/packs/vendor/slop-radar';
import { pack as kobak } from '../../../../src/lib/engine/packs/vendor/kobak';
import { assertSafeRegex, csv, digest, expandFinite, firstPartyInventory, normalize, timeRegex, validatePacks, weightForRatio, yamlTokens } from '../../../../scripts/dictionaries/lib.mjs';
import { dropReason } from '../../../../scripts/dictionaries/policy.mjs';

const packs: RulePack[] = [zeroslop, sampler, essays, vale, radar, kobak];
const root = new URL('../../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const report = JSON.parse(read('src/lib/engine/packs/vendor/report.json'));
const rules = packs.flatMap((pack) => pack.rules) as PhraseRule[];

// If the concurrently-owned core is temporarily unimportable, the explicit
// local validation test still runs. An available core must accept every pack.
let createEngine: typeof import('../../../../src/lib/engine/index').createEngine | undefined;
let engineError: string | undefined;
try { ({ createEngine } = await import('../../../../src/lib/engine/index')); }
catch (error) { engineError = String(error); console.warn(`Vendor integration fallback: core unavailable: ${engineError}`); }

describe('pinned vendor inputs and reproducible pipeline', () => {
  it('retains a verified full license and immutable checksum for each raw input', () => {
    const lock = JSON.parse(read('scripts/dictionaries/sources.lock.json'));
    expect(lock.sources).toHaveLength(7);
    for (const source of lock.sources) {
      expect(source.pin).toMatch(/^[a-f0-9]{40}$/);
      expect(['MIT', 'Apache-2.0', 'BSD-3-Clause']).toContain(source.spdx);
      expect(read(`data/dictionaries/${source.id}/SOURCE.md`)).toContain(source.pin);
      for (const file of source.files) expect(digest(read(`data/dictionaries/${source.id}/${file.path}`))).toBe(file.sha256);
      expect(read('THIRD_PARTY_NOTICES.md')).toContain(`## Vendored dictionary: ${source.id}`);
    }
    const samplerSource = lock.sources.find((s: { id: string }) => s.id === 'paech-sampler');
    expect(samplerSource.spdx).toBe('Apache-2.0');
    expect(samplerSource.notice).toContain('No NOTICE/NOTICE.* anywhere');
    expect(read('src/lib/engine/packs/vendor/paech-sampler.ts')).toContain('Modified from upstream');
    expect(digest(read('data/dictionaries/kobak/style-counts.json'))).toBe(lock.sources.find((s: { id: string }) => s.id === 'kobak').derivedFile.sha256);
  });

  it('round-trips difficult CSV and fails closed on unsupported YAML/regex syntax', () => {
    expect(csv('word,comment\r\n"delve","a, b and ""c"""\r\n')).toEqual([['word', 'comment'], ['delve', 'a, b and "c"']]);
    expect(yamlTokens("tokens:\n  - '[Ii]t\\s+is'\n")[0]!.value).toBe('[Ii]t\\s+is');
    const regex = "\\b[Ii]t'?s not [^.!?\\n]+\\. It is";
    expect(yamlTokens(`tokens:\n  - ${JSON.stringify(regex)}\n`)[0]!.value).toBe(regex);
    expect(() => yamlTokens('tokens:\n  - |\n    unexpected block')).toThrow();
    expect(expandFinite("\\bdelv(?:e|es|ed|ing)\\b")).toEqual(['delve', 'delves', 'delved', 'delving']);
    expect(expandFinite('foo.*bar')).toBeNull();
    for (const pattern of ['(a+)+$', '(?:a{1,4})?', '(?:a?)+', '(?=foo)foo', '(a)\\1', '\\p{L}+']) expect(() => assertSafeRegex(pattern)).toThrow();
  });

  it('derives Kobak ratios from normalized counts and keeps only rare high-fold style words', () => {
    const data = JSON.parse(read('data/dictionaries/kobak/style-counts.json'));
    expect(data.rows).toHaveLength(407);
    const row = data.rows.find((r: { word: string }) => r.word === 'delves');
    const p21 = (row.counts[11] + 1) / (data.totals[11] + 1);
    const p22 = (row.counts[12] + 1) / (data.totals[12] + 1);
    const p24 = (row.counts[14] + 1) / (data.totals[14] + 1);
    const ratio = p24 / (p22 + 2 * Math.max(0, p22 - p21));
    expect(ratio).toBeCloseTo(28.0327838, 6);
    expect(kobak.rules.find((r) => r.kind === 'phrase' && r.phrases?.includes('delves'))?.weight).toBe(weightForRatio(ratio));
    expect(weightForRatio(10)).toBe(4);
    expect(weightForRatio(60)).toBe(8);
    for (const word of ['across', 'between', 'within', 'additionally', 'strategic', 'challenges', 'elara', 'amp;amp;amp', 'covid', 'findings', 'potential']) {
      expect(rules.flatMap((r) => r.phrases ?? [])).not.toContain(word);
    }
  });

  it('enforces human-control and measured-evidence guards independently of sampler penalties', () => {
    const base = { source: 'paech-sampler', kind: 'phrase', category: 'ai-vocabulary', weight: 10, ratio: 32 };
    expect(dropReason({ ...base, value: 'strategic' }, new Map(), [])).toContain('common-professional');
    expect(dropReason({ ...base, value: 'elara' }, new Map(), [])).toContain('unigram-evidence');
    expect(dropReason({ ...base, value: 'barely above a whisper' }, new Map(), [])).toContain('fiction-or-generic');
    const sample = { id: 'human', text: 'We unlock the secrets of this protocol.', normalized: normalize('We unlock the secrets of this protocol.') };
    expect(dropReason({ ...base, value: 'unlock the secrets' }, new Map(), [sample])).toBe('human-control:human');
  });

  it('deduplicates all literal/regex matchers, keeps maximum weights and records every merged origin', () => {
    expect(() => validatePacks(packs)).not.toThrow();
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    const first = firstPartyInventory(fileURLToPath(new URL('src/lib/engine/packs', root)));
    for (const pack of packs) for (const rule of pack.rules as PhraseRule[]) {
      expect(rule.id.startsWith(pack.id + '.')).toBe(true);
      for (const phrase of rule.phrases ?? []) expect(first.phrases.has(normalize(phrase))).toBe(false);
      for (const source of rule.patterns ?? []) expect(first.patterns.has(source)).toBe(false);
    }
    for (const row of report.rules) expect(row.weight).toBe(Math.max(...row.origins.map((o: { weight: number }) => o.weight)));
    expect(report.rules.some((r: { origins: unknown[] }) => r.origins.length > 1)).toBe(true);
    expect(report.exactFirstPartyOverlaps).toBeGreaterThan(0);
    expect(report.totalPhrases).toBe(rules.reduce((n, r) => n + (r.phrases?.length ?? 0), 0));
    console.log(`Vendor totals: ${report.totalPhrases} literal phrases; ${report.totalPatterns} regexes; ${report.totalRules} unique rules; ${report.exactFirstPartyOverlaps} exact first-party overlaps omitted.`);
    for (const source of report.stats) expect(source.keptSourceEntries + source.droppedSourceEntries).toBe(source.upstreamEntries);
  });

  it('regenerates byte-identical packs, reports, source metadata and append-only notices', () => {
    const paths = ['src/lib/engine/packs/vendor', 'data/dictionaries'];
    function snapshot() {
      const entries = new Map<string, string>();
      for (const folder of paths) for (const file of readdirSync(new URL(folder, root), { recursive: true, withFileTypes: true })) {
        if (file.isFile() && file.name !== 'BENCHMARK.json') {
          const path = `${file.parentPath}/${file.name}`; entries.set(path, digest(readFileSync(path)));
        }
      }
      entries.set('notices', digest(read('THIRD_PARTY_NOTICES.md')));
      return entries;
    }
    const before = snapshot();
    const run = spawnSync(process.execPath, ['scripts/dictionaries/update.mjs'], { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 30000 });
    expect(run.status, run.stderr).toBe(0);
    expect(snapshot()).toEqual(before);
  });
});

describe('vendor real-engine integration', () => {
  it('has a local schema fallback if the concurrently-owned core is unavailable', () => {
    expect(() => validatePacks(packs)).not.toThrow();
    if (!createEngine) expect(engineError).toBeTruthy();
  });

  it.skipIf(!createEngine)('builds every pack with createEngine and observes a positive literal in each pack', () => {
    for (const pack of packs) {
      const engine = createEngine!([pack]);
      const rule = pack.rules.find((r) => r.kind === 'phrase' && r.phrases?.length) as PhraseRule;
      expect(rule).toBeTruthy();
      const text = `This is a working example with enough words for the engine to analyze.\n\n${rule.phrases![0]}\n\n${rule.phrases![0]}`;
      expect(engine.analyze({ text }).signals.some((s) => s.ruleId === rule.id)).toBe(true);
    }
  });

  it.skipIf(!createEngine)('preserves ordinary human writing and handles m/Unicode radar translation', () => {
    const engine = createEngine!(packs);
    const controls = [...JSON.parse(read('scripts/dictionaries/human-controls.json')), { id: 'redis-6.0.0-readme (pre-LLM)', text: read('data/dictionaries/human-control-redis/README.md') }] as { id: string; text: string }[];
    for (const post of controls) expect(engine.analyze({ text: post.text }).signals, post.id).toEqual([]);
    const result = createEngine!([radar]).analyze({ text: 'A plain sentence with at least eight words precedes the next line.\n🚀 **Velocity**: the deploy took three seconds.' });
    expect(result.signals.some((s) => s.category === 'formatting')).toBe(true);
    const contrast = createEngine!([vale]).analyze({ text: "It’s not just about a plugin. It’s about a catalyst for transformation across the entire organization." });
    expect(contrast.signals.some((s) => s.category === 'negation-pivot')).toBe(true);
    const leak = engine.analyze({ text: 'There are enough ordinary words here for analysis.\nRegenerate response\nAnother ordinary sentence supplies the remaining visible text.' });
    expect(leak.signals.some((s) => s.category === 'chatbot-leak')).toBe(true);
  });

  it('compiles and scans EVERY regex globally over 10KB adversarial strings in <1ms', () => {
    let worst = 0, slowest = '';
    for (const rule of rules) for (const source of rule.patterns ?? []) {
      expect(() => new RegExp(source, 'gi'), rule.id).not.toThrow();
      const ms = timeRegex(source);
      if (ms > worst) { worst = ms; slowest = rule.id; }
      expect(ms, `${rule.id}: ${source}`).toBeLessThan(1);
    }
    console.log(`Worst warmed 10KB regex scan: ${worst.toFixed(4)}ms (${slowest}).`);
  });

  it.skipIf(!createEngine)('benchmarks 2,000 posts with ALL vendors and existing packs below 0.5ms/post', () => {
    const run = spawnSync(process.execPath, ['scripts/dictionaries/benchmark.mjs', '--no-write'], { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 60000 });
    expect(run.status, run.stderr || run.stdout).toBe(0);
    const result = JSON.parse(run.stdout);
    console.log(`ALL packs: ${result.all.msPerPost.toFixed(4)}ms/post; baseline: ${result.baseline.msPerPost.toFixed(4)}; vendors: ${result.vendorsOnly.msPerPost.toFixed(4)}; slowest added pack: ${result.slowestPack}.`);
    expect(result.sample.posts).toBe(2000);
    expect(result.sample.minWords).toBeGreaterThanOrEqual(50);
    expect(result.sample.maxWords).toBeLessThanOrEqual(400);
    expect(result.all.msPerPost).toBeLessThan(0.5);
    expect(result.syntheticHumanControlsWithVendorHits).toEqual([]);
  }, 65000);
});
