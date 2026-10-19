import { describe, expect, it } from 'vitest';
import { TIERS, tierFor } from '../../../src/lib/engine/tiers';
import type { SlopCategory, SlopReport, SlopSignal, SlopTierId } from '../../../src/lib/engine/types';
import { CATEGORIES, CATEGORY_META } from '../../../src/lib/shame/categories';
import { SHAME_FORMATS } from '../../../src/lib/shame/formats';
import {
  cleanQuote, displayName, generateShame, initials, isEligible, mulberry32, ordinal, renderShame, scrubName, shameToText, slotsOf,
  type ShameSubject,
} from '../../../src/lib/shame/generate';
import { SHAME_SLOTS, type ShameFormat } from '../../../src/lib/shame/types';

const SAMPLE_MATCHES: Record<SlopCategory, string[]> = {
  'ai-vocabulary': ['delve', 'rich tapestry'],
  'template-phrases': ['In today’s fast-paced world', 'Moreover,'],
  'chatbot-leak': ['Certainly! Here’s a LinkedIn post', '[Your Name]'],
  'negation-pivot': ['It’s not about the code. It’s about the people.'],
  inflation: ['truly game-changing', 'revolutionary'],
  hedging: ['could potentially', 'experts say'],
  'engagement-bait': ['Agree?', 'Thoughts?'],
  formatting: ['—', '🚀'],
  'robotic-rhythm': ['Clear. Concise. Compelling.'],
  'bypass-tricks': ['​​​'],
};

function report(score: number, cats: SlopCategory[], matches = true): SlopReport {
  const signals: SlopSignal[] = cats.map((category, i) => ({
    ruleId: `test.${category}`,
    category,
    label: `${CATEGORY_META[category].label} signal`,
    weight: 10 - i,
    matches: matches ? SAMPLE_MATCHES[category] : [],
  }));
  const categoryWeights: Partial<Record<SlopCategory, number>> = {};
  for (const s of signals) categoryWeights[s.category] = (categoryWeights[s.category] ?? 0) + s.weight;
  return { score, shameable: score >= 40, tier: tierFor(score), signals, topCategory: cats[0] ?? null, categoryWeights, wordCount: 212 };
}

const author = { name: 'Jane Doe, MBA 🚀', headline: 'Visionary | Thought Leader | 3x Founder | Keynote Speaker', kind: 'person' as const };
const scoreFor: Record<SlopTierId, number> = { artisanal: 8, whiff: 30, certified: 50, swamp: 70, slopocalypse: 92 };
const LEFTOVER = /\{\w+\}/;

function subjectsFor(format: ShameFormat): ShameSubject[] {
  const tiers = format.tiers ?? TIERS.map((t) => t.id);
  const cats = format.categories ?? ['ai-vocabulary', 'engagement-bait'];
  return tiers.map((tier) => ({
    report: report(scoreFor[tier], tier === 'artisanal' ? [] : [...cats, 'formatting']),
    author,
    slopCount: format.minCount ?? 4,
  }));
}

