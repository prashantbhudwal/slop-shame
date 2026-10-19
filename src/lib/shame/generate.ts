// Picks a shame format for a real post and fills its slots. Pure TS: no DOM,
// no browser APIs, deterministic for a given RNG.

import type { SlopCategory, SlopReport, SlopSignal } from '../engine/types';
import { CATEGORY_META } from './categories';
import { SHAME_FORMATS } from './formats';
import { SHAME_SLOTS, type Shame, type ShameFormat, type ShameSlot } from './types';

/** Who wrote the post. Matches the useful subset of PostAuthor. */
export interface ShameAuthor {
  name: string;
  headline?: string;
  kind?: 'person' | 'company' | 'unknown';
}

export interface ShameSubject {
  report: SlopReport;
  author: ShameAuthor | null;
  /** Slop posts seen from this author, including this one (≥ 1). */
  slopCount?: number;
}

/** Recently used format ids, so re-rolls and nearby posts don't repeat. */
export interface ShameHistory {
  recent: string[];
}

export interface GenerateOptions {
  /** Returns [0, 1). Defaults to Math.random. Use mulberry32(seed) for tests. */
  rng?: () => number;
  /** Defaults to one shared per-session history. */
  history?: ShameHistory;
  formats?: readonly ShameFormat[];
}

const sessionHistory: ShameHistory = { recent: [] };
const HISTORY_SIZE = 16;
const SLOT_RE = /\{(\w+)\}/g;
const KNOWN_SLOTS = new Set<string>(SHAME_SLOTS);
/** Smoking-gun tells get their own jokes even when they aren't the top category. */
const SMOKING_GUNS = new Set<SlopCategory>(['chatbot-leak', 'bypass-tricks']);

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function slotsOf(format: ShameFormat): Set<ShameSlot> {
  const used = new Set<ShameSlot>();
  for (const text of [format.title, format.body, format.footer ?? '']) {
    for (const m of text.matchAll(SLOT_RE)) if (KNOWN_SLOTS.has(m[1]!)) used.add(m[1] as ShameSlot);
  }
  return used;
}

// ── Quotes ──────────────────────────────────────────────────────────────────

const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯﻿]/g;

