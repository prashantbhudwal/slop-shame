import { structureOf } from '../context';
import type { RulePack } from '../rule-types';
import { ATTRIBUTION, custom } from '../rules';
const TRIPLE = /\b[\p{L}][\p{L} -]{1,28},\s+[\p{L}][\p{L} -]{1,28},?\s+and\s+[\p{L}][\p{L} -]{1,28}[.!?]?$/u;
const PUNCTUATION = /[,;:]/g;
const LETTER_RUN = /\p{L}+/gu;
const WORD_BOUNDARY = /\b/uy;
const PARALLEL = /\b[\p{L}]+\s+(?:guides?|shapes?|defines?|drives?|controls?|builds?)\s+[\p{L}]+[.!]\s+[\p{L}]+\s+(?:guides?|shapes?|defines?|drives?|controls?|builds?)\s+[\p{L}]+[.!]/uy;

function parallelMatches(text: string): string[] {
  const matches: string[] = [];
  let end = 0;
  // JS \b is ASCII-based, so a中a中 contains a boundary at every letter.
  // All starts within one letter run share the same suffix after \p{L}+.
  // Try only its first boundary, preserving the original global match and
  // snippet semantics without rescanning the remaining run on every miss.
  for (const run of text.matchAll(LETTER_RUN)) {
    if (run.index < end) continue;
    const runEnd = run.index + run[0].length;
    for (let start = run.index; start < runEnd; start += text.codePointAt(start)! > 0xffff ? 2 : 1) {
      WORD_BOUNDARY.lastIndex = start;
      if (!WORD_BOUNDARY.test(text)) continue;
      PARALLEL.lastIndex = start;
      const match = PARALLEL.exec(text);
      if (match) { matches.push(match[0]); end = PARALLEL.lastIndex; }
      break;
    }
  }
  return matches;
}
function cv(values: readonly number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) / mean : 1;
}
const c = 'robotic-rhythm';
export const roboticRhythm: RulePack = {
  id: c, name: 'The metronome wrote this', description: 'Linear-time stylometrics, gated to samples long enough to measure.', attribution: ATTRIBUTION,
  rules: [
    custom(c, 'parallel-pair', 'Two abstract maxims marching in step', 4, (ctx) => {
      if (ctx.wordCount < 80 || ctx.sentences.length < 4) return null;
      const matches = parallelMatches(ctx.text);
      return matches.length ? { matches, scale: Math.sqrt(matches.length) } : null;
    }),
    custom(c, 'uniformity', 'Every sentence clocks in for the same shift', 4, (ctx) => {
      const counts = structureOf(ctx).sentenceWordCounts.filter((count) => count >= 5);
      return ctx.wordCount >= 80 && counts.length >= 6 && cv(counts) < 0.16 ? { matches: ctx.sentences.slice(0, 3) } : null;
    }),
    custom(c, 'rule-of-three', 'Every idea has two mandatory siblings', 1.5, (ctx) => {
      const matches = ctx.sentences.filter((s) => TRIPLE.test(s));
      // An explicit grammatical construction, not a short-sample statistic.
      // The scorer only admits it alongside an independent phrase family.
      return matches.length ? { matches: matches.slice(0, 3), scale: Math.min(2, Math.sqrt(matches.length)) } : null;
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
