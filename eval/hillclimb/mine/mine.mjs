#!/usr/bin/env node
/** Offline discovery. This program has an explicit train/dev allowlist. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { performance } from 'node:perf_hooks';

export const ROOT = resolve(import.meta.dirname, '../../..');
const CACHE = resolve(ROOT, 'data/eval/raw/hillclimb');
const WORK = resolve(CACHE, 'mine-work');
export const MODELS = ['gpt4', 'chatgpt', 'cohere-chat', 'llama-chat', 'mistral-chat', 'mpt-chat'];
export const POSITIONS = ['any', 'first-sentence', 'last-sentence', 'first-line', 'last-line', 'sentence-initial'];
const WORD = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:'[\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu;
const BOUNDARY = /[\p{L}\p{M}\p{N}_]/u;
const SEP = '\u001f';
const sha = x => createHash('sha256').update(x).digest('hex');
const log = x => process.stdout.write(`${new Date().toISOString()} ${x}\n`);
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n');
const canonical = s => s.replace(/\p{White_Space}+/gu, ' ').trim();
const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Execute the actual local engine functions, without Vite, a server, a worker,
// a dependency install, or writes to the other experiment's engine snapshot.
const contextPath = resolve(ROOT, 'src/lib/engine/context.ts');
const compilePath = resolve(ROOT, 'src/lib/engine/compile.ts');
const contextBytes = readFileSync(contextPath, 'utf8');
const compileBytes = readFileSync(compilePath, 'utf8');
const contextURL = 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(contextBytes)).toString('base64');
export const { normalizeText, straighten, buildContext, structureOf, isProtectedSpan } = await import(contextURL);
const compiledJS = stripTypeScriptTypes(compileBytes).replace(/from ['"]\.\/context['"]/, `from '${contextURL}'`);
export const { compilePhrases } = await import('data:text/javascript;base64,' + Buffer.from(compiledJS).toString('base64'));
const norm = s => canonical(straighten(normalizeText(s)).toLowerCase());
const semanticPath = resolve(import.meta.dirname, 'semantic-review.json');
const semanticBytes = readFileSync(semanticPath);
const semanticReview = JSON.parse(semanticBytes);
const nameabilityPath = resolve(import.meta.dirname, 'nameability.json');
const nameabilityBytes = readFileSync(nameabilityPath);
export const NAMEABILITY = JSON.parse(nameabilityBytes);
export const nameabilitySha256 = sha(nameabilityBytes);
export function nameability(phrase) {
  const reason = NAMEABILITY.true[phrase];
  return { nameable: Boolean(reason), nameableReason: reason || 'Ordinary content/vocabulary or incomplete grammatical fragment; no obvious AI smell can be named from this string alone' };
}
export function rankTrainCandidates(cs) {
  const tier = c => !c.nameable ? 0 : /assistant/i.test(c.nameableReason) ? 3 : /scaffold|closer|wrap-up|prediction|transition/i.test(c.nameableReason) ? 2 : 1;
  return cs.sort((a, b) => Number(b.nameable) - Number(a.nameable) || tier(b) - tier(a) || Number(b.review.styleCue) - Number(a.review.styleCue)
    || Number(a.topicFlag) - Number(b.topicFlag) || evidence(b) - evidence(a) || a.key.localeCompare(b.key));
}

export function ratioStats(a, h, na, nh) {
  // Jeffreys/Haldane-Anscombe smoothing, two-sided 95% log risk-ratio CI.
  const pa = (a + .5) / (na + 1), ph = (h + .5) / (nh + 1);
  const ratio = pa / ph;
  const se = Math.sqrt(Math.max(0, 1 / (a + .5) - 1 / (na + 1) + 1 / (h + .5) - 1 / (nh + 1)));
  return { aiDf: a, humanDf: h, nAi: na, nHuman: nh, aiRate: a / na, humanRate: h / nh, ratio, lcb: Math.exp(Math.log(ratio) - 1.959963984540054 * se) };
}

export function loadRows(split) {
  if (!['train', 'dev'].includes(split)) throw Error('Only train and dev are permitted');
  return readFileSync(resolve(CACHE, `${split}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse)
    .filter(r => r.label === 'human' || r.label === 'ai' && r.family === 'chat' && MODELS.includes(r.model));
}

function totals(rows) {
  const ds = [...new Set(rows.map(r => r.domain))].sort();
  const out = { ai: 0, human: 0, domains: Object.fromEntries(ds.map(d => [d, [0, 0]])), models: Object.fromEntries(MODELS.map(m => [m, 0])) };
  for (const r of rows) {
    const human = r.label === 'human';
    out[human ? 'human' : 'ai']++;
    out.domains[r.domain][human ? 1 : 0]++;
    if (!human) out.models[r.model]++;
  }
  return out;
}

export function tokenize(raw) {
  const text = straighten(normalizeText(raw)).toLowerCase();
  const words = [...text.matchAll(WORD)].map(m => ({ word: m[0], start: m.index, end: m.index + m[0].length }));
  const sentences = [...text.matchAll(/[^.!?\n]+(?:[.!?]+["'”’)]*|(?=\n)|$)/g)]
    .filter(m => m[0].trim()).map(m => [m.index + m[0].indexOf(m[0].trim()), m.index + m[0].trimEnd().length]);
  const lines = [...text.matchAll(/[^\n]+/g)].filter(m => m[0].trim())
    .map(m => [m.index + m[0].indexOf(m[0].trim()), m.index + m[0].trimEnd().length]);
  return { text, words, sentences, lines };
}

/** Exact literal windows: punctuation is retained, never silently deleted. */
export function features(raw, n, previous = null) {
  const { text, words, sentences, lines } = tokenize(raw);
  const found = new Set(), cores = new Set();
  const firstSentence = sentences[0], lastSentence = sentences.at(-1);
  const firstLine = lines[0], lastLine = lines.at(-1);
  const sentenceStarts = new Set(sentences.map(([a]) => a));
  for (let i = 0; i + n <= words.length; i++) {
    const begin = words[i].start, end = words[i + n - 1].end;
    if (begin && BOUNDARY.test(text[begin - 1]) || end < text.length && BOUNDARY.test(text[end])) continue;
    if (n > 1 && previous && !previous.has(canonical(text.slice(begin, words[i + n - 2].end)))) continue;
    const core = canonical(text.slice(begin, end));
    if (core.length > 160 || /[^\p{L}\p{M}\p{N}'\s.,;:!?"()\[\]—–-]/u.test(core)) continue;
    cores.add(core);
    const variants = [core];
    const punctuation = text.slice(end).match(/^[,;:!?\.]{1,3}(?![,;:!?\.])/);
    if (punctuation) variants.push(core + punctuation[0]);
    for (const phrase of variants) {
      const finish = end + phrase.length - core.length;
      found.add('any' + SEP + phrase);
      for (const [name, span] of [['first-sentence', firstSentence], ['last-sentence', lastSentence], ['first-line', firstLine], ['last-line', lastLine]]) {
        if (span && begin >= span[0] && finish <= span[1]) found.add(name + SEP + phrase);
      }
      if (sentenceStarts.has(begin)) found.add('sentence-initial' + SEP + phrase);
    }
  }
  return { found, cores };
}

function newCounter(t) {
  return { a: 0, h: 0, d: Object.fromEntries(Object.keys(t.domains).map(d => [d, [0, 0]])), m: Object.fromEntries(MODELS.map(m => [m, 0])), aSources: new Set(), hSources: new Set() };
}
function addHit(c, r) {
  const human = r.label === 'human';
  c[human ? 'h' : 'a']++;
  c.d[r.domain][human ? 1 : 0]++;
  if (!human) c.m[r.model]++;
  (human ? c.hSources : c.aSources).add(r.source_id);
}
function summarize(c, t) {
  const overall = ratioStats(c.a, c.h, t.ai, t.human);
  const perDomain = Object.fromEntries(Object.entries(t.domains).map(([d, [a, h]]) => [d, ratioStats(...c.d[d], a, h)]));
  const perModel = Object.fromEntries(MODELS.map(m => [m, ratioStats(c.m[m], c.h, t.models[m], t.human)]));
  const positiveDomains = Object.values(perDomain).filter(s => s.aiDf > 0 && s.ratio > 1).length;
  const positiveModels = Object.values(perModel).filter(s => s.aiDf > 0 && s.ratio > 1).length;
  return { ...overall, aiSourceDf: c.aSources.size, humanSourceDf: c.hSources.size, positiveDomains, positiveModels,
    passesGates: c.a >= 30 && overall.lcb >= 4 && positiveDomains >= 5 && positiveModels >= 3,
    perDomain, perModel };
}

// Position is encoded in the pattern, because engine position supports two-line
// opening/closing windows rather than the narrower windows mined here.
export function makeRule(key) {
  const [anchor, phrase] = key.split(SEP);
  const base = { id: `mined.${sha(key).slice(0, 16)}`, kind: 'phrase', category: 'template-phrases', weight: 1, label: 'Mined lexical candidate', repeat: 'once' };
  if (anchor === 'any') return { ...base, phrases: [phrase] };
  // English candidates only for positional regexes: the compiler's gi regex
  // path has no u flag. Exact production remeasurement below is authoritative.
  const literal = escapeRE(phrase).replace(/ /g, '\\s{1,64}');
  const left = '(?<![A-Za-z0-9_])', right = '(?![A-Za-z0-9_])';
  const p = {
    'first-line': `(?<=^\\s{0,128}[^\\n]{0,8192})${left}${literal}${right}`,
    'last-line': `${left}${literal}${right}(?=[^\\n]{0,8192}\\s{0,128}$)`,
    'first-sentence': `(?<=^[\\s.!?]{0,128}[^.!?\\n]{0,8192})${left}${literal}${right}`,
    'last-sentence': `${left}${literal}${right}(?=[^.!?\\n]{0,8192}(?:[.!?]+["'”’)]*)?\\s{0,128}$)`,
    'sentence-initial': `(?:^|(?<=[.!?\\n]))\\s{0,128}${literal}${right}`,
  }[anchor];
  return { ...base, patterns: [p] };
}

function includesBounded(haystack, needle) {
  let start = -1;
  while ((start = haystack.indexOf(needle, start + 1)) >= 0) {
    const end = start + needle.length;
    if ((!start || !BOUNDARY.test(haystack[start - 1])) && (end === haystack.length || !BOUNDARY.test(haystack[end]))) return true;
  }
  return false;
}
export function coverageChecker(entries) {
  const literals = [...new Set(entries.flatMap(e => e.phrases || []).map(norm))].filter(Boolean);
  const patterns = entries.flatMap(e => (e.patterns || []).map(p => ({ id: e.id, re: new RegExp(straighten(p), 'i') })));
  return key => {
    const phrase = key.split(SEP)[1];
    const literal = literals.find(l => includesBounded(phrase, l) || includesBounded(l, phrase));
    if (literal) return { type: 'literal-containment', value: literal };
    for (const { id, re } of patterns) if (re.test(phrase)) return { type: 'regex-coverage', value: id };
    return null;
  };
}

function related(a, b) {
  const [ap, av] = a.key.split(SEP), [bp, bv] = b.key.split(SEP);
  // Different first/last windows represent different evidence; only collapse
  // them for identical strings. Any-position contains every narrower anchor.
  if (ap !== bp && ap !== 'any' && bp !== 'any' && av !== bv) return false;
  return includesBounded(av, bv) || includesBounded(bv, av);
}
function evidence(c) { return Math.log2(c.train.lcb) * Math.log2(1 + c.train.aiDf); }
export function deduplicate(candidates) {
  // Most specific first among forms within 50% of the strongest overlapping
  // support and 80% of its LCB. Otherwise retain the stronger evidence form.
  const ranked = [...candidates].sort((a, b) => evidence(b) - evidence(a) || a.key.localeCompare(b.key));
  const kept = [], removed = [];
  while (ranked.length) {
    const seed = ranked.shift();
    const group = [seed, ...ranked.filter(c => related(seed, c) && c.train.aiDf >= .5 * seed.train.aiDf && c.train.lcb >= .8 * seed.train.lcb)];
    group.sort((a, b) => {
      const [ap, av] = a.key.split(SEP), [bp, bv] = b.key.split(SEP);
      return bv.length - av.length || Number(bp !== 'any') - Number(ap !== 'any') || evidence(b) - evidence(a) || a.key.localeCompare(b.key);
    });
    const winner = group[0]; kept.push(winner);
    for (let i = ranked.length - 1; i >= 0; i--) if (ranked[i] === winner || related(winner, ranked[i])) {
      if (ranked[i] !== winner) removed.push({ key: ranked[i].key, kept: winner.key });
      ranked.splice(i, 1);
    }
    if (seed !== winner) removed.push({ key: seed.key, kept: winner.key });
  }
  return { kept, removed };
}

function classify(c) {
  const phrase = c.key.split(SEP)[1];
  const tokens = phrase.match(/[a-z]+(?:'[a-z]+)*/g) || [];
  // Deliberately conservative review queue: grammatical fragments and domain
  // content remain visible, but only clear discourse/style cues rank first.
  const style = /\b(?:overall|conclusion|conclude|summary|summarize|additionally|furthermore|moreover|however|nevertheless|nonetheless|ultimately|indeed|certainly|undoubtedly|notably|interestingly|remarkably|importantly|essential|crucial|vital|ensure|ensuring|emphasiz\w*|highlight\w*|underscore\w*|showcas\w*|demonstrat\w*|illustrat\w*|signif\w*|testament|intricat\w*|captivat\w*|seamless\w*|comprehensiv\w*|meticulous\w*|unwavering|unparalleled|unprecedented|foster\w*|unleash\w*|unlock\w*|delv\w*|tapestry|myriad|plethora|realm|journey|landscape|beacon|resonat\w*|elevat\w*|transformative|multifaceted|pivotal|commendable|indispensable|invaluable|exceptional|extraordinary|exemplary|thought-provoking|mesmerizing|breathtaking)\b/.test(phrase)
    || /\b(?:in short|to sum|as a result|on the other hand|in other words|in essence|all in all|it is clear|it is evident|it's clear|it's evident|one cannot|cannot be overstated|not only|but also|whether you|when it comes|serves as|as we|we can|let us|let's|in today's|in a world|look no further|the perfect|the ideal|for those|look forward|hope you|feel free)\b/.test(phrase);
  const manual = semanticReview.style[phrase];
  const styleCue = Boolean(manual) || style;
  let topicFlag = !styleCue;
  const reasons = topicFlag ? ['Content, grammatical fragment, or unreviewed vocabulary; manual semantic review required'] : [];
  const shares = Object.values(c.train.perDomain).map(s => s.aiDf / c.train.aiDf);
  const maxDomainShare = Math.max(...shares);
  if (maxDomainShare > .65) { topicFlag = true; reasons.push('More than 65% of AI hits occur in one domain'); }
  if (c.train.aiSourceDf < 20) { topicFlag = true; reasons.push('Fewer than 20 distinct AI source groups'); }
  if (semanticReview.additionalRisks[phrase]) { topicFlag = true; reasons.push(semanticReview.additionalRisks[phrase]); }
  let category = tokens.length === 1 ? 'ai-vocabulary' : 'template-phrases';
  if (/\b(?:unparalleled|unprecedented|extraordinary|exceptional|remarkable|breathtaking)\b/.test(phrase)) category = 'inflation';
  if (/\b(?:hope you|feel free|happy to help|as an ai|language model)\b/.test(phrase)) category = 'chatbot-leak';
  if (manual) category = manual[0];
  return { topicFlag, suggestedCategory: category, review: { styleCue, styleHeuristic: style, reasons, maxDomainShare,
    domainConcentrationRisk: maxDomainShare > .65, semanticReview: manual ? manual[1] : 'conservative lexical heuristic; content/grammar fragment/review queue' } };
}

function measureProduction(rows, candidates, t) {
  const rules = candidates.map(c => makeRule(c.key));
  const matcher = compilePhrases(rules), index = new Map(rules.map((r, i) => [r.id, i]));
  const counts = rules.map(() => newCounter(t));
  let i = 0;
  for (const row of rows) {
    const ctx = buildContext({ text: row.text });
    // Match presence is the production lexical match, before score-level
    // overlap/quote exclusions. Source-group DF is reported as a risk check.
    for (const [rule, hit] of matcher(ctx)) addHit(counts[index.get(rule.id)], row);
    if (++i % 10000 === 0) log(`production match ${i}/${rows.length}`);
  }
  return counts.map(c => summarize(c, t));
}

export function attachBookRates(candidates) {
  const file = resolve(ROOT, 'data/eval/raw/ngram/baseline.jsonl');
  if (!existsSync(file)) return { available: false, annotated: 0, risky: 0 };
  const rows = readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const map = new Map(rows.filter(r => r.coverage === 'exact' && Number.isFinite(r.ratePerMillionTokens)).map(r => [norm(r.phrase), r]));
  let annotated = 0, risky = 0;
  for (const c of candidates) {
    const r = map.get(c.key ? c.key.split(SEP)[1] : c.ngram);
    if (!r) { c.bookRate = null; c.bookRisk = null; c.bookCoverage = 'unavailable'; continue; }
    c.bookRate = r.ratePerMillionTokens;
    c.bookCoverage = 'exact';
    c.bookRisk = c.bookRate > 5;
    annotated++; if (c.bookRisk) risky++;
  }
  return { available: true, sha256: sha(readFileSync(file)), annotated, risky, rows: rows.length };
}

export function report(run, candidates) {
  const pct = x => (100 * x).toFixed(3) + '%';
  const top = candidates.slice(0, 50);
  const lines = ['# Newly mined lexical candidates', '',
    'Target: obvious, nameable smells in zero-effort raw model output. General AI authorship, careful AI-assisted writing, and clean output with no smells are outside this target. RAID chat generations remain the positive proxy. Offline train-only discovery; dev is validation only. No RAID test documents, predictions, features, or original held-out external evaluation rows were opened. Authorized LinkedIn veto/modern-AI checks, when present below, are separate from discovery. Dataset passages are not reproduced.', '',
    `Run: ${run.started}. Elapsed: ${run.elapsedSeconds.toFixed(1)} seconds. One Node process, no workers, browsers, or network.`, '',
    '## Filter counts', '', '| Stage | Candidates |', '| --- | ---: |',
    ...Object.entries(run.stages).map(([k, v]) => `| ${k} | ${v} |`), '',
    'Each DF is document presence, not occurrence count. Anchors and punctuation variants are separate candidates before deduplication.', '',
    '## Method and gates', '',
    `Training: ${run.totals.train.ai} AI / ${run.totals.train.human} human documents. Dev: ${run.totals.dev.ai} AI / ${run.totals.dev.human} human.`, '',
    `Models: ${MODELS.join(', ')}. Base models are excluded, including from denominators. Domains: ${Object.keys(run.totals.train.domains).join(', ')}.`, '',
    'The script imports normalizeText, straighten, buildContext and compilePhrases from the current production sources using Node type stripping. Word tokens use the exact engine WORDS expression. Literal windows retain intervening punctuation and collapse whitespace exactly as the current compiler does; punctuation is never removed to invent a match. Trailing comma/semicolon/colon/period/question/exclamation runs (up to three characters) are measured separately. Strings over 160 characters and non-prose symbol gaps are omitted. Each of n=1..5 is counted exactly; prefix pruning uses only AI DF>=30, so it cannot discard a qualifying longer window. Anchored windows cover first/last nonempty line, first/last engine sentence, and sentence beginnings. Sentence segmentation follows the engine, including its abbreviation and punctuation limitations.', '',
    'Smoothing: pAI=(aiDf+0.5)/(nAi+1), pHuman=(humanDf+0.5)/(nHuman+1). Ratio=pAI/pHuman. LCB=exp(log(ratio)-1.959963984540054*sqrt(1/(aiDf+0.5)-1/(nAi+1)+1/(humanDf+0.5)-1/(nHuman+1))). This is the lower endpoint of a two-sided approximate 95% log risk-ratio interval, not a multiple-testing-adjusted confidence guarantee.', '',
    'Train gates: AI DF>=30, LCB>=4, smoothed ratio>1 with at least one AI hit in >=5 domains and >=3 of the six named chat models. Domain ratios use that domain\'s denominators; each model ratio uses that model\'s AI denominator and the pooled human denominator. Requiring an AI hit prevents smoothing alone from inventing supporting strata. Dev repeats all four thresholds, including DF>=30 despite its smaller size.', '',
    'Novelty removes both directions of Unicode-boundary literal containment against every phrase in entries.json, including rejected/dropped vocabulary retained there. Existing regular expressions are also tested on each candidate string. This deliberately strict policy removes new collocations containing even weak pre-existing single-word entries. It cannot prove semantic non-overlap with every context-dependent regex or custom detector.', '',
    'Production compilePhrases remeasures all provisionally novel candidates on train before any dev read. Production train gates are reapplied, and novelty is rechecked. Containment deduplication is frozen on train: prefer the more specific form when its support is at least half and its LCB at least 80% of the strongest overlapping form; otherwise retain the stronger evidence form. Duplicate punctuation and identical strings across anchors collapse. Distinct anchored windows may remain for different strings. No candidate is created, selected, deduplicated, categorized, or ranked using dev performance.', '',
    'The JSONL includes every final train-qualified candidate, with stats.dev.passesGates marking validation. stats.perDomain and stats.perModel each contain train/dev objects. Rates are fractions; bookRate is per million tokens. miningPosition records the narrow window. Anchors are encoded as patterns rather than invalid production position values; existing opening/closing mean two lines. Anchored patterns use bounded positional lookarounds and require optimization before large-pack deployment.', '',
    '## Nameability and ranking', '',
    NAMEABILITY.rule, '',
    'Every candidate has nameable:true|false and nameableReason. nameability.json records the explicit review decisions; unlisted terms are false. This scope/ranking annotation uses candidate strings and the owner\'s target definition, without changing discovery, numerical gates, phrases, categories or weights. Function-word/grammar and topic candidates remain in the JSONL; they are not silently discarded.', '',
    '## Top 50 by nameability and train evidence', '',
    'Rank: nameable smells first; among them assistant residue precedes scaffolds/closers/predictions/transitions, then other cliches/inflated vocabulary components. Within a tier, style cues precede other content, then unflagged precedes topic-flagged, then log2(train LCB)*log2(1+AI DF), with a deterministic string tie-break. This is a review rank, not a fitted weight. semantic-review.json labels were based only on frozen train strings/counts before inspecting individual dev results. The later owner-directed nameability annotation is likewise a surface-wording judgment, not a dev-performance label. Domain-concentrated style phrases remain flagged.', '',
    '| # | Candidate | Window | Nameable | Topic/review flag | Train AI/H DF | Train ratio / LCB | Dev AI/H rate | Dev ratio / LCB | Dev gates |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...top.map((c, i) => { const a = c.stats.train, d = c.stats.dev; return `| ${i + 1} | ${c.ngram.replaceAll('|', '\\|')} | ${c.miningPosition} | ${c.nameable ? 'yes' : 'no'} | ${c.topicFlag ? 'yes' : 'no'} | ${a.aiDf}/${a.humanDf} | ${a.ratio.toFixed(2)} / ${a.lcb.toFixed(2)} | ${pct(d.aiRate)} / ${pct(d.humanRate)} | ${d.ratio.toFixed(2)} / ${d.lcb.toFixed(2)} | ${d.passesGates ? 'pass' : 'fail'} |`; }), '',
    '## Risks and interpretation', '',
    '- Missing optional book measurements have bookRate:null, bookRisk:null and bookCoverage:unavailable when a baseline is present. Missing rates are never treated as zero. Exact book measurements, if available, flag bookRisk only above 5 per million tokens.',
    '- RAID generations share source/title groups inside a split. Document-level confidence intervals treat them as independent and can be overconfident; aiSourceDf/humanSourceDf are provided. Source-grouped splitting prevents train/dev source overlap, but does not remove within-split correlation.',
    '- Many n-grams were searched. LCBs are exploratory, with no familywise/FDR correction. A dev pass is replication of a mined association, not calibrated real-world authorship accuracy. Repeated future fits on this dev set will consume its independence.',
    '- TopicFlag is conservative: content/grammar fragments, unreviewed vocabulary, >65% single-domain AI-hit concentration, and <20 distinct AI source groups are flagged. Style-cue review labels identify discourse, evaluative/promotional diction and assistant scaffolding, including incomplete constructions explicitly called out in review.semanticReview. An unflagged style collocation can still reflect topic, genre, sentiment, prompt framing, or model-specific artifacts. Five positive domains can include sparse evidence; inspect per-domain counts, not just their signs.',
    '- Named model support is not vendor independence: gpt4 and chatgpt are related; decoding and repetition settings are pooled. Llama/Mistral/MPT contribute twice as many samples as each of GPT4/ChatGPT/Cohere. Pooled ratios therefore reflect this experiment\'s mixture.',
    '- Dev has only 151 human reviews and unequal human domain proportions. Rare human hits create broad intervals. A large ratio does not establish that a phrase is unsafe for human authors, including formal or non-native authors. Do not assign verdict-producing weights to these candidates without the next fit and independent safeguards.',
    '- Current literal matching collapses whitespace (including newlines); regex anchors use engine gi matching and English positional boundaries. Exact production train/dev remeasurement is authoritative when mining-window approximations differ. Protected quotations/code are counted as lexical occurrences here; a score may suppress them or resolve overlaps differently. The script does not estimate incremental recall or false-positive rate for an integrated detector.',
    '- Containment deduplication can trade broad coverage for a more specific cue. Related morphological, punctuation, or syntactic variants without exact containment can remain correlated and should compete during fitting.',
    `- Optional book prior: ${run.books.available ? `${run.books.rows} baseline rows available; ${run.books.annotated} exact annotations, ${run.books.risky} above 5/million.` : 'baseline.jsonl absent at annotation time; no book rates imputed.'} Book frequency is a risk annotation only; it never selects candidates. New phrases may be outside the other agent\'s dictionary-only book query list.`, '',
    '## Reproduction', '',
    'From the repository root, with the original split caches and entries.json present, using Node >=22.13 with node:module.stripTypeScriptTypes:', '',
    '```sh',
    'UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/check.mjs',
    'UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning --max-old-space-size=2048 eval/hillclimb/mine/mine.mjs',
    'UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/linkedin-check.mjs',
    'UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/check.mjs --outputs',
    '```', '',
    'No install/download step. Run one heavy process at a time. These commands write only miner-owned files. The train freeze file is written before the first dev open. The check program rejects a test split request, checks synthetic normalization/matcher parity, and audits final schema, gates, uniqueness, containment, and split provenance.', '',
    'Per-n exact discovery counts:', '',
    '```json', JSON.stringify(run.perN, null, 2), '```', '',
    'Input digests (train/dev only; no test file digest computed):', '',
    '```json', JSON.stringify(run.inputs, null, 2), '```', '',
    'Files: eval/hillclimb/mine/{mine.mjs,check.mjs,linkedin-check.mjs,README.md,semantic-review.json,nameability.json}; eval/hillclimb/MINED.md; data/eval/raw/hillclimb/{mined-candidates.jsonl,mine-work/{train-freeze.json,run.json}}. Cache outputs are gitignored. Existing files outside this list are never written.', '',
  ];
  return lines.join('\n');
}

export async function main() {
  mkdirSync(WORK, { recursive: true });
  const started = new Date().toISOString(), begin = performance.now();
  const entriesFile = resolve(CACHE, 'entries.json'), entriesBytes = readFileSync(entriesFile);
  const entries = JSON.parse(entriesBytes), covered = coverageChecker(entries);
  const train = loadRows('train'), trainTotals = totals(train);
  const inputs = { train: sha(readFileSync(resolve(CACHE, 'train.jsonl'))), entries: sha(entriesBytes), context: sha(contextBytes), compile: sha(compileBytes), semanticReview: sha(semanticBytes), nameability: nameabilitySha256 };
  let previous = null, trainCandidates = [];
  const perN = [], stages = { 'Observed windows across n=1..5': 0, 'AI DF >=30': 0, 'Train LCB >=4': 0, 'Train >=5 positive domains': 0, 'Train >=3 positive models': 0, 'Novel versus dictionary': 0 };
  for (let n = 1; n <= 5; n++) {
    const discovery = new Map(), coreCounts = new Map();
    for (const row of train) if (row.label === 'ai') {
      const f = features(row.text, n, previous);
      for (const key of f.found) discovery.set(key, (discovery.get(key) || 0) + 1);
      for (const core of f.cores) coreCounts.set(core, (coreCounts.get(core) || 0) + 1);
    }
    previous = new Set([...coreCounts].filter(([, df]) => df >= 30).map(([s]) => s));
    const frequent = new Map([...discovery].filter(([, df]) => df >= 30).map(([s]) => [s, newCounter(trainTotals)]));
    const counts = { n, observedAfterPrefixPruning: discovery.size, frequentCores: previous.size, aiDf30: frequent.size, lcb4: 0, domains5: 0, models3: 0, novel: 0 };
    log(`n=${n} discovery=${discovery.size} aiDf30=${frequent.size} cores=${previous.size}`);
    discovery.clear(); coreCounts.clear();
    // Exact human DF is measured only for AI-frequent forms; no human-derived
    // phrase discovery, and no dev access at this stage.
    for (const row of train) {
      for (const key of features(row.text, n).found) {
        const c = frequent.get(key); if (c) addHit(c, row);
      }
    }
    for (const [key, count] of frequent) {
      const s = summarize(count, trainTotals);
      if (s.lcb < 4) continue; counts.lcb4++;
      if (s.positiveDomains < 5) continue; counts.domains5++;
      if (s.positiveModels < 3) continue; counts.models3++;
      if (covered(key)) continue;
      // Positional regexes are English; literal-only Unicode candidates remain
      // supported by the production Unicode boundary path.
      if (!key.startsWith('any' + SEP) && /[^\x00-\x7F]/.test(key.split(SEP)[1])) continue;
      counts.novel++; trainCandidates.push({ key, train: s });
    }
    perN.push(counts);
    for (const [stage, value] of Object.entries({ 'Observed windows across n=1..5': counts.observedAfterPrefixPruning, 'AI DF >=30': counts.aiDf30, 'Train LCB >=4': counts.lcb4, 'Train >=5 positive domains': counts.domains5, 'Train >=3 positive models': counts.models3, 'Novel versus dictionary': counts.novel })) stages[stage] += value;
    log(`n=${n} ${JSON.stringify(counts)}`);
  }
  log(`Remeasuring ${trainCandidates.length} novel candidates with production compiler`);
  const productionTrain = measureProduction(train, trainCandidates, trainTotals);
  trainCandidates = trainCandidates.map((c, i) => ({ ...c, discoveryTrain: c.train, train: productionTrain[i] })).filter(c => c.train.passesGates && !covered(c.key));
  stages['Production train gates'] = trainCandidates.length;
  const { kept, removed } = deduplicate(trainCandidates);
  for (const c of kept) Object.assign(c, classify(c), nameability(c.key.split(SEP)[1]));
  rankTrainCandidates(kept);
  const books = attachBookRates(kept);
  stages['After containment deduplication'] = kept.length;
  stages['Style/discourse (heuristic; no topic flag)'] = kept.filter(c => !c.topicFlag).length;
  stages['Topic/content or semantic-review flag'] = kept.filter(c => c.topicFlag).length;
  stages['Style-cue forms including concentration flags'] = kept.filter(c => c.review.styleCue).length;
  stages['Nameable smells'] = kept.filter(c => c.nameable).length;
  stages['Not nameable; retained and demoted'] = kept.filter(c => !c.nameable).length;
  const freeze = { started, inputs, stages, perN, dedupRemoved: removed, candidates: kept };
  save(resolve(WORK, 'train-freeze.json'), freeze);
  log(`FROZEN ${kept.length} train candidates; opening dev for validation now`);
  const dev = loadRows('dev'), devTotals = totals(dev);
  inputs.dev = sha(readFileSync(resolve(CACHE, 'dev.jsonl')));
  if (new Set(train.map(r => r.source_id)).intersection(new Set(dev.map(r => r.source_id))).size) throw Error('Train/dev source overlap');
  const devStats = measureProduction(dev, kept, devTotals);
  const candidates = kept.map((c, i) => {
    const { category, weight, label, repeat, ...rule } = makeRule(c.key);
    const separate = s => { const { perDomain, perModel, ...overall } = s; return overall; };
    const d = devStats[i];
    return { ...rule, ngram: c.key.split(SEP)[1], miningPosition: c.key.split(SEP)[0], suggestedCategory: c.suggestedCategory,
      stats: { train: separate(c.train), dev: separate(d), perDomain: { train: c.train.perDomain, dev: d.perDomain }, perModel: { train: c.train.perModel, dev: d.perModel } },
      topicFlag: c.topicFlag, nameable: c.nameable, nameableReason: c.nameableReason, review: c.review, trainEvidence: evidence(c),
      ...(c.bookRate !== undefined ? { bookRate: c.bookRate, bookRisk: c.bookRisk, bookCoverage: c.bookCoverage } : {}) };
  });
  stages['Dev all gates (including AI DF >=30)'] = candidates.filter(c => c.stats.dev.passesGates).length;
  stages['Dev gates, unflagged style/discourse'] = candidates.filter(c => c.stats.dev.passesGates && !c.topicFlag).length;
  stages['Dev LCB >=4 only'] = candidates.filter(c => c.stats.dev.lcb >= 4).length;
  const run = { started, elapsedSeconds: (performance.now() - begin) / 1000, inputs, totals: { train: trainTotals, dev: devTotals }, stages, perN, books,
    accessedDatasetSplits: ['train', 'dev'], candidateIdsSha256: sha(candidates.map(c => c.id).join('\n')), trainFreezeSha256: sha(readFileSync(resolve(WORK, 'train-freeze.json'))) };
  writeFileSync(resolve(CACHE, 'mined-candidates.jsonl'), candidates.map(c => JSON.stringify(c)).join('\n') + (candidates.length ? '\n' : ''));
  save(resolve(WORK, 'run.json'), run);
  writeFileSync(resolve(ROOT, 'eval/hillclimb/MINED.md'), report(run, candidates));
  log(JSON.stringify(stages));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await main();
