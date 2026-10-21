/** Minimal synchronous RFC 1951 decoder for our generated, immutable tables.
 * No fetching, dynamic code, browser APIs beyond base64, or runtime package. */
export function inflateJson<T>(base64: string, size: number): T {
  const raw = atob(base64), data = Uint8Array.from(raw, c => c.charCodeAt(0));
  const output = new Uint8Array(size);
  let offset = 0, hold = 0, bits = 0, written = 0;
  function read(n: number): number {
    while (bits < n) { if (offset >= data.length) throw new Error('Truncated engine table'); hold |= data[offset++]! << bits; bits += 8; }
    const result = hold & ((1 << n) - 1); hold >>>= n; bits -= n; return result;
  }
  function huffman(lengths: number[]) {
    const width = Math.max(1, ...lengths), counts = new Uint16Array(16), next = new Uint16Array(16);
    for (const n of lengths) if (n) counts[n] = counts[n]! + 1;
    let code = 0;
    for (let n = 1; n <= 15; n++) { code = (code + counts[n - 1]!) << 1; next[n] = code; }
    const table = new Uint32Array(1 << width);
    lengths.forEach((length, symbol) => {
      if (!length) return;
      let original = next[length]!, reversed = 0; next[length] = original + 1;
      for (let n = 0; n < length; n++) { reversed = (reversed << 1) | (original & 1); original >>>= 1; }
      for (let index = reversed; index < table.length; index += 1 << length) table[index] = (length << 16) | symbol;
    });
    return { width, table };
  }
  function symbol(tree: ReturnType<typeof huffman>): number {
    while (bits < tree.width && offset < data.length) { hold |= data[offset++]! << bits; bits += 8; }
    const entry = tree.table[hold & ((1 << tree.width) - 1)]!, length = entry >>> 16;
    if (!length || length > bits) throw new Error('Invalid engine table code');
    hold >>>= length; bits -= length; return entry & 65535;
  }
  const lengthBase = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const lengthExtra = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const distanceBase = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const distanceExtra = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let final = 0;
  do {
    final = read(1); const type = read(2);
    if (type === 0) {
      read(bits & 7); const length = read(16); if ((length ^ read(16)) !== 65535) throw new Error('Invalid stored engine table');
      for (let i = 0; i < length; i++) output[written++] = read(8);
      continue;
    }
    if (type === 3) throw new Error('Invalid engine table block');
    let lit: ReturnType<typeof huffman>, dist: ReturnType<typeof huffman>;
    if (type === 1) {
      lit = huffman(Array.from({length:288}, (_,i) => i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8)); dist = huffman(Array(32).fill(5));
    } else {
      const nl = read(5) + 257, nd = read(5) + 1, nc = read(4) + 4;
      // RFC permutation (kept explicit to avoid dependence on locale or maps).
      const permutation = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
      const lengths = Array(19).fill(0); for (let i = 0; i < nc; i++) lengths[permutation[i]!] = read(3);
      const codeTree = huffman(lengths), values: number[] = [];
      while (values.length < nl + nd) {
        const code = symbol(codeTree);
        if (code < 16) values.push(code);
        else { if (code === 16 && !values.length) throw new Error('Invalid engine table repeat'); const count = read(code === 16 ? 2 : code === 17 ? 3 : 7) + (code === 18 ? 11 : 3); const value = code === 16 ? values[values.length - 1]! : 0; for (let i = 0; i < count; i++) values.push(value); }
      }
      if (values.length !== nl + nd) throw new Error('Invalid engine table lengths');
      lit = huffman(values.slice(0,nl)); dist = huffman(values.slice(nl));
    }
    for (;;) {
      const code = symbol(lit);
      if (code < 256) { output[written++] = code; }
      else if (code === 256) break;
      else {
        const index = code - 257; if (index >= lengthBase.length) throw new Error('Invalid engine table length');
        const length = lengthBase[index]! + read(lengthExtra[index]!); const d = symbol(dist);
        if (d >= distanceBase.length) throw new Error('Invalid engine table distance');
        const distance = distanceBase[d]! + read(distanceExtra[d]!); if (distance > written) throw new Error('Invalid engine table backreference');
        for (let i = 0; i < length; i++) { output[written] = output[written - distance]!; written++; }
      }
      if (written > size) throw new Error('Engine table overflow');
    }
  } while (!final);
  if (written !== size) throw new Error('Invalid engine table size');
  return JSON.parse(new TextDecoder().decode(output)) as T;
}
