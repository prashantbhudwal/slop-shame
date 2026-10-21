import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { mkdirSync, cpSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

export const ROOT = resolve(import.meta.dirname, '../../..');
export const CACHE = resolve(ROOT, 'data/eval/raw/hillclimb');
export const OUT = resolve(ROOT, 'eval/hillclimb/structural');
export const SCRATCH = resolve(CACHE, 'structural-engine');
export const CHAT = new Set(['gpt4', 'chatgpt', 'cohere-chat', 'llama-chat', 'mistral-chat', 'mpt-chat']);
export const eligible = row => row.label === 'human' || CHAT.has(row.model);
export function splitPath(split) {
  if (!['train', 'dev'].includes(split)) throw Error('Only train and dev are permitted');
  return resolve(CACHE, `${split}.jsonl`);
}
export async function* jsonl(path) {
  const input = createReadStream(path);
  const lines = createInterface({ input, crlfDelay: Infinity });
  try { for await (const line of lines) if (line.trim()) yield JSON.parse(line); }
  finally { lines.close(); input.destroy(); }
}
export function save(path, data) { writeFileSync(path, JSON.stringify(data, null, 2) + '\n'); }
export async function loader() {
  mkdirSync(SCRATCH, { recursive: true });
  const engine = resolve(SCRATCH, 'engine');
  if (!existsSync(engine)) cpSync(resolve(CACHE, 'engine-base'), engine, { recursive: true });
  const server = await createServer({ root: ROOT, configFile: false, server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom', logLevel: 'error' });
  return { engine, load: path => server.ssrLoadModule(path), close: () => server.close() };
}
