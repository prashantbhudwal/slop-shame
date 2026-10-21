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
  it('retains overlapping and closing matches across bounded regex batches', () => {
    const rules=Array.from({length:40},(_,i)=>rule({id:`test.batch-${i}`,phrases:[],patterns:[i%2?'\\bbeta gamma\\b':'\\balpha beta\\b'],...(i>31?{position:'closing' as const}:{})}));
    const text='alpha beta gamma\n#Leadership #Growth';
    for(const ordered of [rules,rules.toReversed()]) {
      const hits=detect(ordered,text);
      for(const r of rules)expect(hits.get(r)?.matches).toEqual([r.patterns![0]!.includes('alpha')?'alpha beta':'beta gamma']);
    }
  });
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
  it.each(['once', 'each', 'sqrt'] as const)('respects %s repetition and retains candidates past three for evidence selection', (repeat) => {
    const r = rule({ repeat });
    const hit = detect([r], 'delve DELVE delve delve').get(r)!;
    expect(hit.scale).toBe(repeat === 'each' ? 4 : repeat === 'sqrt' ? 2 : 1);
    expect(hit.matches).toHaveLength(4);
    expect(hit.spans).toHaveLength(4);
  });
  it.each([
    [' ', ' '], ['  ', '  '], ['\t', '\t'], ['\n', '\n'], [' \n\t  ', ' \n\t  '],
    ['\u0085', '\u0085'], ['\u1680', '\u1680'], ['\u2028', '\u2028'], ['\u2029', '\u2029'],
    ['\u00a0\u2003\u202f', '   '],
  ])('matches multiword literals across whitespace %j with exact normalized snippets', (separator, normalized) => {
    const r = rule({ phrases: ['as an ai language model'] });
    const hit = detect([r], `Before. As an AI${separator}language model!`).get(r);
    const snippet = `As an AI${normalized}language model`;
    expect(hit).toMatchObject({ matches: [snippet], spans: [[8, 8 + snippet.length]] });
  });
  it.each(['once', 'each', 'sqrt'] as const)('counts %s repetitions across different whitespace runs', (repeat) => {
    const r = rule({ phrases: ['delve into'], repeat });
    const snippets = ['Delve  into', 'DELVE\tinto', 'delve\n\ninto', 'delve\u2028into'];
    const text = snippets.join('; ');
    const hit = detect([r], text).get(r)!;
    expect(hit.scale).toBe(repeat === 'each' ? 4 : repeat === 'sqrt' ? 2 : 1);
    expect(hit.matches).toEqual(snippets);
    expect(hit.spans).toEqual(snippets.map((snippet) => [text.indexOf(snippet), text.indexOf(snippet) + snippet.length]));
  });
  it('normalizes whitespace inside contributor literals as well as at their edges', () => {
    const r = rule({ phrases: ['\u0085\tAS  an\nAI\u0085language\tmodel\u1680'] });
    expect(detect([r], 'As an AI language model.').get(r)?.matches).toEqual(['As an AI language model']);
    expect(detect([r], 'As\tan AI\n\nlanguage  model.').get(r)?.matches).toEqual(['As\tan AI\n\nlanguage  model']);
  });
  it('preserves word boundaries and required separators for multiword literals', () => {
    const r = rule({ phrases: ['as an ai language model'], repeat: 'each' });
    const text = [
      'xas an AI\tlanguage model', 'as an AI language modelé',
      '𐐀as an AI language model', 'as an AI language model𐐀',
      '\u0301as an AI language model', 'as an AI language model\u0301',
      '_as an AI language model', 'as an AI language model_',
      '1as an AI language model', 'as an AI language model1',
      'as an AIlanguage model', 'as an AI-language model', 'as an AI, language model',
      '🚀As an AI \n language model🚀',
    ].join('; ');
    expect(detect([r], text).get(r)).toMatchObject({ matches: ['As an AI \n language model'], scale: 1 });
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
  it('maps multiline literal spans before checking the opening boundary and preserves context structure', () => {
    const opening = rule({ phrases: ['as an ai language model'], position: 'opening' });
    const anywhere = rule({ id: 'test.anywhere', phrases: opening.phrases });
    const text = '\n  As an AI \n\tlanguage model\n\nThird line.\n';
    const ctx = buildContext({ text });
    const compiled = compilePhrases([opening, anywhere]);
    const snippet = 'As an AI \n\tlanguage model';
    expect(compiled(ctx).get(opening)).toMatchObject({ matches: [snippet], spans: [[3, 3 + snippet.length]] });
    expect(ctx.text).toBe(text);
    expect(ctx.lower).toBe(text.toLowerCase());
    expect(ctx.lines).toEqual(['As an AI', 'language model', 'Third line.']);
    expect(ctx.words).toEqual(['as', 'an', 'ai', 'language', 'model', 'third', 'line']);

    const hits = compiled(buildContext({ text: 'Concrete intro.\nAs an AI\n\tlanguage model' }));
    expect(hits.get(anywhere)?.matches).toEqual(['As an AI\n\tlanguage model']);
    expect(hits.has(opening)).toBe(false);
  });
  it('keeps multiline literals inside the last two prose lines and out of footers', () => {
    const closing = rule({ phrases: ['as an ai language model'], position: 'closing' });
    const anywhere = rule({ id: 'test.anywhere', phrases: closing.phrases });
    const footer = rule({ id: 'test.footer', phrases: ['language model #ai'], position: 'closing' });
    const compiled = compilePhrases([closing, anywhere, footer]);
    const allowed = compiled(buildContext({ text: 'Concrete intro.\nAs an AI\n\tlanguage model\n#AI\n🚀' }));
    expect(allowed.get(closing)?.matches).toEqual(['As an AI\n\tlanguage model']);
    expect(allowed.has(footer)).toBe(false);

    const crossing = compiled(buildContext({ text: 'As an AI\n\tlanguage model\nThe actual closing.\n#AI\n🚀' }));
    expect(crossing.get(anywhere)?.matches).toEqual(['As an AI\n\tlanguage model']);
    expect(crossing.has(closing)).toBe(false);
  });
  it('retains overlapping literals, suffixes, and different rules at the same offset', () => {
    const first = rule({ phrases: ['the best leaders'], repeat: 'each' });
    const second = rule({ id: 'test.second', phrases: ['best leaders', 'leaders'], repeat: 'each' });
    const hits = detect([first, second], 'The best leaders listen.');
    expect(hits.get(first)?.matches).toEqual(['The best leaders']);
    expect(hits.get(second)).toMatchObject({ matches: ['best leaders', 'leaders'], scale: 1 });
  });
  it('dedupes identical literal/pattern occurrences while retaining different lengths', () => {
    const r = rule({ phrases: ['delve', 'delve into'], patterns: ['\\bdelve\\b'], repeat: 'each' });
    expect(detect([r], 'delve into it; delve').get(r)).toMatchObject({ matches: ['delve into', 'delve', 'delve'], spans: [[0, 10], [0, 5], [15, 20]], scale: 2 });
  });
  it('preserves nested alternatives as candidates for cross-rule competition', () => {
    const r = rule({ phrases: ['alpha', 'alpha beta', 'beta'], patterns: ['\\balpha\\b'], repeat: 'each' });
    const hit = detect([r], 'alpha beta').get(r)!;
    expect(hit.spans).toEqual([[0, 10], [0, 5], [6, 10]]);
  });
  it('dedupes whitespace-normalized literals and both regex paths at exact original spans', () => {
    const r = rule({
      phrases: ['as an ai', 'as an ai language model', 'as an ai\n\tlanguage model'],
      patterns: ['as an ai', 'as an ai\\s+language model', '(as an ai)\\s+language model'],
      repeat: 'each',
    });
    const snippets = ['AS AN AI \n\tLANGUAGE MODEL', 'as an ai language model'];
    const text = `İ  ${snippets.join('; ')}`;
    expect(detect([r], text).get(r)).toMatchObject({
      matches: [snippets[0], 'AS AN AI', snippets[1], 'as an ai'], scale: 2,
      spans: snippets.flatMap((snippet) => [[text.indexOf(snippet), text.indexOf(snippet) + snippet.length], [text.indexOf(snippet), text.indexOf(snippet) + 8]]),
    });
  });
  it('keeps regex whitespace semantics unchanged in candidate and isolated matchers', () => {
    const literal = rule({ phrases: ['ai language'], repeat: 'each' });
    const strict = rule({ id: 'test.strict', phrases: [], patterns: ['ai language'], repeat: 'each' });
    const captured = rule({ id: 'test.captured', phrases: [], patterns: ['(ai) language'], repeat: 'each' });
    const flexible = rule({ id: 'test.flexible', phrases: [], patterns: ['ai\\s+language'], repeat: 'each' });
    const snippets = ['AI  language', 'AI\tlanguage', 'AI\nlanguage', 'AI language'];
    const hits = detect([literal, strict, captured, flexible], snippets.join('; '));
    expect(hits.get(literal)?.scale).toBe(4);
    expect(hits.get(flexible)?.scale).toBe(4);
    expect(hits.get(strict)).toMatchObject({ matches: ['AI language'], scale: 1 });
    expect(hits.get(captured)).toMatchObject({ matches: ['AI language'], scale: 1 });
  });
  it('trims accidental contributor whitespace at phrase edges', () => {
    const r = rule({ phrases: [' delve '] });
    expect(detect([r], 'I delve into this').get(r)?.matches).toEqual(['delve']);
  });
  it('anchors closing regexes at the end of prose before hashtag and emoji-only footer lines', () => {
    const r = rule({ phrases: [], patterns: ['agree\\?\\s*$'], position: 'closing' });
    const text = 'A concrete opening sentence.\nHere is the decision.\nAgree?\n\n#Leadership #Growth\n#Mindset\n👇\n♻️';
    expect(detect([r], text).get(r)?.matches).toEqual(['Agree?']);
    expect(detect([r], '#one #two #three\n👇').size).toBe(0);
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
  it('composes collapsed whitespace offsets with lowercase expansion before and inside matches', () => {
    const r = rule({ phrases: ["İt's not", "it's not"], repeat: 'each' });
    const snippets = ['İT’S \n\tNOT', 'IT’S\tNOT'];
    const text = `İstanbul 🚀  ${snippets[0]}; İ  ${snippets[1]}.`;
    expect(detect([r], text).get(r)).toMatchObject({
      matches: snippets, scale: 2,
      spans: snippets.map((snippet) => [text.indexOf(snippet), text.indexOf(snippet) + snippet.length]),
    });
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
