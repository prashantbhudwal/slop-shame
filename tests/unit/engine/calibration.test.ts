import { describe, expect, it } from 'vitest';
import { analyzePost, TIERS } from '../../../src/lib/engine';
import { allowedTiers, corpus } from './corpus';

describe('synthetic human / AI / edited-AI calibration corpus', () => {
  it('has >=40 unique examples with explicit authorship labels', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(40);
    expect(new Set(corpus.map((post) => post.id)).size).toBe(corpus.length);
    expect(new Set(corpus.map((post) => post.authorship)).size).toBe(3);
    expect(corpus.every((post) => post.synthetic)).toBe(true);
  });
  it('lands >=90% within editorial tier expectations and reports by authorship', () => {
    const results = corpus.map((post) => ({ post, report: analyzePost(post) }));
    const misses = results.filter(({ post, report }) => !allowedTiers(post).includes(report.tier.id));
    console.table(TIERS.map((tier) => {
      const group = results.filter(({ post }) => allowedTiers(post)[0] === tier.id);
      const correct = group.filter(({ post, report }) => allowedTiers(post).includes(report.tier.id)).length;
      return { tier: tier.id, posts: group.length, correct, accuracy: group.length ? `${(100 * correct / group.length).toFixed(1)}%` : 'n/a' };
    }));
    console.table(['human', 'mixed', 'ai'].map((authorship) => {
      const group = results.filter(({ post }) => post.authorship === authorship);
      return { authorship, posts: group.length, meanScore: (group.reduce((s, r) => s + r.report.score, 0) / group.length).toFixed(1), shameable: group.filter((r) => r.report.shameable).length };
    }));
    if (misses.length) console.log('Calibration misses:', misses.map(({ post, report }) => ({ id: post.id, expected: post.expectTier, actual: report.tier.id, score: report.score })));
    expect(1 - misses.length / corpus.length).toBeGreaterThanOrEqual(0.9);
  });
  it.each(corpus.filter((post) => post.authorship === 'human'))('$id must stay <=whiff and cannot be shamed', (post) => {
    expect(analyzePost(post).score).toBeLessThan(40);
    expect(analyzePost(post).shameable).toBe(false);
  });
});
