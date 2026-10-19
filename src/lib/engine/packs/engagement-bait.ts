import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'engagement-bait';
export const engagementBait: RulePack = {
  id: c, name: 'The algorithmic curtain call', description: 'Detector-derived openers, generic conclusions, and social closers.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'social-closer', 'Engagement homework for the audience', 3, { position: 'closing', patterns: ["\\b(?:agree\\?|thoughts\\?|what would you add\\?|save this for later[.!]?|follow me for more[.!]?|read that again[.!]?|thank me later[.!]?|this one is worth your time[.!]?|do yourself a favor and read this[.!]?|don't sleep on this[.!]?)\\s*(?:👇)?\\s*$"] }),
    phrase(c, 'keyword-closer', 'A PDF held hostage for comments', 5, { patterns: ["\\b(?:comment|drop|reply)\\s+['\"][a-z0-9_-]{1,20}['\"]", "\\bcomment\\s+[a-z0-9_-]{1,20}\\s+(?:below\\s+)?(?:and\\s+)?(?:i'll|i will|we'll|we will)\\s+(?:send|dm|share)\\b"] }),
    phrase(c, 'rhetorical-question', 'A rhetorical question requested the microphone', 2, { phrases: ['but what does this mean for', 'so why should you care', "what's next?", 'the question is:'] }),
    phrase(c, 'formulaic-opener', 'The world evolves at the speed of a template', 5, { position: 'opening', patterns: ["(?:^|\\n)[ \\t]*in\\s+today's\\s+(?:(?:fast[ -]paced|rapidly\\s+(?:evolving|changing)|ever[ -]evolving|digital)\\s+){1,3}(?:world|landscape|era)\\b", '(?:^|\\n)[ \\t]*in the (?:rapidly |ever-?)?(?:evolving|changing|expanding|growing|shifting) (?:world|landscape|realm|space|field|era) of\\b', '(?:^|\\n)[ \\t]*in (?:an?|the) (?:digital )?age (?:where|of)\\b'] }),
    phrase(c, 'speculative-opener', 'Imagine a world where this gets to the point', 4, { position: 'opening', patterns: ['(?:^|\\n)[ \\t]*(?:imagine|picture|envision)(?:, [^,\\n]{1,30},)? a (?:world|future|reality) (?:where|in which)\\b'] }),
    phrase(c, 'generic-conclusion', 'The future is conveniently unspecific', 3, { repeat: 'sqrt', phrases: ['the future looks bright', 'only time will tell', 'one thing is certain', 'as we move forward', 'exciting times lie ahead', 'together, we can shape the future', 'as we continue this journey', 'endless possibilities'] }),
  ],
};
