import type { SlopCategory } from '../types';
/** All 48 avoid-ai-writing types, including the deliberately non-scoring copyedit. */
export const UPSTREAM_FAMILIES = {
  tier1: 'ai-vocabulary', tier2: 'ai-vocabulary', tier3: 'ai-vocabulary',
  'tier1-clarity': 'template-phrases', transition: 'template-phrases', filler: 'template-phrases', 'lets-construction': 'template-phrases', 'template-phrase': 'template-phrases', 'tier3-phrase': 'template-phrases', 'tier3-phrase-cluster': 'template-phrases',
  chatbot: 'chatbot-leak', sycophantic: 'chatbot-leak', 'reasoning-artifact': 'chatbot-leak', 'acknowledgment-loop': 'chatbot-leak', 'cutoff-disclaimer': 'chatbot-leak', 'ai-placeholder': 'chatbot-leak', 'ai-citation-markup': 'chatbot-leak', 'ai-utm-source': 'chatbot-leak',
  'false-concession': 'negation-pivot',
  'significance-inflation': 'inflation', 'hollow-intensifier': 'inflation', 'emotional-flatline': 'inflation', 'lingering-attention': 'inflation', 'novelty-inflation': 'inflation', 'future-narrative': 'inflation', 'real-actual-inflation': 'inflation',
  'vague-attribution': 'hedging', 'hedge-stack': 'hedging', 'parenthetical-hedge': 'hedging', 'confidence-calibration': 'hedging',
  'generic-conclusion': 'engagement-bait', 'rhetorical-question': 'engagement-bait', 'social-cta-closer': 'engagement-bait', 'formulaic-opener': 'engagement-bait', 'speculative-opener': 'engagement-bait',
  'em-dash': 'formatting', formatting: 'formatting', 'hashtag-stuff': 'formatting', 'bullet-np-list': 'formatting', 'title-case-header': 'formatting', 'smart-punct-signature': 'formatting', 'unnecessary-hyphenation': 'formatting',
  uniformity: 'robotic-rhythm', 'punct-distribution': 'robotic-rhythm', 'fnword-trigram-entropy': 'robotic-rhythm', 'cross-para-burstiness': 'robotic-rhythm', 'low-ttr': 'robotic-rhythm',
  'normalization-flag': 'bypass-tricks',
} satisfies Record<string, SlopCategory>;
