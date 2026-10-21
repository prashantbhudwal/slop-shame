import type { PostContext } from './rule-types';
import type { PostInput } from './types';

// Deliberately fold lookalikes only; this is not transliteration.
const LOOKALIKES: Readonly<Record<string, string>> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', к: 'k', м: 'm', н: 'h', в: 'b', т: 't', і: 'i', ј: 'j', ѕ: 's',
  А: 'A', Е: 'E', О: 'O', Р: 'P', С: 'C', Х: 'X', У: 'Y', К: 'K', М: 'M', Н: 'H', В: 'B', Т: 'T', І: 'I', Ј: 'J', Ѕ: 'S',
  α: 'a', ο: 'o', ρ: 'p', Α: 'A', Ο: 'O', Ρ: 'P', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Τ: 'T', Υ: 'Y', Χ: 'X',
};
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g;
const HOMOGLYPHS = /[\u0370-\u03ff\u0400-\u04ff]/g;
const WORDS = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:'[\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu;
const HASHTAGS = /(?:^|[^\p{L}\p{N}_])#([\p{L}\p{M}\p{N}_]+)/gu;
const PICTOGRAPH = /\p{Extended_Pictographic}/gu;
const EMOJI_BULLET = /^[\s\uFE0F]*(?:✅|☑|🚀|👉|🔥|💡|📈|💪|🎯|⭐|✨|🔑|📌|💥|🧠|⚡|❌|💰|🔹|✔)/u;
const LATIN = /[a-z]/i;
const NON_LATIN_LOOKALIKE_RANGE = /[\u0370-\u03ff\u0400-\u04ff]/;
const LETTERS = /\p{L}/gu;
const LATIN_LETTERS = /[a-z]/gi;
const RAW_WORDS = /[\p{L}\p{M}]+/gu;
const EMBEDDED_NON_LATIN = /[a-z][\u0370-\u03ff\u0400-\u04ff]+[a-z]/i;
const FOOTER_LINE = /^(?:#[\p{L}\p{M}\p{N}_]+\s*|[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D]\s*)+$/u;
// Keep complete examples, including newlines between Markdown quote lines.
// Matching never removes characters or changes evidence offsets.
const PROTECTED_OPEN = /```|~~~|`|“|‘|"|(?:^|\n)[\t ]*>/g;
const NON_WHITESPACE = /\S/;
type Span = readonly [number, number];

function protectedRanges(text: string): Span[] {
  const spans: [number, number][] = [];
  const unclosed = new Set<string>();
  PROTECTED_OPEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PROTECTED_OPEN.exec(text))) {
    const start = match.index;
    const opening = match[0];
    let end: number;
    if (opening === '```' || opening === '~~~') {
      const closing = text.indexOf(opening, PROTECTED_OPEN.lastIndex);
      end = closing < 0 ? text.length : closing + 3;
    } else if (opening === '`') {
      const closing = text.indexOf('`', PROTECTED_OPEN.lastIndex);
      if (closing <= start + 1 || text.slice(start + 1, closing).includes('\n')) continue;
      end = closing + 1;
    } else if (opening === '“' || opening === '‘' || opening === '"') {
      // Cache absent closers: retrying a negated-class regex at every stray
      // opener would scan an unmatched multiline quotation quadratically.
      if (unclosed.has(opening)) continue;
      let closing = -1;
      if (opening === '"') {
        for (let i = start + 1; i < text.length; i++) {
          if (text[i] === '\\') i++;
          else if (text[i] === '"') { closing = i; break; }
        }
      } else closing = text.indexOf(opening === '“' ? '”' : '’', start + 1);
      if (closing < 0) { unclosed.add(opening); continue; }
      end = closing + 1;
    } else {
      // Consume the entire run of Markdown quote lines, not each line's text.
      const newline = text.indexOf('\n', PROTECTED_OPEN.lastIndex);
      end = newline < 0 ? text.length : newline;
      while (end < text.length) {
        let next = end + 1;
        while (text[next] === ' ' || text[next] === '\t') next++;
        if (text[next] !== '>') break;
        const newline = text.indexOf('\n', next + 1);
        end = newline < 0 ? text.length : newline;
      }
    }
    const previous = spans[spans.length - 1];
    if (previous && (start <= previous[1] || !NON_WHITESPACE.test(text.slice(previous[1], start)))) previous[1] = Math.max(previous[1], end);
    else spans.push([start, end]);
    PROTECTED_OPEN.lastIndex = end;
  }
  return spans;
}

