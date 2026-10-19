import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'inflation';
export const inflation: RulePack = {
  id: c, name: 'The significance inflation index', description: 'Ordinary events wearing a historical turning point costume.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'significance', 'A pivotal moment in paragraph history', 4, { repeat: 'each', phrases: ['marking a pivotal moment', 'marking a significant moment', 'a watershed moment', 'an enduring testament', 'a defining moment in', 'indelible mark', 'vital role in shaping', 'transformative potential'] }),
    phrase(c, 'novelty', 'A secret nobody has stopped posting about', 3, { repeat: 'sqrt', phrases: ["the failure mode nobody's naming", 'a problem nobody talks about', "the insight everyone's missing", 'what nobody tells you'] }),
    phrase(c, 'hollow', 'The intensifiers are doing all the work', 1, { repeat: 'sqrt', phrases: ['truly', 'genuinely', 'quite frankly', "let's be clear", 'profoundly', 'nothing short of'] }),
    phrase(c, 'emotional-flatline', 'An emotion announcement instead of an emotion', 2, { repeat: 'sqrt', phrases: ['what surprised me most', 'i was fascinated to', 'what struck me was', 'i was excited to learn', 'the most interesting aspect', 'the most interesting part'] }),
    phrase(c, 'lingering-attention', 'This thought has apparently rented a room', 2, { repeat: 'sqrt', phrases: ['the line i keep coming back to', 'the one quote i keep coming back to', 'still thinking about this one', "i've been chewing on this", 'rattling around in my head'] }),
    phrase(c, 'real-actual', 'Abstract nouns have been certified real', 2, { repeat: 'sqrt', patterns: ['\\b(?:real|actual|genuine|true)\\s+(?:on-?chain\\s+)?(?:tokenomics|utility|adoption|sustainability|impact|fundamentals|innovation|traction)\\b'] }),
    phrase(c, 'future-narrative', 'The future was upgraded to a narrative', 4, { patterns: ['\\b(?:may|could|will|is poised to) become (?:one of )?(?:the )?(?:most )?[a-z]+ (?:narratives?|developments?|trends?|movements?|chapters?|themes?|forces?)\\b'] }),
    phrase(c, 'promotional', 'A press release swallowed a superlative', 2, { repeat: 'each', phrases: ['game-changing', 'game-changer', 'revolutionary', 'groundbreaking innovation', 'unparalleled', 'unprecedented opportunity', 'boundless potential', 'limitless possibilities', 'unlock unprecedented', 'redefine the future'] }),
  ],
};
