#!/usr/bin/env node
/** Reporting/veto-only checks; no discovery, fitting, weights, or new rules. */
import assert from 'node:assert/strict';
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, buildContext, compilePhrases, report, attachBookRates, NAMEABILITY, nameability, nameabilitySha256, rankTrainCandidates } from './mine.mjs';

const CACHE = resolve(ROOT, 'data/eval/raw/hillclimb');
const sha = x => createHash('sha256').update(x).digest('hex');
// Chosen before opening the human corpus or modern AI examples. The user
// authorized flags/rejections; use a flag and retain all train-selected rows.
export const VETO_POLICY = { minAuthors: 3, minDocumentRate: .001, action: 'flag-only' };

/** Top-level JSON metadata scan without UTF-8 decoding any post text. */
export function authorFromBytes(line) {
  const whitespace = c => c === 32 || c === 9 || c === 10 || c === 13;
  const skipWhite = i => { while (i < line.length && whitespace(line[i])) i++; return i; };
  const endString = i => {
    assert.equal(line[i], 34);
    for (i++; i < line.length; i++) {
      if (line[i] === 92) { i++; continue; }
      if (line[i] === 34) return i + 1;
    }
    throw Error('Unterminated JSON string');
  };
  let i = skipWhite(0);
  assert.equal(line[i++], 123);
  while (i < line.length) {
    i = skipWhite(i);
    if (line[i] === 125) break;
    const keyEnd = endString(i);
    const key = JSON.parse(line.subarray(i, keyEnd).toString('utf8'));
    i = skipWhite(keyEnd);
    assert.equal(line[i++], 58);
    i = skipWhite(i);
    if (key === 'author') {
      const end = endString(i);
      return JSON.parse(line.subarray(i, end).toString('utf8'));
    }
    // Skip the value structurally as bytes, including any nested metadata.
    // Crucially, no .toString/JSON.parse touches a skipped text value.
    let depth = 0;
    for (; i < line.length; i++) {
      const c = line[i];
      if (c === 34) { i = endString(i) - 1; continue; }
      if (c === 123 || c === 91) depth++;
      else if (c === 125 || c === 93) {
        if (depth === 0) break;
        depth--;
      } else if (c === 44 && depth === 0) break;
    }
    if (line[i] !== 44) break;
    i++;
  }
  throw Error('Missing top-level string author; refusing to decode corpus row');
}

async function* binaryLines(file) {
  let rest = Buffer.alloc(0);
  for await (const chunk of createReadStream(file)) {
    const buffer = rest.length ? Buffer.concat([rest, chunk]) : chunk;
    let start = 0, end;
    while ((end = buffer.indexOf(10, start)) >= 0) {
      if (end > start) yield buffer.subarray(start, end);
      start = end + 1;
    }
    rest = Buffer.from(buffer.subarray(start));
  }
  if (rest.length) yield rest;
}

