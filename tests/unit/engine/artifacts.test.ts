import { describe, expect, it } from 'vitest';
import { analyzePost, createEngine } from '../../../src/lib/engine';
import { buildContext } from '../../../src/lib/engine/context';
import { bypassTricks } from '../../../src/lib/engine/packs/bypass-tricks';
import { chatbotLeak } from '../../../src/lib/engine/packs/chatbot-leak';

// Reviewer-authored regression cases, not an authorship calibration corpus.
const release = 'We shipped the update this morning. It fixes the login timeout and adds a download button to the report page. Thanks to everyone who sent examples and tested the patch. The export now uses the same filename as the page title, and the keyboard shortcut works in the search box again.';
const reservation = "Your reservation is confirmed for Thursday at seven. I've added the extra chair and told the kitchen about the nut allergy. Please come to the side entrance because the front door is being repaired. The car park closes at midnight, so remember to collect your car before then. Regards, Sam.";
const artifacts = createEngine([chatbotLeak, bypassTricks]);

describe('direct assistant artifacts', () => {
  it.each([
    'Here’s the revised post:',
    'Here’s a polished version of your post:',
    'Here is your revised email:',
    'Here’s a revised post for your team:',
    "Here's the revised post:",
    'Here is the polished LinkedIn post:',
    'Here is a shorter version of your email:',
    'Sure, here is your revised message:',
    'Absolutely — here’s the rewritten announcement:',
    'Here\tis\tyour\trevised\temail:',
  ])('recognizes the editing preamble %s', (heading) => {
    const text = `${heading}\n\n${release}`;
    for (const report of [artifacts.analyze({ text }), analyzePost({ text })]) {
      expect(report.signals.some((signal) => signal.ruleId === 'chatbot-leak.assistant-preamble')).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(80);
      expect(report.shameable).toBe(true);
    }
  });

  it.each([
    'As an AI language model, I cannot inspect the file on your laptop.',
    'As an AI assistant, I can help with the requested draft.',
    'As of my knowledge cutoff, I cannot confirm the latest figures.',
    'My training data only goes up to June 2024.',
  ])('retains the explicit model fingerprint %s', (identity) => {
    const report = artifacts.analyze({ text: `${identity}\n\n${release}` });
    expect(report.signals.some((signal) => signal.ruleId === 'chatbot-leak.cutoff')).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it.each([
    '<think>The user asks for an announcement. I should keep the final answer short.</think>',
    '<think>\nThe user wants a short post.\nI should only return the finished text.\n</think>',
    '<THINK>I should preserve the threshold x < 5 in the answer.</THINK>',
  ])('recognizes a paired reasoning block', (reasoning) => {
    const report = analyzePost({ text: `${reasoning}\n\n${release}` });
    expect(report.signals.some((signal) => signal.ruleId === 'chatbot-leak.reasoning-block')).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it.each([
    '<|im_start|>assistant\n',
    '<|start_header_id|>assistant<|end_header_id|>\n\n',
    '<|start|>assistant<|message|>',
    '<|start|>assistant<|channel|>analysis<|message|>',
  ])('recognizes the assistant protocol header %s', (header) => {
    const report = artifacts.analyze({ text: `${header}${release}` });
    expect(report.signals.some((signal) => signal.ruleId === 'chatbot-leak.chat-protocol')).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it('recognizes serialized assistant/user turns with content', () => {
    const report = artifacts.analyze({ text: `[assistant]\n${release}\n\n[user]\nPlease shorten the text.\n\n[assistant]\nThe update is live. Login should be faster today.` });
    expect(report.signals.some((signal) => signal.ruleId === 'chatbot-leak.role-transcript')).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it.each([
    ['<think>A documented example.</think>', '<think>I should return only the requested post.</think>'],
    ['[assistant]\nA documented answer.\n[user]\nA documented question.', '[assistant]\nThe update is live.\n[user]\nPlease shorten the announcement.'],
  ])('keeps a later direct artifact visible after a fenced example', (example, direct) => {
    const quotedOnly = artifacts.analyze({ text: `\`\`\`text\n${example}\n\`\`\`\n\n${release}` });
    expect(quotedOnly.score).toBeLessThan(40);
    expect(quotedOnly.shameable).toBe(false);
    const report = artifacts.analyze({ text: `\`\`\`text\n${example}\n\`\`\`\n\n${direct}\n\n${release}` });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it.each([
    "Here's the revised post:",
    'Here is your revised email:',
    '<think>Check the answer.</think>',
    '<|im_start|>assistant',
  ])('does not discard an artifact in a short body: %s', (text) => {
    const report = artifacts.analyze({ text });
    expect(report.signals.length).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(false);
  });

  it.each([
    ['reasoning-block', '<think>We should inspect the data before answering the question.</think>'],
    ['role-transcript', '[assistant]\nThe requested answer follows below.\n[user]\nPlease check the figures before sending it.'],
  ])('retains every %s candidate and its exact position after repeated examples', (ruleId, direct) => {
    const rule = chatbotLeak.rules.find((entry) => entry.id === `chatbot-leak.${ruleId}`);
    if (!rule || rule.kind !== 'custom') throw new Error('Expected a custom artifact detector.');
    // Identical snippets must not resolve back to one of the fenced copies.
    const fenced = `\`\`\`text\n${direct}\n\`\`\``;
    const examples = Array(5).fill(fenced).join('\n\n');
    const text = `${examples}\n\n${direct}`;
    const hit = rule.detect(buildContext({ text }));
    const starts = Array.from({ length: 5 }, (_, i) => i * (fenced.length + 2) + 8);
    starts.push(examples.length + 2);
    const candidateLength = ruleId === 'role-transcript' ? direct.indexOf('[user]') + '[user]'.length : direct.length;
    expect(hit?.matches.length).toBeGreaterThanOrEqual(6);
    expect(hit).toMatchObject({ spans: expect.arrayContaining(starts.map((start) => [start, start + candidateLength])) });
    const quoted = artifacts.analyze({ text: examples });
    expect(quoted.score).toBe(0);
    const report = artifacts.analyze({ text });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
    expect(report.signals.find((signal) => signal.ruleId === rule.id)?.matches).toHaveLength(1);
  });

  it.each([
    ['reasoning-block', '<think>', '</think>'],
    ['role-transcript', '[assistant]\n', '\n[user]\nPlease confirm the draft.'],
  ])('uses the real %s span when an unmatched example has the same truncated prefix', (ruleId, opening, closing) => {
    const prefix = `${opening}${'Check the supplied figures before writing the answer. '.repeat(8)}`;
    const example = `\`\`\`text\n${prefix}\n\`\`\`\n\n`;
    const text = `${example}${prefix}${closing}`;
    const rule = chatbotLeak.rules.find((entry) => entry.id === `chatbot-leak.${ruleId}`);
    if (!rule || rule.kind !== 'custom') throw new Error('Expected a custom artifact detector.');
    const end = ruleId === 'role-transcript' ? text.lastIndexOf('[user]') + '[user]'.length : text.length;
    expect(rule.detect(buildContext({ text }))).toMatchObject({ spans: [[example.length, end]] });
    const report = artifacts.analyze({ text });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.shameable).toBe(true);
  });

  it('retains every balanced nested reasoning candidate without rescanning its body', () => {
    const text = '<think>'.repeat(12) + 'Check the answer before returning it.' + '</think>'.repeat(12);
    const rule = chatbotLeak.rules.find((entry) => entry.id === 'chatbot-leak.reasoning-block');
    if (!rule || rule.kind !== 'custom') throw new Error('Expected a custom artifact detector.');
    const hit = rule.detect(buildContext({ text }));
    expect(hit?.matches).toHaveLength(12);
    expect(hit).toMatchObject({ spans: expect.arrayContaining([[0, text.length], [11 * 7, text.length - 11 * 8]]) });
  });

  it.each([
    ['model-identity', "I'm ChatGPT, an AI assistant trained to help with writing."],
    ['model-identity', 'I am Claude, an AI assistant created to answer questions.'],
    ['model-identity', 'I am a large language model and cannot visit your office.'],
    ['role-transcript', '### System\nYou are a writing assistant.\n### User\nDraft a brief notice.\n### Assistant\nThe revised notice follows below.'],
    ['instruction-template', '[INST] Draft a short invitation for the opening. [/INST]\nYou are invited to join us on Friday.'],
    ['instruction-template', '[INST]\nSummarize the supplied minutes in two paragraphs.\n[/INST]\nThe committee approved the new schedule.'],
    ['reasoning-channel', '<analysis>The user needs a concise reply. I should return the answer only.</analysis>\n<final>The requested reply follows below.</final>'],
    ['reasoning-channel', '<ANALYSIS>I must check the arithmetic before responding.</ANALYSIS>\n<FINAL>The total is forty pounds.</FINAL>'],
    ['tool-transcript', 'assistant to=functions.write_notice {"tone":"brief"}\nfunction result: {"draft":"The office opens tomorrow."}\nassistant: The draft is ready.'],
    ['tool-transcript', 'assistant to=tools.compose_email {"subject":"Opening"}\ntool result: {"body":"Join us on Friday."}\nassistant: Your invitation is ready.'],
    ['generated-boundary', '[End of generated response]\nI revised the paragraph and kept the requested tone.'],
    ['generated-boundary', '[End of the assistant answer]\nWould you like me to shorten the draft further?'],
  ])('recognizes the shared %s grammar', (ruleId, artifact) => {
    for (const report of [artifacts.analyze({ text: `${artifact}\n\n${release}` }), analyzePost({ text: `${artifact}\n\n${release}` })]) {
      expect(report.signals.some((signal) => signal.ruleId === `chatbot-leak.${ruleId}`)).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(80);
      expect(report.shameable).toBe(true);
    }
  });
});

describe('ordinary prose and weak artifact lookalikes', () => {
  it.each(['Certainly!', 'Absolutely!', 'Hello!', 'Hi!', 'Sure, here is the booking confirmation.'])('keeps the greeting %s weak', (greeting) => {
    const report = analyzePost({ text: `${greeting} ${reservation}` });
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it.each([
    "Here's the post:",
    'Here is your email:',
    'Here is your revised email address:',
    'The word think is a verb; assistant is the name of a job.',
    'The parser accepts a think field and a role field in each record.',
    'Our parser uses <think> to begin a region; an unclosed region is rejected.',
    'The parser rejects a lone </think> when there is no opening tag.',
    '<think>   </think>',
    'The protocol has an <|im_start|> delimiter before the role name.',
    '<|im_start|>user\nPlease read the release note.',
    '[assistant]',
    '[assistant]\n[user]',
    'The role names [assistant] and [user] appear in the documentation.',
    '{"role":"assistant","name":"Mira","department":"support"}',
    '{"role":"assistant","content":"Reservation confirmed."}',
    '{"roles":["user","assistant"],"enabled":true}',
    'As of my last update, the kitchen repair was scheduled for Thursday.',
  ])('does not turn an ordinary mention into a fingerprint: %s', (opening) => {
    const report = artifacts.analyze({ text: `${opening}\n\n${release}` });
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it.each([
    "I'm Claude, the assistant manager at the local bakery.",
    'An AI assistant is a program that responds to user requests.',
    '### User\nThe person who operates the machine.\n### Assistant\nThe person who helps the operator.',
    '### System\nThe ventilation system needs an annual inspection.',
    'The prompt begins with [INST] and ends with [/INST].',
    '[INST] and [/INST] delimit an instruction in this file format.',
    '[INST] Rewrite the invitation without changing the date.',
    '[/INST]\nThe parser rejected an unmatched closing token.',
    '<analysis>The measured temperature was twenty degrees.</analysis>',
    '<final>The version approved by the editor.</final>',
    '<analysis>The measured temperature was twenty degrees.</analysis>\n<final>The report was approved.</final>',
    '<analysis>I should check the totals.</analysis>\nThe next XML example follows.\n<final>The reported total.</final>',
    'assistant to=functions.write_notice {"tone":"brief"}',
    'function result: {"draft":"The office opens tomorrow."}',
    'The log records assistant to=functions.write_notice before function result: {"draft":"Notice"}.',
    '[End of generated response]\nThe parser treats this as an output boundary.',
    'I revised the paragraph and kept your requested first-person voice. Would you like me to make this draft more conversational?',
    'I removed the AI-sounding language from the newsletter before sending it to the printer.',
  ])('keeps nearby discussion and human editing prose nondecisive: %s', (text) => {
    for (const report of [artifacts.analyze({ text: `${text}\n\n${release}` }), analyzePost({ text: `${text}\n\n${release}` })]) {
      expect(report.score).toBeLessThan(40);
      expect(report.shameable).toBe(false);
    }
  });

  it.each([
    "I'm ChatGPT, an AI assistant trained to help with writing.",
    '### System\nYou are a writing assistant.\n### User\nDraft a brief notice.\n### Assistant\nThe requested notice follows below.',
    '[INST] Draft a short invitation for the opening. [/INST]',
    '<analysis>The user needs a concise reply.</analysis>\n<final>The reply follows below.</final>',
    'assistant to=functions.write_notice {"tone":"brief"}\nfunction result: {"draft":"The office opens tomorrow."}',
    '[End of generated response]\nI revised the paragraph and kept the requested tone.',
  ])('keeps a fenced protocol example out of direct evidence: %s', (example) => {
    const report = artifacts.analyze({ text: `\`\`\`text\n${example}\n\`\`\`\n\n${release}` });
    expect(report.score).toBe(0);
    expect(report.shameable).toBe(false);
  });

  it.each([
    '<analysis>The user needs a concise reply.</analysis>\n<final>The reply follows below.</final>',
    '[INST] Draft a short invitation for the opening. [/INST]',
    'assistant to=functions.write_notice {"tone":"brief"}\nfunction result: {"draft":"The office opens tomorrow."}',
    '[End of generated response]\nI revised the paragraph and kept the requested tone.',
  ])('keeps quoted protocol discussion out of direct evidence: %s', (example) => {
    const report = artifacts.analyze({ text: `The documentation includes this example:\n“${example}”\n\n${release}` });
    expect(report.score).toBe(0);
    expect(report.shameable).toBe(false);
  });

  it.each([
    '[Your Name]',
    '[Your Product]',
    '[Your Project]',
    '[Insert your product name]',
    '[Add your project name]',
  ])('retains useful but nondecisive placeholder evidence: %s', (placeholder) => {
    const report = artifacts.analyze({ text: `${release}\n\n${placeholder}` });
    const signal = report.signals.find((entry) => entry.ruleId === 'chatbot-leak.placeholder');
    // v2 reports index points; the nondecisive/action guards below stay unchanged.
    expect(signal?.weight).toBeGreaterThan(0);
    expect(signal?.weight).toBeLessThan(40);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it.each([
    'https://example.com/report?utm_source=chatgpt.com',
    'https://example.com/report?referrer=claude.ai',
  ])('keeps a copied tracking URL as weak evidence', (url) => {
    const report = artifacts.analyze({ text: `${release}\n\n${url}` });
    expect(report.signals.some((signal) => signal.ruleId === 'chatbot-leak.tracking')).toBe(true);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it.each([
    ['zero-width', 'The de\u200bsign document is in the shared folder. Please re\u200bview the changed paragraphs before Thursday. The ti\u200bming depends on the database copy finishing, so we have left Friday free for the final check.'],
    ['homoglyphs', 'The parser rejects the mixed-script identifier pαram in this test file. The Greek alpha between the Latin letters is deliberate. Please keep the original character so the test continues to check this error.'],
  ])('retains %s evidence without a fingerprint floor or Shame', (rule, text) => {
    const report = analyzePost({ text });
    expect(report.signals.some((signal) => signal.ruleId === `bypass-tricks.${rule}`)).toBe(true);
    expect(report.score).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });

  it('does not promote combined template and typography evidence to a fingerprint', () => {
    const text = `${release}\n\nName: [Your Name]\nProduct: [Insert your product name]\nhttps://example.com/report?utm_source=chatgpt.com\nThe de\u200bsign and re\u200bview ti\u200bming are recorded as pαram.`;
    const report = artifacts.analyze({ text });
    expect(report.signals.length).toBeGreaterThanOrEqual(4);
    expect(report.score).toBeLessThan(40);
    expect(report.shameable).toBe(false);
  });
});
