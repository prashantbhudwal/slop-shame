import { describe, expect, it } from 'vitest';
import { RANK_TITLES, rankTitle, slopPoints } from '../../../src/lib/store/ranking';
import type { RankingRecord } from '../../../src/lib/store/ranking';

describe('slop ranking', () => {
  it('every additional slop post increases points, even below the previous max', () => {
    for (let score = 40; score <= 100; score++) {
      const record: RankingRecord = { scoreCounts: { 100: 1 }, slopocalypsePosts: 1 };
      const previous = slopPoints(record);
      record.scoreCounts[score] = (record.scoreCounts[score] ?? 0) + 1;
      expect(slopPoints(record)).toBeGreaterThan(previous);
    }
  });

  it('repeated offenders outrank one spike of the same maximum', () => {
    const spike = slopPoints({ scoreCounts: { 100: 1 }, slopocalypsePosts: 1 });
    expect(slopPoints({ scoreCounts: { 100: 1, 60: 4 }, slopocalypsePosts: 1 })).toBeGreaterThan(spike);
  });

  it('non-slop posts contribute zero; slopocalypse adds a small bonus', () => {
    const counts = Object.fromEntries(Array.from({ length: 40 }, (_, score) => [score, 100]));
    expect(slopPoints({ scoreCounts: counts, slopocalypsePosts: 0 })).toBe(0);
    expect(slopPoints({ scoreCounts: { ...counts, 80: 1 }, slopocalypsePosts: 1 }))
      .toBe(slopPoints({ scoreCounts: { 80: 1 }, slopocalypsePosts: 0 }) + 3);
  });

  it('exposes seven ascending rank titles', () => {
    expect(RANK_TITLES).toHaveLength(7);
    for (const rank of RANK_TITLES) expect(rankTitle(rank.min)).toBe(rank.title);
    expect(rankTitle(-1)).toBe('Slop Intern');
    expect(rankTitle(1_000_000)).toBe('Slop Emperor');
  });
});
