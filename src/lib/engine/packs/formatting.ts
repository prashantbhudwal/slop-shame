import { structureOf } from '../context';
import type { RulePack } from '../rule-types';
import { ATTRIBUTION, custom } from '../rules';
const BULLET = /^(?:✅|☑|🚀|👉|🔥|💡|📈|💪|🎯|⭐|✨|🔑|📌|💥|🧠|⚡|❌|💰|🔹|✔)/u;
const BARE_BULLET = /^[-*•]\s+[^.!?:]{2,45}$/;
const TITLE = /^(?:#{1,6}\s+)?(?:[A-Z][a-z]+\s+){2,7}[A-Z][a-z]+$/;
const TAG_LINE = /^(?:#[\p{L}\p{M}\p{N}_]+\s*)+$/u;
const GENERIC = new Set(['#leadership', '#motivation', '#growth', '#success', '#mindset', '#ai', '#innovation', '#hustle', '#inspiration', '#business']);
const MATH_BOLD = /[\u{1D400}-\u{1D7FF}]+/gu;
const SMART_QUOTE = /[“”]/;
const OXFORD_COMMA = /, and /;
const SMART_PUNCT = /[“”—]/;
const SECTION = /^(?:[\p{Extended_Pictographic}\uFE0F\s]*\d{1,2}[.)]\s*\p{L}|[A-Z][A-Z \d-]{5,}:?$)/u;
const c = 'formatting';
export const formatting: RulePack = {
  id: c, name: 'The formatting department', description: 'Formatting clusters are weak corroboration, never authorship proof.', attribution: ATTRIBUTION,
  rules: [
    custom(c, 'em-dash', 'An em dash has been appointed co-author', 1, (ctx) => {
      const count = structureOf(ctx).emDashes;
      return count >= 3 && count / ctx.wordCount > 0.08 ? { matches: ctx.sentences.filter((s) => s.includes('—')).slice(0, 3), scale: Math.min(2, Math.sqrt(count - 1)) } : null;
    }),
    custom(c, 'unicode-bold', 'The alphabet put on a ghostwriting costume', 4, (ctx) => {
      const matches = ctx.input.text.match(MATH_BOLD) ?? [];
      return matches.reduce((sum, match) => sum + Array.from(match).length, 0) >= 8 ? { matches: matches.slice(0, 3), scale: Math.min(3, Math.sqrt(matches.length)) } : null;
    }),
    custom(c, 'section-outline', 'The outline arrived in numbered costumes', 1, (ctx) => {
      const matches = ctx.lines.filter((line) => SECTION.test(line));
      return matches.length >= 2 ? { matches, scale: Math.sqrt(matches.length) } : null;
    }),
    custom(c, 'arrow-chain', 'Every idea came with a process diagram', 2, (ctx) => {
      const matches = ctx.lines.filter((line) => (line.match(/[→⇒⟶]/gu) ?? []).length >= 2);
      return matches.length ? { matches, scale: Math.sqrt(matches.length) } : null;
    }),
    custom(c, 'emoji-bullets', 'Every bullet got an emotional support emoji', 4, (ctx) => {
      const count = structureOf(ctx).emojiBullets;
      return count >= 3 ? { matches: ctx.lines.filter((line) => BULLET.test(line)).slice(0, 3), scale: Math.min(2.5, Math.sqrt(count - 1)) } : null;
    }),
    custom(c, 'emoji-density', 'Words are the minority shareholders', 3, (ctx) => ctx.emojiCount >= 6 && ctx.emojiCount / ctx.wordCount >= 0.15 ? { matches: ctx.lines.slice(0, 3), scale: Math.min(3, ctx.emojiCount / ctx.wordCount / 0.15) } : null),
    custom(c, 'hashtag-stuff', 'The footer is a keyword landfill', 4, (ctx) => {
      const generic = ctx.hashtags.filter((tag) => GENERIC.has(tag));
      const wall = TAG_LINE.test(ctx.lines.at(-1) ?? '');
      if (ctx.hashtags.length >= 6 && (wall || generic.length >= 4)) return { matches: ctx.hashtags.slice(0, 3), scale: Math.min(3, Math.sqrt(ctx.hashtags.length - 4)) };
      return wall && generic.length >= 3 ? { matches: generic.slice(0, 3), scale: 0.5 } : null;
    }),
    custom(c, 'bullet-np-list', 'Nouns pretending to be an explanation', 3, (ctx) => {
      const matches = ctx.lines.filter((line, i) => BARE_BULLET.test(line) && structureOf(ctx).lineWordCounts[i]! <= 7);
      return matches.length >= 5 ? { matches: matches.slice(0, 3) } : null;
    }),
    custom(c, 'title-case-header', 'Every Heading Has Been Promoted', 1.5, (ctx) => {
      const matches = ctx.lines.filter((line) => TITLE.test(line));
      return matches.length >= 3 ? { matches: matches.slice(0, 3) } : null;
    }),
    custom(c, 'smart-punct-signature', 'Suspiciously perfect typography attendance', 1.5, (ctx) => ctx.wordCount >= 80 && SMART_QUOTE.test(ctx.text) && structureOf(ctx).emDashes >= 2 && OXFORD_COMMA.test(ctx.text) ? { matches: ctx.sentences.filter((s) => SMART_PUNCT.test(s)).slice(0, 3) } : null),
  ],
};
