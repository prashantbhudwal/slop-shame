// The live tally behind a profile's slop summary: the posts the profile owner
// wrote that were scored on this page, by post id (re-scoring a post updates
// it, re-scrolling never double-counts). Pure data, no DOM.
//
// Honesty rules: a few words can't show the absence of AI tells, so short
// posts count only when they're slop; below SUMMARY_MIN_POSTS the summary
// gives counts, never a verdict; and no slop found never means human-written.

import type { SlopReport, SlopTierId } from '../engine/types';
import { SLOP_THRESHOLD } from '../store/types';

/** Posts shorter than this count only when they're slop (a fingerprint can show in a few words). */
export const TALLY_MIN_WORDS = 20;
/** Fewer checked posts than this get counts ("2 of 3"), never a verdict. */
export const SUMMARY_MIN_POSTS = 5;
/** Up to this many checked posts, the strip shows one segment per post. */
export const STRIP_MAX_SEGMENTS = 48;

export interface TallyStats {
  /** Posts long enough to judge, plus every slop post. */
  checked: number;
  /** Checked posts scoring >= SLOP_THRESHOLD. */
  slop: number;
  /** Their posts too short to judge (not in `checked`). */
  skipped: number;
  /** Mean Slop Index of the checked posts; null when none. */
  avg: number | null;
  /** One mark per checked post, in the order they were first checked: its tier when slop, else null. */
  marks: (SlopTierId | null)[];
}

interface Tallied {
  score: number;
  slop: SlopTierId | null;
  counted: boolean;
}

type Scored = Pick<SlopReport, 'score' | 'tier' | 'wordCount'>;

export class AuthorTally {
  private readonly posts = new Map<string, Tallied>();

  /** Add or update one post. Returns false when nothing visible changed. */
  set(id: string, report: Scored): boolean {
    const slop = report.score >= SLOP_THRESHOLD ? report.tier.id : null;
    const next: Tallied = { score: report.score, slop, counted: slop !== null || report.wordCount >= TALLY_MIN_WORDS };
    const prev = this.posts.get(id);
    if (prev && prev.score === next.score && prev.slop === next.slop && prev.counted === next.counted) return false;
    this.posts.set(id, next); // An existing id keeps its place in the strip.
    return true;
  }

  get size(): number {
    return this.posts.size;
  }

  stats(): TallyStats {
    let checked = 0, slop = 0, skipped = 0, total = 0;
    const marks: (SlopTierId | null)[] = [];
    for (const p of this.posts.values()) {
      if (!p.counted) {
        skipped++;
        continue;
      }
      checked++;
      total += p.score;
      if (p.slop) slop++;
      marks.push(p.slop);
    }
    return { checked, slop, skipped, avg: checked ? Math.round(total / checked) : null, marks };
  }
}

export const emptyStats = (): TallyStats => ({ checked: 0, slop: 0, skipped: 0, avg: null, marks: [] });

export interface Verdict {
  /** Tier art for the headline; null: the neutral mascot (nothing to call yet, or no slop found). */
  art: SlopTierId | null;
  label: string;
  /** Enough posts for a percentage. */
  sure: boolean;
}

/**
 * The headline: plain counts for small samples, then the share of slop
 * posts in tier art. It describes the posts, never the person.
 */
export function summaryVerdict(s: Pick<TallyStats, 'checked' | 'slop'>): Verdict {
  if (s.checked === 0) return { art: null, label: 'Scroll to check', sure: false };
  if (s.checked < SUMMARY_MIN_POSTS) return { art: null, label: 'Too early to tell', sure: false };
  const rate = s.slop / s.checked;
  if (rate === 0) return { art: null, label: 'No slop found yet', sure: true };
  if (rate < 0.2) return { art: 'whiff', label: 'A little slop', sure: true };
  if (rate < 0.4) return { art: 'certified', label: 'Regular slop', sure: true };
  if (rate < 0.6) return { art: 'swamp', label: 'Lots of slop', sure: true };
  return { art: 'slopocalypse', label: 'Mostly slop', sure: true };
}

export interface StripSegment {
  /** Tier of a slop post (or group); null for checked posts that weren't slop. */
  tier: SlopTierId | null;
  /** Relative width. */
  weight: number;
}

const LOUDEST_FIRST: (SlopTierId | null)[] = ['slopocalypse', 'swamp', 'certified', 'whiff', 'artisanal', null];

/**
 * The strip under the headline: one segment per checked post while they fit
 * (in the order seen, so new posts pop in at the end), then grouped by tier,
 * loudest first, with widths in proportion.
 */
export function stripSegments(marks: readonly (SlopTierId | null)[], max = STRIP_MAX_SEGMENTS): StripSegment[] {
  if (marks.length <= max) return marks.map((tier) => ({ tier, weight: 1 }));
  const counts = new Map<SlopTierId | null, number>();
  for (const m of marks) counts.set(m, (counts.get(m) ?? 0) + 1);
  return LOUDEST_FIRST.filter((t) => counts.has(t)).map((tier) => ({ tier, weight: counts.get(tier)! }));
}
