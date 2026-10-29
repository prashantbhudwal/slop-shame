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

/** Add independent evidence, never divide it by document length. These are
 * editorial points on a Slop Index, not probabilities of AI authorship.
 * Category caps limit repeated wording; style cannot establish a verdict.
 * Fingerprints are an explicit rule property, never inferred from weight.
 */
const K = 12;
const CAP: Record<SlopCategory, number> = {
  'ai-vocabulary': 20, 'template-phrases': 20, 'negation-pivot': 16,
  inflation: 16, hedging: 12, 'engagement-bait': 16,
  formatting: 12, 'robotic-rhythm': 8, 'chatbot-leak': 20, 'bypass-tricks': 8,
};
const STYLE_CATEGORIES = new Set<SlopCategory>(['formatting', 'robotic-rhythm', 'bypass-tricks']);
const CORROBORATING = new Set(['formatting.em-dash', 'robotic-rhythm.rule-of-three']);
const FINGERPRINT_FLOOR = 80;
const STYLE_ONLY_MAX = 39;

/** Internal calibration knobs. Defaults are frozen after tune/dev gates; the
 * public engine API does not accept caller-supplied scoring policies. */
export interface ScoringPolicy {
  k: number;
  caps: Partial<Record<SlopCategory, number>>;
  styleMax: number;
  familyBonus: number;
  shortK: number;
}
export const SCORING_POLICY: ScoringPolicy = {"k":12,"caps":{},"styleMax":39,"familyBonus":1,"shortK":12};

export function saturate(evidence: number, k = K): number {
  return 100 * -Math.expm1(-evidence / k);
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

export function scoreSignals(rawSignals: SlopSignal[], ctx: PostContext, evidence: readonly MatchEvidence[] = [], policy = SCORING_POLICY): SlopReport {
  const independent = independentSignals(rawSignals, ctx, evidence);
  const phrasePoints = independent.reduce((sum, e) => sum + (e.kind === 'style' ? 0 : e.signal.weight), 0);
  const counted = independent.filter((e) => !CORROBORATING.has(e.signal.ruleId) || phrasePoints >= 3);
  const rawPhraseCategory: Partial<Record<SlopCategory, number>> = {};
  const rawStyleCategory: Partial<Record<SlopCategory, number>> = {};
  for (const { signal, kind } of counted) {
    const category = kind === 'style' ? rawStyleCategory : rawPhraseCategory;
    category[signal.category] = (category[signal.category] ?? 0) + signal.weight;
  }

  let phrase = 0; let style = 0;
  for (const entry of counted) {
    const signal = entry.signal;
    const cap = policy.caps[signal.category] ?? CAP[signal.category];
    const phraseUsed = Math.min(cap, rawPhraseCategory[signal.category] ?? 0);
    const raw = (entry.kind === 'style' ? rawStyleCategory : rawPhraseCategory)[signal.category]!;
    // Phrase/fingerprint evidence owns the category budget first. Typography
    // can use only the remaining capacity, never dilute existing wording.
    const available = entry.kind === 'style' ? cap - phraseUsed : cap;
    entry.signal = { ...signal, weight: signal.weight * Math.min(1, available / raw) };
    if (entry.kind === 'style') style += entry.signal.weight; else phrase += entry.signal.weight;
  }
  // Weak wording cannot unlock arbitrarily strong typography. Keep the larger
  // of the style-only index and phrase-supported evidence, so adding a weak
  // phrase cannot lower an existing style-only index either.
  const families = new Set(counted.filter(e=>e.kind !== 'style' && e.signal.weight > 0).map(e=>e.signal.category));
  // The optional corroboration bonus is distributed over visible phrase tells,
  // so the displayed contributions still sum to the evidence actually used.
  const bonus = Math.min(2, Math.max(0, families.size - 2) * policy.familyBonus);
  if (bonus && phrase) {
    for (const e of counted) if(e.kind !== 'style') e.signal = {...e.signal, weight:e.signal.weight * (phrase + bonus) / phrase};
    phrase += bonus;
  }
  const k = ctx.wordCount >= 40 && ctx.wordCount < 100 && counted.length >= 3 && families.size >= 2 ? policy.shortK : policy.k;
  const styleEvidence = Math.min(style, -k * Math.log1p(-policy.styleMax / 100));
  const supported = phrase + Math.min(style, phrase);
  const total = Math.max(styleEvidence, supported);
  const styleBudget = total - phrase;
  const styleRatio = style > 0 ? Math.max(0, styleBudget) / style : 0;
  const categoryWeights: Partial<Record<SlopCategory, number>> = {};
  const signals = counted.map((entry) => {
    const signal = entry.kind === 'style' ? { ...entry.signal, weight: entry.signal.weight * styleRatio } : entry.signal;
    categoryWeights[signal.category] = (categoryWeights[signal.category] ?? 0) + signal.weight;
    return { ...signal, matches: signal.matches.slice(0, 3) };
  }).filter((signal) => signal.weight > 0);
  let topCategory: SlopCategory | null = null; let highest = 0;
  for (const [category, weight] of Object.entries(categoryWeights) as [SlopCategory, number][]) {
    if (weight > highest || weight === highest && topCategory !== null && category < topCategory) { highest = weight; topCategory = category; }
  }
  const fingerprint = counted.some((entry) => entry.kind === 'fingerprint');
  const score = Math.max(0, Math.min(100, Math.round(Math.max(saturate(total, k), fingerprint ? FINGERPRINT_FLOOR : 0))));
  const shameable = ctx.wordCount >= 8 && (fingerprint || score >= 40 && phrase >= 4 && ctx.wordCount >= 40);
  signals.sort((a, b) => b.weight - a.weight || a.ruleId.localeCompare(b.ruleId));
  return { score, shameable, tier: tierFor(score), signals, topCategory, categoryWeights, wordCount: ctx.wordCount };
}
