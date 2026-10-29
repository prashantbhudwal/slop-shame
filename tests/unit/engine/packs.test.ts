import { describe, expect, it } from 'vitest';
import { analyzePost, createEngine } from '../../../src/lib/engine';
import { packs } from '../../../src/lib/engine/packs';
import { UPSTREAM_FAMILIES } from '../../../src/lib/engine/packs/upstream-map';
import type { PostInput } from '../../../src/lib/engine/types';

// v2 adds entry-level dictionaries; weak visible habits may score below 40 on humans.
const positives: Record<string, PostInput> = {
  dictionaries: {text:'Regenerate response\nThe update is ready for the team to review today.'},
  'ai-vocabulary': { text: 'We must delve into the rich tapestry of ideas and explore their intricate interplay as a testament to our work.' },
  'template-phrases': { text: 'Moreover, it is important to note that the reality is that this serves as a significant step forward for everyone.' },
  'chatbot-leak': { text: 'Certainly! As an AI language model, I can help you draft a post for [Your Name] and expand it later.' },
  'negation-pivot': { text: "It's not about control, it's about creating a culture where everybody can contribute their ideas and feel heard." },
  inflation: { text: 'This marks a defining moment in our journey, a watershed moment that demonstrates the transformative potential of our work.' },
  hedging: { text: 'Experts believe this could potentially improve outcomes, though nobody has measured the change in enough detail to say yet.' },
  'engagement-bait': { text: "In today's fast-paced world, we all need to learn from each other. Save this for later. What would you add?" },
  formatting: { text: '🚀🚀🚀 Big launch energy today!\n✅ Win more.\n🔥 Sell more.\n💡 Think bigger.\n📈 Make every moment count.' },
  'robotic-rhythm': { text: 'Our team reviewed the reports and checked the figures before the meeting started this morning. '.repeat(7) },
  'bypass-tricks': { text: 'We need to dеlve into the tаpestry of new ideas before preparing our next report for the team.' },
  'pasted-output': { text: 'We are hiring at [Company]. Please see [link] for the role details.' },
};
const innocent: PostInput = { text: 'We fixed the import bug yesterday. The exporter used a tab in one field, which broke the parser. The patch accepts quoted tabs and includes a sample file so we can reproduce the problem.' };
describe.each(packs)('$id pack', (pack) => {
  it('has a positive example with evidence', () => {
    const report = createEngine([pack]).analyze(positives[pack.id]!);
    expect(report.signals.length).toBeGreaterThan(0);
    expect(report.signals.every((s) => s.ruleId.startsWith(`${pack.id}.`))).toBe(true);
    expect(report.signals.every((s) => s.matches.length > 0)).toBe(true);
  });
  it('leaves an ordinary technical update alone', () => {
    expect(createEngine([pack]).analyze(innocent).signals).toEqual([]);
  });
});

