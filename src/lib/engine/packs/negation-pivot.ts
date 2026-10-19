import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'negation-pivot';
export const negationPivot: RulePack = {
  id: c, name: 'Not a sentence. A formula.', description: 'Manufactured contrast, countdowns, and ceremonial concessions.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'not-x-but-y', "It's not a sentence. It's a formula.", 6, { repeat: 'sqrt', patterns: ["\\b(?:it'?s|this\\s+is|that'?s)\\s+not\\s+(?:just\\s+|only\\s+|merely\\s+)?[^.!?\\n]{1,75}[,;.!—-]\\s*(?:it'?s|this\\s+is|it\\s+is)\\s+[^.!?\\n]{1,65}"] }),
    phrase(c, 'not-only', 'Every claim brought a compulsory contrast', 3, { repeat: 'sqrt', patterns: ['\\bnot\\s+(?:just|only|merely)\\s+[^.!?\\n]{1,65}\\bbut\\s+(?:also\\s+)?[^.!?\\n]{1,60}'] }),
    phrase(c, 'countdown', 'Three negations in a motivational trench coat', 5, { patterns: ['\\bnot [^.!?\\n]{1,30}[.!]\\s*not [^.!?\\n]{1,30}[.!]\\s*(?:just|only|but) [^.!?\\n]{1,50}'] }),
    phrase(c, 'false-concession', 'A concession with no concession inside', 2, { repeat: 'sqrt', patterns: ['\\bwhile [a-z -]{1,35} is impressive\\b', '\\balthough [a-z -]{1,35} has made strides\\b', '\\bdespite (?:these|its|the) challenges[^.!?\\n]{0,60}continues? to thrive\\b'] }),
  ],
};
