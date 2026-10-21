import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parseDrops } from './parse-drops.mjs';
import { metrics,gates,ROOT } from './common.mjs';
const r=(label,score,domain='books',extra={})=>({label,score,domain,words:100,shameable:false,...extra});
test('AUROC ties are half wins and base/completion models are excluded',()=>{
 const m=metrics([r('human',10),r('human',50),r('ai',50),r('ai',90),r('ai',0,'books',{family:'base'})]);
 assert.equal(m.overall.auroc,.875);assert.equal(m.overall.ai,2);assert.equal(m.overall.recall40,1);assert.equal(m.overall.base,1);
});
test('empty denominators are absent and domain-macro recall cannot be carried by a large domain',()=>{
 const m=metrics([r('ai',90),...Array.from({length:9},()=>r('ai',0,'poetry'))]);
 assert.equal(m.overall.fpRate,null);assert.equal(m.overall.auroc,null);assert.equal(m.macroRecall40,.5);assert.equal(m.overall.recall40,.1);
});
test('dev gates independently enforce overall, supported domain and Shame constraints',()=>{
 const b={overall:{fpRate:.015,shameFP:2}};
 assert.equal(gates({overall:{fpRate:.01,shameFP:1},domain:{books:{human:200,fpRate:.025}}},b),true);
 assert.equal(gates({overall:{fpRate:.01,shameFP:1},domain:{books:{human:200,fpRate:.03}}},b),false);
 assert.equal(gates({overall:{fpRate:.01,shameFP:3},domain:{}},b),false);
 assert.equal(gates({overall:{fpRate:.02,shameFP:0},domain:{}},b),false);
});
test('deterministic source grouping is independent of document/model metadata',()=>{
 const code="import sys;sys.path.insert(0,'eval/hillclimb');from prepare import split;import hashlib;source='shared-source';assert split(source)==split(source);p=int(hashlib.sha256(('slop-hillclimb-v1:'+source).encode()).hexdigest()[:16],16)%100;assert split(source)==('train' if p<60 else 'dev' if p<80 else 'test');print('ok')";
 assert.equal(execFileSync('python3',['-c',code],{cwd:ROOT,encoding:'utf8'}).trim(),'ok');
});

test('dictionary Markdown delimiters are excluded; escaped regex pipes survive',()=>{
 const markdown='| Source entry | Matcher | Reason |\n| --- | --- | --- |\n| source:ref | a\\|b | unigram-evidence |\n';
 assert.deepEqual(parseDrops(markdown),[{ref:'source:ref',value:'a|b',reason:'unigram-evidence'}]);
 assert.equal(parseDrops(markdown,{legacySeparator:true}).length,2);
});
