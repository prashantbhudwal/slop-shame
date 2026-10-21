import { describe, expect, it } from 'vitest';
import { analyzePost } from '../../../src/lib/engine';
import { buildContext } from '../../../src/lib/engine/context';
import { compilePhrases } from '../../../src/lib/engine/compile';
import { chatbotLeak, engagementBait, roboticRhythm } from '../../../src/lib/engine/packs';
import type { CustomRule, PhraseRule } from '../../../src/lib/engine/rule-types';

const rhythmPrefix = ('There are enough plain words in each sentence to activate the structural rule.\n').repeat(6);

describe('bounded regex scanning preserves prose matches', () => {
  it.each(['Agree?', 'Thoughts?', 'Read that again.', "Don't sleep on this!"])(
    'preserves social closer %s with and without its emoji', (closer) => {
      const rule = engagementBait.rules.find((rule) => rule.id.endsWith('.social-closer')) as PhraseRule;
      const scan = compilePhrases([rule]);
      for (const suffix of ['', '   ', ' 👇', '\t👇  ', '\n👇\n']) {
        const text = `${closer}${suffix}`;
        const ctx = buildContext({ text });
        const hits = scan(ctx).get(rule);
        // Trailing whitespace and emoji-only lines are excluded by the
        // existing closing-prose view before either matcher runs.
        expect(hits?.matches[0]?.trim()).toBe(closer + (suffix.includes('👇') && !suffix.includes('\n') ? suffix.trimEnd() : ''));
        expect(scan(buildContext({ text: `${text}x` })).has(rule)).toBe(false);
      }
    },
  );

  it.each([
    [engagementBait, 'formulaic-opener', "In today's digital world"],
    [engagementBait, 'formulaic-opener', 'In the rapidly evolving world of'],
    [engagementBait, 'formulaic-opener', 'In an age where'],
    [engagementBait, 'speculative-opener', 'Imagine a world where'],
    [chatbotLeak, 'assistant-closer', 'I hope this helps'],
  ] as const)('keeps %s / %s after paragraph and sentence boundaries', (pack, id, phrase) => {
    const rule = pack.rules.find((rule) => rule.id.endsWith(`.${id}`)) as PhraseRule;
    const scan = compilePhrases([rule]);
    const prefixes = rule.position === 'closing'
      ? ['', 'Earlier. ', 'Earlier.\n\n', 'Earlier\r\n\r\n']
      : ['', '\t ', 'Earlier. ', 'Earlier.\n\n\t', 'Earlier\r\n\r\n  '];
    for (const prefix of prefixes) {
      expect(scan(buildContext({ text: prefix + phrase })).get(rule)?.matches.some((match) => match.trim() === phrase)).toBe(true);
    }
    expect(scan(buildContext({ text: 'Earlier ' + phrase })).has(rule)).toBe(false);
  });

  it.each([
    ['中文a中文 guides progress. Teams shape outcomes.', 'a中文 guides progress. Teams shape outcomes.'],
    ['1中文 guides progress. Teams shape outcomes.', '中文 guides progress. Teams shape outcomes.'],
    ['Équipe guides progress. Teams shape outcomes.', 'quipe guides progress. Teams shape outcomes.'],
    ['𐐀a guides progress. Teams shape outcomes.', 'a guides progress. Teams shape outcomes.'],
    ['中文 guides progress. Teams shape outcomes.', undefined],
  ])('preserves the original ASCII boundary inside Unicode subjects: %s', (text, expected) => {
    const rule = roboticRhythm.rules.find((rule) => rule.id.endsWith('.parallel-pair')) as CustomRule;
    expect(rule.detect(buildContext({ text: rhythmPrefix + text }))?.matches).toEqual(expected ? [expected] : undefined);
  });

  it('keeps later matches after a long mixed-script near miss through the public API', () => {
    const pair = 'Ideas guide progress. Teams shape outcomes.';
    const text = rhythmPrefix + 'a中'.repeat(2500) + ' stops here.\n' + pair;
    // v2 hides this one habit when 5k words exceed its human expectation; the raw matcher still must find it.
    const rule = roboticRhythm.rules.find(r=>r.id==='robotic-rhythm.parallel-pair') as CustomRule;
    expect(rule.detect(buildContext({text}))?.matches).toEqual([pair]);
    expect(analyzePost({text}).shameable).toBe(false);
  });

  it('keeps a successful mixed-script subject and the original non-overlapping repetition', () => {
    const rule = roboticRhythm.rules.find((rule) => rule.id.endsWith('.parallel-pair')) as CustomRule;
    const first = 'a中'.repeat(2500) + ' guides progress. Teams shape outcomes.';
    const second = 'Ideas drive change. Habits build trust.';
    const trailing = 'People define success.';
    expect(rule.detect(buildContext({ text: rhythmPrefix + first + '\n' + second + '\n' + trailing }))).toEqual({
      matches: [first, second], scale: Math.sqrt(2),
    });
  });
});
