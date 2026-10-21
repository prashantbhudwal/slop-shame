#!/usr/bin/env node
import { readFile, writeFile, mkdir, access, appendFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { csv, digest, normalize, yamlTokens, expandFinite, boundRegex, timeRegex, firstPartyInventory, validatePacks, weightForRatio } from './lib.mjs';
import { zeroCategories, valeCategories, dropReason } from './policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = resolve(root, 'data/dictionaries');
const output = resolve(root, 'src/lib/engine/packs/vendor');
const lock = JSON.parse(await readFile(new URL('./sources.lock.json', import.meta.url), 'utf8'));
const refresh = process.argv.includes('--fetch');
const read = (source, path) => readFileSync(resolve(data, source, path), 'utf8');
const json = (source, path) => JSON.parse(read(source, path));
async function put(path, value) {
  try { if (await readFile(path, 'utf8') === value) return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, value);
}
async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
function checkLicense(source, license) {
  // Pin hashes are the authoritative gate. Content checks also prevent a lock
  // typo from accidentally labelling a restricted license as a permissive one.
  if (!['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC0-1.0', 'CC-BY-4.0'].includes(source.spdx)) throw new Error(`Rejected SPDX ${source.spdx}`);
  if (/CC BY-SA|CC-BY-SA|GNU (?:AFFERO|GENERAL)|AGPL|GPL-[23]|noncommercial|non-commercial/i.test(license)) throw new Error(`Restricted license: ${source.id}`);
  if (source.spdx === 'MIT' && !/Permission is hereby granted, free of charge/.test(license)) throw new Error(`Not MIT: ${source.id}`);
  if (source.spdx === 'Apache-2.0' && !/Apache License[\s\S]+Version 2\.0[\s\S]+Grant of Copyright License/.test(license)) throw new Error(`Not Apache-2.0: ${source.id}`);
  if (source.spdx === 'BSD-3-Clause' && !/Neither the name[\s\S]+endorse or promote/.test(license)) throw new Error(`Not BSD-3-Clause: ${source.id}`);
}

// License first; a source with missing or changed licensing cannot be imported.
for (const source of lock.sources) {
  if (!/^[a-f0-9]{40}$/.test(source.pin)) throw new Error(`Unpinned source ${source.id}`);
  for (const file of source.files) {
    const path = resolve(data, source.id, file.path); const url = `https://raw.githubusercontent.com/${source.repo}/${source.pin}/${file.upstreamPath ?? file.path}`;
    let bytes;
    try { bytes = await readFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (refresh || !bytes) bytes = await fetchBytes(url);
    if (digest(bytes) !== file.sha256) throw new Error(`SHA-256 mismatch: ${source.id}/${file.path}`);
    if (file.path === 'LICENSE') checkLicense(source, bytes.toString());
    await put(path, bytes.toString());
  }
  if (refresh && source.spdx === 'Apache-2.0' && !source.files.some((file) => file.path === 'NOTICE')) {
    const response = await fetch(`https://raw.githubusercontent.com/${source.repo}/${source.pin}/NOTICE`, { signal: AbortSignal.timeout(60000) });
    if (response.status !== 404) throw new Error(`NOTICE status changed (${response.status}); inspect and pin before importing`);
  }
}

const kobak = lock.sources.find((s) => s.id === 'kobak');
const derivedPath = resolve(data, 'kobak/style-counts.json');
try { await access(derivedPath); } catch {
  const bytes = await fetchBytes(`https://raw.githubusercontent.com/${kobak.repo}/${kobak.pin}/${kobak.derivedFrom.path}`);
  if (digest(bytes) !== kobak.derivedFrom.sha256) throw new Error('Kobak matrix SHA-256 mismatch');
  const wanted = new Set(csv(read('kobak', 'results/excess_words.csv')).slice(1).filter((row) => row[2] === 'style').map((row) => row[1]));
  const rows = csv(gunzipSync(bytes).toString()); const totals = rows.at(-1).slice(1).map(Number);
  const selected = rows.slice(1, -1).filter((row) => wanted.has(row[0])).map((row) => ({ word: row[0], counts: row.slice(1).map(Number) }));
  await put(derivedPath, JSON.stringify({ method: 'p_y=(count_y+1)/(total_y+1); q2024=p2022+2*max(0,p2022-p2021); r=p2024/q2024', years: rows[0].slice(1).map(Number), totals, rows: selected }, null, 2) + '\n');
}
if (digest(await readFile(derivedPath)) !== kobak.derivedFile.sha256) throw new Error('Derived style-counts.json checksum mismatch');
const counts = json('kobak', 'style-counts.json');
const evidence = new Map(counts.rows.map((row) => {
  const frequencies = row.counts.map((n, i) => (n + 1) / (counts.totals[i] + 1));
  const baseline = frequencies[12] + 2 * Math.max(0, frequencies[12] - frequencies[11]);
  return [row.word, { ratio: frequencies[14] / baseline, baseline, observed: frequencies[14], source: 'kobak:2024/projected-2021-2022' }];
}));

const humanSamples = [{ id: 'redis-6.0.0-readme (pre-LLM, BSD-3-Clause)', text: read('human-control-redis', 'README.md') }];
// These controls are project-authored synthetic professional examples. Keep
// that qualification: they are useful regressions, not held-out human accuracy.
const localControls = JSON.parse(await readFile(new URL('./human-controls.json', import.meta.url), 'utf8'));
humanSamples.push(...localControls);
for (const sample of humanSamples) sample.normalized = normalize(sample.text);

const candidates = [], drops = [], sourceEntries = new Map();
function add(raw) {
  const key = `${raw.source}:${raw.ref}`;
  sourceEntries.set(key, raw);
  const explicitLeak = raw.kind === 'phrase' ? isExplicitLeak(raw.value) : ['as-an-ai', 'chatgpt-artifact', 'regenerate-response-artifact'].includes(raw.name);
  const measured = raw.kind === 'phrase' ? evidence.get(normalize(raw.value)) : undefined;
  const ratio = measured?.ratio ?? raw.ratio;
  const weight = explicitLeak ? 10 : ratio ? weightForRatio(ratio) : raw.upstreamWeight !== undefined ? (raw.upstreamWeight <= (raw.source === 'slop-radar' ? 2 : 3) ? 2 : raw.upstreamWeight <= (raw.source === 'slop-radar' ? 4 : 6) ? 5 : 10) : 2;
  const category = explicitLeak ? 'chatbot-leak' : raw.category === 'chatbot-leak' ? 'template-phrases' : raw.category;
  const base = { ...raw, key, weight, category, evidence: measured ?? (raw.ratio ? { ratio: raw.ratio, source: 'paech:sampler-inverse-proxy (not measured lift)' } : { source: raw.upstreamWeight !== undefined ? `upstream-weight:${raw.upstreamWeight}` : 'unweighted-default' }) };
  if (raw.drop) { drops.push({ ...base, reason: raw.drop }); return; }
  if (raw.kind === 'pattern') {
    const finite = expandFinite(raw.value);
    if (finite) {
      for (const value of finite) addExpanded({ ...base, kind: 'phrase', value });
      return;
    }
    try {
      const value = boundRegex(raw.value, raw.multiline);
      addExpanded({ ...base, original: raw.value, value });
    } catch (error) { drops.push({ ...base, reason: `regex-rejected:${error.message}` }); }
  } else addExpanded({ ...base, value: normalize(raw.value) });
}
function isExplicitLeak(value) {
  return /^(?:as an (?:ai|artificial intelligence|large language)|as a language model|my (?:training data|knowledge cutoff)|regenerate response)|oai_citation|oaicite|contentreference|utm_source=|would you like me to (?:write|generate|rewrite)|here(?:'s| is) (?:a|an|your) (?:linkedin post|revised version)/i.test(value);
}
function addExpanded(entry) {
  if (entry.kind === 'phrase') {
    const leak = isExplicitLeak(entry.value);
    entry.category = leak ? 'chatbot-leak' : entry.category === 'chatbot-leak' ? 'template-phrases' : entry.category;
    entry.weight = leak ? 10 : entry.ratio ? weightForRatio(entry.ratio) : entry.upstreamWeight !== undefined ? (entry.upstreamWeight <= (entry.source === 'slop-radar' ? 2 : 3) ? 2 : entry.upstreamWeight <= (entry.source === 'slop-radar' ? 4 : 6) ? 5 : 10) : 2;
  }
  // Recompute measured weights after finite expansion (e.g. delves) as well.
  const measured = entry.kind === 'phrase' && evidence.get(normalize(entry.value));
  if (measured) { entry.weight = weightForRatio(measured.ratio); entry.evidence = measured; }
  let reason = dropReason(entry, evidence, humanSamples);
  if (!reason && entry.kind === 'pattern') {
    const ms = timeRegex(entry.value); if (ms >= 1) reason = 'regex-time:full global scan over a 10KB adversarial input exceeds 1ms';
  }
  if (reason) drops.push({ ...entry, reason }); else candidates.push(entry);
}

const z = json('zeroslop', 'data/patterns.json');
for (const [i, rule] of z.patterns.entries()) add({ source: 'zeroslop', ref: `data/patterns.json:patterns[${i}]`, name: rule.name, upstreamCategory: rule.cat, category: zeroCategories[rule.cat] ?? (() => { throw new Error(`Unmapped Zero category ${rule.cat}`); })(), kind: 'pattern', value: rule.rx, upstreamWeight: rule.w });
for (const [group, terms] of [['lexicon', z.lexicon], ['riders', z.riders]]) for (const [value, upstreamWeight] of Object.entries(terms)) add({ source: 'zeroslop', ref: `data/patterns.json:${group}.${value}`, category: 'ai-vocabulary', kind: 'phrase', value, upstreamWeight, drop: group === 'riders' ? 'conditional-rider: upstream requires contextual trigger; a standalone phrase would lose that guard' : undefined });
for (const [i, value] of z.rider_triggers.entries()) add({ source: 'zeroslop', ref: `data/patterns.json:rider_triggers[${i}]`, category: 'ai-vocabulary', kind: 'phrase', value, drop: 'rider-trigger: conditional metadata, not independently positive evidence' });

for (const [i, [value, factor]] of json('paech-sampler', 'slop_phrase_prob_adjustments.json').entries()) {
  if (!(factor > 0 && factor < 1)) throw new Error(`Invalid Paech multiplier: ${factor}`);
  add({ source: 'paech-sampler', ref: `slop_phrase_prob_adjustments.json:[${i}]`, category: 'ai-vocabulary', kind: 'phrase', value, ratio: 1 / factor });
}
for (const [i, line] of read('paech-essays', 'results_by_domain/essays/slop_lists/slop_list_phrases.jsonl').trim().split('\n').entries()) {
  const [value, count] = JSON.parse(line);
  add({ source: 'paech-essays', ref: `slop_list_phrases.jsonl:${i + 1}`, category: 'template-phrases', kind: 'phrase', value, count });
}
for (const [i, [value, frequency]] of json('paech-essays', 'results_by_domain/essays/slop_lists/slop_list_by_freq.json').entries()) add({ source: 'paech-essays', ref: `slop_list_by_freq.json:[${i}]`, category: 'ai-vocabulary', kind: 'phrase', value, frequency });

for (const file of lock.sources.find((s) => s.id === 'vale-ai-tells').files.filter((f) => f.path.endsWith('.yml'))) {
  const name = file.path.split('/').at(-1).replace('.yml', '');
  for (const token of yamlTokens(read('vale-ai-tells', file.path))) add({ source: 'vale-ai-tells', ref: `${file.path}:${token.line}`, category: valeCategories[name], kind: /[\\[\]{}()|?+*^$]/.test(token.value) || token.posTagged ? 'pattern' : 'phrase', value: token.value, posTagged: token.posTagged, position: name === 'OpeningCliches' ? 'opening' : name === 'ClosingPleasantries' ? 'closing' : undefined });
}

const radarCategories = { 'em-dash-abuse': 'formatting', 'let-me-starter': 'template-phrases', 'heres-the-thing': 'template-phrases', 'binary-contrast': 'negation-pivot', 'negation-pivot': 'negation-pivot', 'binary-contrast-de': 'negation-pivot', 'wh-starters': 'engagement-bait', 'bullet-overload': 'formatting', 'triple-adjective': 'robotic-rhythm', 'meta-reference': 'template-phrases', 'passive-voice-density': 'robotic-rhythm', 'worth-noting': 'hedging', 'colon-list-intro': 'formatting', 'emoji-header': 'formatting', 'number-list-pattern': 'formatting', 'tldr-pattern': 'template-phrases' };
for (const [i, value] of json('slop-radar', 'src/database/phrases-en.json').entries()) {
  const category = /^(?:in today|in the ever|imagine|have you ever)/i.test(value) ? 'engagement-bait' : /(?:important to|worth not|argue|should be noted)/i.test(value) ? 'hedging' : /(?:power|potential|game.chang|unprecedented)/i.test(value) ? 'inflation' : value.includes(' ') ? 'template-phrases' : 'ai-vocabulary';
  add({ source: 'slop-radar', ref: `src/database/phrases-en.json:[${i}]`, category, kind: 'phrase', value });
}
for (const rule of json('slop-radar', 'src/database/patterns.json')) {
  let drop;
  if (rule.name.endsWith('-de')) drop = 'non-english: German is outside this English pack';
  if (['em-dash-abuse', 'passive-voice-density', 'colon-list-intro', 'bullet-overload'].includes(rule.name)) drop = 'format-or-grammar-alone: human punctuation, lists or passive voice need contextual/density guards';
  // The engine supports gi, not u. Use explicit UTF-16 pairs for the narrow
  // emoji header skeleton; do not silently leave a nonfunctional \p escape.
  let value = rule.pattern;
  if (rule.name === 'emoji-header') value = '^\\s*(?:#{1,6}\\s+(?:[\\u2600-\\u27BF]|\\uD83C[\\uDF00-\\uDFFF]|\\uD83D[\\uDC00-\\uDFFF]|\\uD83E[\\uDD00-\\uDFFF])|(?:[\\u2600-\\u27BF]|\\uD83C[\\uDF00-\\uDFFF]|\\uD83D[\\uDC00-\\uDFFF]|\\uD83E[\\uDD00-\\uDFFF])\\uFE0F?\\s+\\*\\*)';
  if (rule.name === 'negation-pivot') value = value.replace('(?:just |only |merely |simply |about )*', '(?:just |only |merely |simply |about )?');
  add({ source: 'slop-radar', ref: `src/database/patterns.json:${rule.name}`, name: rule.name, category: radarCategories[rule.name] ?? (() => { throw new Error(`Unmapped Radar pattern ${rule.name}`); })(), kind: 'pattern', value, upstreamWeight: rule.weight, multiline: rule.flags?.includes('m'), drop });
}

for (const [i, row] of csv(read('kobak', 'results/excess_words.csv')).slice(1).entries()) add({ source: 'kobak', ref: `results/excess_words.csv:${i + 2}`, category: 'ai-vocabulary', kind: 'phrase', value: row[1], drop: row[2] !== 'style' ? `non-style:type=${row[2]}` : ['preposition', 'pronoun', 'conjunction', 'determiner'].includes(row[3]) ? `function-word:part_of_speech=${row[3]}` : undefined });

const firstParty = firstPartyInventory(resolve(root, 'src/lib/engine/packs'));
const groups = new Map();
for (const entry of candidates) {
  const key = `${entry.kind}:${entry.kind === 'phrase' ? normalize(entry.value) : entry.value}`;
  if (!groups.has(key)) groups.set(key, []); groups.get(key).push(entry);
}
const priority = ['kobak', 'paech-sampler', 'zeroslop', 'paech-essays', 'vale-ai-tells', 'slop-radar'];
const kept = [], overlaps = [], merges = [];
for (const [key, entries] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  entries.sort((a, b) => priority.indexOf(a.source) - priority.indexOf(b.source) || a.ref.localeCompare(b.ref, 'en'));
  const chosen = entries[0]; const weight = Math.max(...entries.map((e) => e.weight));
  const exact = chosen.kind === 'phrase' ? firstParty.phrases.get(normalize(chosen.value)) : firstParty.patterns.get(chosen.value);
  if (exact) {
    overlaps.push({ value: chosen.value, kind: chosen.kind, proposedWeight: weight, firstParty: exact, sources: entries.map((e) => `${e.source}:${e.ref}`) });
    for (const entry of entries) drops.push({ ...entry, reason: 'first-party-overlap: already present; calibration must decide any weight replacement' });
    continue;
  }
  const packId = `vendor-${chosen.source}`;
  const ruleId = `${packId}.${chosen.kind}-${digest(key).slice(0, 12)}`;
  kept.push({ ...chosen, weight, ruleId, origins: entries.map((e) => ({ source: e.source, ref: e.ref, weight: e.weight, evidence: e.evidence })), position: entries.every((e) => e.position === chosen.position) ? chosen.position : undefined });
  for (const entry of entries.slice(1)) merges.push({ source: entry.source, key: entry.key, value: entry.value, owner: ruleId });
}

const packs = [];
for (const source of lock.sources.filter((s) => !s.role)) {
  const selected = kept.filter((e) => e.source === source.id);
  const pack = { id: `vendor-${source.id}`, name: `Vendor: ${source.id}`, description: 'Filtered local AI-style dictionary; reviewed data, not an authorship probability.', attribution: `${source.repo} @ ${source.pin} (${source.spdx}); see data/dictionaries/${source.id}/SOURCE.md and THIRD_PARTY_NOTICES.md.`, rules: selected.map((e) => ({ kind: 'phrase', id: e.ruleId, category: e.category, label: e.category === 'chatbot-leak' ? 'Assistant boilerplate escaped into the post' : e.kind === 'phrase' ? `Dictionary tell: ${e.value}` : `Dictionary construction: ${e.name ?? e.category}`, weight: e.weight, [e.kind === 'phrase' ? 'phrases' : 'patterns']: [e.value], repeat: 'once', ...(e.position ? { position: e.position } : {}) })) };
  packs.push(pack);
  const serialized = pack.rules.map((rule, i) => `    // Sources: ${selected[i].origins.map((o) => `${o.source}:${o.ref} [w=${o.weight}; ${o.evidence.source}${o.evidence.ratio ? `; r=${o.evidence.ratio.toFixed(6)}` : ''}]`).join('; ')}\n    ${JSON.stringify(rule)},`).join('\n');
  const content = `// GENERATED by node scripts/dictionaries/update.mjs. Do not hand edit.\n// Modified from upstream: filtered, normalized, deduplicated and reweighted.\n// Upstream ${source.repo} @ ${source.pin}; SPDX-License-Identifier: ${source.spdx}\n// License/copyright: data/dictionaries/${source.id}/LICENSE; THIRD_PARTY_NOTICES.md.\nimport type { RulePack } from '../../rule-types';\n\nexport const pack: RulePack = {\n  id: ${JSON.stringify(pack.id)},\n  name: ${JSON.stringify(pack.name)},\n  description: ${JSON.stringify(pack.description)},\n  attribution: ${JSON.stringify(pack.attribution)},\n  rules: [\n${serialized}\n  ],\n};\nexport default pack;\n`;
  await put(resolve(output, `${source.id}.ts`), content);
}
validatePacks(packs);

const stats = lock.sources.filter((s) => !s.role).map((source) => {
  const raw = [...sourceEntries.entries()].filter(([, v]) => v.source === source.id);
  const retainedKeys = new Set(candidates.filter((e) => e.source === source.id && !overlaps.some((o) => o.sources.includes(`${e.source}:${e.ref}`))).map((e) => e.key));
  return { source: source.id, upstreamEntries: raw.length, keptSourceEntries: retainedKeys.size, droppedSourceEntries: raw.length - retainedKeys.size, emittedPhrases: kept.filter((e) => e.source === source.id && e.kind === 'phrase').length, emittedPatterns: kept.filter((e) => e.source === source.id && e.kind === 'pattern').length, mergedMatchers: merges.filter((e) => e.source === source.id).length, filteredExpandedMatchers: drops.filter((e) => e.source === source.id).length };
});
const regexes = kept.filter((e) => e.kind === 'pattern');
const report = { version: 1, alpha: 1.3, stats, totalPhrases: kept.filter((e) => e.kind === 'phrase').length, totalPatterns: regexes.length, totalRules: kept.length, exactFirstPartyOverlaps: overlaps.length, crossSourceMerges: merges.length, firstPartyFiles: firstParty.files, humanControls: humanSamples.map((e) => ({ id: e.id, sha256: digest(e.text) })), rules: kept.map((e) => ({ id: e.ruleId, kind: e.kind, value: e.value, weight: e.weight, origins: e.origins })), overlaps, merges };
await put(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const md = (s) => String(s).replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
const table = stats.map((s) => { const source = lock.sources.find((x) => x.id === s.source); return `| ${s.source} | [${source.repo}](https://github.com/${source.repo}) | [${source.pin.slice(0, 12)}](https://github.com/${source.repo}/tree/${source.pin}) | ${source.spdx} | ${s.upstreamEntries} | ${s.keptSourceEntries} / ${s.droppedSourceEntries} | ${s.emittedPhrases} / ${s.emittedPatterns} |`; }).join('\n');
await put(resolve(output, 'DROPPED.md'), `# Filtered dictionary entries\n\nGenerated by \`node scripts/dictionaries/update.mjs\`. Every row identifies its upstream location; one regex may expand into many separately filtered literals. Counts here are expanded matchers, not raw upstream rows. Exact duplicates merged into a surviving vendor rule are recorded in report.json, not counted as false-positive drops.\n\nNo unlicensed or copyleft dictionary was copied. Rules are conservative: single words need measured r>=5 and projected pre-LLM abstract prevalence <=0.1%; sampler suppression is not measured lift. Ordinary professional words, human corpus hits, career announcements, fiction/topic strings, conditional riders and context-free rhythm/grammar rules are excluded. See README.md for rationale and limitations.\n\n| Source entry | Matcher | Reason |\n| --- | --- | --- |\n${drops.map((e) => `| ${md(`${e.source}:${e.ref}`)} | ${md(e.value)} | ${md(e.reason)} |`).join('\n')}\n`);
await put(resolve(output, 'OVERLAPS.md'), `# First-party overlaps\n\nGenerated from read-only TypeScript AST inspection. **${overlaps.length} exact matchers omitted** from vendors; existing rules and weights are untouched. Proposed weight is the maximum of the accepted vendor evidence. The calibration round must decide whether to replace the first-party weight. Source file hashes are in report.json. Custom Set vocabularies are included.\n\nExact matcher identity is deduplicated globally even when position/category differs. Substring/regex semantic equivalence is undecidable in general; see potential overlaps below.\n\n| Matcher | Proposed weight | Existing location | Vendor sources |\n| --- | --- | --- | --- |\n${overlaps.map((e) => `| ${md(e.value)} | ${e.proposedWeight} | ${e.firstParty.join(', ')} | ${md(e.sources.join('; '))} |`).join('\n')}\n\n## Potential partial overlaps\n\nVendor constructions can overlap the existing negation-pivot, formulaic-opener, assistant-artifact and vocabulary-cluster detectors. Literal containment is reported below, without deleting a more specific construction automatically. Broad regex coverage and CustomRule conditions need integration review.\n\n| Vendor phrase | Contained first-party literals |\n| --- | --- |\n${kept.filter((e) => e.kind === 'phrase').map((e) => ({ value: e.value, contained: [...firstParty.phrases.keys()].filter((p) => p.length >= 4 && (` ${e.value} `).includes(` ${p} `)) })).filter((e) => e.contained.length).map((e) => `| ${md(e.value)} | ${md(e.contained.join(', '))} |`).join('\n')}\n`);

for (const source of lock.sources) {
  const hashes = source.files.map((f) => `| [${f.path}](https://github.com/${source.repo}/blob/${source.pin}/${f.upstreamPath ?? f.path}) | ${f.sha256} |`).join('\n');
  await put(resolve(data, source.id, 'SOURCE.md'), `# ${source.id}\n\n- URL: https://github.com/${source.repo}\n- Commit: \`${source.pin}\`\n- Fetch date: ${source.fetchDate} (UTC)\n- SPDX: \`${source.spdx}\`\n- License evidence: pinned upstream [${source.files[0].upstreamPath ?? 'LICENSE'}](https://github.com/${source.repo}/blob/${source.pin}/${source.files[0].upstreamPath ?? 'LICENSE'}); full unmodified text in LICENSE.\n- NOTICE: ${source.notice ?? 'No additional NOTICE is required by BSD; copyright and conditions retained in LICENSE.'}\n- Use: ${source.role ?? 'Unmodified source inputs; generated TS is a filtered, normalized and reweighted derivative.'}\n\n| Pinned upstream file | SHA-256 |\n| --- | --- |\n${hashes}\n${source.id === 'kobak' ? `\n## Derived count subset\n\nstyle-counts.json retains counts for all 407 exactly-style words plus the yearly abstract totals. It is derived from [${source.derivedFrom.path}](https://github.com/${source.repo}/blob/${source.pin}/${source.derivedFrom.path}) (SHA-256 ${source.derivedFrom.sha256}); the full matrix is never persisted by the pipeline. Derived SHA-256: ${source.derivedFile.sha256}. Delete style-counts.json and rerun update.mjs to reproduce the subset in memory. The source CSV remains unmodified, including content words, for auditability; content words never become rules.\n\nThe fold ratio reproduces the smoothing/projection in scripts/03-figures.ipynb at the same commit: p_y=(count_y+1)/(total_y+1), q=p2022+2*max(0,p2022-p2021), r=p2024/q. The paper is Kobak et al., Science Advances 11, eadt3813 (2025), https://doi.org/10.1126/sciadv.adt3813.\n` : ''}`);
}

const readme = `# Vendor rule packs\n\nGenerated, data-only PhraseRules. **Not registered** in ../index.ts. The later calibration round must decide which packs and weight replacements to enable. No engine contract or first-party pack was changed.\n\nRun from the repository root (Node >=22.15; project devDependencies installed):\n\n\`\`\`sh\nnode scripts/dictionaries/update.mjs          # deterministic, checked-in pins; offline when data exists\nnode scripts/dictionaries/update.mjs --fetch  # re-fetch the SAME pins and verify every SHA-256\npnpm exec vitest run tests/unit/engine/vendor\nnode scripts/dictionaries/benchmark.mjs       # real createEngine integration and 2,000-post timings\n\`\`\`\n\nNo new npm dependencies. TypeScript, already a devDependency, is used only for read-only AST inspection of first-party packs. Runtime packs import only RulePack types. To advance upstream versions, deliberately edit scripts/dictionaries/sources.lock.json after inspecting each LICENSE and NOTICE at the new commit; hashes are never silently refreshed. Missing/raw modified files fail verification.\n\n## Sources and counts\n\n| Source | URL | Commit pin | SPDX | Raw entries | Kept / dropped raw entries | Emitted literals / regexes |\n| --- | --- | --- | --- | --- | --- | --- |\n${table}\n\nTotals: **${report.totalPhrases} literal phrases**, **${report.totalPatterns} regexes**, **${report.totalRules} rules**; ${report.crossSourceMerges} duplicate matcher occurrences merged; ${overlaps.length} exact first-party matchers omitted. Kept raw entries include those merged into another source's emitted pack; one upstream regex can produce several literals, so raw rows and emitted rules are different units. ZeroSlop counts include its 26 conditional riders and 25 trigger metadata entries, all excluded rather than misrepresented as standalone evidence.\n\nRedis 6.0.0 README (BSD-3-Clause, 2020), pinned separately under data/dictionaries/human-control-redis, is a pre-LLM human technical negative control, never a scoring pack. scripts/dictionaries/human-controls.json supplies additional **synthetic project-authored** controls for ESL/formal writing, career changes, technical language, idioms and ordinary correspondence. Hits in either corpus are removed, without claiming an independent accuracy estimate.\n\n## Category mapping\n\n| Upstream family | SlopCategory |\n| --- | --- |\n| ZeroSlop hedging | hedging |\n| ZeroSlop scaffolding, filler, misc, cliche, email | template-phrases (idioms/email are filtered) |\n| ZeroSlop artifact / explicit assistant residue | chatbot-leak |\n| ZeroSlop marketing, puffery, drama | inflation |\n| ZeroSlop linkedin, performed, stakes, overcorrection | engagement-bait (career/milestone rules filtered) |\n| ZeroSlop contrast | negation-pivot |\n| ZeroSlop triads | robotic-rhythm (excluded: lacks length/repetition guard) |\n| ZeroSlop verbs / lexicon / riders | ai-vocabulary (conditional riders excluded) |\n| Paech sampler; essay unigram list | ai-vocabulary |\n| Paech essay phrase list | template-phrases |\n| Vale vocabulary / compounds / verb forms | ai-vocabulary (POS-dependent verbs excluded) |\n| Vale openers / contrast / closers / hedges / affirmations | engagement-bait / negation-pivot / template-phrases / hedging / inflation |\n| Radar openers / worth-noting / hype / other phrases | engagement-bait / hedging / inflation / template-phrases; unigrams ai-vocabulary |\n| Radar contrasts / headers and lists / grammar and triads | negation-pivot / formatting / robotic-rhythm (unguarded grammar and triads excluded) |\n| Kobak exactly-style rows | ai-vocabulary |\n| Explicit model disclaimers / generation offers in any source | chatbot-leak |\n| No accepted source has a valid bypass rule | bypass-tricks: no generated rule |\n\n## Evidence and weights\n\n**w = clamp(round(1.3 * log2(r)), 1, 10)**. Alpha **1.3** maps 10x to 4 and 60x to 8. Kobak uses the pinned count matrix's exact published counterfactual projection, including add-one smoothing: p_y=(count_y+1)/(total_y+1); q2024=p2022+2*max(0,p2022-p2021); r=p2024/q2024. For example delves is ${evidence.get('delves').ratio.toFixed(4)}x here. These are changes in the prevalence of words across biomedical abstracts, **not** AI/human likelihoods or measurements on LinkedIn.\n\nPaech factors m are sampler probability penalties; r_proxy=1/m uses the same logarithmic formula **as an editorial proxy**, explicitly marked as such on every rule. A multiplier is never used as empirical evidence to admit an ordinary single word. A measured Kobak ratio takes precedence for the same exact word. Essay counts/frequencies are not ratios and earn the faint default 2. Vale severity is not a numeric lift and also defaults to 2. ZeroSlop weights 1..3 ->2, >3..6 ->5, >6 ->10; Radar weights 1..2 ->2, >2..4 ->5, >4 ->10. Explicit model disclaimers and unmistakable generation artifacts may be 10.\n\nresearch/frequency-evidence.md informed the logarithmic transform, but its approximate social/collocation ratios are not promoted into measurements without reproducible denominators. Some rows mix sampler multipliers, editorial weights and actual lifts; fresh Kobak derivation supersedes those summary numbers. Em-dash measurements conflict across the reports, so no standalone dash detector is imported.\n\n## False-positive policy and drops\n\n[DROPPED.md](DROPPED.md) records every excluded expanded candidate and upstream location. Single words require measured r>=5, projected baseline<=0.1% of abstracts, and no human-control hit. Normal professional/function words are explicitly excluded (including across, between, within, additionally, showcasing and ordinary evaluative verbs). Fiction names, sampler fiction phrases and essay topic labels are rejected; Paech multiword phrases require an explicit rhetorical construction in policy.mjs. Career announcements, email pleasantries, ordinary idioms/transitions and broad real-value claims are removed. These are conservative editorial filters, **not validated English usage estimates**.\n\nA top-5k list was considered but **not vendored**: first20hours/google-10000-english LICENSE.md restricts commercial usage via LDC, and wordfreq-derived lists contain CC BY-SA data. Rather than claim a licensed top-5k test, this pipeline rejects all unmeasured unigrams and uses a rare high-fold gate plus an explicit professional-word denylist and pre-LLM human prose. The calibration round may add a verified permissive general-English frequency source.\n\n## Matching, deduplication and speed\n\nFinite regex alternatives and inflections become normalized lowercase literal phrases whenever possible. Each surviving matcher gets a stable SHA-256-derived id prefixed by its vendor pack; every origin is recorded in its adjacent comment and report.json. Exact normalized duplicates across sources merge into one rule with the **maximum final weight**, even across category/position differences. Ownership prefers Kobak, Paech sampler, ZeroSlop, Paech essays, Vale, Radar; it does not increase weight. A position restriction is retained only when all duplicate origins agree. Opening/closing literals use the engine's first/last-two-lines semantics. Phrase expansion narrows whitespace to ordinary spaces and boundaries to the engine's Unicode-aware literal semantics. ZeroSlop prefix stems are not broadened into arbitrary word prefixes.\n\n[OVERLAPS.md](OVERLAPS.md) reports exact first-party matches, proposed weights and source locations; those candidates are omitted. It also reports literal containment. Semantic overlap between regexes/custom detectors remains a calibration decision; exact deduplication does not solve correlated evidence. First-party hashes make concurrent edits visible.\n\nRemaining regexes have spans bounded to 80 characters (word spans 32, whitespace 8), no lookaround/backreferences, no nested quantifiers and no u-only escapes. Unsupported or overly broad constructions are dropped. Python anchors become JS anchors; m anchors are explicitly translated to start-or-newline. Radar's emoji header uses explicit UTF-16 pairs because the contract supplies only gi; its repeated-modifier contrast is narrowed to zero or one modifier. DOTALL/nested generic benefit stacks are excluded.\n\nEach regex is compiled once and scanned globally over six adversarial inputs of up to 10KB, including long words, whitespace, repeated negations and list fragments. The worst input's median of seven warmed full scans must be <1ms (reduces scheduler/GC noise; no cold-start claim). The benchmark warms separately, then analyzes **2,000 mixed posts, 50–400 words**, with ALL vendor and current first-party packs; reports full, baseline, vendor-only and per-pack timings. BENCHMARK.json is the last measured result, not regenerated by this deterministic converter.\n\n## License gate and exclusions\n\nOnly MIT, Apache-2.0, BSD-2-Clause/BSD-3-Clause, CC0-1.0 or CC-BY-4.0 data may enter the lock. Every fetched input has a pinned upstream license and SHA-256; SPDX alone is insufficient. Full source LICENSE texts and SOURCE.md files are retained. Apache sampler generated files prominently state modifications; the pinned repository archive has no NOTICE/NOTICE.* file, so no upstream NOTICE text was fabricated. Any NOTICE found on a deliberate pin update must be preserved and appended to THIRD_PARTY_NOTICES.md.\n\nExplicitly excluded: Wikipedia tables (CC BY-SA/GFDL), gptslop (AGPL), GPL/AGPL code or dictionaries, sloptells and archiewood/claudeisms (no license), Graphite/GPTZero proprietary lists (no grant), Paech 50k adjustments, fiction dumps, creative_writing profiles, wordfreq ports and CC BY-SA data. Vale Figurative*.yml and FormalTransitions.yml are outside the allowlisted inputs.\n\n## Calibration handoff\n\nReview partial overlaps and weight replacements before registration; test on held-out human social/ESL writing. Decide whether sampler proxy weights need an additional cap, whether topic filters are too strict, whether the bounded contrast variants add evidence beyond the first-party rules, and whether any corpus-filtered assistant wording merits a contextual rule. These packs do not implement density gates, score normalization, category caps or Shame policy. Registration and score calibration remain separate work.\n`;
await put(resolve(output, 'README.md'), readme);

// Append-only and idempotent; never rewrite another agent's sections.
const noticesPath = resolve(root, 'THIRD_PARTY_NOTICES.md');
let notices = await readFile(noticesPath, 'utf8');
for (const source of lock.sources) {
  const marker = `## Vendored dictionary: ${source.id}`;
  if (notices.split(marker).slice(1).some((section) => section.split('\n## ')[0].includes(`https://github.com/${source.repo}/tree/${source.pin}`))) continue;
  const addition = `\n${marker}\n\nSource: https://github.com/${source.repo}/tree/${source.pin}\n\nSPDX: ${source.spdx}. Fetched ${source.fetchDate}. ${source.role ?? 'Generated rules are modified: filtered, normalized, reweighted and deduplicated; raw data is unmodified.'}\n\n${source.notice ? `NOTICE inspection: ${source.notice}\n\n` : ''}Full upstream license:\n\n\`\`\`text\n${read(source.id, 'LICENSE').trimEnd()}\n\`\`\`\n${source.files.some((f) => f.path === 'NOTICE') ? `\nUpstream NOTICE:\n\n\`\`\`text\n${read(source.id, 'NOTICE').trimEnd()}\n\`\`\`\n` : ''}`;
  await appendFile(noticesPath, addition); notices += addition;
}
console.log(JSON.stringify({ stats, totalPhrases: report.totalPhrases, totalPatterns: report.totalPatterns, exactFirstPartyOverlaps: overlaps.length, crossSourceMerges: merges.length }, null, 2));
