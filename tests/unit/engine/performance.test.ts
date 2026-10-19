import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/lib/engine';
import { buildContext } from '../../../src/lib/engine/context';
import { packs } from '../../../src/lib/engine/packs';
import type { PostInput } from '../../../src/lib/engine/types';
import { corpus } from './corpus';

describe('feed main-thread performance', () => {
  it('creates the full engine in <20ms and analyzes 2,000 mixed posts in <0.5ms/post', () => {
    // Warm module/JIT initialization outside the measured creation; engine
    // creation still builds every trie and matcher from scratch below.
    createEngine(packs);
    const startCreation = performance.now();
    const engine = createEngine(packs);
    const creationMs = performance.now() - startCreation;
    const filler = 'The team reviewed the report on Tuesday and wrote down the remaining questions before the next meeting with our customers'.split(' ');
    const inputs: PostInput[] = Array.from({ length: 2000 }, (_, i) => {
      const source = corpus[i % corpus.length]!;
      const count = buildContext(source).wordCount;
      const target = Math.max(count, [50, 100, 200, 300, 400][i % 5]!);
      const padding = Array.from({ length: target - count }, (_, j) => filler[j % filler.length]).join(' ');
      return { ...source, text: `${source.text}\n\n${padding}` };
    });
    for (const input of inputs.slice(0, 100)) engine.analyze(input);
    let checksum = 0;
    const start = performance.now();
    for (const input of inputs) checksum += engine.analyze(input).score;
    const elapsed = performance.now() - start;
    const mean = elapsed / inputs.length;
    console.log(`Engine creation: ${creationMs.toFixed(3)} ms; 2,000 posts: ${elapsed.toFixed(2)} ms; mean: ${mean.toFixed(4)} ms/post; checksum: ${checksum}`);
    expect(creationMs).toBeLessThan(20);
    expect(mean).toBeLessThan(0.5);
    expect(checksum).toBeGreaterThan(0);
    expect(buildContext(inputs[0]!).wordCount).toBeGreaterThanOrEqual(50);
    expect(buildContext(inputs[4]!).wordCount).toBeLessThanOrEqual(400);
  });
});
