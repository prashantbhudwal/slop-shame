// Research extraction only. Runtime candidate rules live in measured/structural.ts.
// Reuse the frozen snapshot's exact tokens/counts; never split the body again.
import { structureOf } from '../../../data/eval/raw/hillclimb/structural-engine/engine/context';
import type { PostContext } from '../../../src/lib/engine/rule-types';

const TRANSITION = /^(?:moreover|furthermore|additionally|however|therefore|thus|consequently|nevertheless|nonetheless|meanwhile|finally|firstly|secondly|thirdly|in addition|in contrast|for example|for instance|in conclusion|in summary|overall|ultimately|to summarize)\b/i;
const SUMMARY = /^(?:in conclusion|in summary|to summarize|to sum up|overall|ultimately|in closing|in essence)\b/i;
const HEADER = /^#{1,6}\s+\S/;
const BOLD = /\*\*[^*\n]+\*\*|__[^_\n]+__/;
const NUMBERED = /^\d{1,3}[.)]\s+\S/;
const BULLET = /^[-*+•]\s+\S/;
const LABEL = /^(?:\*\*)?[A-Z][A-Za-z0-9 /&-]{1,48}(?:\*\*)?:\s+\S/;
const FIRST = new Set(['i', "i'm", "i've", "i'll", "i'd", 'me', 'my', 'mine', 'myself', 'we', "we're", "we've", "we'll", "we'd", 'us', 'our', 'ours', 'ourselves']);
const DIGIT = /\d/;

function stats(values: readonly number[]) {
  let n = 0, sum = 0, sum2 = 0;
  for (const v of values) if (v > 0) { n++; sum += v; sum2 += v * v; }
  const mean = sum / Math.max(1, n);
  return { n, mean, cv: mean ? Math.sqrt(Math.max(0, sum2 / n - mean * mean)) / mean : 0 };
}

