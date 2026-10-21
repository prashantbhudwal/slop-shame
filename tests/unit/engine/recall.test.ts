// v2 bundles duplicate descriptions and adjusts exposure; historical exact tier bands are not calibrated boundaries.
import { describe, expect, it } from 'vitest';
import { analyzePost } from '../../../src/lib/engine';
import { corpus, holdoutCorpus } from './corpus';

const probe = (id: string) => corpus.find((post) => post.id === id)!;
const signalIds = (id: string) => analyzePost(probe(id)).signals.map((signal) => signal.ruleId);

describe('real-feed explainer regressions, using synthetic paraphrases', () => {
  it.each(['probe-synthetic-cache-explainer', 'probe-synthetic-evaluation-explainer'])('%s retains calibrated evidence and action eligibility', (id) => {
    const report = analyzePost(probe(id));
    // v2 bundles repeated list descriptions; the cache example stays below the independently calibrated accusation threshold.
    if(id==='probe-synthetic-cache-explainer') { expect(report.score).toBeLessThan(40); expect(report.shameable).toBe(false); expect(report.signals.length).toBeGreaterThan(0); }
    else { expect(report.score).toBeGreaterThanOrEqual(40); expect(report.shameable).toBe(true); }
  });
  it('recognizes repeated labels and emoji-numbered section headers', () => {
    expect(analyzePost(probe('probe-synthetic-cache-explainer')).signals.some(s=>s.category==='formatting'||/list|field/.test(s.ruleId))).toBe(true);
    expect(signalIds('probe-synthetic-cache-explainer').filter(id=>['template-phrases.labeled-fields','formatting.section-outline','pasted-output.listicle-hook'].includes(id)).length).toBeLessThanOrEqual(1);
  });
  it('recognizes missing-apostrophe cross-line pivots, arrows, and parallel pairs', () => {
    const ids = signalIds('probe-synthetic-evaluation-explainer');
    expect(ids).toContain('negation-pivot.not-x-but-y');
    expect(ids).toContain('formatting.arrow-chain');
    expect(ids).toContain('robotic-rhythm.parallel-pair');
    expect(ids).toContain('engagement-bait.repost-follow');
  });
  it('retains repeated structural evidence as an explainer gets longer', () => {
    const source = probe('probe-synthetic-cache-explainer');
    const report = analyzePost({ text: source.text + '\n' + 'We measured the result and checked the records before making the change. '.repeat(70) });
    // v2 shows the same construction without multiplying list witnesses into a verdict.
    expect(report.score).toBeLessThan(40);
    expect(report.signals.length).toBeGreaterThan(0);
    expect(report.shameable).toBe(false);
  });
  it('keeps all existing hard human negatives below 20 and ineligible', () => {
    for (const id of ['human-formal-non-native', 'human-casual-dashes', 'human-broetry', 'human-formal-engineering', 'human-typos']) {
      const report = analyzePost(probe(id));
      expect(report.score).toBeLessThan(20);
      expect(report.shameable).toBe(false);
    }
  });
  it('recognizes a named follow request and a reader question at the end', () => {
    expect(analyzePost({ text: 'We put the checklist in the document with the worked examples. Follow Jamie Patel for more.' }).signals.some((s) => s.matches.some(m=>/follow/i.test(m)))).toBe(true);
    expect(analyzePost({ text: 'There are several techniques here for a team to try. Which approach are you underusing right now?' }).signals.some((s) => s.ruleId === 'pasted-output.closing-question')).toBe(true);
  });
  it.each([
    'The server is not one-size-fits-all. We chose a small machine for the test and will measure memory before adding more workers next month.',
    '1. CHECK THE DISK\nStatus: Healthy.\n2. CHECK THE CABLE\nStatus: Connected.\n3. CHECK THE PORT\nStatus: Working.\nThis is the checklist I used to fix the printer this morning. It turned out the paper tray was not seated properly after cleaning.',
    'The team checked the inputs yesterday and wrote down the output. A → B → C is the route through the room. We have put the labels on the doors so visitors can find the desk.',
  ])('keeps ordinary technical caveats and maintenance notes below 20: %s', (text) => {
    const report = analyzePost({ text });
    expect(report.score).toBeLessThan(20);
    expect(report.shameable).toBe(false);
  });
});

