import { SLOP_THRESHOLD } from './types';

export interface RankingRecord {
  scoreCounts: Partial<Record<number, number>>;
  slopocalypsePosts: number;
}

/**
 * Sum (score - 30)^1.3 / 10 for scores >= 40, plus 3 per slopocalypse.
 * Round only the final sum. Every slop post contributes positively, so repeat
 * offenders climb even when the new post scores below their personal worst.
 * A score histogram keeps this exact after post-detail retention expires.
 */
export function slopPoints(record: RankingRecord): number {
  let points = 3 * record.slopocalypsePosts;
  for (let score = SLOP_THRESHOLD; score <= 100; score++) {
    points += (record.scoreCounts[score] ?? 0) * (score - 30) ** 1.3 / 10;
  }
  return Math.round(points);
}

export const RANK_TITLES = [
  { min: 0, title: 'Slop Intern' },
  { min: 20, title: 'Associate Slop Officer' },
  { min: 75, title: 'Senior Thoughtfluencer' },
  { min: 200, title: 'Director of Unsolicited Wisdom' },
  { min: 500, title: 'VP of Slop' },
  { min: 1_200, title: 'Chief Slop Officer' },
  { min: 3_000, title: 'Slop Emperor' },
] as const;

export function rankTitle(points: number): string {
  return RANK_TITLES.findLast((rank) => points >= rank.min)?.title ?? RANK_TITLES[0].title;
}
