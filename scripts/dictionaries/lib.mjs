import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import ts from 'typescript'; // Already a project devDependency; no added packages.

export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const normalize = (value) => value.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase().replace(/\s+/g, ' ').trim();
export const weightForRatio = (ratio) => Math.max(1, Math.min(10, Math.round(1.3 * Math.log2(ratio))));
export const categories = ['ai-vocabulary', 'template-phrases', 'chatbot-leak', 'negation-pivot', 'inflation', 'hedging', 'engagement-bait', 'formatting', 'robotic-rhythm', 'bypass-tricks'];

/** RFC 4180, including doubled quotes, commas and newlines inside fields. */
export function csv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === ',' || ch === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = '';
      if (ch === '\n') { rows.push(row); row = []; }
    } else cell += ch;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

/** Deliberately limited to the pinned Vale token-list subset; fail closed. */
export function yamlTokens(text) {
  const lines = text.split('\n'); const tokens = []; let inTokens = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === 'tokens:') { inTokens = true; continue; }
    if (!inTokens || !line.trim() || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^  - (.+)$/);
    if (!match) {
      if (/^    tag: /.test(line)) continue; // POS tag retained as metadata, not implementable locally.
      throw new Error(`Unsupported Vale YAML at line ${i + 1}: ${line}`);
    }
    let value = match[1]; let posTagged = false;
    if (value.startsWith('pattern: ')) { value = value.slice(9); posTagged = true; }
    // Every double-quoted scalar in the pinned subset uses JSON-compatible
    // YAML escapes (notably \\ for a regex backslash). Reject other YAML forms.
    if (/^["']/.test(value)) {
      const quote = value[0];
      if (value.at(-1) !== quote) throw new Error('Unsupported multiline YAML scalar');
      value = quote === '"' ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'");
    }
    tokens.push({ value, line: i + 1, posTagged });
  }
  if (!tokens.length) throw new Error('Missing Vale tokens');
  return tokens;
}

/** Expand a finite regex language into literals. No evaluation of upstream code. */
export function expandFinite(source, limit = 512) {
  let i = 0;
  const product = (a, b) => {
    if (a.length * b.length > limit) throw new Error('Expansion limit');
    return a.flatMap((x) => b.map((y) => x + y));
  };
  function expression(end) {
    let alternatives = [], sequence = [''];
    while (i < source.length && source[i] !== end) {
      let atom; const ch = source[i++];
      if (ch === '|') { alternatives.push(...sequence); sequence = ['']; continue; }
      if (ch === '(') {
        if (source.slice(i, i + 2) === '?:') i += 2;
        else if (source[i] === '?') throw new Error('Non-finite assertion');
        atom = expression(')'); if (source[i++] !== ')') throw new Error('Unclosed group');
      } else if (ch === '\\') {
        const escaped = source[i++];
        if (escaped === 'b') atom = [''];
        else if (/[\\.'"?!,:;()\[\]{}+*/-]/.test(escaped ?? '')) atom = [escaped];
        else throw new Error('Non-literal escape');
      } else if (ch === '[') {
        const endClass = source.indexOf(']', i);
        if (endClass < 0) throw new Error('Unclosed class');
        const content = source.slice(i, endClass); i = endClass + 1;
        if (/[\\^\-]/.test(content) || content.length > 8) throw new Error('Non-finite class');
        atom = [...content];
      } else if (/[.^$*+{}]/.test(ch)) throw new Error('Non-finite regex');
      else atom = [ch];
      if (source[i] === '?') { atom = [...atom, '']; i++; }
      else if (source[i] === '+' || source[i] === '*' || source[i] === '{') throw new Error('Non-finite repeat');
      sequence = product(sequence, atom);
    }
    alternatives.push(...sequence);
    if (alternatives.length > limit) throw new Error('Expansion limit');
    return alternatives;
  }
  try {
    const values = expression(undefined);
    if (i !== source.length) return null;
    const result = [...new Set(values.map(normalize))];
    return result.every(Boolean) ? result : null;
  } catch { return null; }
}

/** No quantified group can contain another quantifier, even a bounded one. */
export function assertSafeRegex(source) {
  if (/\(\?[=!<]|\\[1-9]|\\k<|\(\?[a-z-]+\)/i.test(source)) throw new Error('Lookaround, backreference or inline flags');
  const stack = [{ quantified: false }]; let last = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') {
      if (source[i + 1] === 'p' || source[i + 1] === 'P') throw new Error('Unicode properties require unavailable u flag');
      i++; last = { quantified: false }; continue;
    }
    if (ch === '[') {
      for (i++; i < source.length && source[i] !== ']'; i++) if (source[i] === '\\') i++;
      last = { quantified: false }; continue;
    }
    if (ch === '(') {
      if (source.slice(i + 1, i + 3) === '?:') i += 2;
      stack.push({ quantified: false }); last = null; continue;
    }
    if (ch === ')') {
      if (stack.length < 2) throw new Error('Unbalanced regex');
      last = stack.pop(); stack.at(-1).quantified ||= last.quantified; continue;
    }
    if (ch === '?' || ch === '*' || ch === '+' || ch === '{') {
      if (last?.quantified) throw new Error('Nested quantifiers');
      stack.at(-1).quantified = true;
      if (ch === '{') { const end = source.indexOf('}', i); if (end < 0) throw new Error('Invalid quantifier'); i = end; }
      if (source[i + 1] === '?') i++; // lazy modifier is part of the same quantifier
      last = { quantified: true }; continue;
    }
    last = { quantified: false };
  }
  if (stack.length !== 1) throw new Error('Unbalanced regex');
  const regex = new RegExp(source, 'gi');
  if (regex.test('')) throw new Error('Nullable pattern');
  return source;
}

/** Narrow variable spans to sentence fragments, maximum 80 code units. */
export function boundRegex(source, multiline = false) {
  let out = source.replace(/\\A/g, '^').replace(/\\Z/g, '$').replace(/[‘’]/g, "'");
  out = out.replace(/\\s\+/g, '[ \\t]{1,8}').replace(/\\s\*/g, '[ \\t]{0,8}');
  out = out.replaceAll('[ \\t]*', '[ \\t]{0,8}').replaceAll('[ \\t]+', '[ \\t]{1,8}');
  out = out.replace(/\\w\+/g, '\\w{1,32}').replace(/\\w\*/g, '\\w{0,32}');
  out = out.replace(/\\d\+/g, '\\d{1,12}');
  // Repeated character classes only, never arbitrary group text.
  out = out.replace(/(\[(?:\\.|[^\]\\])+\])\+/g, '$1{1,80}').replace(/(\[(?:\\.|[^\]\\])+\])\*/g, '$1{0,80}');
  out = out.replace(/\{(\d+),\}/g, '{$1,80}');
  out = out.replace(/\.\*/g, '[^.!?\\n]{0,80}').replace(/\.\+/g, '[^.!?\\n]{1,80}');
  if (multiline && out.startsWith('^')) out = '(?:^|\\n)' + out.slice(1);
  assertSafeRegex(out);
  return out;
}