function appendix(run, cs) {
  const li = run.linkedinChecks, pct = r => (100 * r).toFixed(3) + '%';
  const recommended = cs.filter(c => c.stats.dev.passesGates && !c.linkedinVetoRisk);
  const lines = ['', '## Authorized LinkedIn false-alarm check', '',
    `Only the author-split veto partition was decoded and matched: ${li.veto.documents} posts from ${li.veto.authors} authors. The shared JSONL was streamed as bytes for author selection; holdout text values were never UTF-8 decoded, parsed into post objects, passed to the matcher, quoted, written, or scored. The split metadata was read to identify allowed authors. No score threshold or engine verdict was computed on this corpus.`, '',
    'Policy, fixed before corpus access: flag a candidate when >=3 distinct veto authors use it and its veto document rate is >=0.1% (at least 9 of 8,189 posts). Flags do not alter train/dev statistics, ranking, phrases, categories, or weights. All train-qualified rows remain in the handoff JSONL. Each has linkedinVetoDf, linkedinVetoAuthorCount, linkedinVetoRate and linkedinVetoRisk. Several independent human authors using a phrase is a reason to distrust it as standalone positive evidence.', '',
    `Risk flags: ${li.veto.riskyCandidates}/${cs.length} train-qualified candidates; ${li.veto.riskyDevCandidates}/${li.veto.devCandidates} dev-qualified candidates. ${recommended.length} dev-qualified candidates remain without this veto risk flag, of which ${li.veto.unflaggedNameableDevCandidates} are nameable smells. Across the ${li.veto.documents} veto posts, any dev-qualified candidate appears in ${li.veto.devCandidateUnionDf} (${pct(li.veto.devCandidateUnionDf / li.veto.documents)}); any unflagged dev-qualified candidate appears in ${li.veto.unflaggedDevCandidateUnionDf} (${pct(li.veto.unflaggedDevCandidateUnionDf / li.veto.documents)}). These are raw phrase-presence rates, not an integrated detector false-positive rate.`, '',
    'Dev-qualified candidates, in the unchanged train evidence order:', '',
    '| Candidate | Window | Nameable | Topic flag | Veto DF / authors | Veto rate | Veto risk |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
    ...cs.filter(c => c.stats.dev.passesGates).map(c => `| ${c.ngram.replaceAll('|', '\\|')} | ${c.miningPosition} | ${c.nameable ? 'yes' : 'no'} | ${c.topicFlag ? 'yes' : 'no'} | ${c.linkedinVetoDf} / ${c.linkedinVetoAuthorCount} | ${pct(c.linkedinVetoRate)} | ${c.linkedinVetoRisk ? 'flag' : 'clear'} |`), '',
    'Veto risks among the first 30 train-ranked forms:', '',
    '| Candidate | Veto DF | Authors | Risk |', '| --- | ---: | ---: | --- |',
    ...cs.slice(0, 30).map(c => `| ${c.ngram.replaceAll('|', '\\|')} | ${c.linkedinVetoDf} | ${c.linkedinVetoAuthorCount} | ${c.linkedinVetoRisk ? 'flag' : 'clear'} |`), '',
    '## Modern AI LinkedIn coverage — reporting only', '',
    'The four generation files are evaluated only after train selection, dev validation and veto policy are frozen. No words, rules, weights or thresholds are mined or fitted from them. The same 30 prompt IDs are present once per model. A hit means at least one candidate lexical pattern occurs; it does not mean score>=40 or a reliable AI verdict, and it is not directly comparable with the owner\'s 5/120 current-engine result.', '',
    '| Model | Posts | Any train candidate | Any dev-qualified candidate | Dev-qualified, no veto risk |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...Object.entries(li.modernAi.perModel).map(([m, s]) => `| ${m} | ${s.posts} | ${s.trainCandidateHits} | ${s.devCandidateHits} | ${s.unflaggedDevCandidateHits} |`),
    `| Total | ${li.modernAi.total.posts} | ${li.modernAi.total.trainCandidateHits} | ${li.modernAi.total.devCandidateHits} | ${li.modernAi.total.unflaggedDevCandidateHits} |`, '',
    `The ${li.veto.unflaggedNameableDevCandidates} nameable dev-qualified candidates without veto flags hit ${li.modernAi.total.unflaggedNameableDevCandidateHits}/120 modern examples. Under the revised target, clean modern AI output without obvious smells is out of scope: zero hits are not evidence of target failure, and these reporting examples have not been labeled for smell/effort. Conversely, RAID discrimination alone does not establish detection of zero-effort writing.`, '',
    'Human veto and modern AI results are cross-checks only. The human sample consists of 2021 influencers, and the modern AI set contains only 30 shared prompts, so neither establishes generalization to all human LinkedIn writing or modern AI output. Genre/topic flags still apply even when a candidate is absent from the veto sample. No LinkedIn holdout result is available or implied.', '',
    'Only veto-row bytes contributed to the recorded human input digest. The combined corpus file was not copied, modified, committed, or hashed as a whole. Modern AI input digests appear in mine-work/run.json. No author names or dataset passages appear in these outputs.', '',
  ];
  return lines.join('\n');
}

