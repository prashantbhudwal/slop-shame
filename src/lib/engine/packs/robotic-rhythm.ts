import { structureOf } from '../context';
import type { RulePack } from '../rule-types';
import { ATTRIBUTION, custom } from '../rules';
const TRIPLE = /\b[\p{L}][\p{L} -]{1,28},\s+[\p{L}][\p{L} -]{1,28},?\s+and\s+[\p{L}][\p{L} -]{1,28}[.!?]?$/u;
const PUNCTUATION = /[,;:]/g;
function cv(values: readonly number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) / mean : 1;
}
const c = 'robotic-rhythm';
export const roboticRhythm: RulePack = {
  id: c, name: 'The metronome wrote this', description: 'Linear-time stylometrics, gated to samples long enough to measure.', attribution: ATTRIBUTION,
  rules: [
    custom(c, 'uniformity', 'Every sentence clocks in for the same shift', 4, (ctx) => {
      const counts = structureOf(ctx).sentenceWordCounts.filter((count) => count >= 5);
      return ctx.wordCount >= 80 && counts.length >= 6 && cv(counts) < 0.16 ? { matches: ctx.sentences.slice(0, 3) } : null;
    }),
    custom(c, 'rule-of-three', 'Every idea has two mandatory siblings', 3, (ctx) => {
      if (ctx.wordCount < 80) return null;
      const matches = ctx.sentences.filter((s) => TRIPLE.test(s));
      return matches.length >= 2 ? { matches: matches.slice(0, 3), scale: Math.min(2, Math.sqrt(matches.length - 1)) } : null;
    }),
    custom(c, 'cross-para-burstiness', 'Paragraphs in identical shipping containers', 3, (ctx) => {
      const counts = structureOf(ctx).lineWordCounts.filter((n) => n >= 20);
      return ctx.wordCount >= 150 && counts.length >= 5 && cv(counts) < 0.13 ? { matches: ctx.lines.slice(0, 3) } : null;
    }),
    custom(c, 'punct-distribution', 'The commas have a recurring calendar invite', 2, (ctx) => {
      if (ctx.wordCount < 100 || ctx.sentences.length < 6) return null;
      const counts = ctx.sentences.map((s) => (s.match(PUNCTUATION) ?? []).length);
      return counts.every((n) => n >= 1) && cv(counts) < 0.1 ? { matches: ctx.sentences.slice(0, 3) } : null;
    }),
  ],
};
