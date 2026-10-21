// Candidate only: deliberately NOT registered in packs/index.ts.
// Train-only thresholds, source-grouped RAID train/dev; no test split read.
// See eval/hillclimb/STRUCTURAL.md for domain/model FP, source-format caveats,
// incremental public-engine measurements and reproduction commands.
// Target: visible, low-effort pasted-output smells. Clean AI is out of scope.
// All rules are style evidence; general formal writing is not a verdict.
import { structureOf } from '../../context';
import type { PostContext, RuleHit, RulePack } from '../../rule-types';

// Precompiled, anchored alternatives: no splitting/lowercasing/tokenization.
const TRANSITION = /^(?:moreover|furthermore|additionally|however|therefore|thus|consequently|nevertheless|nonetheless|meanwhile|finally|firstly|secondly|thirdly|in addition|in contrast|for example|for instance|in conclusion|in summary|overall|ultimately|to summarize)\b/i;
const SUMMARY = /^(?:in conclusion|in summary|to summarize|to sum up|overall|ultimately|in closing|in essence)\b/i;
const HEADER = /^#{1,6}\s+\S/;
const BOLD = /\*\*[^*\n]{1,160}\*\*|__[^_\n]{1,160}__/;
const BOLD_HEAD = /^(?:\*\*[^*\n]{2,60}\*\*|__[^_\n]{2,60}__):?(?:\s|$)/;
const PLATITUDE = /\b(?:keep showing up|keep learning|let the results compound|consistency is key|progress (?:not|over) perfection|trust the process|small steps|one step at a time|stay curious|start small|stay consistent|keep pushing|make it happen|take the first step|embrace the journey|work smarter|real progress|real impact|make a difference|be intentional)\b/g;
const SPECIFIC = /https?:\/\/[^\s]+|www\.[^\s]+|[$€£¥₹]|(?:^|[^\p{L}\p{N}_])@[\p{L}\p{N}_]+/iu;
const DIGIT = /\d/;
const CAPITAL = /^\p{Lu}/u;
const GENERIC_CAPITALS = new Set(['i','ai','llm','llms','ceo','cto','cfo','hr','roi','kpi','kpis','b2b','b2c','saas','ok','okay']);
type Span = readonly [number, number];
interface Shape {
  transitionSpans: Span[];
  transitionExamples: string[];
  summary: number;
  headers: Span[];
  bold: Span[];
  boldHeadings: Span[];
  vaguePlatitudes: Span[];
}
// One scan shared across detectors. Weak keys release each post with its context.
const shapes = new WeakMap<PostContext, Shape>();

function shapeOf(ctx: PostContext): Shape {
  const known = shapes.get(ctx);
  if (known) return known;
  const st = structureOf(ctx), n = ctx.sentences.length;
  const shape: Shape = { transitionSpans: [], transitionExamples: [], summary: -1, headers: [], bold: [], boldHeadings: [], vaguePlatitudes: [] };
  if (ctx.wordCount >= 40 && ctx.wordCount <= 300) {
    PLATITUDE.lastIndex = 0;
    let match = PLATITUDE.exec(ctx.lower);
    // Specificity scanning is needed only alongside a positive, visible tell.
    if (match && !SPECIFIC.test(ctx.text)) {
      do {
        const end = match.index + match[0].length;
        shape.vaguePlatitudes.push([st.lowerOffsets?.[match.index] ?? match.index, st.lowerOffsets?.[end] ?? end]);
      } while ((match = PLATITUDE.exec(ctx.lower)));
    }
    if (shape.vaguePlatitudes.length) {
      let sentence = 0, first = true;
      for (let i = 0; i < ctx.words.length; i++) {
        const start = st.wordSpans[i]![0];
        while (sentence + 1 < st.sentenceSpans.length && start >= st.sentenceSpans[sentence + 1]![0]) { sentence++; first = true; }
        const word = ctx.words[i]!;
        if (DIGIT.test(word) || (!first && !GENERIC_CAPITALS.has(word) && CAPITAL.test(ctx.text[start]!))) { shape.vaguePlatitudes.length = 0; break; }
        first = false;
      }
    }
  }
  let cursor = 0;
  for (const line of ctx.lines) {
    const start = ctx.text.indexOf(line, cursor);
    cursor = start + line.length;
    const header = HEADER.test(line), bold = BOLD.test(line), boldHeading = BOLD_HEAD.test(line);
    if (!header && !bold && !boldHeading) continue;
    const span: Span = [start,cursor];
    if (header) shape.headers.push(span);
    if (bold) shape.bold.push(span);
    if (boldHeading) shape.boldHeadings.push(span);
  }
  if (n >= 6) {
    for (let i = 0; i < n; i++) {
      if (!TRANSITION.test(ctx.sentences[i]!)) continue;
      shape.transitionSpans.push(st.sentenceSpans[i]!);
      if (shape.transitionExamples.length < 3) shape.transitionExamples.push(ctx.sentences[i]!);
    }
  }
  if (ctx.wordCount >= 80 && n >= 3) {
    let tailWords = 0;
    for (let i = n - 1; i >= n - 2; i--) {
      tailWords += st.sentenceWordCounts[i]!;
      if (tailWords >= 15 && tailWords <= 120 && tailWords <= ctx.wordCount * 0.35 && SUMMARY.test(ctx.sentences[i]!)) shape.summary = i;
    }
  }
  shapes.set(ctx, shape);
  return shape;
}