export async function main() {
  const candidateFile = resolve(CACHE, 'mined-candidates.jsonl');
  const runFile = resolve(CACHE, 'mine-work/run.json');
  const cs = readFileSync(candidateFile, 'utf8').trim().split('\n').map(JSON.parse);
  const run = JSON.parse(readFileSync(runFile));
  assert.equal(sha(cs.map(c => c.id).join('\n')), run.candidateIdsSha256);
  // Support the owner's later target clarification without rerunning or
  // altering numerical discovery. Rank solely from train freeze + wording.
  const freezePath = resolve(CACHE, 'mine-work/train-freeze.json');
  const freeze = JSON.parse(readFileSync(freezePath));
  for (const c of freeze.candidates) Object.assign(c, nameability(c.key.split('\u001f')[1]));
  rankTrainCandidates(freeze.candidates);
  const order = new Map(freeze.candidates.map((c, i) => [makeId(c.key), i]));
  function makeId(key) { return `mined.${sha(key).slice(0, 16)}`; }
  for (const c of cs) { assert(order.has(c.id)); Object.assign(c, nameability(c.ngram)); }
  cs.sort((a, b) => order.get(a.id) - order.get(b.id));
  for (const stages of [freeze.stages, run.stages]) {
    stages['Nameable smells'] = cs.filter(c => c.nameable).length;
    stages['Not nameable; retained and demoted'] = cs.filter(c => !c.nameable).length;
  }
  run.stages['Nameable smells passing dev'] = cs.filter(c => c.nameable && c.stats.dev.passesGates).length;
  freeze.target = run.target = NAMEABILITY.target;
  freeze.nameabilityRule = run.nameabilityRule = NAMEABILITY.rule;
  freeze.inputs.nameability = run.inputs.nameability = nameabilitySha256;
  writeFileSync(freezePath, JSON.stringify(freeze, null, 2) + '\n');
  run.trainFreezeSha256 = sha(readFileSync(freezePath));
  run.candidateIdsSha256 = sha(cs.map(c => c.id).join('\n'));
  // The optional prior may have arrived after train discovery. Annotation is
  // allowed here, without changing candidate membership, rank or weights.
  run.books = attachBookRates(cs);
  const rules = cs.map(c => ({ id: c.id, kind: 'phrase', category: c.suggestedCategory, weight: 1, label: 'Reporting-only lexical candidate', repeat: 'once', ...(c.phrases ? { phrases: c.phrases } : { patterns: c.patterns }) }));
  const matcher = compilePhrases(rules), index = new Map(cs.map((c, i) => [c.id, i]));
  const splitPath = resolve(ROOT, 'data/eval/raw/normalized/linkedin-influencers-split.json');
  const splitBytes = readFileSync(splitPath), split = JSON.parse(splitBytes);
  const allowedAuthors = new Set(Object.entries(split.authors).filter(([, part]) => part === 'veto').map(([a]) => a));
  const authorSets = cs.map(() => new Set()), df = cs.map(() => 0), seenAuthors = new Set();
  const vetoHash = createHash('sha256'), vetoHitSets = [];
  let nVeto = 0;
  for await (const raw of binaryLines(resolve(ROOT, 'data/eval/raw/normalized/linkedin-influencers.jsonl'))) {
    const author = authorFromBytes(raw);
    assert(['veto', 'holdout'].includes(split.authors[author]), 'Unknown author partition');
    if (!allowedAuthors.has(author)) continue;
    // This is the ONLY point where corpus text is decoded; membership is
    // checked above, without parsing or decoding holdout text values.
    const row = JSON.parse(raw.toString('utf8'));
    assert.equal(row.author, author);
    assert.equal(row.label, 'human');
    assert.equal(typeof row.text, 'string');
    nVeto++; seenAuthors.add(author); vetoHash.update(raw); vetoHash.update('\n');
    const hitIds = new Set();
    for (const [rule] of matcher(buildContext({ text: row.text }))) {
      const i = index.get(rule.id); df[i]++; authorSets[i].add(author); hitIds.add(i);
    }
    vetoHitSets.push(hitIds);
  }
  assert.equal(nVeto, split.counts.veto);
  assert.equal(seenAuthors.size, allowedAuthors.size);
  for (let i = 0; i < cs.length; i++) Object.assign(cs[i], {
    linkedinVetoDf: df[i], linkedinVetoAuthorCount: authorSets[i].size, linkedinVetoRate: df[i] / nVeto,
    linkedinVetoRisk: authorSets[i].size >= VETO_POLICY.minAuthors && df[i] / nVeto >= VETO_POLICY.minDocumentRate,
  });
  const devSet = new Set(cs.flatMap((c, i) => c.stats.dev.passesGates ? [i] : []));
  const safeSet = new Set([...devSet].filter(i => !cs[i].linkedinVetoRisk));
  const safeNameableSet = new Set([...safeSet].filter(i => cs[i].nameable));
  const union = (hitSet, candidates) => [...hitSet].some(i => candidates.has(i));
  const veto = { documents: nVeto, authors: seenAuthors.size, policy: VETO_POLICY, devCandidates: devSet.size,
    unflaggedNameableDevCandidates: [...safeSet].filter(i => cs[i].nameable).length,
    riskyCandidates: cs.filter(c => c.linkedinVetoRisk).length,
    riskyDevCandidates: cs.filter(c => c.linkedinVetoRisk && c.stats.dev.passesGates).length,
    devCandidateUnionDf: vetoHitSets.filter(s => union(s, devSet)).length,
    unflaggedDevCandidateUnionDf: vetoHitSets.filter(s => union(s, safeSet)).length,
    vetoRowsSha256: vetoHash.digest('hex'), splitSha256: sha(splitBytes), holdoutTextsDecoded: 0, holdoutTextsMatched: 0 };
  // Freeze all checks and subsets before the reporting-only AI corpus opens.
  const perModel = {}, aiInputs = {}, promptSets = [], total = { posts: 0, trainCandidateHits: 0, devCandidateHits: 0, unflaggedDevCandidateHits: 0, unflaggedNameableDevCandidateHits: 0 };
  const aiDir = resolve(ROOT, 'data/eval/generated/linkedin-ai');
  // Pin the four specified models/120 posts. Other agents may add new model
  // files to this shared directory while this report runs.
  for (const file of ['claude-opus-5-5.jsonl', 'gemini-3.8-flash.jsonl', 'gpt-6.1-sol.jsonl', 'grok-4.7.jsonl']) {
    const bytes = readFileSync(resolve(aiDir, file)); aiInputs[file] = sha(bytes);
    const rows = bytes.toString('utf8').trim().split('\n').map(JSON.parse), promptIds = new Set();
    assert.equal(rows.length, 30);
    for (const row of rows) {
      assert.equal(typeof row.text, 'string');
      promptIds.add(row.promptId);
      const hits = new Set([...matcher(buildContext({ text: row.text })).keys()].map(r => index.get(r.id)));
      const s = perModel[row.model] ||= { posts: 0, trainCandidateHits: 0, devCandidateHits: 0, unflaggedDevCandidateHits: 0, unflaggedNameableDevCandidateHits: 0 };
      s.posts++; s.trainCandidateHits += Number(hits.size > 0); s.devCandidateHits += Number(union(hits, devSet)); s.unflaggedDevCandidateHits += Number(union(hits, safeSet));
      s.unflaggedNameableDevCandidateHits += Number(union(hits, safeNameableSet));
    }
    assert.equal(promptIds.size, 30); promptSets.push(promptIds);
  }
  assert.equal(Object.keys(perModel).length, 4);
  for (const ps of promptSets) assert.deepEqual([...ps].sort(), [...promptSets[0]].sort());
  for (const s of Object.values(perModel)) for (const k of Object.keys(total)) total[k] += s[k];
  assert.equal(total.posts, 120);
  run.linkedinChecks = { veto, modernAi: { perModel, total, inputs: aiInputs, sharedPrompts: 30 }, codeSha256: sha(readFileSync(import.meta.filename)), reportingOnly: true };
  run.stages['LinkedIn veto risk flags (all train candidates)'] = veto.riskyCandidates;
  run.stages['LinkedIn veto risk flags among dev passes'] = veto.riskyDevCandidates;
  run.stages['Dev passes without LinkedIn veto risk flag'] = safeSet.size;
  run.stages['Dev passes without either topic or LinkedIn veto flags'] = cs.filter(c => c.stats.dev.passesGates && !c.topicFlag && !c.linkedinVetoRisk).length;
  run.stages['Nameable dev passes without LinkedIn veto flags'] = [...safeSet].filter(i => cs[i].nameable).length;
  writeFileSync(candidateFile, cs.map(c => JSON.stringify(c)).join('\n') + '\n');
  writeFileSync(runFile, JSON.stringify(run, null, 2) + '\n');
  writeFileSync(resolve(ROOT, 'eval/hillclimb/MINED.md'), report(run, cs) + appendix(run, cs));
  console.log(JSON.stringify({ veto, modernAi: { perModel, total } }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await main();
