import type { RulePack } from '../rule-types';
import { ATTRIBUTION, custom, phrase } from '../rules';

const SECONDARY = new Set('harness navigate navigating foster elevate unleash streamline empower bolster spearhead resonate resonates revolutionize facilitate facilitates underpin nuanced crucial multifaceted ecosystem myriad plethora encompass catalyze reimagine galvanize augment cultivate illuminate elucidate juxtapose transformative transformation cornerstone paramount poised burgeoning nascent quintessential overarching underpinning underpinnings'.split(' '));
const TERTIARY = new Set('significant significantly innovative innovation effective effectively dynamic dynamics scalable scalability compelling unprecedented exceptional exceptionally remarkable remarkably sophisticated instrumental verbatim'.split(' '));
const c = 'ai-vocabulary';
export const aiVocabulary: RulePack = {
  id: c, name: 'The autocomplete thesaurus', description: 'Vocabulary tells with density gates for everyday technical words.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'tier1', 'A rich tapestry of autocomplete', 3, { repeat: 'each', phrases: ['delve', 'delving', 'tapestry', 'beacon', 'intricacies', 'meticulously', 'ever-evolving', 'holistically', 'learnings', 'symphony', 'interplay'] }),
    phrase(c, 'tier1-common', 'The adjective drawer is unusually busy', 1.2, { repeat: 'each', phrases: ['paradigm', 'robust', 'comprehensive', 'cutting-edge', 'pivotal', 'meticulous', 'seamless', 'seamlessly', 'nestled', 'vibrant', 'thriving', 'bustling', 'intricate', 'enduring', 'daunting', 'holistic', 'actionable', 'impactful', 'leverage', 'leveraging', 'synergy', 'synergies', 'showcase', 'showcasing', 'underscoring', 'unpack'] }),
    phrase(c, 'collocations', 'Navigating the landscape of saying things', 4, { repeat: 'sqrt', phrases: ['testament to', 'harness the power', 'unlock the potential', 'navigate the landscape', 'navigating the landscape', 'embark on a journey', 'intricate interplay', 'rich tapestry', 'delve into the realm'] }),
    custom(c, 'tier2', 'The word cluster has achieved sentience', 2, (ctx) => {
      const matches: string[] = []; let count = 0;
      for (const word of ctx.words) if (SECONDARY.has(word)) { count++; if (matches.length < 3) matches.push(word); }
      return count >= 3 && count * 100 / ctx.wordCount >= 2 ? { matches, scale: Math.sqrt(count - 1) } : null;
    }),
    custom(c, 'tier3', 'Every noun brought an impressive adjective', 1.5, (ctx) => {
      const matches: string[] = []; let count = 0;
      for (const word of ctx.words) if (TERTIARY.has(word)) { count++; if (matches.length < 3) matches.push(word); }
      return count >= 4 && count * 100 / ctx.wordCount >= 3 ? { matches, scale: Math.sqrt(count - 2) } : null;
    }),
  ],
};
