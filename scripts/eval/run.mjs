import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';
import { loadCorpus } from '../../eval/lib/corpus.mjs';
import { evaluate } from '../../eval/lib/metrics.mjs';
import { markdown } from '../../eval/lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const args = process.argv.slice(2).filter(arg => arg !== '--');
const data = [];
let strict = false;
let baseline = false;
let committedOnly = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--strict') strict = true;
  else if (arg === '--baseline') baseline = true;
  else if (arg === '--committed-only') committedOnly = true;
  else if (arg === '--data' && args[i + 1] && !args[i + 1].startsWith('--')) data.push(args[++i]);
  else if (arg === '--help') {
    console.log('pnpm eval [--strict] [--committed-only] [--data file.jsonl ...] [--baseline]\n--data may repeat and replaces configured inputs. --baseline writes aggregate eval/BASELINE.md.');
    process.exit(0);
  } else throw new Error(`Unknown/incomplete argument: ${arg}`);
}

async function engineDigest(directory = resolve(root, 'src/lib/engine')) {
  const hash = createHash('sha256');
  async function visit(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.name.endsWith('.ts')) { hash.update(relative(root, path)); hash.update(await readFile(path)); }
    }
  }
  await visit(directory);
  return hash.digest('hex');
}

async function main() {
  const config = JSON.parse(await readFile('eval/config.json', 'utf8'));
  const optional = committedOnly ? [] : config.optionalFiles.filter(file => existsSync(file));
  const missing = committedOnly || data.length ? [] : config.optionalFiles.filter(file => !existsSync(file));
  const corpus = await loadCorpus(data.length ? data : [...config.files, ...optional], config);
  const before = await engineDigest();
  const loadStart = performance.now();
  // Vite is already a project dependency. It resolves the public TS API's
  // extensionless imports without a second TS runner or writing into src/.
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  let engine;
  try { engine = await server.ssrLoadModule('/src/lib/engine/index.ts'); }
  finally { await server.close(); }
  const loadMs = performance.now() - loadStart;
  if (typeof engine.analyzePost !== 'function') throw new Error('Public API analyzePost is unavailable');
  const start = performance.now();
  engine.analyzePost({ text: corpus.items[0].text });
  const coldMs = performance.now() - start;
  for (let i = 0; i < Math.min(100, corpus.items.length); i++) engine.analyzePost({ text: corpus.items[i].text });
  const rows = corpus.items.map(item => {
    const start = performance.now();
    const report = engine.analyzePost({ text: item.text });
    const ms = performance.now() - start;
    if (!Number.isInteger(report.score) || report.score < 0 || report.score > 100 ||
        typeof report.tier?.id !== 'string' || !Array.isArray(report.signals) ||
        report.signals.some(signal => typeof signal.ruleId !== 'string' || !Number.isFinite(signal.weight)) ||
        (report.shameable !== undefined && typeof report.shameable !== 'boolean')) {
      throw new Error(`${item.id}: invalid engine report`);
    }
    return { ...item, score: report.score, tier: report.tier.id,
      shameable: report.shameable, signals: report.signals, ms };
  });
  if (before !== await engineDigest()) throw new Error('Engine files changed during evaluation; rerun for a coherent baseline');
  const metrics = evaluate(rows, config);
  let gitHead = 'unavailable';
  try { gitHead = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(); } catch { /* optional provenance */ }
  const result = { schemaVersion: 1, timestamp: new Date().toISOString(),
    command: ['pnpm eval', ...args].join(' '), node: process.version, gitHead,
    engineSha256: before, config, inputs: corpus.receipts, missingOptionalFiles: missing,
    duplicates: corpus.duplicates, loadMs, coldMs,
    tiers: engine.TIERS?.map(tier => tier.id) ?? [...new Set(rows.map(row => row.tier))], metrics,
    // Full text stays in its source JSONL. Research-only snippets stay in ignored results.
    predictions: rows.map(({text, ...row}) => row),
  };
  await mkdir('eval/results', {recursive: true});
  const output = `eval/results/${result.timestamp.replace(/[:.]/gu, '-')}.json`;
  const md = markdown(result);
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile('eval/results/latest.md', md);
  if (baseline) await writeFile('eval/BASELINE.md', markdown(result, {snippets: false}));
  console.log(md);
  console.log(`\nJSON: ${output}\nMarkdown: eval/results/latest.md`);
  if (missing.length) console.warn(`Optional research datasets absent: ${missing.join(', ')}. See eval/README.md.`);
  if (strict && !metrics.strictPass) process.exitCode = metrics.missingHardSubsets.length ? 2 : 1;
}

main().catch(error => { console.error(error.stack ?? error); process.exitCode = 2; });