describe('shame formats', () => {
  it('has at least 40 formats with unique ids', () => {
    expect(SHAME_FORMATS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(SHAME_FORMATS.map((f) => f.id)).size).toBe(SHAME_FORMATS.length);
  });

  it('uses only known slots', () => {
    const known = new Set<string>(SHAME_SLOTS);
    for (const f of SHAME_FORMATS) {
      for (const text of [f.title, f.body, f.footer ?? '']) {
        for (const m of text.matchAll(/\{(\w+)\}/g)) expect(known.has(m[1]!), `${f.id} uses {${m[1]}}`).toBe(true);
      }
    }
  });

  it('every format renders with no leftover {slot} on a post it is meant for', () => {
    for (const format of SHAME_FORMATS) {
      for (const subject of subjectsFor(format)) {
        expect(isEligible(format, subject), `${format.id} @ ${subject.report.tier.id}`).toBe(true);
        const shame = renderShame(format, subject);
        for (const text of [shame.title, shame.body, shame.footer ?? '']) {
          expect(text, format.id).not.toMatch(LEFTOVER);
          expect(text).not.toMatch(/undefined|null|NaN/);
        }
      }
    }
  });

  it('covers every layout', () => {
    const layouts = new Set(SHAME_FORMATS.map((f) => f.layout));
    for (const l of ['citation', 'certificate', 'tabloid', 'wanted-poster', 'report-card', 'eulogy'] as const) expect(layouts.has(l)).toBe(true);
  });

  it('has at least 3 formats specific to every category, 5 for the smoking guns', () => {
    for (const c of CATEGORIES) {
      const n = SHAME_FORMATS.filter((f) => f.categories?.includes(c)).length;
      expect(n, c).toBeGreaterThanOrEqual(c === 'chatbot-leak' || c === 'bypass-tricks' ? 5 : 3);
    }
  });

  it('every tier has its own generic formats and several eligible formats', () => {
    for (const tier of TIERS) {
      expect(SHAME_FORMATS.some((f) => !f.categories && f.tiers?.includes(tier.id)), tier.id).toBe(true);
      const subject: ShameSubject = { report: report(scoreFor[tier.id], tier.id === 'artisanal' ? [] : ['inflation']), author, slopCount: 1 };
      expect(SHAME_FORMATS.filter((f) => isEligible(f, subject)).length, tier.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('never uses gendered pronouns for the author', () => {
    for (const f of SHAME_FORMATS) expect(`${f.title} ${f.body} ${f.footer ?? ''}`, f.id).not.toMatch(/\b(he|she|his|hers|her)\b/i);
  });
});

describe('generateShame', () => {
  const sloppy: ShameSubject = { report: report(86, ['chatbot-leak', 'ai-vocabulary', 'engagement-bait']), author, slopCount: 5 };

  it('is deterministic for a seeded RNG', () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed);
      const history = { recent: [] as string[] };
      return Array.from({ length: 8 }, () => generateShame(sloppy, { rng, history }));
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(7));
  });

  it('does not repeat a format within a session until it runs out', () => {
    const rng = mulberry32(1);
    const history = { recent: [] as string[] };
    const ids = Array.from({ length: 10 }, () => generateShame(sloppy, { rng, history }).formatId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prefers jokes about the post’s top tell and quotes the real phrase', () => {
    const rng = mulberry32(3);
    let onTopic = 0;
    for (let i = 0; i < 200; i++) {
      const shame = generateShame(sloppy, { rng, history: { recent: [] } });
      if (shame.category === 'chatbot-leak') onTopic++;
      if (shame.category === 'chatbot-leak' && shame.quote) expect(['Certainly! Here’s a LinkedIn post', '[Your Name]']).toContain(shame.quote);
    }
    expect(onTopic).toBeGreaterThan(100);
  });

  it('skips formats whose slots it cannot fill', () => {
    const bare: ShameSubject = { report: report(55, ['bypass-tricks'], false), author: { name: 'Acme Corp', kind: 'company' }, slopCount: 1 };
    const rng = mulberry32(9);
    for (let i = 0; i < 100; i++) {
      const shame = generateShame(bare, { rng, history: { recent: [] } });
      expect(`${shame.title} ${shame.body} ${shame.footer ?? ''}`).not.toMatch(LEFTOVER);
    }
  });

  it('handles an unknown author and a clean post', () => {
    const shame = generateShame({ report: report(4, []), author: null }, { rng: mulberry32(5), history: { recent: [] } });
    expect(shame.body).not.toMatch(LEFTOVER);
    expect(SHAME_FORMATS.find((f) => f.id === shame.formatId)!.tiers).toEqual(['artisanal']);
  });

  it('renders plain text for copying', () => {
    const shame = generateShame(sloppy, { rng: mulberry32(11), history: { recent: [] } });
    const text = shameToText(shame, sloppy.report);
    expect(text).toContain(shame.body);
    expect(text).toContain('Slop Index 86/100');
  });
});

describe('sharing anonymization', () => {
  it('reduces names to initials and scrubs them from the headline', () => {
    expect(initials('Jane Doe, MBA 🚀')).toBe('J.D.');
    expect(initials('Mary Ann de la Cruz')).toBe('M.C.');
    expect(initials('Cher')).toBe('C.');
    expect(scrubName('Founder of Jane Doe Consulting | Doe Ventures', 'Jane Doe')).toBe('Founder of J.D. Consulting | D. Ventures');
  });

  it('never leaks the full or first name in an anonymized render', () => {
    const named = { name: 'Priya Raman', headline: 'CEO at Raman Labs | Keynote Speaker', kind: 'person' as const };
    for (const format of SHAME_FORMATS) {
      for (const subject of subjectsFor(format)) {
        const shame = renderShame(format, { ...subject, author: named }, { anonymize: true });
        const text = `${shame.title} ${shame.body} ${shame.footer ?? ''}`;
        expect(text, format.id).not.toMatch(/Priya|Raman/);
      }
    }
  });
});

describe('helpers', () => {
  it('cleans quotes', () => {
    expect(cleanQuote('​​')).toBe('');
    expect(cleanQuote('  “Agree?”  ')).toBe('Agree?');
    expect(cleanQuote('a '.repeat(80), 20).length).toBeLessThanOrEqual(20);
    expect(cleanQuote('—')).toBe('—');
    expect(cleanQuote('. I hope this helps!')).toBe('I hope this helps!');
  });
  it('formats names and ordinals', () => {
    expect(displayName('Jane Doe, MBA, PMP 🚀')).toBe('Jane Doe');
    expect(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '102nd']).toEqual([1, 2, 3, 4, 11, 12, 13, 21, 102].map(ordinal));
  });
  it('slotsOf finds every slot in a format', () => {
    expect([...slotsOf({ id: 'x', layout: 'citation', title: '{first}', body: '{quote} {score}', footer: '{count}' })].sort()).toEqual(['count', 'first', 'quote', 'score']);
  });
});
