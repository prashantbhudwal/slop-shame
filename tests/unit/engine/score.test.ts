import { describe, expect, it } from 'vitest';
import { analyzePost, createEngine } from '../../../src/lib/engine';
import { saturate } from '../../../src/lib/engine/score';
import type { CustomRule, PhraseRule, RulePack } from '../../../src/lib/engine/rule-types';
const phrase: PhraseRule = { kind: 'phrase', id: 'test.first', category: 'ai-vocabulary', label: 'First', weight: 10, phrases: ['obvious'], repeat: 'each' };
const pack = (rules: RulePack['rules'] = [phrase]): RulePack => ({ id: 'test', name: 'Test', description: 'Test', rules });
const text = 'One obvious example among enough ordinary words to be scored.';

describe('AI density and capped scoring', () => {
  it('sorts actual contributions, fills categories, and caps snippets', () => {
    const custom: CustomRule = { kind: 'custom', id: 'test.custom', category: 'inflation', label: 'Custom', weight: 20, detect: () => ({ matches: ['One', 'example', 'ordinary', 'words'], scale: 2 }) };
    const report = createEngine([pack([phrase, custom])]).analyze({ text: `${text} obvious obvious obvious` });
    expect(report.signals.every((s, i, all) => !i || all[i - 1]!.weight >= s.weight)).toBe(true);
    expect(report.signals.every((s) => s.matches.length <= 3)).toBe(true);
    expect(Object.values(report.categoryWeights).reduce((a, b) => a + b, 0)).toBeCloseTo(24);
    expect(report.topCategory).not.toBeNull();
    expect(Number.isInteger(report.score)).toBe(true);
    expect(report.score).toBeLessThanOrEqual(53);
  });
  it('gates bodies below 8 words and bare reposts, regardless of metadata', () => {
    for (const short of ['', ' \n ', 'obvious obvious obvious obvious obvious obvious obvious']) {
      expect(analyzePost({ text: short, isBareRepost: true, authorHeadline: 'Visionary | Ninja | Guru', hashtags: ['#ai', '#growth', '#success', '#mindset', '#leadership'] })).toMatchObject({ score: 0, shameable: false, tier: { id: 'artisanal' }, signals: [], categoryWeights: {}, topCategory: null });
    }
    expect(createEngine([pack()]).analyze({ text: 'obvious one two three four five six seven' }).score).toBeGreaterThan(0);
    expect(createEngine([pack()]).analyze({ text, isBareRepost: true }).score).toBeGreaterThan(0);
  });
  it('dilutes sparse tells and keeps equal density stable across text lengths', () => {
    const engine = createEngine([pack()]);
    const padding = 'We reviewed the files and wrote down the remaining questions. ';
    const short = engine.analyze({ text });
    const sparse = engine.analyze({ text: text + padding.repeat(30) });
    expect(sparse.score).toBeLessThan(short.score);
    const sentence = 'One obvious example among enough ordinary words to be scored. ';
    const a = engine.analyze({ text: sentence.repeat(10) });
    const b = engine.analyze({ text: sentence.repeat(30) });
    expect(Math.abs(a.score - b.score)).toBeLessThanOrEqual(1);
    expect(saturate(100000)).toBe(100);
  });
  it('caps phrase, discourse, formatting, and rhythm evidence separately', () => {
    const categories = ['ai-vocabulary', 'negation-pivot', 'formatting', 'robotic-rhythm'] as const;
    const rules = categories.map((category, i) => ({ ...phrase, id: `test.cap-${i}`, category, weight: 1000 }));
    const report = createEngine([pack(rules)]).analyze({ text });
    expect(report.categoryWeights['ai-vocabulary']).toBeCloseTo(24);
    expect(report.categoryWeights['negation-pivot']).toBeCloseTo(12);
    expect(report.categoryWeights.formatting).toBeCloseTo(8);
    expect(report.categoryWeights['robotic-rhythm']).toBeCloseTo(8);
    expect(report.score).toBe(80);
  });
  it('keeps model fingerprints strong in long text while requiring 40 words for Shame', () => {
    const body = 'As an AI language model, I can help you write this post. ';
    const short = analyzePost({ text: body });
    const long = analyzePost({ text: body + 'The team reviewed all the files before leaving for the day. '.repeat(30) });
    expect(short.score).toBeGreaterThanOrEqual(80);
    expect(long.score).toBeGreaterThanOrEqual(80);
    expect(short.shameable).toBe(false);
    expect(long.shameable).toBe(true);
  });
  it('does not treat bypass evidence alone as a phrase/discourse family for Shame', () => {
    const engine = createEngine([pack([{ ...phrase, category: 'bypass-tricks', weight: 14 }])]);
    const report = engine.analyze({ text: text.repeat(10) });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(false);
  });
  it('never permits Shame from style evidence alone, even a high-scoring plugin', () => {
    const style = createEngine([pack([{ ...phrase, category: 'formatting', weight: 999 }, { ...phrase, id: 'test.rhythm', category: 'robotic-rhythm', weight: 999 }])]);
    const report = style.analyze({ text: text.repeat(10) });
    expect(report.score).toBeGreaterThanOrEqual(39);
    expect(report.shameable).toBe(false);
  });
  it('snapshots contributor rule data and returns independent singleton reports', () => {
    const contributed = { ...phrase, phrases: ['obvious'] };
    const engine = createEngine([pack([contributed])]);
    const before = engine.analyze({ text });
    contributed.phrases[0] = 'other'; contributed.weight = 999;
    expect(engine.analyze({ text })).toEqual(before);
    const input = { text: "Let's delve into this rich tapestry of transformative potential. It is important to note that the future looks bright." };
    const report = analyzePost(input); report.signals.length = 0;
    expect(analyzePost(input).signals.length).toBeGreaterThan(0);
  });
  it('supports a class-based custom rule with prototype methods and this state', () => {
    class ContributorRule implements CustomRule {
      kind = 'custom' as const;
      id = 'test.class-rule';
      category = 'inflation' as const;
      label = 'Class-based rule';
      weight = 2;
      snippet = 'obvious';
      detect() { return { matches: [this.snippet] }; }
    }
    const engine = createEngine([pack([new ContributorRule()])]);
    expect(engine.analyze({ text }).signals[0]?.ruleId).toBe('test.class-rule');
  });
});

