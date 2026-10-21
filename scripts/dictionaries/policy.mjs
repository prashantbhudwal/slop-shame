import { normalize } from './lib.mjs';

export const zeroCategories = {
  hedging: 'hedging', scaffolding: 'template-phrases', artifact: 'chatbot-leak',
  marketing: 'inflation', puffery: 'inflation', linkedin: 'engagement-bait',
  drama: 'inflation', performed: 'engagement-bait', stakes: 'engagement-bait',
  contrast: 'negation-pivot', triads: 'robotic-rhythm', verbs: 'ai-vocabulary',
  filler: 'template-phrases', assistant: 'chatbot-leak', misc: 'template-phrases',
  overcorrection: 'engagement-bait', cliche: 'template-phrases', email: 'template-phrases',
};
export const valeCategories = {
  OverusedVocabulary: 'ai-vocabulary', OverusedVocabularyVerbs: 'ai-vocabulary',
  AICompoundPhrases: 'ai-vocabulary', OpeningCliches: 'engagement-bait',
  ContrastiveFormulas: 'negation-pivot', ClosingPleasantries: 'template-phrases',
  HedgingPhrases: 'hedging', AffirmativeFormulas: 'inflation',
};

// More conservative than a top-5k gate: common professional unigrams never
// survive on sampler penalties alone. These verbs are normal job descriptions.
export const professionalWords = new Set('across between within additionally showcasing underscoring surpassing commendable excels garnered underscored strategic strategies challenges findings potential crucial comprehensive'.split(' '));
export const commonPhrases = new Set([
  'in recent years', 'in this day and age', 'when it comes to', 'in the world of',
  'in the realm of', 'at the same time', 'on the other hand', 'in a sense', 'in many ways',
  'in some ways', 'as such', 'as it were', 'for the most part', 'by and large',
  'all things considered', 'generally speaking', 'broadly speaking', 'in other words',
  'to some extent', 'at the forefront', 'to be sure', 'as you might expect', "as you'd expect",
  'as one might expect', 'best of luck', 'good luck', 'happy coding', 'happy building',
  'happy learning', 'happy to help', "i'm happy to help", 'feel free to ask',
  'feel free to reach out', 'happy to answer', 'happy to explain', 'happy to clarify',
  'happy to elaborate', 'happy to assist', 'enjoy the journey', "you've got this",
  'in summary', 'in conclusion', 'to summarize', 'throughout history', 'first and foremost',
  'in addition', 'in essence', 'on the same page', 'reach out', 'touch base', 'loop in',
  'supply chain management', 'social media platforms', 'corporate social responsibility',
  'world health organization', 'world war ii', 'step in the right direction',
  'it remains to be seen', 'it goes without saying', 'needless to say',
  'the jury is still out', 'calls into question', 'raises questions about', 'forces us to consider',
  'reminds us that', 'working together', 'raises important questions', 'a real problem',
  'key role', 'vital role', 'crucial role', 'pivotal role', 'instrumental role',
]);

