import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'negation-pivot';
export const negationPivot: RulePack = {
  id: c, name: 'Not a sentence. A formula.', description: 'Manufactured contrast, countdowns, and ceremonial concessions.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'not-x-but-y', "It's not a sentence. It's a formula.", 4, { repeat: 'sqrt', patterns: ["\\b(?:it'?s|this\\s+is|that'?s)\\s+not\\s+(?:just\\s+|only\\s+|merely\\s+)?[^.!?\\n]{1,75}[,;.!–—-]\\s*(?:it'?s|this\\s+is|it\\s+is)\\s+[^.!?\\n]{1,65}", "\\b(?:isn't|aren't|wasn't|weren't|is not|are not|was not|were not)\\s+(?:just\\s+|only\\s+|merely\\s+)?about\\s+[^.!?\\n]{1,75}(?:[,;.!–—-]|\\bbut\\b)\\s*(?:it'?s|it is|they're|they are|about)\\s+[^.!?\\n]{1,65}", "\\b(?:isn't|isnt|is not)\\s+(?:usually\\s+)?[^.!?\\n]{1,65}(?:[.!]\\s+|[\\t ]*\\n[\\t ]*)(?:it'?s|it is)\\s+(?!still\\b|not\\b|missing\\b)[^.!?\\n]{1,85}"] }),
    phrase(c, 'one-size-fits-all', 'A universal caveat opened the explainer', 2, { phrases: ['is not "one-size-fits-all', 'is not one-size-fits-all', "isn't one-size-fits-all", 'isn’t "one-size-fits-all'] }),
    phrase(c, 'audience-contrast', 'Most people versus the people who get it', 4, { repeat: 'sqrt', patterns: ["\\bmost people (?:treat|think|see|use|focus on) [^.!?\\n]{1,90}[.!]\\s*(?:engineers|experts|leaders|the best teams|great teams|professionals) (?:treat|think|see|use|focus on) [^.!?\\n]{1,90}"] }),
    phrase(c, 'not-only', 'Every claim brought a compulsory contrast', 3, { repeat: 'sqrt', patterns: ['\\bnot\\s+(?:just|only|merely)\\s+[^.!?\\n]{1,65}\\bbut\\s+(?:also\\s+)?[^.!?\\n]{1,60}'] }),
    phrase(c, 'countdown', 'Three negations in a motivational trench coat', 5, { patterns: ['\\bnot [^.!?\\n]{1,30}[.!]\\s*not [^.!?\\n]{1,30}[.!]\\s*(?:just|only|but) [^.!?\\n]{1,50}'] }),
    phrase(c, 'false-concession', 'A concession with no concession inside', 2, { repeat: 'sqrt', patterns: ['\\bwhile [a-z -]{1,35} is impressive\\b', '\\balthough [a-z -]{1,35} has made strides\\b', '\\bdespite (?:these|its|the) challenges[^.!?\\n]{0,60}continues? to thrive\\b'] }),
  ],
};
