import { buildContext, normalizeText, straighten, structureOf } from './context';
import { compilePhrases } from './compile';
import { packs as builtInPacks } from './packs';
import { scoreSignals, type MatchEvidence } from './score';
import type { CustomRule, PhraseRule, PostContext, RuleHit, RulePack } from './rule-types';
import type { PostInput, SlopCategory, SlopReport, SlopSignal } from './types';

export type * from './types';
export type * from './rule-types';
export { TIERS, tierFor, tierById } from './tiers';

const CATEGORIES = new Set<SlopCategory>(['ai-vocabulary', 'template-phrases', 'chatbot-leak', 'negation-pivot', 'inflation', 'hedging', 'engagement-bait', 'formatting', 'robotic-rhythm', 'bypass-tricks']);
const NAMESPACE = /^[a-z][a-z0-9-]*$/;
const WORD_CHAR = /[\p{L}\p{M}\p{N}_]/u;

function codePointBefore(text: string, end: number): string {
  const trailing = text.charCodeAt(end - 1);
  return text.slice(Math.max(0, end - (trailing >= 0xdc00 && trailing <= 0xdfff ? 2 : 1)), end);
}

/** Legacy plugins may only supply snippets. Enumerate all boundary-aware
 * occurrences so a leading example cannot hide a later, direct occurrence. */
function customSpans(ctx: PostContext, hit: RuleHit, ruleId: string): [number, number][] {
  const spans: [number, number][] = [];
  if (hit.spans !== undefined) {
    if (!Array.isArray(hit.spans) || hit.spans.some((span) => !Array.isArray(span) || span.length !== 2
      || !Number.isInteger(span[0]) || !Number.isInteger(span[1]) || span[0] < 0 || span[1] <= span[0] || span[1] > ctx.text.length)) {
      throw new Error(`Custom rule "${ruleId}" must return valid spans within ctx.text.`);
    }
    for (const [start, end] of hit.spans) spans.push([start, end]);
  } else {
    const stats = structureOf(ctx);
    const snippets = new Set(hit.matches.map((snippet) => straighten(normalizeText(snippet)).toLowerCase()));
    for (const snippet of snippets) {
      if (!snippet) continue;
      const firstIsWord = WORD_CHAR.test(String.fromCodePoint(snippet.codePointAt(0)!));
      const lastIsWord = WORD_CHAR.test(codePointBefore(snippet, snippet.length));
      let cursor = 0;
      let start: number;
      while ((start = ctx.lower.indexOf(snippet, cursor)) >= 0) {
        const end = start + snippet.length;
        cursor = start + (ctx.lower.codePointAt(start)! > 0xffff ? 2 : 1);
        const before = codePointBefore(ctx.lower, start);
        const after = end < ctx.lower.length ? String.fromCodePoint(ctx.lower.codePointAt(end)!) : '';
        if (firstIsWord && WORD_CHAR.test(before) || lastIsWord && WORD_CHAR.test(after)) continue;
        spans.push([stats.lowerOffsets?.[start] ?? start, stats.lowerOffsets?.[end] ?? end]);
      }
    }
  }
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  return spans.filter((span, i) => !i || span[0] !== spans[i - 1]![0] || span[1] !== spans[i - 1]![1]);
}

const immutableDictionary = builtInPacks.find(pack => pack.id === 'dictionaries');
let immutableBuiltIn: { analyze(input: PostInput): SlopReport } | undefined;
export function createEngine(packs: RulePack[]): { analyze(input: PostInput): SlopReport } {
  if (packs === builtInPacks && immutableBuiltIn) return immutableBuiltIn;
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
    // Generated records are frozen at module evaluation and verified by the
    // offline pipeline. Reuse them without revalidating/copying 9k records on
    // every tab; arbitrary contributor packs still receive all validation.
    if (pack === immutableDictionary) {
      for (const rule of pack.rules) phraseRules.push(rule as PhraseRule);
      continue;
    }
    for (const rule of pack.rules) {
      if (!rule || typeof rule.id !== 'string') throw new Error(`Pack "${pack.id}" has a rule without a string id.`);
      if (!rule.id.startsWith(`${pack.id}.`) || !NAMESPACE.test(rule.id.slice(pack.id.length + 1))) {
        throw new Error(`Rule "${rule.id}" must have a namespaced id "${pack.id}.<rule>" (lowercase kebab-case).`);
      }
      if (ids.has(rule.id)) throw new Error(`Duplicate rule id "${rule.id}".`);
      ids.add(rule.id);
      if (!CATEGORIES.has(rule.category)) throw new Error(`Unknown category "${rule.category}" in rule "${rule.id}".`);
      if (!Number.isFinite(rule.weight) || rule.weight <= 0) throw new Error(`Rule "${rule.id}" needs a finite positive weight.`);
      if (rule.evidence !== undefined && !['phrase', 'style', 'fingerprint'].includes(rule.evidence)) throw new Error(`Invalid evidence kind in rule "${rule.id}".`);
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
  const engine: { analyze(input: PostInput): SlopReport } = {
    analyze(input) {
      const ctx = buildContext(input);
      if (!ctx.wordCount) return scoreSignals([], ctx, []);
      const signals: SlopSignal[] = [];
      const evidence: MatchEvidence[] = [];
      for (const [rule, hit] of matchPhrases(ctx)) {
        const weight = rule.weight * (hit.scale ?? 1);
        if (!Number.isFinite(weight)) throw new Error(`Rule "${rule.id}" produced a non-finite weight.`);
        signals.push({ ruleId: rule.id, category: rule.category, label: rule.label, weight, matches: hit.matches });
        evidence.push({ weight, spans: hit.spans, kind: rule.evidence, baseWeight: rule.weight, repeat: rule.repeat ?? 'once', construction: rule.category === 'negation-pivot' && !!rule.patterns?.length });
      }
      for (const rule of customRules) {
        const hit = rule.detect(ctx);
        if (!hit) continue;
        const scale = hit.scale ?? 1;
        if (!Number.isFinite(scale) || scale <= 0) throw new Error(`Custom rule "${rule.id}" returned an invalid scale; use a finite positive number or null.`);
        if (!Array.isArray(hit.matches) || hit.matches.some((match) => typeof match !== 'string')) throw new Error(`Custom rule "${rule.id}" must return a matches array of strings.`);
        const weight = rule.weight * scale;
        if (!Number.isFinite(weight)) throw new Error(`Rule "${rule.id}" produced a non-finite weight.`);
        signals.push({ ruleId: rule.id, category: rule.category, label: rule.label, weight, matches: hit.matches });
        evidence.push({ weight, spans: customSpans(ctx, hit, rule.id), kind: rule.evidence, baseWeight: rule.weight,
          // An unscaled custom hit is presence evidence, not a count. Retaining
          // one direct occurrence preserves its weight after examples are cut.
          repeat: hit.scale === undefined ? 'once' : undefined });
      }
      return scoreSignals(signals, ctx, evidence);
    },
  };
  if (packs === builtInPacks) immutableBuiltIn = engine;
  return engine;
}

let defaultEngine: ReturnType<typeof createEngine> | undefined;
export function analyzePost(input: PostInput): SlopReport {
  return (defaultEngine ??= createEngine(builtInPacks)).analyze(input);
}