/** Make a matched snippet safe and short enough to quote. "" if nothing visible remains. */
export function cleanQuote(raw: string, max = 90): string {
  let q = raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  q = q.replace(/^[\s"'“”‘’«».,;:)\]-]+|["'“”‘’«»(\[]+$/g, '').trim();
  if (q.length > max) {
    const cut = q.slice(0, max - 1);
    const space = cut.lastIndexOf(' ');
    q = `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.!?-]+$/, '')}…`;
  }
  // Need at least one visible, non-punctuation-only character to be worth quoting.
  return /[\p{L}\p{N}\p{Extended_Pictographic}—–]/u.test(q) ? q : '';
}

interface QuotePick {
  quote?: string;
  quote2?: string;
  signal?: SlopSignal;
}

function pickQuotes(signals: readonly SlopSignal[], prefer?: readonly SlopCategory[]): QuotePick {
  const ordered = prefer?.length
    ? [...signals.filter((s) => prefer.includes(s.category)), ...signals.filter((s) => !prefer.includes(s.category))]
    : signals;
  const pick: QuotePick = {};
  const seen = new Set<string>();
  for (const signal of ordered) {
    for (const raw of signal.matches) {
      const q = cleanQuote(raw);
      const key = q.toLowerCase();
      if (!q || seen.has(key)) continue;
      // The primary quote must come from the format's own categories.
      if (!pick.quote) {
        if (prefer?.length && !prefer.includes(signal.category)) return pick;
        pick.quote = q;
        pick.signal = signal;
        seen.add(key);
        break; // quote2 comes from a different signal when possible
      }
      pick.quote2 = q;
      return pick;
    }
  }
  // Fall back to a second match of the same signal.
  if (pick.quote && !pick.quote2 && pick.signal) {
    for (const raw of pick.signal.matches) {
      const q = cleanQuote(raw);
      if (q && !seen.has(q.toLowerCase())) return { ...pick, quote2: q };
    }
  }
  return pick;
}

// ── Names ───────────────────────────────────────────────────────────────────

/** "Jane Doe, MBA, PMP 🚀" → "Jane Doe". */
export function displayName(name: string): string {
  const cleaned = name
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .split(/\s*[,|(]\s*/)[0]!
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || name.trim();
}

function firstName(author: ShameAuthor): string {
  const name = displayName(author.name);
  if (author.kind === 'company') return name;
  const parts = name.split(' ');
  const first = parts[0] ?? name;
  // "Dr. Smith" reads better than "Dr."
  return /\.$/.test(first) && parts[1] ? `${first} ${parts[1]}` : first;
}

function trimHeadline(headline: string | undefined): string {
  if (!headline) return '';
  const parts = headline.replace(/\s+/g, ' ').trim().split(/\s*[|•·]\s*/).filter(Boolean);
  let out = parts[0] ?? '';
  for (const part of parts.slice(1)) {
    if (out.length + part.length + 3 > 60) break;
    out += ` | ${part}`;
  }
  return out.length > 70 ? `${out.slice(0, 68).trimEnd()}…` : out;
}

export function ordinal(n: number): string {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

// ── Filling ─────────────────────────────────────────────────────────────────

type SlotValues = Partial<Record<ShameSlot, string>>;

export interface RenderOptions {
  /**
   * For anything that leaves the extension (copied text, downloaded image):
   * the author becomes initials and their name is scrubbed from the headline.
   */
  anonymize?: boolean;
}

/** "Jane Doe" → "J.D." */
export function initials(name: string): string {
  const parts = displayName(name).split(' ').filter((p) => /\p{L}/u.test(p));
  const letters = parts.map((p) => p.match(/\p{L}/u)![0]!.toUpperCase());
  const picked = letters.length > 2 ? [letters[0]!, letters[letters.length - 1]!] : letters;
  return picked.length ? `${picked.join('.')}.` : 'Anon.';
}

/** Remove the author's own name from their headline ("Founder, Jane Doe Consulting"). */
export function scrubName(text: string, name: string): string {
  const full = displayName(name);
  let out = text.split(full).join(initials(full));
  for (const part of full.split(' ')) {
    if (part.length < 3) continue;
    out = out.replace(new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'giu'), `${part[0]!.toUpperCase()}.`);
  }
  return out;
}

function slotValues(subject: ShameSubject, format: ShameFormat, opts: RenderOptions = {}): { values: SlotValues; pick: QuotePick } {
  const { report, author } = subject;
  const count = Math.max(1, Math.round(subject.slopCount ?? 1));
  const pick = pickQuotes(report.signals, format.categories);
  const offenseCategory = (format.categories?.find((c) => (report.categoryWeights[c] ?? 0) > 0) ?? report.topCategory) as SlopCategory | null;
  const values: SlotValues = {
    author: author ? displayName(author.name) : 'An Unidentified Poster',
    first: author ? firstName(author) : 'the poster',
    score: String(report.score),
    tier: report.tier.label,
    count: String(count),
    ordinal: ordinal(count),
    words: String(report.wordCount),
  };
  if (pick.quote) values.quote = pick.quote;
  if (pick.quote2) values.quote2 = pick.quote2;
  const signal = pick.signal ?? report.signals[0];
  if (signal) values.signal = signal.label;
  if (offenseCategory) values.category = CATEGORY_META[offenseCategory].offense;
  const headline = trimHeadline(author?.headline);
  if (headline) values.headline = headline;
  if (opts.anonymize && author) {
    values.author = values.first = initials(author.name);
    if (headline) values.headline = scrubName(headline, author.name);
  }
  return { values, pick };
}

const TITLE_QUOTE_MAX = 34;

function fill(template: string, values: SlotValues, isTitle: boolean): string {
  return template.replace(SLOT_RE, (whole, name: string, offset: number) => {
    if (!KNOWN_SLOTS.has(name)) return whole; // Left visible so tests catch typos.
    let value = values[name as ShameSlot];
    if (value === undefined) return whole;
    if (isTitle && (name === 'quote' || name === 'quote2')) value = cleanQuote(value, TITLE_QUOTE_MAX) || value;
    // Capitalize slot values that start a sentence ("the poster did…" → "The poster did…").
    const before = template.slice(0, offset);
    if (/(^|[.!?]\s+|\n)$/.test(before)) value = value.charAt(0).toUpperCase() + value.slice(1);
    return value;
  });
}

/** True when every slot the format uses can be filled for this subject. */
export function canFill(format: ShameFormat, subject: ShameSubject): boolean {
  const { values } = slotValues(subject, format);
  for (const slot of slotsOf(format)) if (values[slot] === undefined) return false;
  return true;
}

export function isEligible(format: ShameFormat, subject: ShameSubject): boolean {
  const { report } = subject;
  if (format.tiers && !format.tiers.includes(report.tier.id)) return false;
  if (format.categories && !format.categories.some((c) => (report.categoryWeights[c] ?? 0) > 0)) return false;
  if (format.minCount && (subject.slopCount ?? 1) < format.minCount) return false;
  return canFill(format, subject);
}

/** Relative pick weight: jokes about the post's actual top tell win. */
export function formatWeight(format: ShameFormat, subject: ShameSubject): number {
  const { report } = subject;
  if (!format.categories) {
    // Tier-specific generics are the "overall verdict" jokes.
    let w = format.tiers && format.tiers.length <= 2 ? 3 : 1.5;
    if (format.minCount) w += 2; // Repeat-offender jokes are a treat when they apply.
    return w;
  }
  const total = Object.values(report.categoryWeights).reduce((a, b) => a + (b ?? 0), 0) || 1;
  let share = 0;
  for (const c of format.categories) share = Math.max(share, (report.categoryWeights[c] ?? 0) / total);
  let w = format.categories.includes(report.topCategory as SlopCategory) ? 8 : 0.5 + 4 * share;
  if (format.categories.some((c) => SMOKING_GUNS.has(c) && (report.categoryWeights[c] ?? 0) > 0)) w *= 3;
  return w;
}

export function renderShame(format: ShameFormat, subject: ShameSubject, opts: RenderOptions = {}): Shame {
  const { values, pick } = slotValues(subject, format, opts);
  const shame: Shame = {
    formatId: format.id,
    layout: format.layout,
    title: fill(format.title, values, true),
    body: fill(format.body, values, false),
    category: format.categories?.find((c) => (subject.report.categoryWeights[c] ?? 0) > 0) ?? subject.report.topCategory,
  };
  if (format.footer) shame.footer = fill(format.footer, values, false);
  if (pick.quote && slotsOf(format).has('quote')) shame.quote = pick.quote;
  return shame;
}

export function formatById(id: string, formats: readonly ShameFormat[] = SHAME_FORMATS): ShameFormat | undefined {
  return formats.find((f) => f.id === id);
}

/** Pick a fitting format (weighted, avoiding recent repeats) and fill it from the real post. */
export function generateShame(subject: ShameSubject, opts: GenerateOptions = {}): Shame {
  const rng = opts.rng ?? Math.random;
  const history = opts.history ?? sessionHistory;
  const formats = opts.formats ?? SHAME_FORMATS;
  let eligible = formats.filter((f) => isEligible(f, subject));
  if (!eligible.length) eligible = formats.filter((f) => !f.categories && !f.minCount && canFill(f, subject));
  if (!eligible.length) eligible = formats.filter((f) => canFill(f, subject));
  if (!eligible.length) throw new Error('No shame format can be filled for this post');

  const recent = new Set(history.recent);
  const fresh = eligible.filter((f) => !recent.has(f.id));
  // Everything used up: forget the oldest half and keep going.
  const pool = fresh.length ? fresh : eligible.filter((f) => !history.recent.slice(-Math.floor(eligible.length / 2)).includes(f.id));
  const candidates = pool.length ? pool : eligible;

  const weights = candidates.map((f) => formatWeight(f, subject));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  let chosen = candidates[candidates.length - 1]!;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) {
      chosen = candidates[i]!;
      break;
    }
  }
  history.recent.push(chosen.id);
  if (history.recent.length > HISTORY_SIZE) history.recent.splice(0, history.recent.length - HISTORY_SIZE);
  return renderShame(chosen, subject);
}

/** The card as plain text (for "Copy text"). */
export function shameToText(shame: Shame, report: SlopReport): string {
  const header: Record<Shame['layout'], string> = {
    citation: '🚨 DEPARTMENT OF SLOP ENFORCEMENT · CITATION',
    certificate: '🏅 DEPARTMENT OF SLOP ENFORCEMENT · OFFICIAL CERTIFICATE',
    tabloid: '📰 THE DAILY SLOP · EXCLUSIVE',
    'wanted-poster': '🤠 WANTED BY THE DEPARTMENT OF SLOP ENFORCEMENT',
    'report-card': '📝 SLOP ACADEMY · REPORT CARD',
    eulogy: '🪦 IN LOVING MEMORY',
  };
  return [
    header[shame.layout],
    '',
    shame.title.toUpperCase(),
    '',
    shame.body,
    ...(shame.footer ? ['', shame.footer] : []),
    '',
    `Slop Index ${report.score}/100 · ${report.tier.label} · issued by Slop Shame`,
  ].join('\n');
}
