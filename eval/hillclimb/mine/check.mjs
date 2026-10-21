#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, features, tokenize, normalizeText, straighten, ratioStats, makeRule, compilePhrases, buildContext, loadRows, coverageChecker, deduplicate, nameability } from './mine.mjs';
import { authorFromBytes, VETO_POLICY } from './linkedin-check.mjs';

const SEP = '\u001f';
const sha = x => createHash('sha256').update(x).digest('hex');
assert.throws(() => loadRows('test'), /Only train and dev/);
assert.equal(nameability('of the').nameable, false);
assert.equal(nameability('is its').nameable, false);
assert.equal(nameability("here's a possible").nameable, true);
assert.equal(authorFromBytes(Buffer.from(JSON.stringify({ text: 'Synthetic text with "author": "wrong" and an escaped backslash \\', nested: { author: 'wrong', array: [1, { a: true }] }, author: 'synthetic-veto' }))), 'synthetic-veto');
assert.equal(authorFromBytes(Buffer.from('{"author":"synthetic-holdout","text":"never decoded"}')), 'synthetic-holdout');
assert.throws(() => authorFromBytes(Buffer.from('{"text":"synthetic no author"}')), /Missing top-level/);
assert.equal(straighten(normalizeText('Ｆｏｏ\u200b\r\nаlpha’s ´book´')), "Foo\nalpha's 'book'");
assert(features('Ｆｏｏ\u200b\t\tbar, baz.', 2).found.has('any' + SEP + 'foo bar'));
assert(features('Foo, bar.', 2).found.has('any' + SEP + 'foo, bar'));
assert(!features('Foo, bar.', 2).found.has('any' + SEP + 'foo bar'));
assert(features('A foo_bar test.', 1).found.has('any' + SEP + 'test'));
assert(!features('A foo_bar test.', 1).found.has('any' + SEP + 'foo'));
assert.deepEqual(tokenize('One. Two!\nThree?').sentences, [[0, 4], [5, 9], [10, 16]]);
const rr = ratioStats(300, 0, 28800, 7166);
assert(rr.ratio > 100 && rr.lcb >= 4);
assert(Number.isFinite(rr.lcb));
assert(ratioStats(30, 0, 28800, 7166).lcb < 4);
const docs = ['Zesty prose begins here. Zesty prose ends here.', 'Plain.\nZesty prose belongs here.\nFinal.', 'Plain zesty prose continues.\nFinal.', 'Plain.\nFinal zesty prose.', 'Plain! Zesty prose.'];
for (const position of ['any', 'first-sentence', 'last-sentence', 'first-line', 'last-line', 'sentence-initial']) {
  const key = position + SEP + 'zesty prose';
  const rule = makeRule(key), matcher = compilePhrases([rule]);
  for (const text of docs) assert.equal(matcher(buildContext({ text })).has(rule), features(text, 2).found.has(key), `${position}: ${text}`);
}
const covered = coverageChecker([{ phrases: ['a literary beacon', 'buzzword'], patterns: ['\\bstock\\s+phrase\\b'] }]);
assert(covered('any' + SEP + 'literary beacon'));
assert(covered('any' + SEP + 'one buzzword here'));
assert(covered('any' + SEP + 'a stock phrase'));
assert.equal(covered('any' + SEP + 'buzzwords'), null);
const testCandidates = ['zesty prose', 'zesty prose,', 'new zesty prose'].map(key => ({ key: 'any' + SEP + key, train: { lcb: 10, aiDf: 100 } }));
const dd = deduplicate(testCandidates);
assert(dd.kept.length > 0);
assert(dd.removed.length > 0);

