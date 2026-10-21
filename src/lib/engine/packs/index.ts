import { dictionaries } from './dictionaries';
import type { RulePack } from '../rule-types';
import { aiVocabulary } from './ai-vocabulary';
import { templatePhrases } from './template-phrases';
import { chatbotLeak } from './chatbot-leak';
import { negationPivot } from './negation-pivot';
import { inflation } from './inflation';
import { hedging } from './hedging';
import { engagementBait } from './engagement-bait';
import { formatting } from './formatting';
import { roboticRhythm } from './robotic-rhythm';
import { bypassTricks } from './bypass-tricks';
import { pastedOutput } from './pasted-output';
export const packs: RulePack[] = [aiVocabulary, templatePhrases, chatbotLeak, negationPivot, inflation, hedging, engagementBait, formatting, roboticRhythm, bypassTricks, pastedOutput, dictionaries];
export { aiVocabulary, templatePhrases, chatbotLeak, negationPivot, inflation, hedging, engagementBait, formatting, roboticRhythm, bypassTricks };

// Built-ins are immutable; reusable precompiled engines can safely share them.
for (const pack of packs) { for (const rule of pack.rules) { if (rule.kind === 'phrase') { if (rule.phrases) Object.freeze(rule.phrases); if (rule.patterns) Object.freeze(rule.patterns); } Object.freeze(rule); } Object.freeze(pack.rules); Object.freeze(pack); }
Object.freeze(packs);