export const adversarialInputs = () => [
  'a'.repeat(10240), ' '.repeat(10240), 'not '.repeat(2560),
  "It's not just ".repeat(788).slice(0, 10240),
  ('a'.repeat(75) + ', ').repeat(133).slice(0, 10240),
  '- **a a a a a a a a a a a a\n'.repeat(400).slice(0, 10240),
];

export function timeRegex(source, trials = 7) {
  assertSafeRegex(source);
  const regex = new RegExp(source, 'gi'); let worstMs = 0;
  for (const input of adversarialInputs()) {
    for (let i = 0; i < 3; i++) { regex.lastIndex = 0; regex.test(input); }
    // Median independent warmed trials reduce scheduler / GC noise without
    // choosing the fastest result. Report the worst input's median full scan.
    const times = [];
    for (let trial = 0; trial < trials; trial++) {
      regex.lastIndex = 0; const start = performance.now();
      while (regex.exec(input)) { /* full global scan, including successful hits */ }
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    worstMs = Math.max(worstMs, times[Math.floor(times.length / 2)]);
  }
  return worstMs;
}

/** Read literal arrays and custom Set vocabularies without importing the core. */
export function firstPartyInventory(root) {
  const phrases = new Map(), patterns = new Map(), files = [];
  for (const name of readdirSync(root).filter((x) => x.endsWith('.ts') && !['index.ts', 'upstream-map.ts'].includes(x)).sort()) {
    const content = readFileSync(`${root}/${name}`, 'utf8'); files.push({ path: `src/lib/engine/packs/${name}`, sha256: digest(content) });
    const ast = ts.createSourceFile(name, content, ts.ScriptTarget.Latest, true);
    function record(map, value, node) {
      const key = map === phrases ? normalize(value) : value;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(`${name}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
    }
    function visit(node) {
      if (ts.isPropertyAssignment(node) && ts.isArrayLiteralExpression(node.initializer)) {
        const key = node.name.getText(ast).replace(/['"]/g, '');
        if (key === 'phrases' || key === 'patterns') for (const element of node.initializer.elements) {
          if (ts.isStringLiteralLike(element)) record(key === 'phrases' ? phrases : patterns, element.text, element);
        }
      }
      if (ts.isNewExpression(node) && node.expression.getText(ast) === 'Set') {
        const arg = node.arguments?.[0];
        if (arg && ts.isCallExpression(arg) && ts.isPropertyAccessExpression(arg.expression) && arg.expression.name.text === 'split' && ts.isStringLiteralLike(arg.expression.expression)) {
          for (const word of arg.expression.expression.text.split(' ')) record(phrases, word, node);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  return { phrases, patterns, files };
}

export function validatePacks(packs) {
  const ids = new Set(); const seen = new Set();
  for (const pack of packs) for (const rule of pack.rules) {
    if (!rule.id.startsWith(pack.id + '.') || ids.has(rule.id)) throw new Error(`Invalid/duplicate id ${rule.id}`);
    ids.add(rule.id);
    if (rule.kind !== 'phrase' || !categories.includes(rule.category) || !Number.isInteger(rule.weight) || rule.weight < 1 || rule.weight > 10) throw new Error(`Invalid rule ${rule.id}`);
    if (!(rule.phrases?.length || rule.patterns?.length)) throw new Error(`Empty rule ${rule.id}`);
    for (const [kind, values] of [['phrase', rule.phrases ?? []], ['pattern', rule.patterns ?? []]]) for (const value of values) {
      const key = `${kind}:${kind === 'phrase' ? normalize(value) : value}`;
      if (seen.has(key)) throw new Error(`Duplicate matcher ${key}`);
      seen.add(key);
      if (kind === 'pattern') { assertSafeRegex(value); const ms = timeRegex(value); if (ms >= 1) throw new Error(`Regex over 1ms (${ms}): ${rule.id}`); }
    }
  }
  return { rules: ids.size, matchers: seen.size };
}
