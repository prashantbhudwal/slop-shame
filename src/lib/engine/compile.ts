import { normalizeText, straighten, structureOf } from './context';
import type { PhraseRule, PostContext, RuleHit } from './rule-types';

interface Output { rule: number; length: number }
interface Node { next: Map<string, number>; fail: number; outputs: Output[] }
interface RegexRule { rule: number; matcher: RegExp }
interface RegexGroup { closing: boolean; entries: RegexRule[]; sources: string[]; candidate: RegExp | null }
const WORD_CHAR = /[\p{L}\p{M}\p{N}_]/u;
const LITERAL_WHITESPACE = /\p{White_Space}+/gu;
/** All unique candidate spans survive until cross-rule evidence selection. */
export interface CompiledHit extends RuleHit { spans: readonly (readonly [number, number])[] }

/** Literal-only view; boundary offsets map back to ctx.lower before lowercase expansion is undone. */
function literalView(lower: string): { text: string; offsets: readonly number[] | null } {
  let offsets: number[] | null = null;
  let cursor = 0;
  const text = lower.replace(LITERAL_WHITESPACE, (whitespace: string, start: number) => {
    // Single whitespace characters change spelling, but preserve offsets.
    if (whitespace.length > 1) {
      offsets ??= [];
      for (let i = cursor; i < start; i++) offsets.push(i);
      offsets.push(start);
      cursor = start + whitespace.length;
    }
    return ' ';
  });
  // The replace callback may initialize the map; TS does not track writes
  // through callbacks when narrowing the outer variable.
  const mapping = offsets as number[] | null;
  if (mapping) for (let i = cursor; i <= lower.length; i++) mapping.push(i);
  return { text, offsets: mapping };
}

/**
 * Aho–Corasick for every literal across every pack (including overlapping
 * phrases), with whitespace runs collapsed in a separate matching view.
 * Regex sources use bounded candidate batches (full text / closing
 * prose before a footer), then sticky matchers at
 * candidate offsets so overlapping rules cannot hide one another. Patterns
 * with captures/backreferences stay isolated to preserve their semantics.
 * All regex construction and trie failure links are done at registration.
 */
export function compilePhrases(rules: readonly PhraseRule[]): (ctx: PostContext) => Map<PhraseRule, CompiledHit> {
  const nodes: Node[] = [{ next: new Map(), fail: 0, outputs: [] }];
  const groups: RegexGroup[] = [
    { closing: false, entries: [], sources: [], candidate: null },
    { closing: true, entries: [], sources: [], candidate: null },
  ];
  const isolated: RegexRule[] = [];
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index]!;
    for (const literal of new Set(rule.phrases?.map((p) => straighten(normalizeText(p).toLowerCase()).replace(LITERAL_WHITESPACE, ' ').trim()))) {
      if (!literal) continue;
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
          const closing = rule.position === 'closing';
          // Each hit checks at most sixteen sources instead of every regex in
          // every dictionary. Batches enumerate overlapping starts; record()
          // merges duplicate spans without changing capture semantics.
          let group = groups.find((group) => group.closing === closing && group.entries.length < 16);
          if (!group) { group = { closing, entries: [], sources: [], candidate: null }; groups.push(group); }
          group.entries.push({ rule: index, matcher: new RegExp(compatible, 'iy') });
          group.sources.push(`(?:${compatible})`);
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
  for (const group of groups) if (group.sources.length) group.candidate = new RegExp(group.sources.join('|'), 'gi');

  return (ctx) => {
    const structure = structureOf(ctx);
    const closingText = structure.straight.slice(0, structure.bodyEnd);
    // Deduplicate identical literal/regex occurrences, but keep shorter and
    // nested alternatives: a stronger competing rule may block the longest.
    const hits = new Map<number, Map<number, Set<number>>>();
    const record = (ruleIndex: number, start: number, end: number) => {
      if (end <= start) return; // Zero-length regexes can never produce a signal.
      const rule = rules[ruleIndex]!;
      if (rule.position === 'opening' && end > structure.openingEnd) return;
      if (rule.position === 'closing' && (start < structure.closingStart || end > structure.bodyEnd)) return;
      let spans = hits.get(ruleIndex);
      if (!spans) { spans = new Map(); hits.set(ruleIndex, spans); }
      let ends = spans.get(start);
      if (!ends) { ends = new Set(); spans.set(start, ends); }
      ends.add(end);
    };
    if (nodes.length > 1) {
      const view = literalView(ctx.lower);
      let state = 0;
      let offset = 0;
      for (const char of view.text) {
        while (state && !nodes[state]!.next.has(char)) state = nodes[state]!.fail;
        state = nodes[state]!.next.get(char) ?? 0;
        offset += char.length;
        for (const output of nodes[state]!.outputs) {
          const start = offset - output.length;
          const before = start > 0 ? String.fromCodePoint(view.text.codePointAt(start - (view.text.charCodeAt(start - 1) >= 0xdc00 && view.text.charCodeAt(start - 1) <= 0xdfff ? 2 : 1))!) : '';
          const after = offset < view.text.length ? String.fromCodePoint(view.text.codePointAt(offset)!) : '';
          if (before && WORD_CHAR.test(before) || after && WORD_CHAR.test(after)) continue;
          const lowerStart = view.offsets?.[start] ?? start;
          const lowerEnd = view.offsets?.[offset] ?? offset;
          record(output.rule, structure.lowerOffsets?.[lowerStart] ?? lowerStart, structure.lowerOffsets?.[lowerEnd] ?? lowerEnd);
        }
      }
    }
    for (const group of groups) {
      const candidate = group.candidate;
      if (!candidate) continue;
      const target = group.closing ? closingText : structure.straight;
      candidate.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = candidate.exec(target))) {
        for (const entry of group.entries) {
          entry.matcher.lastIndex = match.index;
          const hit = entry.matcher.exec(target);
          if (hit) record(entry.rule, hit.index, hit.index + hit[0].length);
        }
        // Search again one code point later; a long match must not swallow a
        // second rule starting inside it. Also guarantees empty-match progress.
        candidate.lastIndex = match.index + (ctx.text.codePointAt(match.index)! > 0xffff ? 2 : 1);
      }
    }
    for (const entry of isolated) {
      const target = rules[entry.rule]!.position === 'closing' ? closingText : structure.straight;
      entry.matcher.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = entry.matcher.exec(target))) {
        record(entry.rule, match.index, match.index + match[0].length);
        entry.matcher.lastIndex = match.index + (ctx.text.codePointAt(match.index)! > 0xffff ? 2 : 1);
      }
    }
    const result = new Map<PhraseRule, CompiledHit>();
    for (const [index, spans] of hits) {
      const rule = rules[index]!;
      let previousEnd = -1;
      const ordered: [number, number][] = [];
      for (const [start, ends] of spans) for (const end of ends) ordered.push([start, end]);
      ordered.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      // Standalone scale is provisional. The scorer recomputes repetition
      // from candidates retained after exclusions and cross-rule competition.
      let count = 0;
      for (const [start, end] of ordered) {
        if (start < previousEnd) continue;
        previousEnd = end;
        count++;
      }
      result.set(rule, {
        spans: ordered,
        matches: ordered.map(([start, end]) => ctx.text.slice(start, end)),
        scale: rule.repeat === 'each' ? count : rule.repeat === 'sqrt' ? Math.sqrt(count) : 1,
      });
    }
    return result;
  };
}
