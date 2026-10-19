import { normalizeText, straighten, structureOf } from './context';
import type { PhraseRule, PostContext, RuleHit } from './rule-types';

interface Output { rule: number; length: number }
interface Node { next: Map<string, number>; fail: number; outputs: Output[] }
interface RegexRule { rule: number; matcher: RegExp }
const WORD_CHAR = /[\p{L}\p{M}\p{N}_]/u;
export interface CompiledHit extends RuleHit { spans: readonly (readonly [number, number])[] }

/**
 * Aho–Corasick for every literal across every pack (including overlapping
 * phrases). Regex sources use one candidate scanner, then sticky matchers at
 * candidate offsets so overlapping rules cannot hide one another. Patterns
 * with captures/backreferences stay isolated to preserve their semantics.
 * All regex construction and trie failure links are done at registration.
 */
export function compilePhrases(rules: readonly PhraseRule[]): (ctx: PostContext) => Map<PhraseRule, CompiledHit> {
  const nodes: Node[] = [{ next: new Map(), fail: 0, outputs: [] }];
  const regexRules: RegexRule[] = [];
  const isolated: RegexRule[] = [];
  const candidates: string[] = [];
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index]!;
    for (const literal of new Set(rule.phrases?.map((p) => straighten(normalizeText(p).trim().toLowerCase())))) {
      let state = 0;
      for (const char of literal) {
        let next = nodes[state]!.next.get(char);
        if (next === undefined) {
          next = nodes.length;
          nodes[state]!.next.set(char, next);
          nodes.push({ next: new Map(), fail: 0, outputs: [] });
        }
        state = next;
      }
      nodes[state]!.outputs.push({ rule: index, length: literal.length });
    }
    for (const source of rule.patterns ?? []) {
      const compatible = straighten(source);
      try {
        if (new RegExp(compatible, 'i').test('')) throw new Error('Patterns must not match empty text.');
        // Captures are legal in contributed patterns, including backreferences.
        // Do not renumber them by inserting them in the candidate alternation.
        const hasCaptures = /\((?!\?(?::|=|!|<=|<!))/.test(compatible);
        if (hasCaptures) isolated.push({ rule: index, matcher: new RegExp(compatible, 'gi') });
        else {
          regexRules.push({ rule: index, matcher: new RegExp(compatible, 'iy') });
          candidates.push(`(?:${compatible})`);
        }
      } catch (error) {
        throw new Error(`Invalid pattern in rule "${rule.id}": ${String(error)}`);
      }
    }
  }
  const queue = [...nodes[0]!.next.values()];
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head]!;
    for (const [char, next] of nodes[state]!.next) {
      let fail = nodes[state]!.fail;
      while (fail && !nodes[fail]!.next.has(char)) fail = nodes[fail]!.fail;
      nodes[next]!.fail = nodes[fail]!.next.get(char) ?? 0;
      nodes[next]!.outputs.push(...nodes[nodes[next]!.fail]!.outputs);
      queue.push(next);
    }
  }
  const candidate = candidates.length ? new RegExp(candidates.join('|'), 'gi') : null;

  return (ctx) => {
    const structure = structureOf(ctx);
    // One occurrence per start per rule, even when a phrase and regex both hit.
    const hits = new Map<number, Map<number, number>>();
    const record = (ruleIndex: number, start: number, end: number) => {
      if (end <= start) return; // Zero-length regexes can never produce a signal.
      const rule = rules[ruleIndex]!;
      if (rule.position === 'opening' && end > structure.openingEnd) return;
      if (rule.position === 'closing' && start < structure.closingStart) return;
      let spans = hits.get(ruleIndex);
      if (!spans) { spans = new Map(); hits.set(ruleIndex, spans); }
      spans.set(start, Math.max(end, spans.get(start) ?? end));
    };
    let state = 0;
    let offset = 0;
    for (const char of ctx.lower) {
      while (state && !nodes[state]!.next.has(char)) state = nodes[state]!.fail;
      state = nodes[state]!.next.get(char) ?? 0;
      offset += char.length;
      for (const output of nodes[state]!.outputs) {
        const start = offset - output.length;
        const before = start > 0 ? String.fromCodePoint(ctx.lower.codePointAt(start - (ctx.lower.charCodeAt(start - 1) >= 0xdc00 && ctx.lower.charCodeAt(start - 1) <= 0xdfff ? 2 : 1))!) : '';
        const after = offset < ctx.lower.length ? String.fromCodePoint(ctx.lower.codePointAt(offset)!) : '';
        if (before && WORD_CHAR.test(before) || after && WORD_CHAR.test(after)) continue;
        record(output.rule, structure.lowerOffsets?.[start] ?? start, structure.lowerOffsets?.[offset] ?? offset);
      }
    }
    if (candidate) {
      candidate.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = candidate.exec(structure.straight))) {
        for (const entry of regexRules) {
          entry.matcher.lastIndex = match.index;
          const hit = entry.matcher.exec(structure.straight);
          if (hit) record(entry.rule, hit.index, hit.index + hit[0].length);
        }
        // Search again one code point later; a long match must not swallow a
        // second rule starting inside it. Also guarantees empty-match progress.
        candidate.lastIndex = match.index + (ctx.text.codePointAt(match.index)! > 0xffff ? 2 : 1);
      }
    }
    for (const entry of isolated) {
      entry.matcher.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = entry.matcher.exec(structure.straight))) {
        record(entry.rule, match.index, match.index + match[0].length);
        entry.matcher.lastIndex = match.index + (ctx.text.codePointAt(match.index)! > 0xffff ? 2 : 1);
      }
    }
    const result = new Map<PhraseRule, CompiledHit>();
    for (const [index, spans] of hits) {
      const rule = rules[index]!;
      let previousEnd = -1;
      const ordered = [...spans].sort((a, b) => a[0] - b[0]).filter(([start, end]) => {
        if (start < previousEnd) return false;
        previousEnd = end;
        return true;
      });
      result.set(rule, {
        spans: ordered,
        matches: ordered.slice(0, 3).map(([start, end]) => ctx.text.slice(start, end)),
        scale: rule.repeat === 'each' ? ordered.length : rule.repeat === 'sqrt' ? Math.sqrt(ordered.length) : 1,
      });
    }
    return result;
  };
}
