import type { RuleHit, RulePack } from '../rule-types';
import { ATTRIBUTION, custom, phrase } from '../rules';
const c = 'chatbot-leak';
// Phrase-rule sources are compiled once by createEngine. Keep editing grammar
// bounded, and require an actual revision for a bare colon-ended deliverable.
const preamble = String.raw`(?:^|(?<=[.!?\n]))\s{0,32}(?:(?:certainly|absolutely|sure)\s{0,8}[,!—–-]\s{0,16})?here(?:'s|\s{1,16}(?:is|are))\s{1,16}(?:a|an|your|the)\s{1,16}`;
const modifier = String.raw`(?:linkedin|twitter|facebook|instagram|social[ -]media|polished|revised|professional|engaging|draft|sample|rewritten|updated|edited|cleaner|shorter)\s{1,16}`;
const revision = String.raw`(?:polished|revised|rewritten|updated|edited|cleaner|shorter)\s{1,16}`;
const deliverable = '(?:post|draft|announcement|email|caption|response|article|message)';
const thinkTag = /<(\/?)(think)>/gi;
const channelTag = /<(\/?)(analysis|final)>/gi;
const instructionTag = /\[(\/?)(INST)\]/gi;
const nonWhitespace = /\S/;
const roleHeader = /(?:^|\n)[\t ]{0,16}(?:\[(assistant|user|system)\]|#{2,6}[\t ]{1,8}(assistant|user|system):?)[\t ]{0,16}(?=\n|$)/gi;
const systemInstruction = /^\s{0,32}you\s{1,8}are\b/i;
const assistantPlanning = /\b(?:the\s{1,8}user|i\s{1,8}(?:should|must|need\s{1,8}to))\b/i;
const generationInstruction = /^\s{0,32}(?:write|rewrite|draft|generate|compose|summari[sz]e|revise|edit|translate|answer|explain|create|return)\b/i;
const toolHeader = /(?:^|\n)[\t ]{0,16}(?:assistant[\t ]{1,16}to=([a-z_][a-z0-9_]{0,63}(?:\.[a-z_][a-z0-9_]{0,63}){1,4})[\t ]{1,16}|((?:function|tool)[\t ]{1,8}result):[\t ]{0,16})(?=\{)/gi;

type Span = readonly [number, number];
interface Block { name: string; start: number; bodyStart: number; bodyEnd: number; end: number }

function candidateHit(text: string, spans: Span[]): RuleHit | null {
  // Keep every candidate and its real position. The core excludes examples
  // before choosing the three displayed matches, even for repeated snippets.
  return spans.length ? { matches: spans.map(([start, end]) => text.slice(start, Math.min(end, start + 240))), spans } : null;
}

function pairedBlocks(text: string, tags: RegExp): Block[] {
  tags.lastIndex = 0;
  const blocks: Block[] = [];
  const stack: Block[] = [];
  let previousEnd = 0;
  let lastContent = -1;
  let tag: RegExpExecArray | null;
  while ((tag = tags.exec(text))) {
    // Inspect disjoint gaps once, rather than rescanning each nested body.
    if (nonWhitespace.test(text.slice(previousEnd, tag.index))) lastContent = tag.index - 1;
    const name = tag[2]!.toLowerCase();
    if (!tag[1]) {
      const block = { name, start: tag.index, bodyStart: tags.lastIndex, bodyEnd: -1, end: -1 };
      blocks.push(block);
      stack.push(block);
    } else {
      const opening = stack.pop();
      if (opening?.name === name && lastContent >= opening.bodyStart) {
        opening.bodyEnd = tag.index;
        opening.end = tags.lastIndex;
      }
    }
    lastContent = tags.lastIndex - 1;
    previousEnd = tags.lastIndex;
  }
  return blocks.filter((block) => block.end >= 0);
}

export const chatbotLeak: RulePack = {
  id: c, name: 'The assistant forgot its disguise', description: 'Model fingerprints carry more weight than vocabulary.', attribution: ATTRIBUTION,
  rules: [
    phrase(c, 'greeting', 'Forgot to delete the assistant greeting', 2, { evidence: 'style', patterns: ["^\\s*(?:certainly!|absolutely!|sure[,!]\\s+here(?:'s| is))"] }),
    phrase(c, 'assistant-preamble', 'The assistant is introducing its deliverable', 14, { evidence: 'fingerprint', patterns: [
      `${preamble}(?:${modifier}){0,3}${deliverable}\\s{1,16}(?:about|for|on|you\\s{1,16}requested)\\b`,
      `${preamble}(?:${modifier}){0,2}${revision}(?:${modifier}){0,2}${deliverable}\\s{0,16}:`,
      `${preamble}(?:${revision}){1,3}version\\s{1,16}of\\s{1,16}(?:your|the)\\s{1,16}(?:${modifier}){0,2}${deliverable}\\s{0,16}:`,
    ] }),
    phrase(c, 'sycophantic', 'Your chatbot thinks you are brilliant', 5, { position: 'opening', patterns: ["^\\s*(?:you're absolutely right|that's a really insightful|that's a great question|excellent question!|excellent point!|great question!)"] }),
    // Newlines already provide boundaries; only consume horizontal spacing
    // so a blank-line run is scanned once rather than from every newline.
    phrase(c, 'assistant-closer', 'The post offers to write another draft', 8, { position: 'closing', patterns: ["(?:^|(?<=[.!?\\n]))[^\\S\\n]*(?:i hope this helps|let me know if you'd like me to|let me know if you would like me to|would you like me to expand|feel free to ask for more details)[^\\n]{0,160}$"] }),
    phrase(c, 'cutoff', 'The author has a knowledge cutoff', 14, { evidence: 'fingerprint', phrases: ['as an ai language model', 'as a large language model', 'as an artificial intelligence model', 'as an ai assistant', 'as of my knowledge cutoff', 'my training data only goes up to', 'my training data ends in'], patterns: ["\\bas an ai[,;]\\s+i\\s+(?:cannot|can't|do not|don't)\\b"] }),
    phrase(c, 'model-identity', 'The assistant identifies itself as a model', 14, { evidence: 'fingerprint', patterns: [
      String.raw`(?:^|(?<=[.!?\n]))[\t ]{0,16}(?:i(?:'m|\s{1,8}am)|my\s{1,8}name\s{1,8}is)\s{1,8}(?:(?:chatgpt|claude|gemini|copilot|grok)\s{0,8},\s{0,8})?an?\s{1,8}(?:ai\s{1,8}(?:assistant|language\s{1,8}model)|large\s{1,8}language\s{1,8}model)\b`,
    ] }),
    phrase(c, 'update', 'A stock update qualifier', 3, { phrases: ['as of my last update'] }),
    phrase(c, 'reasoning', 'The reasoning scaffold escaped', 8, { phrases: ['let me think step by step', 'to approach this systematically', "here's my thought process", 'working through this logically'] }),
    {
      ...custom(c, 'reasoning-block', 'A paired reasoning block escaped', 14, (ctx) => {
        return candidateHit(ctx.text, pairedBlocks(ctx.text, thinkTag).map((block) => [block.start, block.end]));
      }),
      evidence: 'fingerprint',
    },
    {
      ...custom(c, 'reasoning-channel', 'Analysis and final answer channels escaped', 14, (ctx) => {
        const blocks = pairedBlocks(ctx.text, channelTag);
        const spans: Span[] = [];
        for (let i = 1; i < blocks.length; i++) {
          const analysis = blocks[i - 1]!; const final = blocks[i]!;
          // Generic XML analysis/final fields need assistant planning too.
          if (analysis.name === 'analysis' && final.name === 'final' && final.start >= analysis.end
            && !nonWhitespace.test(ctx.text.slice(analysis.end, final.start))
            && assistantPlanning.test(ctx.text.slice(analysis.bodyStart, analysis.bodyEnd))) spans.push([analysis.start, final.end]);
        }
        return candidateHit(ctx.text, spans);
      }),
      evidence: 'fingerprint',
    },
    {
      ...custom(c, 'instruction-template', 'An instruction template escaped with the answer', 14, (ctx) => {
        const spans = pairedBlocks(ctx.text, instructionTag)
          .filter((block) => generationInstruction.test(ctx.text.slice(block.bodyStart, Math.min(block.bodyEnd, block.bodyStart + 64))))
          .map((block): Span => [block.start, block.end]);
        return candidateHit(ctx.text, spans);
      }),
      evidence: 'fingerprint',
    },
    phrase(c, 'chat-protocol', 'An assistant protocol header escaped', 14, { evidence: 'fingerprint', patterns: [
      '<\\|im_start\\|>[ \\t]{0,16}assistant\\b',
      '<\\|start_header_id\\|>\\s{0,16}assistant\\s{0,16}<\\|end_header_id\\|>',
      '<\\|start\\|>assistant(?:<\\|(?:channel|meta_sep)\\|>[a-z_]{1,32})?<\\|message\\|>',
    ] }),
    {
      ...custom(c, 'role-transcript', 'Serialized assistant turns escaped', 14, (ctx) => {
        roleHeader.lastIndex = 0;
        const spans: Span[] = [];
        let previous: { role: string; markdown: boolean; start: number; end: number } | undefined;
        let markdownSystem: number | undefined;
        let header: RegExpExecArray | null;
        while ((header = roleHeader.exec(ctx.text))) {
          const role = (header[1] ?? header[2])!.toLowerCase();
          const markdown = !!header[2];
          const start = header.index + (header[0][0] === '\n' ? 1 : 0);
          const hasBody = previous && nonWhitespace.test(ctx.text.slice(previous.end, start));
          // Require another role and intervening content, not a lone label or
          // a prose/JSON mention of the word "assistant".
          if (previous && hasBody && !markdown && !previous.markdown && (role === 'assistant') !== (previous.role === 'assistant')) {
            spans.push([previous.start, roleHeader.lastIndex]);
          }
          // Markdown headings are ordinary document structure. Require the
          // complete system/user/assistant scaffold with a system instruction.
          if (previous?.markdown && markdown && hasBody && previous.role === 'system' && role === 'user'
            && systemInstruction.test(ctx.text.slice(previous.end, Math.min(start, previous.end + 64)))) markdownSystem = previous.start;
          else {
            if (previous?.markdown && markdown && hasBody && previous.role === 'user' && role === 'assistant' && markdownSystem !== undefined) spans.push([markdownSystem, roleHeader.lastIndex]);
            markdownSystem = undefined;
          }
          previous = { role, markdown, start, end: roleHeader.lastIndex };
        }
        return candidateHit(ctx.text, spans);
      }),
      evidence: 'fingerprint',
    },
    {
      ...custom(c, 'tool-transcript', 'An assistant tool-call transcript escaped', 14, (ctx) => {
        toolHeader.lastIndex = 0;
        const spans: Span[] = [];
        let callStart = -1;
        let header: RegExpExecArray | null;
        while ((header = toolHeader.exec(ctx.text))) {
          if (header[1]) callStart = header.index + (header[0][0] === '\n' ? 1 : 0);
          else if (callStart >= 0) {
            spans.push([callStart, toolHeader.lastIndex]);
            callStart = -1;
          }
        }
        return candidateHit(ctx.text, spans);
      }),
      evidence: 'fingerprint',
    },
    phrase(c, 'generated-boundary', 'The generated answer kept its editing tail', 14, { evidence: 'fingerprint', patterns: [
      String.raw`(?:^|(?<=\n))[\t ]{0,16}\[(?:end|start)\s{1,8}of\s{1,8}(?:the\s{1,8})?(?:generated|assistant)\s{1,8}(?:response|answer|output)\][\t ]{0,16}\n\s{0,32}(?:i(?:'ve|\s{1,8}have)?\s{1,8}(?:removed|revised|edited|rewrote|rewritten|kept|preserved|shortened|adjusted)\b|would\s{1,8}you\s{1,8}like\s{1,8}me\s{1,8}to\b)`,
    ] }),
    phrase(c, 'acknowledgment', 'Repeating the prompt back to the audience', 3, { phrases: ["you're asking about", 'to answer your question', 'the question of whether'] }),
    phrase(c, 'placeholder', 'Insert authentic human experience here', 5, { evidence: 'style', patterns: ['\\[(?:your\\s+(?:name|company|product|project|role|story)|(?:company|product|project|recipient) name|(?:insert|add) (?:your )?(?:name|company name|product name|project name|role|story))\\]'] }),
    phrase(c, 'editor-note', 'An editing note was left in the published draft', 4, { evidence: 'style', patterns: ['\\[(?!(?:insert|add) (?:your )?(?:name|company name|role|story)\\])(?:insert|fill in|add)[^\\]\\n]{1,60}\\]', '<!--\\s*(?:insert|add|fill in|todo|placeholder)[^>]{0,100}-->'] }),
    phrase(c, 'tracking', 'ChatGPT left its receipt in the URL', 4, { evidence: 'style', patterns: ['[?&]utm_source=(?:chatgpt|openai|claude|copilot|perplexity|gemini|grok)(?:\\.com|\\.ai)?\\b', '[?&]referrer=(?:chatgpt|copilot|grok|claude|gemini|perplexity)\\.(?:com|ai)\\b'] }),
    phrase(c, 'citation', 'Citation markup escaped containment', 14, { evidence: 'fingerprint', patterns: ['\\b(?:cite)?turn\\d+(?:search|news)\\d+\\b', '\\b(?:oai_citation|grok_card)\\b', 'contentReference\\s*\\[oaicite:[^\\]]{1,60}\\]', '\\[attached_file:\\d+\\]'] }),
  ],
};
