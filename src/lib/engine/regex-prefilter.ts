/** A conservative parser for necessary literal substrings. Null means run the
 * regex unconditionally. Every alternative must provide a witness. Optional
 * branches and assertions cannot create a required substring. No regex is
 * changed; this is only a cheap rejection before its precompiled scan. */
const cache = new Map<string, string[][] | null>();
export function requiredLiterals(source: string): string[][] | null {
  if (source.includes('\\k<')) return null;
  if (cache.has(source)) return cache.get(source)!;
  type Node = { exact?: string; required: string[][] | null };
  let i = 0;
  let unsafe = false;
  function sequence(): Node {
    const nodes: Node[] = [];
    while (i < source.length && source[i] !== ')' && source[i] !== '|') {
      let node: Node;
      const ch = source[i++]!;
      if (ch === '(') {
        if (source[i] === '?') {
          if (source.slice(i, i + 2) === '?:') i += 2;
          else {
            let depth = 1; let inClass = false;
            while (i < source.length && depth) { const c = source[i++]!; if (c === '\\') { i++; continue; } if (c === '[') inClass = true; else if (c === ']') inClass = false; else if (!inClass && c === '(') depth++; else if (!inClass && c === ')') depth--; }
            if (depth) unsafe = true;
            node = { required: null }; nodes.push(node); continue;
          }
        }
        node = alternatives();
        if (source[i++] !== ')') unsafe = true;
      } else if (ch === '[') {
        let content = '';
        while (i < source.length && source[i] !== ']') {
          const c = source[i++]!; content += c;
          if (c === '\\' && i < source.length) content += source[i++];
        }
        if (source[i++] !== ']') unsafe = true;
        const folded = content.toLowerCase();
        node = /^[a-z]+$/.test(folded) && new Set(folded).size === 1 ? { exact: folded[0], required: null } : { required: null };
      } else if (ch === '\\') {
        const c = source[i++]!;
        if (c === 'u' || c === 'x' || /[1-9]/.test(c)) { unsafe = true; return { required: null }; }
        node = /[a-zA-Z]/.test(c) ? { required: null } : { exact: c, required: null };
      } else node = /[.^$]/.test(ch) ? { required: null } : { exact: ch.toLowerCase(), required: null };
      const quantifier = source[i];
      if (quantifier === '?' || quantifier === '*' || quantifier === '+') {
        i++;
        node = quantifier === '+' ? { required: node.exact ? [[node.exact]] : node.required } : { required: null };
        if (source[i] === '?') i++;
      } else if (quantifier === '{') {
        const end = source.indexOf('}', i);
        if (end < 0) { unsafe = true; return { required: null }; }
        const minimum = Number(source.slice(i + 1, end).split(',')[0]); i = end + 1;
        node = minimum > 0 ? { required: node.exact ? [[node.exact]] : node.required } : { required: null };
        if (source[i] === '?') i++;
      }
      nodes.push(node);
    }
    let run = ''; const checks: string[][] = [];
    const consider = (values: string[] | null) => { if (values?.length && values.every(v => v.length >= 3)) checks.push(values); };
    for (const node of nodes) {
      if (node.exact !== undefined) run += node.exact;
      else { consider(run.length >= 3 ? [run] : null); run = ''; if (node.required) checks.push(...node.required); }
    }
    consider(run.length >= 3 ? [run] : null);
    return { exact: nodes.every(n => n.exact !== undefined) ? nodes.map(n => n.exact).join('') : undefined, required: checks.length ? checks : null };
  }

  function alternatives(): Node {
    const branches = [sequence()];
    while (source[i] === '|') { i++; branches.push(sequence()); }
    if (branches.length === 1) return branches[0]!;
    if (!branches.every(b => b.required)) return { required: null };
    const best = branches.map(b => b.required!.toSorted((a, c) => Math.min(...c.map(v => v.length)) - Math.min(...a.map(v => v.length)))[0]!);
    return { required: [[...new Set(best.flat())]] };
  }
  const result = alternatives();
  const required = unsafe || i !== source.length ? null : result.required;
  cache.set(source, required);
  return required;
}