describe('contributor validation', () => {
  it.each([
    ['missing namespace', { ...phrase, id: 'oops' }, /namespaced.*test/],
    ['wrong prefix', { ...phrase, id: 'other.rule' }, /namespaced.*test/],
    ['empty suffix', { ...phrase, id: 'test.' }, /namespaced/],
    ['zero weight', { ...phrase, weight: 0 }, /finite positive weight/],
    ['NaN weight', { ...phrase, weight: NaN }, /finite positive weight/],
    ['infinite weight', { ...phrase, weight: Infinity }, /finite positive weight/],
    ['negative weight', { ...phrase, weight: -3 }, /finite positive weight/],
    ['empty label', { ...phrase, label: ' ' }, /readable label/],
    ['empty phrases', { ...phrase, phrases: [] }, /non-empty/],
    ['blank phrase', { ...phrase, phrases: [' '] }, /non-empty/],
    ['invisible phrase', { ...phrase, phrases: ['\u200B'] }, /non-empty/],
    ['nullable pattern', { ...phrase, patterns: ['(?:foo)?'] }, /empty text/],
    ['non-array phrases', { ...phrase, phrases: 'obvious' }, /array of strings/],
    ['empty pattern', { ...phrase, phrases: [], patterns: [''] }, /non-empty/],
    ['invalid regex', { ...phrase, patterns: ['['] }, /Invalid pattern.*test.first/],
    ['invalid category', { ...phrase, category: 'nonsense' }, /Unknown category/],
    ['invalid repeat', { ...phrase, repeat: 'forever' }, /repeat mode/],
    ['invalid position', { ...phrase, position: 'middle' }, /position/],
    ['invalid custom rule', { ...phrase, kind: 'custom' }, /detect/],
  ])('rejects %s', (_name, badRule, expected) => {
    expect(() => createEngine([pack([badRule as PhraseRule])])).toThrow(expected as RegExp);
  });
  it('rejects duplicate rule IDs, duplicate packs, and invalid pack namespaces', () => {
    expect(() => createEngine([pack([phrase, phrase])])).toThrow(/Duplicate rule id.*test.first/);
    expect(() => createEngine([pack(), pack()])).toThrow(/Duplicate pack id.*test/);
    expect(() => createEngine([{ ...pack(), id: 'bad.ID' }])).toThrow(/Invalid pack id/);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid custom scale %s', (scale) => {
    const engine = createEngine([pack([{ ...phrase, kind: 'custom', detect: () => ({ matches: [], scale }) }])]);
    expect(() => engine.analyze({ text })).toThrow(/test.first.*invalid scale/);
  });
  it('allows an empty engine and clean posts', () => {
    expect(createEngine([]).analyze({ text })).toMatchObject({ score: 0, topCategory: null, signals: [] });
  });
});
