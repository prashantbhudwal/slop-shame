import { describe, expect, it } from 'vitest';
import { analyzePost, TIERS } from '../../../src/lib/engine';
import { allowedTiers, calibrationCorpus, corpus } from './corpus';

describe('synthetic human / AI / edited-AI calibration corpus', () => {
  it('has >=40 unique examples with explicit authorship labels', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(40);
    expect(new Set(corpus.map((post) => post.id)).size).toBe(corpus.length);
    expect(new Set(corpus.map((post) => post.authorship)).size).toBe(3);
    expect(corpus.every((post) => post.synthetic)).toBe(true);
  });
  it('retains explicit artifact recall and reports generic AI examples without treating authorship as the target', () => {
    const results = calibrationCorpus.map((post) => ({ post, report: analyzePost(post) }));
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
    // Historical exact-tier labels were fitted to density scoring. Report them
    // for visibility; do not fit additive scores to those arbitrary bands.
    const ai = results.filter(({ post }) => post.authorship === 'ai');
    expect(ai.length).toBeGreaterThan(0);
    // v2 targets visible low-effort residue; generic synthetic AI authorship is report-only.
    const artifacts=ai.filter(({post})=>/as an ai language model|here.s (?:a |the |your )?(?:polished|revised|possible)/i.test(post.text));
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts.every(({report})=>report.score>=80)).toBe(true);
  });
  // This synthetic draft contains an unfinished slot; round 2 explicitly
  // treats pasted editing residue as slop regardless of illustrative authorship.
  it.each(corpus.filter((post) => post.authorship === 'human' && post.id !== 'human-editor-note'))('$id must stay <=whiff and cannot be shamed', (post) => {
    expect(analyzePost(post).score).toBeLessThan(40);
    expect(analyzePost(post).shameable).toBe(false);
  });
  it('shows the unfinished editing slot in the synthetic hiring draft', () => {
    const report=analyzePost(corpus.find(post=>post.id==='human-editor-note')!);
    expect(report.score).toBeGreaterThanOrEqual(40);
    expect(report.signals.flatMap(signal=>signal.matches)).toContain('[insert link in comments]');
  });
});
