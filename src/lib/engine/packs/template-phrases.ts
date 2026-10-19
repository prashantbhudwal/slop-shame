import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'template-phrases';
export const templatePhrases: RulePack = {
  id: c, name: 'The paragraph assembly line', description: 'Boilerplate, ceremonial signposting, transitions, and filler.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'transition', 'A transition without new information', 1.5, { repeat: 'each', phrases: ['moreover', 'furthermore', 'additionally', 'in an era where', "it's worth noting that", 'in conclusion', 'in summary', 'to summarize', 'at the end of the day', 'that being said'] }),
    phrase(c, 'clarity', 'Several words doing the job of one', 1, { repeat: 'sqrt', phrases: ['in order to', 'due to the fact that', 'serves as', 'commence', 'ascertain', 'utilize', 'utilizing'] }),
    phrase(c, 'filler', 'Padding with a business-casual dress code', 3, { repeat: 'each', phrases: ['it is important to note that', "it's important to note that", 'the reality is that', 'in terms of', 'at its core', "here's the thing", 'let that sink in'] }),
    phrase(c, 'lets-construction', 'Announcing the paragraph before writing it', 2, { repeat: 'sqrt', phrases: ["let's explore", "let's delve into", "let's break this down", "let's examine", 'without further ado', "here's what you need to know"] }),
    phrase(c, 'template', 'A sentence off the template rack', 3, { repeat: 'each', phrases: ['i recently had the pleasure of', 'a significant step forward', 'a pivotal step towards', 'whether you are a seasoned professional', "whether you're a seasoned professional", 'a wide range of', 'in the ever-changing world'] }),
    phrase(c, 'boilerplate', 'The boilerplate is becoming structural', 2, { repeat: 'each', phrases: ['at the intersection of', 'the integration of', 'long-term sustainability', 'tokenized incentive structures', 'designed for long-term', 'community-driven innovation', 'emerging sector', 'emerging space', 'decentralized compute', 'sustainable reward emissions'] }),
  ],
};
