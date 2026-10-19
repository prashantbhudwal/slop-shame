import { buildContext, normalizeText, straighten, structureOf } from './context';
import { compilePhrases } from './compile';
import { packs as builtInPacks } from './packs';
import { scoreSignals, type MatchEvidence } from './score';
import type { CustomRule, PhraseRule, RulePack } from './rule-types';
import type { PostInput, SlopCategory, SlopReport, SlopSignal } from './types';

export type * from './types';
export type * from './rule-types';
export { TIERS, tierFor, tierById } from './tiers';

const CATEGORIES = new Set<SlopCategory>(['ai-vocabulary', 'template-phrases', 'chatbot-leak', 'negation-pivot', 'inflation', 'hedging', 'engagement-bait', 'formatting', 'robotic-rhythm', 'bypass-tricks']);
const NAMESPACE = /^[a-z][a-z0-9-]*$/;

export function createEngine(packs: RulePack[]): { analyze(input: PostInput): SlopReport } {
  const ids = new Set<string>();
  const packIds = new Set<string>();
  const phraseRules: PhraseRule[] = [];
  const customRules: CustomRule[] = [];
  if (!Array.isArray(packs)) throw new Error('Engine packs must be an array of RulePack objects.');
  for (const pack of packs) {
    if (!pack || typeof pack.id !== 'string' || !Array.isArray(pack.rules)) throw new Error('Each pack needs a string id and a rules array.');
    if (!NAMESPACE.test(pack.id)) throw new Error(`Invalid pack id "${pack.id}". Use lowercase kebab-case.`);
    if (packIds.has(pack.id)) throw new Error(`Duplicate pack id "${pack.id}".`);
    packIds.add(pack.id);
    for (const rule of pack.rules) {
      if (!rule || typeof rule.id !== 'string') throw new Error(`Pack "${pack.id}" has a rule without a string id.`);
      if (!rule.id.startsWith(`${pack.id}.`) || !NAMESPACE.test(rule.id.slice(pack.id.length + 1))) {
        throw new Error(`Rule "${rule.id}" must have a namespaced id "${pack.id}.<rule>" (lowercase kebab-case).`);
      }
      if (ids.has(rule.id)) throw new Error(`Duplicate rule id "${rule.id}".`);
      ids.add(rule.id);
      if (!CATEGORIES.has(rule.category)) throw new Error(`Unknown category "${rule.category}" in rule "${rule.id}".`);
      if (!Number.isFinite(rule.weight) || rule.weight <= 0) throw new Error(`Rule "${rule.id}" needs a finite positive weight.`);
      if (typeof rule.label !== 'string' || !rule.label.trim()) throw new Error(`Rule "${rule.id}" needs a readable label.`);
      if (rule.kind === 'phrase') {
        for (const key of ['phrases', 'patterns'] as const) {
          if (rule[key] !== undefined && (!Array.isArray(rule[key]) || rule[key]!.some((value) => typeof value !== 'string'))) throw new Error(`Rule "${rule.id}" ${key} must be an array of strings.`);
        }
        if (![...(rule.phrases ?? []), ...(rule.patterns ?? [])].length || rule.phrases?.some((p) => !normalizeText(p).trim()) || rule.patterns?.some((p) => !p.trim())) {
          throw new Error(`Phrase rule "${rule.id}" needs non-empty phrases or patterns.`);
        }
        if (rule.repeat && !['once', 'each', 'sqrt'].includes(rule.repeat)) throw new Error(`Invalid repeat mode in rule "${rule.id}".`);
        if (rule.position && !['opening', 'closing'].includes(rule.position)) throw new Error(`Invalid position in rule "${rule.id}".`);
        phraseRules.push({ ...rule, phrases: rule.phrases?.slice(), patterns: rule.patterns?.slice() });
      } else if (rule.kind === 'custom' && typeof rule.detect === 'function') customRules.push({ ...rule, detect: rule.detect.bind(rule) });
      else throw new Error(`Rule "${rule.id}" needs kind "phrase" or a custom detect() function.`);
    }
  }
  const matchPhrases = compilePhrases(phraseRules);
  return {
    analyze(input) {
      const ctx = buildContext(input);
      if (ctx.wordCount < 8) return scoreSignals([], ctx, []);
      const signals: SlopSignal[] = [];
      const evidence: MatchEvidence[] = [];
      for (const [rule, hit] of matchPhrases(ctx)) {
        const weight = rule.weight * (hit.scale ?? 1);
        if (!Number.isFinite(weight)) throw new Error(`Rule "${rule.id}" produced a non-finite weight.`);
        signals.push({ ruleId: rule.id, category: rule.category, label: rule.label, weight, matches: hit.matches.slice(0, 3) });
        evidence.push({ weight, spans: hit.spans });
      }
      for (const rule of customRules) {
        const hit = rule.detect(ctx);
        if (!hit) continue;
        const scale = hit.scale ?? 1;
        if (!Number.isFinite(scale) || scale <= 0) throw new Error(`Custom rule "${rule.id}" returned an invalid scale; use a finite positive number or null.`);
        if (!Array.isArray(hit.matches) || hit.matches.some((match) => typeof match !== 'string')) throw new Error(`Custom rule "${rule.id}" must return a matches array of strings.`);
        const weight = rule.weight * scale;
        if (!Number.isFinite(weight)) throw new Error(`Rule "${rule.id}" produced a non-finite weight.`);
        signals.push({ ruleId: rule.id, category: rule.category, label: rule.label, weight, matches: hit.matches.slice(0, 3) });
        const stats = structureOf(ctx);
        const spans: [number, number][] = [];
        for (const snippet of hit.matches) {
          const normalized = straighten(normalizeText(snippet)).toLowerCase();
          if (!normalized) continue;
          const start = ctx.lower.indexOf(normalized);
          if (start >= 0) spans.push([stats.lowerOffsets?.[start] ?? start, stats.lowerOffsets?.[start + normalized.length] ?? start + normalized.length]);
        }
        spans.sort((a, b) => a[0] - b[0]);
        evidence.push({ weight, spans });
      }
      return scoreSignals(signals, ctx, evidence);
    },
  };
}

let defaultEngine: ReturnType<typeof createEngine> | undefined;
export function analyzePost(input: PostInput): SlopReport {
  return (defaultEngine ??= createEngine(builtInPacks)).analyze(input);
}