export function features(ctx: PostContext): Record<string, number | null> {
  const st = structureOf(ctx), wc = ctx.wordCount, sent = stats(st.sentenceWordCounts);
  const paragraphs: number[] = [], paraStarts: number[] = [];
  let end = 0, p = -1, header = 0, bold = 0, numbered = 0, bullet = 0, labels = 0;
  for (let i = 0; i < ctx.lines.length; i++) {
    const line = ctx.lines[i]!, start = ctx.text.indexOf(line, end);
    let newlines = 0;
    for (let j = end; j < start; j++) if (ctx.text.charCodeAt(j) === 10) newlines++;
    if (p < 0 || newlines >= 2) { p++; paragraphs.push(0); paraStarts.push(start); }
    paragraphs[p]! += st.lineWordCounts[i]!;
    header += Number(HEADER.test(line)); bold += Number(BOLD.test(line));
    numbered += Number(NUMBERED.test(line)); bullet += Number(BULLET.test(line)); labels += Number(LABEL.test(line));
    end = start + line.length;
  }
  const para = stats(paragraphs), line = stats(st.lineWordCounts), lines = Math.max(1, ctx.lines.length);
  const paraSent = new Array<number>(paragraphs.length).fill(0);
  let pi = 0, transition = 0, repeated1 = 0, repeated2 = 0, wi = 0;
  const openings1 = new Map<string, number>(), openings2 = new Map<string, number>();
  for (let i = 0; i < ctx.sentences.length; i++) {
    const span = st.sentenceSpans[i]!;
    while (pi + 1 < paraStarts.length && span[0] >= paraStarts[pi + 1]!) pi++;
    if (paraSent.length) paraSent[pi]!++;
    transition += Number(TRANSITION.test(ctx.sentences[i]!));
    while (wi < st.wordSpans.length && st.wordSpans[wi]![0] < span[0]) wi++;
    if (wi >= ctx.words.length || st.wordSpans[wi]![0] >= span[1]) continue;
    const one = ctx.words[wi]!, a = (openings1.get(one) ?? 0) + 1; openings1.set(one, a); repeated1 = Math.max(repeated1, a);
    if (wi + 1 < ctx.words.length && st.wordSpans[wi + 1]![0] < span[1]) {
      const two = one + ' ' + ctx.words[wi + 1]!, b = (openings2.get(two) ?? 0) + 1; openings2.set(two, b); repeated2 = Math.max(repeated2, b);
    }
  }
  let comma = 0, colon = 0, semi = 0, paren = 0, question = 0, exclaim = 0, en = 0, digits = 0, first = 0, chars = 0;
  for (let i = 0; i < ctx.text.length; i++) {
    switch (ctx.text.charCodeAt(i)) {
      case 44: comma++; break; case 58: colon++; break; case 59: semi++; break;
      case 40: paren++; break; case 63: question++; break; case 33: exclaim++; break; case 8211: en++; break;
    }
  }
  for (const w of ctx.words) { chars += w.length; digits += Number(DIGIT.test(w)); first += Number(FIRST.has(w)); }
  const r = 100 / Math.max(1, wc), sn = ctx.sentences.length, longEnough = wc >= 80 && sent.n >= 6;
  let runSum = 0, runSquare = 0, runSize = 0, runMin = Infinity;
  for (let i = 0; i < st.sentenceWordCounts.length; i++) {
    const n = st.sentenceWordCounts[i]!;
    if (n < 5) { runSum = 0; runSquare = 0; runSize = 0; continue; }
    runSum += n; runSquare += n * n; runSize++;
    if (runSize > 6) { const old = st.sentenceWordCounts[i - 6]!; runSum -= old; runSquare -= old * old; }
    if (runSize >= 6 && runSum >= 60 && runSum <= 240) {
      const mean = runSum / 6;
      runMin = Math.min(runMin, Math.sqrt(Math.max(0, runSquare / 6 - mean * mean)) / mean);
    }
  }
  let summaryTail = 0, suffixWords = 0;
  for (let i = sn - 1; i >= Math.max(0, sn - 2); i--) {
    suffixWords += st.sentenceWordCounts[i]!;
    if (wc >= 80 && sn >= 3 && suffixWords >= 15 && suffixWords <= 120 && suffixWords <= wc * .35 && SUMMARY.test(ctx.sentences[i]!)) summaryTail = 1;
  }
  const lastStart = paraStarts.at(-1) ?? 0;
  const closingMarker = paragraphs.length >= 2 && SUMMARY.test(ctx.text.slice(lastStart, lastStart + 48));
  const last = paragraphs.at(-1) ?? 0, bodyMean = (wc - last) / Math.max(1, paragraphs.length - 1);
  return {
    sentence_mean: longEnough ? sent.mean : null,
    sentence_cv: longEnough ? sent.cv : null,
    paragraph_mean: paragraphs.length >= 3 && wc >= 120 ? para.mean : null,
    paragraph_cv: paragraphs.length >= 3 && wc >= 120 ? para.cv : null,
    line_cv: lines >= 5 && wc >= 120 ? line.cv : null,
    sentences_per_paragraph: paragraphs.length >= 2 ? sn / paragraphs.length : null,
    transition_share: sn >= 6 ? transition / sn : null,
    comma_rate: comma * r, colon_rate: colon * r, semicolon_rate: semi * r,
    parenthesis_rate: paren * r, question_rate: question * r, exclamation_rate: exclaim * r,
    emdash_rate: st.emDashes * r, endash_rate: en * r,
    header_share: header / lines, bold_share: bold / lines,
    numbered_share: numbered / lines, bullet_share: bullet / lines,
    list_share: (numbered + bullet) / lines, label_share: labels / lines,
    first_person_rate: first * r, digit_rate: digits * r, average_word_length: wc ? chars / wc : null,
    repeated_opener1: sn >= 6 && repeated1 >= 3 ? repeated1 / sn : null,
    repeated_opener2: sn >= 6 && repeated2 >= 3 ? repeated2 / sn : null,
    closing_summary: Number(closingMarker && last >= 15 && last <= 120),
    closing_ratio: paragraphs.length >= 3 && wc >= 120 ? last / Math.max(1, bodyMean) : null,
    closing_single_sentence: Number(paragraphs.length >= 3 && last >= 15 && paraSent.at(-1) === 1),
    // Corroborating constructions, rather than mere absence of human variation.
    transition_count: transition >= 2 && sn >= 6 ? transition : 0,
    label_count: labels,
    bold_count: bold,
    header_count: header,
    numbered_count: numbered,
    bullet_count: bullet,
    list_count: numbered + bullet,
    regular_run_cv6: wc >= 80 && Number.isFinite(runMin) ? runMin : null,
    summary_tail: summaryTail,
  };
}