describe('precision and research guardrails', () => {
  it('maps all 48 upstream types into the ten families', () => {
    expect(Object.keys(UPSTREAM_FAMILIES)).toHaveLength(48);
    expect(new Set(Object.values(UPSTREAM_FAMILIES)).size).toBe(10);
    expect(packs).toHaveLength(11);
    expect(packs.filter((pack)=>pack.id!=='pasted-output').every((pack) => pack.attribution?.includes('MIT'))).toBe(true);
  });
  it('does not score headlines, human genre choices, one emoji, one dash, or thanks', () => {
    const inputs = [
      'I finally fixed the broken printer today 🎉. It only took a new cable and three attempts to install the driver.',
      'The API is back online — the database was unavailable for about five minutes while we replaced a failed disk.',
      'Bring tea, coffee, and biscuits to the workshop tomorrow. We will use the room at the back of the building.',
      'Grateful for my colleagues who covered the weekend shift while my family was dealing with a difficult few days.',
      "I'm thrilled to announce that I've started a new position at the hospital. Thanks to everyone who helped me move.",
      'My son just started his own business repairing bikes. He is still at school and works on them in the evenings.',
      'As an AI engineer I spent the week cleaning my training data for the defect classifier. We found some broken images.',
      'Would I do it again? Certainly! But next time I would bring a spare cable and more chairs for the room.',
    ];
    for (const text of inputs) expect(analyzePost({ text, authorHeadline: 'Visionary | Thought Leader | Evangelist | Ninja | Guru' }).score).toBeLessThan(40);
  });
  it('requires phrase evidence for em-dash corroboration and caps its contribution at two', () => {
    const body = 'I ran — I waited — I asked — I checked — I finished — I left the room.';
    expect(analyzePost({ text: body }).score).toBeLessThan(40);
    const report = analyzePost({ text: `Delve into a rich tapestry. ${body}` });
    expect(report.signals.find((s) => s.ruleId === 'formatting.em-dash')?.weight).toBeLessThanOrEqual(24); // v2 uses index points, still capped to one habit family.
  });
  it('does not penalize low diversity, missing contractions, or grammar', () => {
    expect(packs.flatMap((p) => p.rules).some((r) => /low-ttr|entropy|perplexity|contraction/.test(r.id))).toBe(false);
    const report = analyzePost({ text: 'The test is complete and the test result is acceptable. '.repeat(25) });
    expect(report.shameable).toBe(false);
    expect(report.score).toBeLessThan(40);
  });
  it('gates all rhythm rules below 80 words and needs at least four sentences', () => {
    const engine = createEngine([packs.find((p) => p.id === 'robotic-rhythm')!]);
    expect(engine.analyze({ text: 'Our team reviewed the reports and checked the figures. '.repeat(4) }).signals).toEqual([]);
    expect(engine.analyze({ text: 'The team reviewed the files before the meeting '.repeat(12) }).signals).toEqual([]);
  });
  it('recognizes mathematical fake bold while still matching its normalized phrases', () => {
    const report = analyzePost({ text: '𝗗𝗲𝗹𝘃𝗲 into a 𝘁𝗮𝗽𝗲𝘀𝘁𝗿𝘆 of ideas that will help every team develop a plan for the next year.' });
    expect(report.signals.some((s) => s.ruleId === 'formatting.unicode-bold')).toBe(true);
    expect(report.signals.flatMap(s=>s.matches).some(m=>/delve|tapestry/i.test(m))).toBe(true);
  });
  it('does not flag emoji joiners or pure non-Latin scripts as bypass tricks', () => {
    const engine = createEngine([packs.find((p) => p.id === 'bypass-tricks')!]);
    expect(engine.analyze({ text: 'I took my family 👨‍👩‍👧 out to the park after finishing work yesterday.' }).signals).toEqual([]);
    expect(engine.analyze({ text: 'Это обычный текст для моих коллег о встрече завтра утром в офисе' }).signals).toEqual([]);
    expect(engine.analyze({ text: 'Сегодня я отправил SMSку клиенту и получил ответ через десять минут после окончания нашей встречи в офисе в центре города' }).signals).toEqual([]);
  });
  it('does not mistake code instructions, editing notes, or short math labels for fingerprints', () => {
    const bodies = [
      "Never use type 'any' in TypeScript without checking whether unknown would work. We replaced three uses in the parser today.",
      '𝐓𝐢𝐩𝐬 for anyone using the shared room: please unplug the projector and close the windows when you leave.',
    ];
    for (const text of bodies) expect(analyzePost({ text }).score).toBeLessThan(40);
    expect(analyzePost({ text: bodies[0]! }).shameable).toBe(false);
    expect(analyzePost({ text: bodies[1]! }).shameable).toBe(false);
  });
  it('uses sentence anchors for built-in closers even when the post is one long line', () => {
    const engine = createEngine([packs.find((p) => p.id === 'engagement-bait')!]);
    const text = 'Agree? That was the heading on a survey we sent to the team last week. Most people asked for a smaller form and a clearer explanation of what we were collecting. We have removed the questions about travel and will keep the answers for a month. The updated version is in the shared folder if you need to check how the consent box works.';
    expect(engine.analyze({ text }).signals).toEqual([]);
    expect(engine.analyze({ text: `${text} Agree?` }).signals.some((s) => s.ruleId === 'engagement-bait.social-closer')).toBe(true);
  });
  it('dedupes metadata hashtags and accepts curly quotes in keyword CTAs', () => {
    expect(analyzePost({ ...innocent, hashtags: Array.from({ length: 20 }, () => '#AI') }).signals).toEqual([]);
    expect(analyzePost({ text: 'Comment “GUIDE” and I’ll send you the free checklist that we used for our recent launch.' }).signals.some((s) => s.matches.some(m=>/comment.*guide/i.test(m)))).toBe(true);
  });
});
