// Everything a shame card shows besides the roast itself: ticket numbers,
// fines, report-card grades. Pure and deterministic per post.

import type { SlopCategory, SlopReport } from '../engine/types';
import { CATEGORIES, CATEGORY_META } from './categories';
import { displayName, initials, scrubName, type ShameAuthor } from './generate';

export interface GradeRow {
  category: SlopCategory;
  subject: string;
  grade: string;
}

export interface CardFacts {
  /** "SLP-4821-QX" */
  ticket: string;
  /** "$532.90" */
  fine: string;
  /** "Oct 19, 2026" */
  date: string;
  /** Worst subjects first, six rows. */
  grades: GradeRow[];
  /** Overall letter for the Slop Index. */
  overall: string;
  /** Name as shown on this copy of the card (full or initials). */
  name: string;
  headline: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function letterFor(weight: number): string {
  if (weight <= 0) return 'A';
  if (weight < 4) return 'B';
  if (weight < 8) return 'C';
  if (weight < 14) return 'D';
  return 'F';
}

export function overallFor(score: number): string {
  return score < 20 ? 'A+' : score < 40 ? 'B' : score < 60 ? 'C' : score < 80 ? 'D' : 'F';
}

export function cardFacts(
  report: SlopReport,
  author: ShameAuthor | null,
  postId: string,
  opts: { anonymize?: boolean; now?: Date } = {},
): CardFacts {
  const h = hash(postId);
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const ticket = `SLP-${String(h % 10000).padStart(4, '0')}-${letters[(h >>> 14) % letters.length]}${letters[(h >>> 20) % letters.length]}`;
  const fine = `$${((report.score * report.score) / 10).toFixed(2)}`;
  const date = (opts.now ?? new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const rows = CATEGORIES.map((c) => ({ category: c, subject: CATEGORY_META[c].subject, w: report.categoryWeights[c] ?? 0 }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 6)
    .map(({ category, subject, w }) => ({ category, subject, grade: letterFor(w) }));
  const rawName = author?.name ?? 'An Unidentified Poster';
  const name = author ? (opts.anonymize ? initials(rawName) : displayName(rawName)) : rawName;
  let headline = author?.headline?.replace(/\s+/g, ' ').trim() ?? '';
  if (headline.length > 90) headline = `${headline.slice(0, 88).trimEnd()}…`;
  if (opts.anonymize && author && headline) headline = scrubName(headline, author.name);
  return { ticket, fine, date, grades: rows, overall: overallFor(report.score), name, headline };
}
