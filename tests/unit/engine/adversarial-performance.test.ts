import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { analyzePost } from '../../../src/lib/engine';
import { buildContext } from '../../../src/lib/engine/context';

const prose = ('word '.repeat(20) + '.\n').repeat(4);
const mixedScript = prose + 'a中'.repeat((5000 - prose.length) / 2);
const cases: [string, string][] = [
  ...[1000, 3000, 5000].map((length): [string, string] => [`closer + ${length} spaces + near miss`, `Agree?${' '.repeat(length)}x`]),
  ['5000 blank lines', `hello${'\n'.repeat(5000)}world`],
  ['5000 carriage returns', `hello${'\r'.repeat(5000)}world`],
  ['5000 mixed CR/LF characters', `hello${'\r\n'.repeat(2500)}world`],
  ['5000 invisible-separated newlines', `hello${'\n\u200b'.repeat(2500)}world`],
  ['5000 punctuation characters', `hello ${'!?.,'.repeat(1250)} world`],
  ['5000 emoji code units', `hello ${'🚀'.repeat(2500)} world`],
  ['5000 hashtag characters', '#tag '.repeat(1000)],
  ['5000 bullet-line characters', '• x\n'.repeat(1250)],
  ['one 5000-character word', 'a'.repeat(5000)],
  ['5000 mixed-script characters with rhythm gates', mixedScript],
  ['5000 newlines before a successful opener', `${'\n'.repeat(5000)}in today's digital world`],
];

describe('adversarial input stays within the main-thread budget', () => {
  it('activates the rhythm rule for the mixed-script regression', () => {
    const ctx = buildContext({ text: mixedScript });
    expect(ctx.text.length).toBe(5000);
    expect(ctx.wordCount).toBeGreaterThanOrEqual(80);
    expect(ctx.sentences.length).toBeGreaterThanOrEqual(4);
  });

  it.each(cases)('%s', (name, text) => {
    // Warm the public API, its cached engine, and each input shape before
    // measuring. A median tolerates occasional scheduling/GC noise in CI.
    const input = { text };
    for (let i = 0; i < 3; i++) analyzePost(input);
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      analyzePost(input);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    const median = times[2]!;
    console.log(`${name}: ${median.toFixed(3)} ms (median of 5)`);
    // Deliberately much looser than the normal <1ms / 300-word budget;
    // these are 5k-character pathological inputs, not ordinary feed posts.
    expect(median, name).toBeLessThan(10);
  });
});
