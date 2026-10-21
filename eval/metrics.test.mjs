import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate, summarize, wordCount } from './lib/metrics.mjs';
import { loadCorpus } from './lib/corpus.mjs';

const config = { minWords: 30, maxWords: 600, falsePositiveThreshold: 40,
  falsePositiveTarget: 0.05, hardHumanSubsets: ['formal', 'non-native'] };
const row = (label, score, subset = 'formal', extra = {}) => ({ id: `${label}:${score}:${subset}`,
  text: 'word '.repeat(40).trim(), words: 40, source: 'test', label, score, subset,
  genre: 'essay', register: subset === 'non-native' ? 'learner' : 'formal',
  tier: score >= 80 ? 'slopocalypse' : score >= 60 ? 'swamp' : score >= 40 ? 'certified' : score >= 20 ? 'whiff' : 'artisanal',
  ms: 1, signals: [], ...extra });

test('score thresholds are inclusive; mixed text never changes FP or recall denominators', () => {
  const m = summarize([row('human', 39), row('human', 40), row('ai', 40), row('ai', 60), row('mixed', 99)]);
  assert.equal(m.falsePositiveRate, 1 / 2);
  assert.equal(m.recall, 1);
  assert.equal(m.recallAt60, 1 / 2);
  assert.equal(m.shameableFalsePositiveRate, null);
  assert.equal(summarize([]).falsePositiveRate, null);
});

test('Shame FP uses the field when present and does not infer it from score', () => {
  const m = summarize([row('human', 90, 'formal', { shameable: false }), row('human', 40, 'formal', { shameable: true })]);
  assert.equal(m.falsePositiveRate, 1);
  assert.equal(m.shameableFalsePositiveRate, 0.5);
});

test('strict gate fails with missing non-native data even when formal FP is zero', () => {
  const m = evaluate([row('human', 0)], config);
  assert.equal(m.strictPass, false);
  assert.deepEqual(m.missingHardSubsets, ['non-native']);
  assert.equal(m.minimumHardThreshold, null);
});

test('5% is allowed; sweep uses pooled and separate hard-subset targets', () => {
  const rows = Array.from({ length: 20 }, (_, i) => row('human', i === 0 ? 40 : 0, 'formal'));
  rows.push(...Array.from({ length: 20 }, () => row('human', 0, 'non-native')));
  rows.push(row('ai', 45), row('mixed', 80));
  const m = evaluate(rows, config);
  assert.equal(m.strictPass, true);
  assert.equal(m.minimumHardThreshold, 20);
  assert.equal(m.minimumEachHardSubsetThreshold, 20);
  assert.equal(m.sweep.length, 15);
  assert.equal(m.byGenre.essay.ai, 1);
  assert.equal(m.byRegister.learner.human, 20);
  assert.equal(m.confusion.mixed.slopocalypse, 1);
  assert.equal(m.histograms.mixed[8], 1);
});

test('strict gate rejects over-target FP; human rule ranking counts a rule once per post', () => {
  const signal = { ruleId: 'example.phrase', weight: 3, matches: ['phrase'] };
  const m = evaluate([row('human', 100, 'non-native', { signals: [signal, signal] }), row('human', 0), row('ai', 100)], config);
  assert.equal(m.strictPass, false);
  assert.equal(m.minimumHardThreshold, null);
  assert.equal(m.topHumanRules[0].humanPosts, 1);
  assert.equal(m.topHumanRules[0].falsePositivePosts, 1);
  assert.equal(m.topHumanRules[0].humanWeight, 3);
  assert.equal(m.histograms.human[9], 1); // 100 belongs in final bin.
});

test('pooled threshold cannot conceal a small subgroup in the per-subset result', () => {
  const rows = Array.from({ length: 100 }, () => row('human', 0));
  rows.push(row('human', 40, 'non-native'));
  const m = evaluate(rows, config);
  assert.equal(m.minimumHardThreshold, 20);
  assert.equal(m.minimumEachHardSubsetThreshold, 45);
});

test('corpus loader rejects conflicting duplicates, duplicate IDs, and wrong word counts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'slop-eval-'));
  const file = join(dir, 'data.jsonl');
  try {
    const a = row('human', 0);
    const b = { ...a, id: 'second' };
    await writeFile(file, [a, b].map(JSON.stringify).join('\n'));
    const corpus = await loadCorpus([file], config);
    assert.equal(corpus.items.length, 1);
    assert.equal(corpus.duplicates, 1);
    await writeFile(file, [a, { ...b, label: 'ai' }].map(JSON.stringify).join('\n'));
    await assert.rejects(loadCorpus([file], config), /conflicting labels/);
    await writeFile(file, [a, a].map(JSON.stringify).join('\n'));
    await assert.rejects(loadCorpus([file], config), /duplicate id/);
    await writeFile(file, JSON.stringify({ ...a, words: 39 }));
    await assert.rejects(loadCorpus([file], config), /words must be 40/);
    await writeFile(file, JSON.stringify({ ...a, text: 'too short', words: 2 }));
    await assert.rejects(loadCorpus([file], config), /expected 30/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('word counting is defined by ECMAScript whitespace, not punctuation', () => {
  assert.equal(wordCount('  one\u00a0two\nthree-four  '), 3);
  assert.equal(wordCount('one\u0085two three'), 2);
});
