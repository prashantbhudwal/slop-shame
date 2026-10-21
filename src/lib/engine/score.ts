import type { EvidenceKind, PhraseRule, PostContext } from './rule-types';
import { isProtectedSpan, structureOf } from './context';
import { tierFor } from './tiers';
import type { SlopCategory, SlopReport, SlopSignal } from './types';

type Span = readonly [number, number];
export interface MatchEvidence {
  weight: number;
  spans: readonly Span[];
  kind?: EvidenceKind;
  baseWeight?: number;
  repeat?: PhraseRule['repeat'];
  /** A grammatical construction is independent of its constituent word choices. */
  construction?: boolean;
}

import { SCORECARD, THRESHOLD } from './scorecard';
import { GUN_CAP, HABIT_CAP, ruleSchema, type EvidenceRule } from './scorecard-schema';
const STYLE_CATEGORIES = new Set<SlopCategory>(['formatting', 'robotic-rhythm', 'bypass-tricks']);
const FINGERPRINT_FLOOR = 80;

/** The public index is linear up to 60, then smoothly compressed. */
export function evidenceIndex(u: number): number {
  return u <= 1.5 ? 40 * u : 100 - 40 * Math.exp(-(u - 1.5));
}
/** Retained for contributor tools; k now means evidence at index 40. */
export function saturate(evidence: number, k = THRESHOLD): number {
  return evidenceIndex(evidence / k);
}
interface Counted {
  signal: SlopSignal;
  evidence: MatchEvidence;
  kind: EvidenceKind;
  kept: Span[];
}

function kindFor(signal: SlopSignal, evidence: MatchEvidence): EvidenceKind {
  return evidence.kind ?? (STYLE_CATEGORIES.has(signal.category) ? 'style' : 'phrase');
}

function repetition(count: number, mode: PhraseRule['repeat']): number {
  return mode === 'each' ? count : mode === 'sqrt' ? Math.sqrt(count) : count ? 1 : 0;
}

/** Reserve a nonoverlapping lexical interval with a binary search. Construction
 * and style evidence may overlap words, but the same text occurrence is never
 * counted twice by competing phrase rules. Ties use rule IDs, not pack order.
 */
function reserve(spans: Span[], span: Span): boolean {
  let lo = 0; let hi = spans.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (spans[mid]![0] < span[0]) lo = mid + 1; else hi = mid;
  }
  if (lo && spans[lo - 1]![1] > span[0] || lo < spans.length && spans[lo]![0] < span[1]) return false;
  spans.splice(lo, 0, span);
  return true;
}

function independentSignals(raw: SlopSignal[], ctx: PostContext, evidence: readonly MatchEvidence[]): Counted[] {
  const quoted = structureOf(ctx).protectedSpans;
  const entries = raw.map((signal, i) => {
    const hit = evidence[i] ?? { weight: signal.weight, spans: [] };
    return { signal, evidence: hit, kind: kindFor(signal, hit), kept: [] as Span[] };
  });
  const occurrences: { entry: Counted; span: Span }[] = [];
  for (const entry of entries) {
    for (const span of entry.evidence.spans) {
      if (isProtectedSpan(quoted, span)) continue;
      // A fingerprint scaffold cannot borrow an anchor from an example.
      // Ordinary phrases can contain quoted parameters, such as Comment "YES";
      // direct tool-call scaffolds can contain interior quoted JSON values.
      if (entry.kind === 'fingerprint' && (isProtectedSpan(quoted, [span[0], span[0] + 1]) || isProtectedSpan(quoted, [span[1] - 1, span[1]]))) continue;
      occurrences.push({ entry, span });
    }
  }
  occurrences.sort((a, b) =>
    Number(b.entry.kind === 'fingerprint') - Number(a.entry.kind === 'fingerprint')
    || Number(SCORECARD[b.entry.signal.ruleId]?.gun ?? false) - Number(SCORECARD[a.entry.signal.ruleId]?.gun ?? false)
    || Number(SCORECARD[b.entry.signal.ruleId]?.tier !== 'vocabulary') - Number(SCORECARD[a.entry.signal.ruleId]?.tier !== 'vocabulary')
    || (b.entry.evidence.baseWeight ?? b.entry.signal.weight) - (a.entry.evidence.baseWeight ?? a.entry.signal.weight)
    || (b.span[1] - b.span[0]) - (a.span[1] - a.span[0])
    || a.entry.signal.ruleId.localeCompare(b.entry.signal.ruleId)
    || a.span[0] - b.span[0]);
  const exact = new Set<string>();
  const lexical: Span[] = [];
  for (const { entry, span } of occurrences) {
    // A rhetorical construction is a different cue from its word choices.
    // Two rules describing identical text still compete for that occurrence.
    const key = `${entry.kind === 'style' ? 'style' : 'text'}:${span[0]}:${span[1]}`;
    if (exact.has(key)) continue;
    if (entry.kind !== 'style' && !entry.evidence.construction) {
      if (!reserve(lexical, span)) continue;
      entry.kept.push(span);
    } else if (!reserve(entry.kept, span)) continue;
    exact.add(key);
  }
  return entries.flatMap((entry) => {
    const originalCount = entry.evidence.spans.length;
    if (!originalCount) return [entry]; // Custom rules may report non-textual evidence.
    if (!entry.kept.length) return [];
    entry.kept.sort((a, b) => a[0] - b[0]);
    const weight = entry.evidence.repeat && entry.evidence.baseWeight !== undefined
      ? entry.evidence.baseWeight * repetition(entry.kept.length, entry.evidence.repeat)
      : entry.signal.weight * entry.kept.length / originalCount;
    entry.signal = { ...entry.signal, weight, matches: entry.kept.slice(0, 3).map(([start, end]) => ctx.text.slice(start, end)) };
    return [entry];
  });
}

