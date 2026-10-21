import { isProtectedSpan, structureOf } from '../context';
import type { PostContext, RuleHit, RulePack } from '../rule-types';
import { ATTRIBUTION, custom, phrase } from '../rules';

const SECONDARY = new Set('harness navigate navigating foster elevate unleash streamline empower bolster spearhead resonate resonates revolutionize facilitate facilitates underpin nuanced crucial multifaceted ecosystem myriad plethora encompass catalyze reimagine galvanize augment cultivate illuminate elucidate juxtapose transformative transformation cornerstone paramount poised burgeoning nascent quintessential overarching underpinning underpinnings'.split(' '));
const TERTIARY = new Set('significant significantly innovative innovation effective effectively dynamic dynamics scalable scalability compelling unprecedented exceptional exceptionally remarkable remarkably sophisticated instrumental verbatim'.split(' '));

function cluster(ctx: PostContext, vocabulary: ReadonlySet<string>, minimum: number, offset: number): RuleHit | null {
  const structure = structureOf(ctx);
  const spans: (readonly [number, number])[] = [];
  const matches: string[] = [];
  for (let i = 0; i < ctx.words.length; i++) {
    const span = structure.wordSpans[i]!;
    if (!vocabulary.has(ctx.words[i]!) || isProtectedSpan(structure.protectedSpans, span)) continue;
    spans.push(span);
    matches.push(ctx.text.slice(span[0], span[1]));
  }
  // Examples cannot establish a cluster or inflate its count-based weight.
  return spans.length >= minimum ? { matches, spans, scale: Math.sqrt(spans.length - offset) } : null;
}
const c = 'ai-vocabulary';
export const aiVocabulary: RulePack = {
  id: c, name: 'The autocomplete thesaurus', description: 'Vocabulary and recurring word clusters; surrounding prose never dilutes evidence.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'explainer-idioms', 'The explainer reached for the stock phrase drawer', 0.25, { repeat: 'sqrt', phrases: ['hitting a wall', 'best of both worlds', 'connecting the dots', 'production-grade', 'one-size-fits-all', 'transforming how', 'the real magic', 'unlock', 'game-changer'] }),
    phrase(c, 'tier1', 'A rich tapestry of autocomplete', 3, { repeat: 'each', phrases: ['delve', 'delving', 'tapestry', 'beacon', 'intricacies', 'meticulously', 'ever-evolving', 'holistically', 'learnings', 'symphony', 'interplay'] }),
    phrase(c, 'tier1-common', 'The adjective drawer is unusually busy', 1.2, { repeat: 'each', phrases: ['paradigm', 'robust', 'comprehensive', 'cutting-edge', 'pivotal', 'meticulous', 'seamless', 'seamlessly', 'nestled', 'vibrant', 'thriving', 'bustling', 'intricate', 'enduring', 'daunting', 'holistic', 'actionable', 'impactful', 'leverage', 'leveraging', 'synergy', 'synergies', 'showcase', 'showcasing', 'underscoring', 'unpack'] }),
    phrase(c, 'collocations', 'Navigating the landscape of saying things', 4, { repeat: 'sqrt', phrases: ['testament to', 'harness the power', 'unlock the potential', 'navigate the landscape', 'navigating the landscape', 'embark on a journey', 'intricate interplay', 'rich tapestry', 'delve into the realm'], patterns: ['\\bnavigat(?:e|es|ing|ed)\\s+(?:the|this|an?)\\s+(?:(?:ever[ ‐‑–—-]evolving|rapidly (?:changing|evolving)|digital|complex|evolving|changing)\\s+){0,3}landscape\\b', '\\bunlock(?:ing|s|ed)?\\s+(?:(?:the|your|our|their|its)\\s+)?(?:full|true|limitless|untapped)\\s+potential\\b'] }),
    custom(c, 'tier2', 'The word cluster has achieved sentience', 1, (ctx) => cluster(ctx, SECONDARY, 3, 1)),
    custom(c, 'tier3', 'Every noun brought an impressive adjective', 1.5, (ctx) => cluster(ctx, TERTIARY, 4, 2)),
  ],
};