const ordinaryFrames = /^(?:(?:please )?(?:feel free|don'?t hesitate)|(?:please )?let me know if (?:you have|you need|anything)|if you (?:have any|need)|good luck|(?:we'?re|we are|i'?m|i am) (?:here to help|happy to)|(?:i'?d|i would) be happy to (?:help|answer|clarify)|(?:a )?real (?:choice|option|difference|test|question|chance|problem|shot|risk|cost|benefit|value|progress|flexibility|impact|leverage|ownership|accountability|consequence|trade)|(?:excited|thrilled|humbled|honored|proud|delighted) (?:to|and)|(?:i'm|we're) (?:excited|thrilled)|(?:play|plays|played|playing) (?:a |an )?(?:crucial|vital|key|critical|significant|instrumental) role|whether you(?:'re| are)|by the end of this|this (?:guide|article|post) will|welcome to this|ready to (?:get started|learn)|in (?:a world|an age|an era) (?:where|of)$)/;
const styleFrame = /testament|tapestr|intricate interplay|multifaceted approach|ever[- ](?:evolving|changing)|increasingly interconnected world|pivotal role in shaping|cannot be overstated|harness.{0,30}(?:power|potential)|unlock.{0,30}(?:power|potential)|seamless integration|foster.{0,30}culture|delv(?:e|es|ed|ing)|nuanced understanding|vast array of|beacon of|realm of possibilities|landscape of|journey of discovery|boundless|limitless possibilities|today's digital (?:age|era)|(?:unlock|unveil) the secrets|important to (?:remember|note)|take a dive into/;

export function dropReason(entry, evidence, humanSamples) {
  const value = normalize(entry.value);
  if (entry.posTagged) return 'pos-tag-required: Vale verb-only rule needs a POS tagger; do not treat technical nouns as verbs';
  if (entry.category === 'robotic-rhythm') return 'rhythm-needs-context: triads require repeated sentences and a minimum length; PhraseRule cannot express that guard';
  if (entry.source === 'zeroslop' && entry.upstreamCategory === 'email') return 'ordinary-email: human correspondence, not an AI fingerprint';
  if (entry.source === 'zeroslop' && ['announce-excited', 'personal-news', 'journey-gratitude', 'passionate-about', 'emotional-labor', 'couldnt-be-prouder', 'as-i-reflect', 'false-vulnerability'].includes(entry.name)) return 'human-milestone: normal career announcements, gratitude or personal reflection';
  if (entry.source === 'zeroslop' && entry.upstreamCategory === 'cliche') return 'ordinary-idiom: pre-existing human idioms without measured social-domain lift';
  if (entry.name === 'generic-benefit-stack') return 'broad-benefit-stack: nested quantifiers and generic product descriptions';
  if (entry.kind === 'pattern') {
    if (/^(?:\[\^|\[A-Z\]\[a-z\]|\[A-Z\]|\\b\[Aa\]n?)/.test(entry.original ?? entry.value)) return 'generic-subject: broad unanchored catch-all also matches ordinary factual corrections';
  } else {
    if (/amp;|^amp$|^www$|^org$|https?:|[\n<>]|\*\*|references|word count:|retrieved from|\bdoi\b/i.test(entry.value)) return 'scraper-or-bibliography: malformed HTML, citations or document metadata';
    if (professionalWords.has(value)) return 'common-professional: ordinary function/technical/evaluative word; domain lift is insufficient';
    const words = value.split(/[\s-]+/).filter(Boolean);
    if (words.length === 1) {
      const measurement = evidence.get(value);
      if (!measurement || measurement.ratio < 5 || measurement.baseline > 0.001) return 'unigram-evidence: require measured r>=5 and projected pre-LLM abstract rate<=0.1%; sampler factors are not ratios';
    }
    if ((value.length < 7 && !evidence.has(value)) || (!value.includes(' ') && words.length > 1)) return 'short-or-hyphenated: common stylistic/technical token without a contextual construction';
    if (commonPhrases.has(value) || ordinaryFrames.test(value)) return 'ordinary-professional-phrase: human correspondence, topic description, transition or milestone';
    if (entry.source === 'paech-sampler' && words.length > 1 && !styleFrame.test(value)) return 'fiction-or-generic: sampler fiction phrase has no selected professional-style construction';
    if (entry.source === 'paech-essays' && words.length > 1 && !styleFrame.test(value)) return 'essay-topic: raw essay count is not human-relative lift; no selected rhetorical construction';
  }
  for (const sample of humanSamples) {
    if (entry.kind === 'phrase') {
      let at = -1;
      while ((at = sample.normalized.indexOf(value, at + 1)) >= 0) {
        if (!/[\p{L}\p{M}\p{N}_]/u.test(sample.normalized[at - 1] ?? '') && !/[\p{L}\p{M}\p{N}_]/u.test(sample.normalized[at + value.length] ?? '')) return `human-control:${sample.id}`;
      }
    } else if (new RegExp(entry.value, 'i').test(sample.text.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"'))) return `human-control:${sample.id}`;
  }
  return null;
}