function transitionHit(shape: Shape): RuleHit {
  // Both transition rules report identical spans. The scorer keeps the stronger
  // one when both fire, so the same openings cannot receive two weights.
  return { matches: shape.transitionExamples, spans: shape.transitionSpans };
}
function lineHit(ctx: PostContext, spans: Span[]): RuleHit {
  return { matches: spans.slice(0,3).map(([start,end]) => ctx.text.slice(start,end)), spans };
}

export const structural: RulePack = {
  id: 'measured-structural',
  name: 'Measured structural cues (candidate)',
  description: 'Visible pasted-output smells with weak discourse support; unregistered candidates, not an AI-authorship detector.',
  rules: [
    {
      kind: 'custom', id: 'measured-structural.vague-platitude-count',
      category: 'robotic-rhythm', label: 'Generic advice with no detected specifics', evidence: 'style', weight: 1,
      detect(ctx) { const spans = shapeOf(ctx).vaguePlatitudes; return spans.length >= 1 ? lineHit(ctx,spans) : null; },
    },
    {
      kind: 'custom', id: 'measured-structural.visible-markdown-headers',
      category: 'formatting', label: 'Markdown headings were pasted into the post', evidence: 'style', weight: 2,
      detect(ctx) { const spans = shapeOf(ctx).headers; return spans.length >= 1 ? lineHit(ctx,spans) : null; },
    },
    {
      kind: 'custom', id: 'measured-structural.visible-markdown-bold',
      category: 'formatting', label: 'Bold markers are still visible in multiple lines', evidence: 'style', weight: 2,
      detect(ctx) { const spans = shapeOf(ctx).bold; return spans.length >= 2 ? lineHit(ctx,spans) : null; },
    },
    {
      kind: 'custom', id: 'measured-structural.visible-bold-headings',
      category: 'formatting', label: 'A bold-heading template is still showing its markup', evidence: 'style', weight: 2.5,
      detect(ctx) { const spans = shapeOf(ctx).boldHeadings; return spans.length >= 1 ? lineHit(ctx,spans) : null; },
    },
    {
      kind: 'custom', id: 'measured-structural.transition-share',
      category: 'robotic-rhythm', label: 'The transitions are taking turns at the microphone',
      evidence: 'style', weight: 0.5,
      detect(ctx) {
        const shape = shapeOf(ctx);
        // Exact train-selected fraction 5/24, with at least six sentences.
        return shape.transitionSpans.length * 24 >= ctx.sentences.length * 5 && shape.transitionSpans.length > 0 ? transitionHit(shape) : null;
      },
    },
    {
      kind: 'custom', id: 'measured-structural.transition-count',
      category: 'robotic-rhythm', label: 'Four transitions have joined the same committee',
      evidence: 'style', weight: 0.75,
      detect(ctx) {
        const shape = shapeOf(ctx);
        return shape.transitionSpans.length >= 4 ? transitionHit(shape) : null;
      },
    },
    {
      kind: 'custom', id: 'measured-structural.summary-tail',
      category: 'robotic-rhythm', label: 'The ending filed a summary of the meeting',
      evidence: 'style', weight: 0.5,
      detect(ctx) {
        const i = shapeOf(ctx).summary;
        return i >= 0 ? { matches: [ctx.sentences[i]!], spans: [structureOf(ctx).sentenceSpans[i]!] } : null;
      },
    },
  ],
};

export const pack = structural;
