import type { RulePack } from '../rule-types';
import { ATTRIBUTION, phrase } from '../rules';
const c = 'chatbot-leak';
export const chatbotLeak: RulePack = {
  id: c, name: 'The assistant forgot its disguise', description: 'Model fingerprints carry more weight than vocabulary.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'greeting', 'Forgot to delete the assistant greeting', 7, { patterns: ["^\\s*(?:certainly!|sure[,!]\\s+here(?:'s| is)|great question!|absolutely!)"] }),
    phrase(c, 'sycophantic', 'Your chatbot thinks you are brilliant', 5, { position: 'opening', patterns: ["^\\s*(?:you're absolutely right|that's a really insightful|that's a great question|excellent question!|excellent point!)"] }),
    phrase(c, 'assistant-closer', 'The post offers to write another draft', 8, { position: 'closing', patterns: ["(?:^|[.!?\\n])\\s*(?:i hope this helps|let me know if you'd like me to|let me know if you would like me to|would you like me to expand|feel free to ask for more details)[^\\n]{0,160}$"] }),
    phrase(c, 'cutoff', 'The author has a knowledge cutoff', 14, { phrases: ['as an ai language model', 'as a large language model', 'as an artificial intelligence model', 'as an ai assistant', 'as of my last update', 'as of my knowledge cutoff', 'my training data only goes up to', 'my training data ends in'], patterns: ["\\bas an ai[,;]\\s+i\\s+(?:cannot|can't|do not|don't)\\b"] }),
    phrase(c, 'reasoning', 'The reasoning scaffold escaped', 8, { phrases: ['let me think step by step', 'to approach this systematically', "here's my thought process", 'working through this logically'] }),
    phrase(c, 'acknowledgment', 'Repeating the prompt back to the audience', 3, { phrases: ["you're asking about", 'to answer your question', 'the question of whether'] }),
    phrase(c, 'placeholder', 'Insert authentic human experience here', 12, { patterns: ['\\[(?:your\\s+(?:name|company|role|story)|company name|recipient name|(?:insert|add) (?:your )?(?:name|company name|role|story))\\]'] }),
    phrase(c, 'editor-note', 'An editing note was left in the published draft', 4, { patterns: ['\\[(?!(?:insert|add) (?:your )?(?:name|company name|role|story)\\])(?:insert|fill in|add)[^\\]\\n]{1,60}\\]', '<!--\\s*(?:insert|add|fill in|todo|placeholder)[^>]{0,100}-->'] }),
    phrase(c, 'tracking', 'ChatGPT left its receipt in the URL', 12, { patterns: ['[?&]utm_source=(?:chatgpt|openai|claude|copilot|perplexity|gemini|grok)(?:\\.com|\\.ai)?\\b', '[?&]referrer=(?:chatgpt|copilot|grok|claude|gemini|perplexity)\\.(?:com|ai)\\b'] }),
    phrase(c, 'citation', 'Citation markup escaped containment', 14, { patterns: ['\\b(?:cite)?turn\\d+(?:search|news)\\d+\\b', '\\b(?:oai_citation|grok_card)\\b', 'contentReference\\s*\\[oaicite:[^\\]]{1,60}\\]', '\\[attached_file:\\d+\\]'] }),
  ],
};
