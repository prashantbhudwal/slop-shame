import { describe, expect, it } from 'vitest';
import { buildContext, structureOf } from '../../../src/lib/engine/context';

describe('shared post context', () => {
  it('strips invisible bypasses, folds lookalikes, preserves display punctuation', () => {
    const ctx = buildContext({ text: 'Dеl\u200bve\u200c\u200d\u2060\ufeff into α tаpestry. “It’s fine.”\r\n\rNext line!' });
    expect(ctx.text).toBe('Delve into a tapestry. “It’s fine.”\n\nNext line!');
    expect(ctx.lower).toContain('"it\'s fine."');
    expect(ctx.words).toEqual(['delve', 'into', 'a', 'tapestry', "it's", 'fine', 'next', 'line']);
    expect(ctx.wordCount).toBe(8);
    expect(ctx.lines).toEqual(['Delve into a tapestry. “It’s fine.”', 'Next line!']);
  });

  it('handles blank lines, fragments, accented tokens, digits, and apostrophes once', () => {
    const ctx = buildContext({ text: '\n  Café 42\n\nWe’re here! Good.\n  Last fragment  \n' });
    expect(ctx.words).toEqual(['café', '42', "we're", 'here', 'good', 'last', 'fragment']);
    expect(ctx.sentences).toEqual(['Café 42', 'We’re here!', 'Good.', 'Last fragment']);
    expect(structureOf(ctx).lineWordCounts).toEqual([2, 3, 2]);
    expect(structureOf(ctx).blankBreaks).toBe(1);
  });

  it('counts extended pictographs rather than UTF-16 units', () => {
    const ctx = buildContext({ text: '🚀🚀 👨‍👩‍👧 ✅ ✨ a real sentence' });
    // The contract counts code points with Extended_Pictographic, not graphemes.
    expect(ctx.emojiCount).toBe(7);
    expect(structureOf(ctx).rockets).toBe(2);
  });

  it('dedupes hashtags from the body and metadata and rejects junk', () => {
    const ctx = buildContext({ text: '#AI #ai #Développeur #growth_2026 C# include #include', hashtags: ['#AI', '#LEADERSHIP', '#leadership', '#', 'not a tag'] });
    expect(ctx.hashtags).toEqual(['#ai', '#développeur', '#growth_2026', '#include', '#leadership']);
  });

  it('handles expanding Unicode lowercase offsets and all-whitespace posts', () => {
    const ctx = buildContext({ text: 'İstanbul\n\nDELVE now' });
    expect(ctx.lower).toContain('i\u0307stanbul');
    expect(structureOf(ctx).lowerOffsets).not.toBeNull();
    expect(structureOf(ctx).lineWordCounts).toEqual([1, 2]);
    expect(buildContext({ text: ' \n\t' }).wordCount).toBe(0);
  });
  it('records exact token spans through lowercase expansion and astral characters', () => {
    const ctx = buildContext({ text: 'İstanbul 🚀 HARNESS elevated foster’s' });
    expect(structureOf(ctx).wordSpans.map(([start, end]) => ctx.text.slice(start, end))).toEqual(['İstanbul', 'HARNESS', 'elevated', 'foster’s']);
    expect(structureOf(ctx).wordSpans).toHaveLength(ctx.words.length);
  });

  it('protects whole multiline quotes and contiguous Markdown blockquotes without changing offsets', () => {
    const text = 'Intro. “Quoted\nmodel example.”\n> <think>\n> Some reasoning.\n> </think>\nDirect prose.';
    const ctx = buildContext({ text });
    const spans = structureOf(ctx).protectedSpans;
    expect(spans.map(([start, end]) => ctx.text.slice(start, end))).toEqual(['“Quoted\nmodel example.”\n> <think>\n> Some reasoning.\n> </think>']);
    expect(ctx.text).toBe(text);
    expect(spans.every(([start, end]) => start < end)).toBe(true);
    expect(spans[0]![1]).toBeLessThan(text.indexOf('Direct prose.'));
  });

  it('merges quoted examples separated only by whitespace', () => {
    const example = '```\n[assistant]\nAn answer.\n[user]\nA question.\n```';
    const examples = `${example}\n\n${example}`;
    const ctx = buildContext({ text: `${examples}\nDirect prose.` });
    expect(structureOf(ctx).protectedSpans).toEqual([[0, examples.length]]);
  });

  it('keeps recognizing examples after many unmatched multiline quote openers', () => {
    const prefix = '“word '.repeat(3000);
    const ctx = buildContext({ text: `${prefix}\`alpha\` \n> beta\nDirect prose.` });
    expect(structureOf(ctx).protectedSpans).toEqual([[prefix.length, prefix.length + '`alpha` \n> beta'.length]]);
  });
  it('normalizes mathematical fake bold but retains raw input for its formatting signal', () => {
    const input = { text: '𝗗𝗲𝗹𝘃𝗲 into the 𝘁𝗮𝗽𝗲𝘀𝘁𝗿𝘆.' };
    const ctx = buildContext(input);
    expect(ctx.text).toBe('Delve into the tapestry.');
    expect(ctx.input.text).toBe(input.text);
  });
});
