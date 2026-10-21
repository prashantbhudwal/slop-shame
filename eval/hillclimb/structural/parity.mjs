// Verify optimized runtime against every previously exported candidate hit.
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT,CACHE,OUT,eligible,splitPath,jsonl,loader,save } from './common.mjs';
const s=await loader();
try {
  copyFileSync(resolve(ROOT,'src/lib/engine/packs/measured/structural.ts'),resolve(s.engine,'packs/measured/structural.ts'));
  const {structural}=await s.load(resolve(s.engine,'packs/measured/structural.ts'));
  const {buildContext,structureOf,isProtectedSpan}=await s.load(resolve(s.engine,'context.ts'));
  const result={};
  for(const split of ['train','dev']) {
    const records=jsonl(resolve(CACHE,`structural-features-${split}.jsonl`))[Symbol.asyncIterator]();
    let n=0;
    for await(const row of jsonl(splitPath(split))) {
      if(!eligible(row)) continue;
      const next=await records.next();assert(!next.done);assert.equal(row.id,next.value.id);
      const ctx=buildContext({text:row.text}),prot=structureOf(ctx).protectedSpans,hits=[];
      for(const rule of structural.rules){const hit=rule.detect(ctx);if(hit)hits.push([rule.id,hit.scale??1,hit.spans,hit.scale===undefined,hit.spans.some(span=>!isProtectedSpan(prot,span))]);}
      assert.deepEqual(hits,next.value.hits,`${split} ${row.id}`);n++;
    }
    assert((await records.next()).done);result[split]=n;
  }
  save(resolve(OUT,'parity.json'),result);console.log(JSON.stringify(result));
} finally {await s.close();}
