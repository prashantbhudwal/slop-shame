import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { LABELS, wordCount } from './metrics.mjs';

export async function loadCorpus(files, config) {
  const items = [];
  const ids = new Set();
  const texts = new Map();
  const receipts = [];
  let duplicates = 0;
  for (const file of files) {
    const bytes = await readFile(file);
    receipts.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
    let lineNumber = 0;
    for (const line of bytes.toString('utf8').split(/\r?\n/u)) {
      lineNumber++;
      if (!line.trim()) continue;
      let item;
      try { item = JSON.parse(line); } catch { throw new Error(`${file}:${lineNumber}: invalid JSON`); }
      const error = message => { throw new Error(`${file}:${lineNumber}: ${message}`); };
      for (const field of ['id', 'text', 'source', 'subset', 'genre', 'register']) {
        if (typeof item[field] !== 'string' || !item[field].trim()) error(`missing/non-string ${field}`);
      }
      if (!LABELS.includes(item.label)) error('label must be human, ai, or mixed');
      const words = wordCount(item.text);
      if (words < config.minWords || words > config.maxWords) error(`${words} words, expected ${config.minWords}–${config.maxWords}`);
      if (item.words !== words) error(`words must be ${words}, received ${item.words}`);
      if (ids.has(item.id)) error(`duplicate id ${item.id}`);
      ids.add(item.id);
      // Do not count identical humans repeated across generator configs twice.
      const digest = createHash('sha256').update(item.text.normalize('NFKC').replace(/\s+/gu, ' ').trim()).digest('hex');
      const previous = texts.get(digest);
      if (previous) {
        if (previous.label !== item.label) error(`conflicting labels for duplicate text (${previous.id})`);
        duplicates++;
        continue;
      }
      texts.set(digest, item);
      items.push(item);
    }
  }
  if (!items.length) throw new Error('No evaluation items found');
  return { items, receipts, duplicates };
}