export interface EvidenceUnit {
  signal: SlopSignal;
  kind: EvidenceKind;
  count: number;
  model: EvidenceRule;
}

/** Shared by the offline fitter and production. Counts are actual surviving
 * occurrences, never a detector's old square-root point multiplier. A post
 * predicate (a list, a cadence, a closing question) is one unit. */
export function evidenceUnits(raw: SlopSignal[], ctx: PostContext, evidence: readonly MatchEvidence[] = []): EvidenceUnit[] {
  const candidates: EvidenceUnit[] = [];
  for (const e of independentSignals(raw, ctx, evidence)) {
    const model = SCORECARD[e.signal.ruleId] ?? ruleSchema(e.signal.ruleId, e.signal.category, e.evidence.baseWeight ?? e.signal.weight, e.kind, e.evidence.repeat === 'once');
    if (model.disabled || model.weight <= 0) continue;
    const count = model.mode === 'post' ? 1 : e.kept.length || e.evidence.spans.length || 1;
    candidates.push({ signal: e.signal, kind: e.kind, count, model });
  }
  const bundles = new Map<string, EvidenceUnit>();
  const kept: EvidenceUnit[] = [];
  for (const e of candidates) {
    if (!e.model.bundle) { kept.push(e); continue; }
    const old = bundles.get(e.model.bundle);
    if (!old || (e.model.priority ?? 0) > (old.model.priority ?? 0)
      || e.model.priority === old.model.priority && e.signal.ruleId < old.signal.ruleId) bundles.set(e.model.bundle, e);
  }
  return kept.concat([...bundles.values()]);
}

export function humanExpectation(rule: EvidenceRule, words: number): number {
  return typeof rule.rate === 'number' ? rule.rate * words : rule.rate[words < 100 ? 0 : words < 250 ? 1 : 2];
}

export function scoreSignals(rawSignals: SlopSignal[], ctx: PostContext, evidence: readonly MatchEvidence[] = []): SlopReport {
  const units = evidenceUnits(rawSignals, ctx, evidence);
  const groups = new Map<string, { raw: number; cap: number; entries: { unit: EvidenceUnit; value: number }[] }>();
  for (const unit of units) {
    const phi = Math.max(0, Math.log1p(unit.count) - Math.log1p(humanExpectation(unit.model, ctx.wordCount)));
    if (!phi) continue;
    const value = unit.model.weight * phi;
    let group = groups.get(unit.model.family);
    if (!group) { group = { raw: 0, cap: unit.model.gun ? GUN_CAP : HABIT_CAP, entries: [] }; groups.set(unit.model.family, group); }
    group.raw += value;
    group.entries.push({ unit, value });
  }
  let total = 0;
  let gun = false;
  let fingerprint = false;
  let phrase = false;
  const families = new Set<string>();
  const signals: SlopSignal[] = [];
  const fingerprintSignals: SlopSignal[] = [];
  for (const [family, group] of groups) {
    const contribution = group.cap * -Math.expm1(-group.raw / group.cap);
    total += contribution;
    for (const { unit, value } of group.entries) {
      gun ||= unit.model.gun;
      fingerprint ||= unit.kind === 'fingerprint' && unit.model.gun;
      phrase ||= unit.kind !== 'style';
      if (!unit.model.gun && unit.model.tier !== 'vocabulary') families.add(family);
      const signal = { ...unit.signal, weight: contribution * value / group.raw, matches: unit.signal.matches.slice(0, 3) };
      signals.push(signal);
      if (unit.kind === 'fingerprint' && unit.model.gun) fingerprintSignals.push(signal);
    }
  }
  // Frozen explicit artifacts keep the historical floor. Allocate its evidence
  // uplift to the visible artifact; do not invent an unexplained score bonus.
  if (fingerprint && total < THRESHOLD * (1.5 + Math.LN2)) {
    const uplift = THRESHOLD * (1.5 + Math.LN2) - total;
    const raw = fingerprintSignals.reduce((sum, s) => sum + s.weight, 0);
    for (const s of fingerprintSignals) s.weight += uplift * s.weight / raw;
    total += uplift;
  }
  const eligible = gun || families.size >= 2 && phrase;
  let index = evidenceIndex(total / THRESHOLD);
  if (!eligible) index = Math.min(39, index);
  // Signals carry exact index points after smooth family saturation and index
  // compression. Rounding is confined to the badge, never individual tells.
  const ratio = total > 0 ? index / total : 0;
  const categoryWeights: Partial<Record<SlopCategory, number>> = {};
  let topCategory: SlopCategory | null = null;
  let highest = 0;
  for (const s of signals) {
    s.weight *= ratio;
    categoryWeights[s.category] = (categoryWeights[s.category] ?? 0) + s.weight;
  }
  for (const [category, weight] of Object.entries(categoryWeights) as [SlopCategory, number][]) {
    if (weight > highest || weight === highest && topCategory !== null && category < topCategory) { highest = weight; topCategory = category; }
  }
  // Floor (rather than round) preserves the calibrated >=40 boundary exactly.
  const score = Math.max(fingerprint ? FINGERPRINT_FLOOR : 0, Math.min(100, Math.floor(index + 1e-10)));
  const shameable = score >= 40 && (fingerprint ? ctx.wordCount >= 8 : ctx.wordCount >= 40 && phrase);
  signals.sort((a, b) => b.weight - a.weight || a.ruleId.localeCompare(b.ruleId));
  return { score, shameable, tier: tierFor(score), signals, topCategory, categoryWeights, wordCount: ctx.wordCount };
}