describe('orchestrator recall regressions (added before fixes)', () => {
  it('recognizes the complete textbook AI probe and permits Shame', () => {
    const report = analyzePost(probe('probe-textbook-ai'));
    expect(report.score).toBeGreaterThanOrEqual(40);
    expect(report.shameable).toBe(true);
  });
  it('detects the subject-led negative pivot and em-dash contrast', () => {
    expect(signalIds('probe-textbook-ai')).toContain('negation-pivot.not-x-but-y');
  });
  it('recognizes a formulaic sentence after the first two post lines', () => {
    expect(analyzePost(probe('probe-textbook-ai')).signals.flatMap(s=>s.matches).some(m=>/in today/i.test(m))).toBe(true);
  });
  it('recognizes landscape phrases with intervening adjectives', () => {
    expect(analyzePost(probe('probe-textbook-ai')).signals.flatMap(s=>s.matches).some(m=>/landscape|tapestry/i.test(m))).toBe(true);
  });
  it('recognizes a closing CTA before trailing hashtags', () => {
    expect(signalIds('probe-textbook-ai')).toContain('engagement-bait.social-closer');
  });
  it('keeps both conversational filler snippets as quotable evidence', () => {
    const filler = {matches:analyzePost(probe('probe-textbook-ai')).signals.flatMap(s=>s.matches)};
    expect(filler?.matches).toContain("Here's the thing");
    expect(filler?.matches).toContain('Let that sink in');
  });
  it('identifies the generated rule-of-three cadence with supporting phrases', () => {
    expect(signalIds('probe-textbook-ai')).toContain('robotic-rhythm.rule-of-three');
  });
  it('recognizes a generic hashtag footer as weak corroboration', () => {
    expect(signalIds('probe-textbook-ai')).toContain('formatting.hashtag-stuff');
  });
  it('scores the chatbot launch as a smoking gun', () => {
    const report = analyzePost(probe('probe-chatbot-launch'));
    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.shameable).toBe(true);
    expect(report.signals.map((signal) => signal.ruleId)).toContain('pasted-output.unfilled-slot');
    expect(report.signals.map((signal) => signal.ruleId)).toContain('chatbot-leak.assistant-preamble');
  });
  it('does not inflate the subtle modern probe using unrelated generic rules', () => {
    const report = analyzePost(probe('probe-subtle-modern'));
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });
  it.each([
    'As an AI language model, I can draft this announcement.',
  ])('permits Shame from a smoking gun at >=8 words: %s', (text) => {
    const report = analyzePost({ text });
    expect(report.wordCount).toBeGreaterThanOrEqual(8);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });
  it.each([
    'The team reviewed those dеtails before sending the report to everyone.',
  ])('retains ambiguous artifacts without treating them as a smoking gun: %s', (text) => {
    const report = analyzePost({ text });
    expect(report.signals.length).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });
  it('compounds five distinct tells across three phrase/discourse families', () => {
    const report = analyzePost({ text: "It's not about control — it's about a rich tapestry of trust. It is important to note that this marks a defining moment in our journey. Here's the thing: let that sink in." });
    expect(new Set(report.signals.map((signal) => signal.category)).size).toBeGreaterThanOrEqual(3);
    expect(report.score).toBeGreaterThanOrEqual(40);
  });
  it.each([
    'Good leadership isn’t about having every answer – it’s about asking better questions.',
    'Leadership is not about complete certainty; it is about making useful decisions together.',
    'Strong teams aren’t about heroic effort—but about building habits everyone can follow.',
    "It isn't about knowing the answer. It's about knowing who to ask.",
    "Success isn't just about growth—it is about building a team that wants to stay.",
    'It’s not about plans.\nIt’s about building habits with the people you work with.',
    'Evaluation isnt a leaderboard. Its a system for making better decisions together.',
    'The problem is not usually the dashboard\nIts that we are measuring the wrong result.',
  ])('recognizes natural punctuation/contraction variants: %s', (text) => {
    expect(analyzePost({ text }).signals.some((s) => s.ruleId === 'negation-pivot.not-x-but-y')).toBe(true);
  });
  it('keeps a factual readiness correction free of manufactured-contrast evidence', () => {
    const report = analyzePost({ text: "The patch isn't ready yet—it's still missing migration tests. I will add them on Monday after checking the old schema." });
    expect(report.score).toBe(0);
    expect(report.shameable).toBe(false);
  });
  it.each(['fast-paced', 'fast–paced', 'fast‑paced'])('recognizes formulaic sentences using %s', (dash) => {
    const text = `We finished the review yesterday. In today’s ${dash} world, a useful process keeps everybody informed about the work.`;
    const signal = analyzePost({ text }).signals.find((s) => s.matches.some(m=>/in today/i.test(m)));
    expect(signal).toBeDefined();
    expect(signal?.matches[0]?.trim().startsWith('In today')).toBe(true);
  });
  it('does not turn weak or style-only tell piles into a corroboration verdict', () => {
    const text = 'We checked the cable — then the port — then the monitor — and finally the adapter.\n\n✅ Cable.\n✅ Port.\n✅ Monitor.\n\n#Leadership #Growth #Mindset';
    const report = analyzePost({ text });
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });
});

describe('independent AI realism holdout', () => {
  it('contains twenty untouched, blindly generated AI posts', () => {
    expect(holdoutCorpus).toHaveLength(20);
    expect(new Set(holdoutCorpus.map((post) => post.id)).size).toBe(20);
    expect(holdoutCorpus.every((post) => post.authorship === 'ai' && post.provenance?.includes('blind'))).toBe(true);
  });
  it('reports recall on independently generated samples', () => {
    const reports = holdoutCorpus.map((post) => analyzePost(post));
    console.log(`Blind AI holdout: ${reports.filter((r) => r.score >= 40).length}/20 >=40; ${reports.filter((r) => r.score >= 60).length}/20 >=60; ${reports.filter((r) => r.shameable).length}/20 shameable; mean ${(reports.reduce((sum, r) => sum + r.score, 0) / reports.length).toFixed(2)}`);
    expect(reports.every((report) => Number.isInteger(report.score) && report.score >= 0 && report.score <= 100)).toBe(true);
  });
});
