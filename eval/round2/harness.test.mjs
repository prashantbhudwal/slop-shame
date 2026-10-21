import {test}from'node:test';
import assert from 'node:assert/strict';
import {resolve}from'node:path';
import{writeFileSync,unlinkSync}from'node:fs';
import{CACHE,tunePrompt,jsonl,hash,json}from'./common.mjs';
test('target split follows the exact prompt hash and groups models',()=>{
 for(const id of ['q01','q20','t022','b042','c067']) {
  const expected=parseInt(hash('target-v1:'+id).slice(0,8),16)%10<6;
  assert.equal(tunePrompt(id),expected);
  assert.equal(tunePrompt(id),tunePrompt(id));
 }
 const baseline=json(resolve(import.meta.dirname,'baseline.json'));
 assert.equal(baseline.sets.targetTune.overall.ai,290);
 assert.equal(baseline.sets.targetHoldout.overall.ai,160);
});
test('JSONL parser keeps literal Unicode line separators inside text',async()=>{
 const path=resolve(CACHE,'parser-test.jsonl');
 const rows=[{text:'one\u2028two\u2029three'},{text:'four\nfive\rsix'}];
 try{writeFileSync(path,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');const actual=[];for await(const r of jsonl(path))actual.push(r);assert.deepEqual(actual,rows);}finally{unlinkSync(path);}
});
