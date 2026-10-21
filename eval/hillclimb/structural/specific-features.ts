import { structureOf } from '../../../data/eval/raw/hillclimb/structural-engine/engine/context';
import type { PostContext } from '../../../src/lib/engine/rule-types';
const DIGIT = /\d/;
const CAPITAL = /^\p{Lu}/u;
const GENERIC_CAPITALS = new Set(['i','ai','llm','llms','ceo','cto','cfo','hr','roi','kpi','kpis','b2b','b2c','saas','ok','okay']);
const MENTION = /(?:^|[^\p{L}\p{N}_])@[\p{L}\p{N}_]+/gu;
const URL = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const CURRENCY = /[$€£¥₹]/g;
// Fixed before reading low-effort output. User examples + conventional aphorisms.
const PLATITUDE = /\b(?:keep showing up|keep learning|let the results compound|consistency is key|progress (?:not|over) perfection|trust the process|small steps|one step at a time|stay curious|start small|stay consistent|keep pushing|make it happen|take the first step|embrace the journey|work smarter|real progress|real impact|make a difference|be intentional)\b/g;
function count(regex: RegExp, text: string): number {
  regex.lastIndex = 0; let n = 0; while (regex.exec(text)) n++; return n;
}
export function features(ctx: PostContext): Record<string, number> {
  const st = structureOf(ctx);
  let specific = 0, sentence = 0, first = true;
  for (let i = 0; i < ctx.words.length; i++) {
    const [start] = st.wordSpans[i]!;
    while (sentence + 1 < st.sentenceSpans.length && start >= st.sentenceSpans[sentence + 1]![0]) { sentence++; first = true; }
    const word = ctx.words[i]!;
    if (DIGIT.test(word) || (!first && !GENERIC_CAPITALS.has(word) && CAPITAL.test(ctx.text[start]!))) specific++;
    first = false;
  }
  // These are specificity markers, not deduplicated semantic entities: e.g. a
  // named @mention can supply both a capital token and a mention marker.
  specific += count(MENTION,ctx.text) + count(URL,ctx.text) + count(CURRENCY,ctx.text);
  const platitudes = count(PLATITUDE,ctx.lower), rate = 100 / Math.max(1,ctx.wordCount);
  const short = ctx.wordCount >= 40 && ctx.wordCount <= 300;
  return {
    specifics_rate: specific * rate,
    no_specifics_60: Number(ctx.wordCount >= 60 && ctx.wordCount <= 300 && specific === 0),
    platitude_density: platitudes * rate,
    platitude_count: platitudes,
    vague_platitude_count: short && specific === 0 ? platitudes : 0,
    vague_platitude_density: short && specific === 0 ? platitudes * rate : 0,
  };
}