/** Protected ranges are ordered and merged; test containment in O(log n). */
export function isProtectedSpan(ranges: readonly Span[], span: Span): boolean {
  let lo = 0; let hi = ranges.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ranges[mid]![0] <= span[0]) lo = mid + 1; else hi = mid;
  }
  return lo > 0 && ranges[lo - 1]![1] >= span[1];
}

function mixedScriptWords(text: string): string[] {
  if (!NON_LATIN_LOOKALIKE_RANGE.test(text)) return [];
  // Script mixing is ordinary in Russian/Greek prose (e.g. "SMSку"). A
  // fingerprint requires mostly Latin prose AND a mostly Latin word.
  const letterCount = (text.match(LETTERS) ?? []).length;
  if ((text.match(LATIN_LETTERS) ?? []).length / Math.max(1, letterCount) < 0.7) return [];
  return (text.match(RAW_WORDS) ?? []).filter((word) => {
    if (!LATIN.test(word) || !EMBEDDED_NON_LATIN.test(word) || !HOMOGLYPH_WORD.test(word)) return false;
    const letters = Array.from(word).length;
    return letters >= 4 && (word.match(LATIN_LETTERS) ?? []).length / letters >= 0.75;
  });
}

export function normalizeText(text: string): string {
  return text.replace(/´/g, "'").normalize('NFKC').replace(INVISIBLE, '').replace(HOMOGLYPHS, (char) => LOOKALIKES[char] ?? char).replace(/\r\n?/g, '\n');
}

export function straighten(text: string): string {
  return text.replace(/[‘’ʼ‛′＇]/g, "'").replace(/[“”]/g, '"');
}

/** Extra structural data stays internal; contributors still receive PostContext. */
export interface PostStructure {
  straight: string;
  /** Exact ctx.text ranges corresponding to ctx.words, including case folds. */
  wordSpans: readonly Span[];
  /** Complete quoted/code examples, ordered and merged. */
  protectedSpans: readonly Span[];
  sentenceSpans: readonly (readonly [number, number])[];
  sentenceWordCounts: readonly number[];
  lineWordCounts: readonly number[];
  openingEnd: number;
  closingStart: number;
  /** End of prose, excluding trailing hashtag/emoji-only lines. */
  bodyEnd: number;
  blankBreaks: number;
  emojiBullets: number;
  rockets: number;
  emDashes: number;
  zeroWidthInWords: number;
  mixedScriptWords: readonly string[];
  /** Maps expanding lowercase characters back to exact text offsets (rare). */
  lowerOffsets: readonly number[] | null;
}
const structures = new WeakMap<PostContext, PostStructure>();

export function structureOf(ctx: PostContext): PostStructure {
  const structure = structures.get(ctx);
  if (!structure) throw new Error('PostContext must be created with buildContext().');
  return structure;
}

