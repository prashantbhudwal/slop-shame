import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'hedging';
export const hedging: RulePack = {
  id: c, name: 'The department of potential possibilities', description: 'Hedges, vague authorities, and confidence theatre.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'stack', 'This could potentially maybe be a sentence', 4, { repeat: 'sqrt', patterns: ['\\b(?:could|may|might)\\s+(?:(?!not\\b|never\\b|hardly\\b|scarcely\\b|barely\\b)[a-z]+\\s+)?(?:potentially|eventually|ultimately|possibly|conceivably)\\b', '\\b(?:potentially|eventually|ultimately)\\s+(?:could|may|might)\\b'] }),
    phrase(c, 'parenthetical', 'Thoughtfulness added in parentheses', 0.25, { repeat: 'sqrt', patterns: ['\\(\\s*(?:and\\s+)?(?:increasingly|notably|importantly|crucially|interestingly|perhaps),?\\s+[^)\\n]{3,60}\\)', '\\(\\s*or more (?:precisely|accurately|specifically),?\\s+[^)\\n]{3,60}\\)', '\\(\\s*though to be fair,?\\s+[^)\\n]{3,60}\\)'] }),
    phrase(c, 'vague-attribution', 'Experts, unavailable for comment', 2, { repeat: 'sqrt', phrases: ['experts believe', 'experts say', 'experts suggest', 'industry leaders agree', 'industry observers note', 'some critics argue', 'studies suggest', 'research indicates'] }),
    phrase(c, 'confidence', 'Certainty delivered in adverb form', 1, { repeat: 'sqrt', phrases: ['interestingly', 'surprisingly', 'importantly', 'undoubtedly', 'without a doubt', 'it could be argued that'] }),
  ],
};
