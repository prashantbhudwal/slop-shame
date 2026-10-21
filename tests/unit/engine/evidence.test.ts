// v2: exposure and smooth caps replace fixed editorial points; protected spans and dedup stay required.
import { describe, expect, it } from 'vitest';
import { analyzePost, createEngine } from '../../../src/lib/engine';
import { aiVocabulary } from '../../../src/lib/engine/packs/ai-vocabulary';
import type { CustomRule, PhraseRule, RulePack } from '../../../src/lib/engine/rule-types';

const rule = (id: string, data: Partial<PhraseRule> = {}): PhraseRule => ({
  kind: 'phrase', id: `test.${id}`, category: 'ai-vocabulary', label: id,
  weight: 2, phrases: ['alpha'], ...data,
});
const pack = (rules: RulePack['rules']): RulePack => ({ id: 'test', name: 'Test', description: 'Test', rules });
const padding = ' The team reviewed the files and wrote down the results.';

describe('independent evidence and action eligibility', () => {
  it('does not erase vocabulary clusters when unrelated text is appended', () => {
    const engine = createEngine([aiVocabulary]);
    const text = 'We harness the tools, elevate the platform and foster the team.';
    const before = engine.analyze({ text });
    const after = engine.analyze({ text: text + padding.repeat(50) });
    expect(before.signals.some((s) => s.ruleId === 'ai-vocabulary.tier2')).toBe(true);
    expect(after.score).toBeLessThanOrEqual(before.score);
    expect(after.signals.map(s=>s.matches)).toEqual(before.signals.map(s=>s.matches));
  });

  it.each(['"', '“', '`', '```'])('does not scale vocabulary with excluded %s examples', (delimiter) => {
    const engine = createEngine([aiVocabulary]);
    const closing = delimiter === '“' ? '”' : delimiter;
    const example = `${delimiter}${'harness '.repeat(100)}${closing}`;
    const before = engine.analyze({ text: 'harness elevate foster' });
    for (const text of [`harness elevate foster ${example}`, `${example} harness elevate foster`]) {
      const after = engine.analyze({ text });
      expect(after.score).toBeLessThanOrEqual(before.score);
      expect(after.signals.map(s=>s.matches)).toEqual(before.signals.map(s=>s.matches));
      expect(after.shameable).toBe(false);
    }
    expect(engine.analyze({ text: `harness elevate ${example}` }).score).toBe(0);
  });

  it('uses actual vocabulary tokens after a leading quoted prefix example', () => {
    const engine = createEngine([aiVocabulary]);
    const before = engine.analyze({ text: 'harness elevate foster' });
    for (const text of ['"harnessing elevated fostering" harness elevate foster', 'harness elevate foster "harnessing elevated fostering"']) {
      expect(engine.analyze({ text }).signals.map(s=>s.matches)).toEqual(before.signals.map(s=>s.matches));
      expect(engine.analyze({ text }).score).toBeLessThanOrEqual(before.score);
    }
  });

  it('keeps legacy custom snippet lookup on word boundaries past quoted prefixes', () => {
    const custom: CustomRule = {
      kind: 'custom', id: 'test.legacy', category: 'ai-vocabulary', label: 'Legacy', weight: 2,
      detect: () => ({ matches: ['harness', 'elevate', 'foster'] }),
    };
    const engine = createEngine([pack([custom])]);
    const report = engine.analyze({ text: '"harnessing elevated fostering" harness elevate foster' });
    expect(report.signals).toMatchObject([{ matches: ['harness', 'elevate', 'foster'] }]);
  });

  it('retains custom evidence after the first three occurrences are excluded', () => {
    const custom: CustomRule = {
      kind: 'custom', id: 'test.legacy', category: 'ai-vocabulary', label: 'Legacy', weight: 2,
      detect: () => ({ matches: ['alpha', 'alpha', 'alpha'] }),
    };
    const report = createEngine([pack([custom])]).analyze({ text: '"alpha alpha alpha" alpha' });
    expect(report.signals).toMatchObject([{ matches: ['alpha'] }]);
  });

  it('uses all reconstructed occurrences when reducing a count-scaled legacy hit', () => {
    const custom: CustomRule = {
      kind: 'custom', id: 'test.legacy', category: 'ai-vocabulary', label: 'Legacy', weight: 2,
      detect: () => ({ matches: ['alpha', 'alpha', 'alpha'], scale: 4 }),
    };
    const report = createEngine([pack([custom])]).analyze({ text: '"alpha alpha alpha" alpha' });
    expect(report.signals).toMatchObject([{ matches: ['alpha'] }]);
  });

  it('prefers explicit custom spans to ambiguous snippets and caps only the final display', () => {
    const custom: CustomRule = {
      kind: 'custom', id: 'test.spans', category: 'ai-vocabulary', label: 'Spans', weight: 2,
      detect: (ctx) => ({
        matches: ['a display label'],
        spans: Array.from(ctx.text.matchAll(/alpha/g), (m) => [m.index, m.index + m[0].length] as const),
        scale: 5,
      }),
    };
    const report = createEngine([pack([custom])]).analyze({ text: '"alpha" alpha alpha alpha alpha' });
    expect(report.signals).toMatchObject([{ matches: ['alpha', 'alpha', 'alpha'] }]);
  });

  it('does not build a custom fingerprint using an anchor inside an example', () => {
    const custom: CustomRule = {
      kind: 'custom', id: 'test.bridge', category: 'chatbot-leak', label: 'Bridge', weight: 14, evidence: 'fingerprint',
      detect: (ctx) => ({ matches: [ctx.text], spans: [[0, ctx.text.length]] }),
    };
    const report = createEngine([pack([custom])]).analyze({ text: '`alpha` followed by ordinary prose and an unrelated beta.' });
    expect(report.score).toBe(0);
    expect(report.signals).toEqual([]);
  });

  it('counts an identical occurrence once regardless of pack category or order', () => {
    const categories = ['ai-vocabulary', 'template-phrases', 'inflation', 'hedging', 'negation-pivot', 'engagement-bait'] as const;
    const rules = categories.map((category, i) => rule(`same-${i}`, { category }));
    const text = 'alpha appears once among the ordinary words in this example.';
    const one = createEngine([pack([rules[0]!])]).analyze({ text });
    const many = createEngine([pack(rules)]).analyze({ text });
    expect(many.score).toBe(one.score);
    expect(createEngine([pack(rules.toReversed())]).analyze({ text })).toEqual(many);
  });

  it('does not count a word again inside a stronger lexical phrase', () => {
    const text = 'A rich tapestry of ideas helped everyone finish the report.' + padding.repeat(4);
    const report = analyzePost({ text });
    expect(report.signals.flatMap(s=>s.matches).some(m=>m.toLowerCase().includes('rich tapestry'))).toBe(true);
    expect(report.signals.some((s) => s.ruleId === 'ai-vocabulary.tier1')).toBe(false);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it('retains the independent occurrences after discarding an overlapping word', () => {
    const engine = createEngine([pack([
      rule('word', { weight: 3, phrases: ['tapestry'], repeat: 'each' }),
      rule('phrase', { weight: 4, phrases: ['rich tapestry'] }),
    ])]);
    const report = engine.analyze({ text: 'A rich tapestry with another tapestry elsewhere in the document.' });
    expect(report.categoryWeights['ai-vocabulary']).toBeCloseTo(report.signals.reduce((a,s)=>a+s.weight,0));
    expect(report.signals.find((s) => s.ruleId === 'test.word')?.matches).toEqual(['tapestry']);
  });

  it.each(['once', 'each', 'sqrt'] as const)('retains %s phrase alternatives until cross-rule competition is resolved', (repeat) => {
    const rules = [
      rule('long', { weight: 4, phrases: ['alpha beta', 'alpha beta gamma delta', 'gamma'], repeat }),
      rule('short', { weight: 5, phrases: ['alpha'] }),
    ];
    for (const ordered of [rules, rules.toReversed()]) {
      const engine = createEngine([pack(ordered)]);
      const before = engine.analyze({ text: 'alpha beta gamma' });
      const after = engine.analyze({ text: 'alpha beta gamma delta' });
      expect(after.score).toBeLessThanOrEqual(before.score);
      expect(after.categoryWeights['ai-vocabulary']).toBeCloseTo(after.signals.reduce((a,s)=>a+s.weight,0));
      expect(after.signals.find((s) => s.ruleId === 'test.long')?.matches).toEqual(['gamma']);
    }
  });

  it('retains a shorter alternative at the same start when its longer alternative loses', () => {
    const engine = createEngine([pack([
      rule('long', { weight: 4, phrases: ['beta', 'beta gamma'], patterns: ['\\bbeta\\b'], repeat: 'each' }),
      rule('strong', { weight: 5, phrases: ['gamma'] }),
    ])]);
    const report = engine.analyze({ text: 'beta gamma' });
    expect(report.categoryWeights['ai-vocabulary']).toBeCloseTo(report.signals.reduce((a,s)=>a+s.weight,0));
    expect(report.signals.find((s) => s.ruleId === 'test.long')?.matches).toEqual(['beta']);
  });

  it('deduplicates only competing occurrences while retaining independent repeats', () => {
    const rules = [
      rule('weak', { weight: 3, repeat: 'each', phrases: ['alpha'], patterns: ['\\balpha\\b'] }),
      rule('strong', { weight: 4, repeat: 'each', phrases: ['alpha beta'] }),
    ];
    const first = createEngine([pack(rules)]).analyze({ text: 'alpha beta alpha alpha beta' });
    expect(first.categoryWeights['ai-vocabulary']).toBeCloseTo(first.signals.reduce((a,s)=>a+s.weight,0));
    expect(first.signals.find((s) => s.ruleId === 'test.weak')).toMatchObject({ matches: ['alpha'] });
    expect(createEngine([pack(rules.toReversed())]).analyze({ text: 'alpha beta alpha alpha beta' })).toEqual(first);
  });

  it('does not let extra style consume the category budget of an existing phrase', () => {
    const engine = createEngine([pack([
      rule('meaning', { category: 'template-phrases', weight: 10 }),
      rule('shape', { category: 'template-phrases', weight: 10, phrases: ['beta'], repeat: 'each', evidence: 'style' }),
    ])]);
    const text = 'alpha appears among the ordinary words in this example.';
    const before = engine.analyze({ text });
    const after = engine.analyze({ text: text + ' beta'.repeat(100) });
    expect(after.score).toBeGreaterThanOrEqual(before.score);
    expect(after.signals.find((s) => s.ruleId === 'test.meaning')?.matches).toEqual(before.signals[0]?.matches);
    expect(after.categoryWeights['template-phrases']).toBeLessThan(40);
    expect(after.signals.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(after.categoryWeights['template-phrases']!);
  });

  it('never turns repeated weak evidence into an explicit fingerprint', () => {
    const engine = createEngine([pack([rule('weak', { category: 'chatbot-leak', repeat: 'each' })])]);
    const report = engine.analyze({ text: 'alpha '.repeat(5) + 'one two three four five six seven eight' });
    expect(report.score).toBeLessThan(80);
    expect(report.shameable).toBe(false);
  });

  it('scores explicit artifacts in short text while keeping the action word guard', () => {
    const report = analyzePost({ text: 'As an AI language model, I cannot.' });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.signals.length).toBeGreaterThan(0);
    expect(report.shameable).toBe(false);
  });

  it.each([
    'The error message was "As an AI language model, I cannot answer." We removed that response and filed a bug.' + padding.repeat(4),
    'The following is a log sample:\n```json\n{"message": "As an AI language model, I cannot answer."}\n```\nThe team checked the parser.' + padding.repeat(4),
    '> As an AI language model, I cannot answer.\nThat is the response reported in the issue.' + padding.repeat(4),
  ])('does not treat quoted or fenced examples as the author speaking: %s', (text) => {
    const report = analyzePost({ text });
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it.each([
    'The model replied: “As an AI language model,\nI cannot answer that request.”',
    'The model replied: "As an AI language model,\nI cannot answer that request."',
    'The model replied: ‘As an AI language model,\nI cannot answer that request.’',
    'The model replied:\n> <think>\n> I should review the request before choosing an answer.\n> </think>',
  ])('protects complete multiline quotations: %s', (text) => {
    const report = analyzePost({ text });
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
    expect(report.signals.some((s) => s.ruleId === 'chatbot-leak.cutoff' || s.ruleId === 'chatbot-leak.reasoning-block')).toBe(false);
  });

  it('preserves a direct model fingerprint after a multiline quoted example', () => {
    const report = analyzePost({ text: 'The example was: “As an AI language model,\nI cannot answer that request.”\nAs an AI language model, I can answer now.' });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
    expect(report.signals.find((s) => s.ruleId === 'chatbot-leak.cutoff')?.matches).toEqual(['As an AI language model']);
  });

  it('retains a direct artifact outside an unrelated code example', () => {
    const report = analyzePost({ text: 'As an AI language model, I cannot answer.\n```\nconst x = 1;\n```' });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it('cannot use one weak transition to turn a checklist into a Shame verdict', () => {
    const text = 'Moreover, the test is complete.\n' + Array.from({ length: 15 }, (_, i) => `✅ Item ${i} checked.`).join('\n');
    const report = analyzePost({ text });
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it('does not treat repeated documentation labels as independent phrase evidence', () => {
    const text = ['disk', 'memory', 'network'].map((name) => `How it works: The ${name} cache stores the result until the next request arrives. We clear the old value when the input changes.`).join('\n');
    const report = analyzePost({ text });
    expect(report.signals.some((s) => s.ruleId === 'template-phrases.labeled-fields')).toBe(true);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });
});
