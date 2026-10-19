import { describe, expect, it } from 'vitest';
import { compilePhrases } from '../../../src/lib/engine/compile';
import { buildContext } from '../../../src/lib/engine/context';
import type { PhraseRule } from '../../../src/lib/engine/rule-types';

function rule(overrides: Partial<PhraseRule> = {}): PhraseRule {
  return { kind: 'phrase', id: 'test.phrase', category: 'ai-vocabulary', label: 'Test', weight: 5, phrases: ['delve'], ...overrides };
}
function detect(rules: PhraseRule[], text: string) {
  return compilePhrases(rules)(buildContext({ text }));
}

describe('phrase compiler', () => {
  it('matches case-insensitively on Unicode word boundaries', () => {
    const r = rule();
    expect(detect([r], 'DELVE, delved undelve delve_thing delveé édelve delve1. delve!').get(r)).toMatchObject({ matches: ['DELVE', 'delve'], scale: 1 });
  });
  it('accepts both apostrophe styles in phrases and regex character classes', () => {
    const r = rule({ phrases: ["it's not"] });
    expect(detect([r], 'IT’S NOT easy. it\'s not hard.').get(r)?.matches).toEqual(['IT’S NOT', "it's not"]);
    const p = rule({ phrases: [], patterns: ["\\bcomment\\s+['\"]yes['\"]"] });
    expect(detect([p], 'Comment ‘YES’ and comment "yes"').get(p)?.matches).toEqual(['Comment ‘YES’', 'comment "yes"']);
  });
  it.each(['once', 'each', 'sqrt'] as const)('respects %s repetition and caps snippets at three', (repeat) => {
    const r = rule({ repeat });
    const hit = detect([r], 'delve DELVE delve delve').get(r)!;
    expect(hit.scale).toBe(repeat === 'each' ? 4 : repeat === 'sqrt' ? 2 : 1);
    expect(hit.matches).toHaveLength(3);
  });
  it('uses first/last two non-empty lines, preserving offsets and full spans', () => {
    const opening = rule({ position: 'opening', repeat: 'each' });
    const closing = rule({ id: 'test.close', position: 'closing', repeat: 'each' });
    const hits = detect([opening, closing], '  DELVE\n\nDelve\n\ndelve middle\n\nDelve\n\ndelve   ');
    expect(hits.get(opening)?.scale).toBe(2);
    expect(hits.get(closing)?.scale).toBe(2);
    expect(hits.get(closing)?.matches).toEqual(['Delve', 'delve']);
    const spanning = rule({ phrases: ['delve\nnext\nlast'], position: 'opening' });
    expect(detect([spanning], 'delve\nnext\nlast').size).toBe(0);
  });
  it('retains overlapping literals, suffixes, and different rules at the same offset', () => {
    const first = rule({ phrases: ['the best leaders'], repeat: 'each' });
    const second = rule({ id: 'test.second', phrases: ['best leaders', 'leaders'], repeat: 'each' });
    const hits = detect([first, second], 'The best leaders listen.');
    expect(hits.get(first)?.matches).toEqual(['The best leaders']);
    expect(hits.get(second)?.matches).toEqual(['best leaders']);
  });
  it('dedupes literal/pattern alternatives at the same start', () => {
    const r = rule({ phrases: ['delve', 'delve into'], patterns: ['\\bdelve\\b'], repeat: 'each' });
    expect(detect([r], 'delve into it; delve').get(r)).toMatchObject({ matches: ['delve into', 'delve'], scale: 2 });
  });
  it('trims accidental contributor whitespace at phrase edges', () => {
    const r = rule({ phrases: [' delve '] });
    expect(detect([r], 'I delve into this').get(r)?.matches).toEqual(['delve']);
  });
  it('does not swallow regex hits at the same or nested offsets', () => {
    const a = rule({ phrases: [], patterns: ['foo bar'] });
    const b = rule({ id: 'test.b', phrases: [], patterns: ['foo', 'bar'] , repeat: 'each' });
    const hits = detect([a, b], 'foo bar');
    expect(hits.get(a)?.matches).toEqual(['foo bar']);
    expect(hits.get(b)?.matches).toEqual(['foo', 'bar']);
  });
  it('keeps capture numbering and named backreferences local to their sources', () => {
    const a = rule({ phrases: [], patterns: ['(foo)\\s+\\1', '(?<word>bar)\\s+\\k<word>'], repeat: 'each' });
    const b = rule({ id: 'test.b', phrases: [], patterns: ['(?<word>baz)\\s+\\k<word>'] });
    const hits = detect([a, b], 'foo foo bar bar baz baz');
    expect(hits.get(a)?.matches).toEqual(['foo foo', 'bar bar']);
    expect(hits.get(b)?.matches).toEqual(['baz baz']);
  });
  it('preserves exact snippets after lowercase expansion and handles astral boundaries', () => {
    const r = rule();
    expect(detect([r], 'İstanbul 🚀 DELVE 𐐀delve delve𐐀').get(r)?.matches).toEqual(['DELVE']);
  });
  it('terminates empty regexes and resets state between calls', () => {
    expect(() => compilePhrases([rule({ phrases: [], patterns: ['(?:)'] })])).toThrow(/empty text/);
    const empty = rule({ phrases: [], patterns: ['(?=x)'] });
    const r = rule({ patterns: ['delve'] });
    const compiled = compilePhrases([empty, r]);
    expect(compiled(buildContext({ text: '🚀' })).size).toBe(0);
    expect(compiled(buildContext({ text: 'delve' })).get(r)?.matches).toEqual(['delve']);
    expect(compiled(buildContext({ text: 'delve' })).get(r)?.matches).toEqual(['delve']);
  });
});
