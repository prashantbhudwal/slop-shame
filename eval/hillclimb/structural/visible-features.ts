// Target revision: explicit, nameable pasted-output smells. Design on train only.
import { structureOf } from '../../../data/eval/raw/hillclimb/structural-engine/engine/context';
import type { PostContext } from '../../../src/lib/engine/rule-types';

const HEADER = /^#{1,6}\s+\S/;
const BOLD = /\*\*[^*\n]{1,160}\*\*|__[^_\n]{1,160}__/;
const BOLD_HEAD = /^(?:\*\*[^*\n]{2,60}\*\*|__[^_\n]{2,60}__):?(?:\s|$)/;
const LIST = /^(?:[-*+•]|\d{1,3}[.)])\s+\S/;
const EMOJI = /^[\s\uFE0F]*(?:✅|☑|🚀|👉|🔥|💡|📈|💪|🎯|⭐|✨|🔑|📌|💥|🧠|⚡|❌|💰|🔹|✔)/u;
const SCAFFOLD = /^(?:here(?:'s| is) (?:why|how|what (?:i|we) learned)|key takeaways|the takeaways|takeaways|key lessons|lessons learned|here are (?:the |my )?(?:\d{1,2} |key )?(?:takeaways|lessons|tips|steps))\s*:?$/i;
const TAG_WALL = /^(?:#[\p{L}\p{M}\p{N}_]+\s*)+$/u;
const TAG = /#[\p{L}\p{M}\p{N}_]+/gu;
const CTA = /\b(?:comment|share|repost|follow|thoughts|agree)\b/i;
const TRIPLE = /\b[\p{L}][\p{L} -]{1,28},\s+[\p{L}][\p{L} -]{1,28},?\s+and\s+[\p{L}][\p{L} -]{1,28}[.!?]?$/u;

export function features(ctx: PostContext): Record<string, number> {
  let headers = 0, bold = 0, boldHead = 0, lists = 0, emoji = 0, scaffold = 0, boldList = 0, short = 0, math = 0, triples = 0;
  const st = structureOf(ctx), count = ctx.lines.length;
  for (let i = 0; i < count; i++) {
    const line = ctx.lines[i]!;
    headers += Number(HEADER.test(line)); bold += Number(BOLD.test(line)); boldHead += Number(BOLD_HEAD.test(line));
    lists += Number(LIST.test(line)); emoji += Number(EMOJI.test(line)); short += Number(st.lineWordCounts[i]! <= 12);
    if (SCAFFOLD.test(line) || BOLD_HEAD.test(line)) {
      let following = 0;
      for (let j = i + 1; j < Math.min(count, i + 9); j++) following += Number(LIST.test(ctx.lines[j]!) || EMOJI.test(ctx.lines[j]!));
      if (SCAFFOLD.test(line)) scaffold = Math.max(scaffold, following);
      if (BOLD_HEAD.test(line)) boldList = Math.max(boldList, following);
    }
  }
  for (const char of ctx.input.text) { const n = char.codePointAt(0)!; if (n >= 0x1d400 && n <= 0x1d7ff) math++; }
  for (const sentence of ctx.sentences) triples += Number(TRIPLE.test(sentence));
  let bodySentence = ctx.sentences.length - 1;
  while (bodySentence >= 0 && st.sentenceSpans[bodySentence]![0] >= st.bodyEnd) bodySentence--;
  const last = ctx.sentences[bodySentence] ?? '', footer = ctx.lines.at(-1) ?? '';
  let tags = 0;
  if (TAG_WALL.test(footer)) { TAG.lastIndex = 0; while (TAG.exec(footer)) tags++; }
  const socialLength = ctx.wordCount >= 40 && ctx.wordCount <= 300;
  const question = ctx.wordCount >= 40 && /\?["”')]*$/.test(last);
  return {
    visible_markdown_headers: headers,
    visible_markdown_bold: bold,
    visible_bold_headings: boldHead,
    visible_scaffold_list: socialLength && scaffold >= 2 ? scaffold : 0,
    visible_bold_list: socialLength && boldList >= 2 ? boldList : 0,
    visible_emoji_list: socialLength && emoji >= 3 ? emoji : 0,
    visible_outline_list: socialLength && lists >= 3 ? lists : 0,
    visible_unicode_bold: math >= 8 ? math : 0,
    visible_hashtag_wall: tags >= 5 ? tags : 0,
    visible_heavy_dash: socialLength && st.emDashes >= 3 ? st.emDashes : 0,
    visible_closing_question: Number(question),
    visible_hook_lines_cta: Number(socialLength && count >= 6 && st.lineWordCounts[0]! <= 12 && short / count >= .8 && (question || CTA.test(footer))),
    visible_repeated_triples: triples >= 2 ? triples : 0,
  };
}