export function buildContext(input: PostInput): PostContext {
  const text = normalizeText(input.text);
  const straight = straighten(text);
  const lower = straight.toLowerCase();
  const lines: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  const lineWordCounts: number[] = [];
  let emojiBullets = 0;
  // Find lines rather than splitting them again in each structural rule.
  for (const match of text.matchAll(/[^\n]+/g)) {
    const line = match[0].trim();
    if (!line) continue;
    lines.push(line);
    starts.push(match.index + match[0].indexOf(line));
    ends.push(starts[starts.length - 1]! + line.length);
    lineWordCounts.push(0);
    if (EMOJI_BULLET.test(line)) emojiBullets++;
  }
  let lowerOffsets: number[] | null = null;
  if (lower.length !== text.length) {
    lowerOffsets = [];
    let offset = 0;
    for (const char of text) {
      for (let j = 0; j < char.toLowerCase().length; j++) lowerOffsets.push(offset);
      offset += char.length;
    }
    lowerOffsets.push(text.length);
  }
  const words: string[] = [];
  const wordSpans: [number, number][] = [];
  const sentences: string[] = [];
  const sentenceSpans: [number, number][] = [];
  const sentenceWordCounts: number[] = [];
  for (const match of text.matchAll(/[^.!?\n]+(?:[.!?]+["'”’)]*|(?=\n)|$)/g)) {
    const sentence = match[0].trim();
    if (!sentence) continue;
    const start = match.index + match[0].indexOf(sentence);
    sentences.push(sentence);
    sentenceSpans.push([start, start + sentence.length]);
    sentenceWordCounts.push(0);
  }
  let lineIndex = 0;
  let sentenceIndex = 0;
  for (const match of lower.matchAll(WORDS)) {
    words.push(match[0]);
    const offset = lowerOffsets?.[match.index] ?? match.index;
    const lowerEnd = match.index + match[0].length;
    wordSpans.push([offset, lowerOffsets?.[lowerEnd] ?? lowerEnd]);
    while (lineIndex + 1 < starts.length && offset >= starts[lineIndex + 1]!) lineIndex++;
    if (lines.length) lineWordCounts[lineIndex] = lineWordCounts[lineIndex]! + 1;
    while (sentenceIndex + 1 < sentenceSpans.length && offset >= sentenceSpans[sentenceIndex + 1]![0]) sentenceIndex++;
    if (sentenceSpans.length) sentenceWordCounts[sentenceIndex] = sentenceWordCounts[sentenceIndex]! + 1;
  }
  const hashtags = new Set<string>();
  for (const match of lower.matchAll(HASHTAGS)) hashtags.add(`#${match[1]}`);
  for (const tag of input.hashtags ?? []) {
    const clean = normalizeText(tag).toLowerCase().trim().replace(/^#?/, '#');
    if (/^#[\p{L}\p{M}\p{N}_]+$/u.test(clean)) hashtags.add(clean);
  }
  const ctx: PostContext = {
    input, text, lower, lines,
    sentences,
    words, wordCount: words.length,
    emojiCount: Array.from(text.matchAll(PICTOGRAPH)).length,
    hashtags: [...hashtags],
  };
  let lastBodyLine = lines.length - 1;
  while (lastBodyLine >= 0 && FOOTER_LINE.test(lines[lastBodyLine]!)) lastBodyLine--;
  structures.set(ctx, {
    straight, wordSpans, protectedSpans: protectedRanges(text), sentenceSpans, sentenceWordCounts,
    lineWordCounts,
    openingEnd: ends[Math.min(1, ends.length - 1)] ?? 0,
    closingStart: lastBodyLine >= 0 ? starts[Math.max(0, lastBodyLine - 1)]! : text.length,
    bodyEnd: ends[lastBodyLine] ?? 0,
    blankBreaks: (text.match(/\n[\t ]*\n/g) ?? []).length,
    emojiBullets,
    rockets: (text.match(/🚀/gu) ?? []).length,
    emDashes: (text.match(/—/g) ?? []).length,
    zeroWidthInWords: Array.from(input.text.matchAll(/[a-z][\u200B-\u200D\u2060\uFEFF]+(?=[a-z])/gi)).reduce((sum, match) => sum + match[0].length - 1, 0),
    mixedScriptWords: mixedScriptWords(input.text),
    lowerOffsets,
  });
  return ctx;
}

const HOMOGLYPH_WORD = /[аеорсхукіјѕАЕОРСХУКІЈЅαορΑΟΡΒΕΖΗΙΚΜΝΤΥΧ]/;
