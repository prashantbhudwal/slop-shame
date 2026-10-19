import { structureOf } from './context';
import type { PostContext } from './rule-types';
import { tierFor } from './tiers';
import type { SlopCategory, SlopReport, SlopSignal } from './types';

export interface MatchEvidence { weight: number; spans: readonly (readonly [number, number])[] }
type Bucket = 'phrases' | 'discourse' | 'formatting' | 'rhythm' | 'fingerprints';
const CAPS = { phrases: 24, discourse: 12, formatting: 8, rhythm: 8 } as const;
const PHRASE_FAMILIES = new Set<SlopCategory>(['ai-vocabulary', 'template-phrases', 'chatbot-leak', 'negation-pivot', 'inflation', 'hedging', 'engagement-bait']);
function bucket(signal: SlopSignal): Bucket {
  if (signal.category === 'chatbot-leak' || signal.category === 'bypass-tricks') return 'fingerprints';
  if (signal.category === 'negation-pivot' || signal.category === 'engagement-bait' || signal.ruleId === 'robotic-rhythm.rule-of-three') return 'discourse';
  if (signal.category === 'formatting') return 'formatting';
  if (signal.category === 'robotic-rhythm') return 'rhythm';
  return 'phrases';
}

/**
 * Density first, then family caps, then saturation. This is a tell index,
 * never an authorship probability.
 *
 * For each evidence bucket j:
 *   P_j = sum(base weight * repeat/custom scale).
 *   Spread each rule's points over ALL matching spans and sentences touched.
 *   C_j = mean(1-exp(-sentenceStrength/6)): weighted sentence coverage.
 *   D_j = 100 * P_j / max(60, words): weighted tells per 100 words.
 *   E_j = min(cap_j, 0.5*cap_j*C_j + 0.5*D_j).
 *
 * E is raw evidence before the final saturating curve, capped at phrases 24,
 * discourse 12, formatting 8, rhythm 8. Normalizing BEFORE these caps keeps
 * repeating the same density over 100 vs 300 words approximately invariant.
 * Returned signal weights are apportioned E_j, so the report exposes the
 * actual capped contributions, rather than uncapped dictionary hit counts.
 * Fingerprints are exempt: E_j=P_j. Strong fingerprints also set a floor
 * 100*(1-exp(-F/7)), F=sum chatbot signals >=10 and bypass signals >=9.
 * score=round(100*(1-exp(-sum(E_j)/32))), or the fingerprint floor if higher.
 *
 * Em dashes only corroborate a positive phrase/discourse family and retain
 * at most 2 raw points. No low-TTR, grammar, contraction-absence, or entropy
 * proxy earns points. Style alone can move a badge, never enable Shame.
 * Complexity: O(sentences * registered rules + occurrences); no retokenizing.
 */
export function saturate(evidence: number): number {
  return 100 * -Math.expm1(-evidence / 32);
}

export function scoreSignals(rawSignals: SlopSignal[], ctx: PostContext, evidence: readonly MatchEvidence[]): SlopReport {
  const hasPhrase = rawSignals.some((signal) => PHRASE_FAMILIES.has(signal.category));
  const groups = new Map<Bucket, { indices: number[]; points: number; strengths: Float64Array }>();
  const sentences = structureOf(ctx).sentenceSpans;
  let fingerprints = 0;
  for (let index = 0; index < rawSignals.length; index++) {
    const signal = rawSignals[index]!;
    if (signal.ruleId === 'formatting.em-dash' && !hasPhrase) continue;
    const key = bucket(signal);
    let group = groups.get(key);
    if (!group) { group = { indices: [], points: 0, strengths: new Float64Array(sentences.length) }; groups.set(key, group); }
    group.indices.push(index);
    group.points += signal.weight;
    if (signal.category === 'chatbot-leak' && signal.weight >= 10 || signal.category === 'bypass-tricks' && signal.weight >= 9) fingerprints += signal.weight;
    const item = evidence[index];
    if (!item) continue;
    let cursor = 0;
    for (const [start, end] of item.spans) {
      while (cursor < sentences.length && sentences[cursor]![1] <= start) cursor++;
      let last = cursor;
      while (last < sentences.length && sentences[last]![0] < end) last++;
      const contribution = item.weight / item.spans.length / Math.max(1, last - cursor);
      for (let i = cursor; i < last; i++) group.strengths[i] = group.strengths[i]! + contribution;
    }
  }
  const signals: SlopSignal[] = [];
  const categoryWeights: Partial<Record<SlopCategory, number>> = {};
  let total = 0;
  for (const [key, group] of groups) {
    let coverage = 0;
    for (const strength of group.strengths) coverage += -Math.expm1(-strength / 6);
    coverage /= Math.max(1, sentences.length);
    const normalized = key === 'fingerprints' ? group.points : Math.min(CAPS[key], 0.5 * CAPS[key] * coverage + 50 * group.points / Math.max(60, ctx.wordCount));
    // A tie-breaking em dash must never be amplified by density conversion.
    let contribution = 0;
    for (const index of group.indices) {
      const signal = rawSignals[index]!;
      const weight = signal.ruleId === 'formatting.em-dash' ? Math.min(2, signal.weight, signal.weight * normalized / group.points) : signal.weight * normalized / group.points;
      signals.push({ ...signal, weight });
      categoryWeights[signal.category] = (categoryWeights[signal.category] ?? 0) + weight;
      contribution += weight;
    }
    total += contribution;
  }
  let topCategory: SlopCategory | null = null, highest = 0;
  for (const [category, weight] of Object.entries(categoryWeights)) {
    if (weight > highest) { highest = weight; topCategory = category as SlopCategory; }
  }
  const score = Math.max(0, Math.min(100, Math.round(Math.max(saturate(total), 100 * -Math.expm1(-fingerprints / 7)))));
  const shameable = score >= 40 && ctx.wordCount >= 40 && hasPhrase;
  return { score, shameable, tier: tierFor(score), signals: signals.sort((a, b) => b.weight - a.weight), topCategory, categoryWeights, wordCount: ctx.wordCount };
}
