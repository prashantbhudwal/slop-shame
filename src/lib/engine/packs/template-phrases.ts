import type { RulePack } from '../rule-types';
import { ATTRIBUTION, custom, phrase } from '../rules';
const FIELD = /(?:^|[-–—]\s*)(best for|how it works|use it when|pattern|focus|core to|useful for|one-liner|key takeaway|bottom line|why it matters)\s*:/i;
const c = 'template-phrases';
export const templatePhrases: RulePack = {
  id: c, name: 'The paragraph assembly line', description: 'Boilerplate, ceremonial signposting, transitions, and filler.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'explainer-scaffold', 'The explainer came with assembly instructions', 3, { repeat: 'sqrt', patterns: ["\\bhere(?:'?s| is)\\s+(?:a |the )?breakdown\\b", "\\bhere'?s what (?:actually |really )?separates\\b", '\\bthe (?:critical|key|crucial) distinction (?:most|many) (?:teams|people|engineers) miss\\b'] }),
    { ...custom(c, 'labeled-fields', 'Every section filled in the same form', 2, (ctx) => {
      const matches: string[] = [];
      const labels = new Map<string, number>();
      for (const line of ctx.lines) {
        const field = FIELD.exec(line);
        if (!field) continue;
        const label = field[1]!.toLowerCase();
        labels.set(label, (labels.get(label) ?? 0) + 1);
        matches.push(line);
      }
      return matches.length >= 3 || [...labels.values()].some((n) => n >= 2)
        ? { matches, scale: Math.sqrt(matches.length) } : null;
    }), evidence: 'style' },
    phrase(c, 'transition', 'A transition without new information', 1.5, { repeat: 'each', phrases: ['moreover', 'furthermore', 'additionally', 'in an era where', "it's worth noting that", 'in conclusion', 'in summary', 'to summarize', 'at the end of the day', 'that being said'] }),
    phrase(c, 'clarity', 'Several words doing the job of one', 1, { repeat: 'sqrt', phrases: ['in order to', 'due to the fact that', 'serves as', 'commence', 'ascertain', 'utilize', 'utilizing'] }),
    phrase(c, 'filler', 'Padding with a business-casual dress code', 3, { repeat: 'each', phrases: ['it is important to note that', "it's important to note that", 'the reality is that', 'in terms of', 'at its core', "here's the thing", 'let that sink in'] }),
    phrase(c, 'lets-construction', 'Announcing the paragraph before writing it', 2, { repeat: 'sqrt', phrases: ["let's explore", "let's delve into", "let's break this down", "let's examine", 'without further ado', "here's what you need to know"] }),
    phrase(c, 'template', 'A sentence off the template rack', 3, { repeat: 'each', phrases: ['i recently had the pleasure of', 'a significant step forward', 'a pivotal step towards', 'whether you are a seasoned professional', "whether you're a seasoned professional", 'a wide range of', 'in the ever-changing world'] }),
    phrase(c, 'boilerplate', 'The boilerplate is becoming structural', 2, { repeat: 'each', phrases: ['at the intersection of', 'the integration of', 'long-term sustainability', 'tokenized incentive structures', 'designed for long-term', 'community-driven innovation', 'emerging sector', 'emerging space', 'decentralized compute', 'sustainable reward emissions'] }),
  ],
};
