import { describe, expect, it } from 'vitest';
import { tierFor } from '../../../src/lib/engine/tiers';
import {
  AuthorTally, STRIP_MAX_SEGMENTS, SUMMARY_MIN_POSTS, TALLY_MIN_WORDS, stripSegments, summaryVerdict,
} from '../../../src/lib/ui/author-tally';

const scored = (score: number, wordCount = 120) => ({ score, tier: tierFor(score), wordCount });

describe('AuthorTally', () => {
  it('counts each post once by id, and a re-score updates it in place', () => {
    const t = new AuthorTally();
    expect(t.set('a', scored(70))).toBe(true);
    expect(t.set('b', scored(10))).toBe(true);
    expect(t.set('a', scored(70))).toBe(false); // re-scrolled: nothing changed
    expect(t.stats()).toMatchObject({ checked: 2, slop: 1, avg: 40, marks: ['swamp', null] });
    // "…see more" expanded, the full text scores lower: same place in the strip.
    expect(t.set('a', scored(30))).toBe(true);
    expect(t.stats()).toMatchObject({ checked: 2, slop: 0, avg: 20, marks: [null, null] });
    expect(t.size).toBe(2);
  });

  it('uses the store threshold: 40 is slop, 39 is not', () => {
    const t = new AuthorTally();
    t.set('a', scored(39));
    t.set('b', scored(40));
    expect(t.stats()).toMatchObject({ checked: 2, slop: 1, marks: [null, 'certified'] });
  });

  it('leaves short posts out unless they are slop (a few words cannot show the absence of tells)', () => {
    const t = new AuthorTally();
    t.set('image-only', scored(0, 0));
    t.set('caption', scored(5, TALLY_MIN_WORDS - 1));
    t.set('fingerprint', scored(80, 9));
    t.set('long', scored(12, TALLY_MIN_WORDS));
    expect(t.stats()).toMatchObject({ checked: 2, slop: 1, skipped: 2, avg: 46, marks: ['slopocalypse', null] });
    // A short post that later expands into a judgeable one moves into the count.
    t.set('caption', scored(5, 60));
    expect(t.stats()).toMatchObject({ checked: 3, skipped: 1 });
  });

  it('reports nothing measured as null, not zero', () => {
    expect(new AuthorTally().stats()).toEqual({ checked: 0, slop: 0, skipped: 0, avg: null, marks: [] });
  });
});

describe('summaryVerdict', () => {
  it('gives counts, never a verdict, below the minimum sample', () => {
    expect(summaryVerdict({ checked: 0, slop: 0 })).toEqual({ art: null, label: 'Scroll to check', sure: false });
    for (let n = 1; n < SUMMARY_MIN_POSTS; n++) {
      expect(summaryVerdict({ checked: n, slop: n })).toEqual({ art: null, label: 'Too early to tell', sure: false });
    }
  });

  it('never calls a person clean or human: zero slop is "no slop found" with the neutral mascot', () => {
    const v = summaryVerdict({ checked: 40, slop: 0 });
    expect(v).toEqual({ art: null, label: 'No slop found yet', sure: true });
    expect(v.label).not.toMatch(/clean|human|authentic|real/i);
  });

  it('scales the tier art with the share of slop posts', () => {
    const at = (slop: number) => summaryVerdict({ checked: 10, slop }).art;
    expect([1, 2, 3, 4, 5, 6, 10].map(at)).toEqual(['whiff', 'certified', 'certified', 'swamp', 'swamp', 'slopocalypse', 'slopocalypse']);
    expect(summaryVerdict({ checked: SUMMARY_MIN_POSTS, slop: 3 }).sure).toBe(true);
  });
});

describe('stripSegments', () => {
  it('draws one segment per post in the order seen while they fit', () => {
    expect(stripSegments(['swamp', null, 'certified'])).toEqual([
      { tier: 'swamp', weight: 1 }, { tier: null, weight: 1 }, { tier: 'certified', weight: 1 },
    ]);
  });

  it('groups by tier, loudest first, with proportional widths when dense', () => {
    const marks = [...Array(STRIP_MAX_SEGMENTS).fill(null), 'certified', 'slopocalypse', 'certified'] as const;
    expect(stripSegments(marks)).toEqual([
      { tier: 'slopocalypse', weight: 1 }, { tier: 'certified', weight: 2 }, { tier: null, weight: STRIP_MAX_SEGMENTS },
    ]);
  });
});
