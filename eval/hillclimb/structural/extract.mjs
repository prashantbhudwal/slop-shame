import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { CACHE, OUT, eligible, splitPath, jsonl, loader } from './common.mjs';

const split = process.argv[2];
const visible = process.argv[3] === 'visible';
const specifics = process.argv[3] === 'specifics';
const input = splitPath(split); // Validate before opening any file.
const s = await loader();
try {
  const { buildContext } = await s.load(resolve(s.engine, 'context.ts'));
  const { features } = await s.load(resolve(OUT, specifics ? 'specific-features.ts' : visible ? 'visible-features.ts' : 'features.ts'));
  const output = createWriteStream(resolve(CACHE, `${specifics ? 'specifics' : visible ? 'visible' : 'structural'}-values-${split}.jsonl`));
  let n = 0;
  for await (const row of jsonl(input)) {
    if (!eligible(row)) continue;
    const ctx = buildContext({ text: row.text });
    const { text, ...meta } = row;
    if (!output.write(JSON.stringify({ ...meta, engineWords: ctx.wordCount, features: features(ctx) }) + '\n')) await once(output, 'drain');
    if (++n % 10000 === 0) console.log(`${split}: ${n}`);
  }
  output.end(); await once(output, 'finish'); console.log(`${split}: ${n} complete`);
} finally { await s.close(); }