if (process.argv.includes('--outputs')) {
  const cache = resolve(ROOT, 'data/eval/raw/hillclimb');
  const run = JSON.parse(readFileSync(resolve(cache, 'mine-work/run.json')));
  const freezeBytes = readFileSync(resolve(cache, 'mine-work/train-freeze.json'));
  const freeze = JSON.parse(freezeBytes);
  const text = readFileSync(resolve(cache, 'mined-candidates.jsonl'), 'utf8').trim();
  const cs = text ? text.split('\n').map(JSON.parse) : [];
  const coveredByDictionary = coverageChecker(JSON.parse(readFileSync(resolve(cache, 'entries.json'))));
  assert.equal(new Set(cs.map(c => c.id)).size, cs.length);
  assert.deepEqual(run.accessedDatasetSplits, ['train', 'dev']);
  assert.equal(sha(freezeBytes), run.trainFreezeSha256);
  assert.deepEqual(cs.map(c => c.id), freeze.candidates.map(c => makeRule(c.key).id));
  assert.equal(cs.length, run.stages['After containment deduplication']);
  assert.equal(cs.filter(c => c.stats.dev.passesGates).length, run.stages['Dev all gates (including AI DF >=30)']);
  assert.equal(cs.filter(c => !c.topicFlag).length, run.stages['Style/discourse (heuristic; no topic flag)']);
  const categories = readFileSync(resolve(ROOT, 'src/lib/engine/types.ts'), 'utf8').split('export type SlopCategory =')[1].split(';')[0];
  for (const c of cs) {
    assert.match(c.id, /^mined\.[a-f0-9]{16}$/);
    assert.equal(c.kind, 'phrase');
    assert(Boolean(c.phrases) !== Boolean(c.patterns));
    assert(categories.includes(`'${c.suggestedCategory}'`));
    assert.equal(typeof c.topicFlag, 'boolean');
    assert.equal(typeof c.nameable, 'boolean');
    assert.deepEqual({ nameable: c.nameable, nameableReason: c.nameableReason }, nameability(c.ngram));
    assert.equal(coveredByDictionary(c.miningPosition + SEP + c.ngram), null);
    for (const split of ['train', 'dev']) {
      const s = c.stats[split];
      assert.deepEqual(ratioStats(s.aiDf, s.humanDf, s.nAi, s.nHuman), Object.fromEntries(['aiDf','humanDf','nAi','nHuman','aiRate','humanRate','ratio','lcb'].map(k => [k, s[k]])));
      assert.equal(Object.keys(c.stats.perDomain[split]).length, 8);
      assert.equal(Object.keys(c.stats.perModel[split]).length, 6);
      const domains = Object.values(c.stats.perDomain[split]);
      const models = Object.values(c.stats.perModel[split]);
      assert.equal(domains.reduce((a, x) => a + x.aiDf, 0), s.aiDf);
      assert.equal(domains.reduce((a, x) => a + x.humanDf, 0), s.humanDf);
      assert.equal(models.reduce((a, x) => a + x.aiDf, 0), s.aiDf);
      assert.equal(s.positiveDomains, domains.filter(x => x.aiDf > 0 && x.ratio > 1).length);
      assert.equal(s.positiveModels, models.filter(x => x.aiDf > 0 && x.ratio > 1).length);
      assert.equal(s.passesGates, s.aiDf >= 30 && s.lcb >= 4 && s.positiveDomains >= 5 && s.positiveModels >= 3);
    }
    assert(c.stats.train.passesGates);
  }
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'eval/hillclimb/splits.json')));
  for (const split of ['train', 'dev']) {
    const hash = sha(readFileSync(resolve(cache, `${split}.jsonl`)));
    assert.equal(hash, run.inputs[split]);
    assert.equal(hash, manifest.splits[split].sha256);
  }
  assert.equal(sha(readFileSync(resolve(cache, 'entries.json'))), run.inputs.entries);
  assert.equal(sha(readFileSync(resolve(ROOT, 'src/lib/engine/context.ts'))), run.inputs.context);
  assert.equal(sha(readFileSync(resolve(ROOT, 'src/lib/engine/compile.ts'))), run.inputs.compile);
  assert.equal(sha(readFileSync(resolve(ROOT, 'eval/hillclimb/mine/semantic-review.json'))), run.inputs.semanticReview);
  assert.equal(sha(readFileSync(resolve(ROOT, 'eval/hillclimb/mine/nameability.json'))), run.inputs.nameability);
  assert.equal(cs.filter(c => c.nameable).length, run.stages['Nameable smells']);
  assert.equal(cs.filter(c => !c.nameable).length, run.stages['Not nameable; retained and demoted']);
  let sawNonNameable = false;
  for (const c of cs) { if (!c.nameable) sawNonNameable = true; if (sawNonNameable) assert.equal(c.nameable, false); }
  if (run.books.available) {
    assert.equal(cs.filter(c => Number.isFinite(c.bookRate)).length, run.books.annotated);
    assert.equal(cs.filter(c => c.bookRisk === true).length, run.books.risky);
    for (const c of cs) {
      if (c.bookCoverage === 'unavailable') { assert.equal(c.bookRate, null); assert.equal(c.bookRisk, null); }
      else { assert.equal(c.bookCoverage, 'exact'); assert(Number.isFinite(c.bookRate)); assert.equal(c.bookRisk, c.bookRate > 5); }
    }
  }
  if (run.linkedinChecks) {
    const li = run.linkedinChecks;
    assert.deepEqual(li.veto.policy, VETO_POLICY);
    assert.equal(li.veto.documents, 8189);
    assert.equal(li.veto.authors, 29);
    assert.equal(li.veto.holdoutTextsDecoded, 0);
    assert.equal(li.veto.holdoutTextsMatched, 0);
    assert.equal(li.reportingOnly, true);
    const split = JSON.parse(readFileSync(resolve(ROOT, 'data/eval/raw/normalized/linkedin-influencers-split.json')));
    assert.equal(sha(readFileSync(resolve(ROOT, 'data/eval/raw/normalized/linkedin-influencers-split.json'))), li.veto.splitSha256);
    assert.equal(split.counts.veto, li.veto.documents);
    assert.equal(Object.values(split.authors).filter(p => p === 'veto').length, li.veto.authors);
    for (const c of cs) {
      assert(Number.isInteger(c.linkedinVetoDf) && c.linkedinVetoDf >= 0 && c.linkedinVetoDf <= li.veto.documents);
      assert(Number.isInteger(c.linkedinVetoAuthorCount) && c.linkedinVetoAuthorCount >= 0 && c.linkedinVetoAuthorCount <= li.veto.authors);
      assert(c.linkedinVetoAuthorCount <= c.linkedinVetoDf);
      assert.equal(c.linkedinVetoRate, c.linkedinVetoDf / li.veto.documents);
      assert.equal(c.linkedinVetoRisk, c.linkedinVetoAuthorCount >= VETO_POLICY.minAuthors && c.linkedinVetoRate >= VETO_POLICY.minDocumentRate);
    }
    assert.equal(cs.filter(c => c.linkedinVetoRisk).length, li.veto.riskyCandidates);
    assert.equal(cs.filter(c => c.linkedinVetoRisk && c.stats.dev.passesGates).length, li.veto.riskyDevCandidates);
    assert.equal(cs.filter(c => c.nameable && !c.linkedinVetoRisk && c.stats.dev.passesGates).length, li.veto.unflaggedNameableDevCandidates);
    assert.equal(li.modernAi.total.posts, 120);
    assert.equal(Object.keys(li.modernAi.perModel).length, 4);
    for (const [k, v] of Object.entries(li.modernAi.total)) assert.equal(Object.values(li.modernAi.perModel).reduce((n, x) => n + x[k], 0), v);
    for (const [file, digest] of Object.entries(li.modernAi.inputs)) assert.equal(sha(readFileSync(resolve(ROOT, 'data/eval/generated/linkedin-ai', file))), digest);
    assert.equal(sha(readFileSync(resolve(ROOT, 'eval/hillclimb/mine/linkedin-check.mjs'))), li.codeSha256);
    console.log(`LinkedIn output audit passed: ${li.veto.documents} veto rows, ${li.veto.riskyDevCandidates} flagged dev passes, ${li.modernAi.total.posts} modern AI reporting rows.`);
  }
  console.log(`Output audit passed: ${cs.length} candidates, ${cs.filter(c => c.stats.dev.passesGates).length} dev passes.`);
}
console.log('Synthetic checks passed: split allowlist, normalization, punctuation, anchors, ratios, novelty, deduplication.');
