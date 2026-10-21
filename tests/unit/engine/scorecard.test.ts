import {describe,expect,it} from 'vitest';
import {createEngine,analyzePost} from '../../../src/lib/engine';
import {evidenceIndex,humanExpectation,evidenceUnits} from '../../../src/lib/engine/score';
import {buildContext} from '../../../src/lib/engine/context';
import {SCORECARD,THRESHOLD} from '../../../src/lib/engine/scorecard';
import {HABIT_CAP} from '../../../src/lib/engine/scorecard-schema';
import {dictionaries} from '../../../src/lib/engine/packs/dictionaries';
import {requiredLiterals} from '../../../src/lib/engine/regex-prefilter';
import type {PhraseRule,RulePack} from '../../../src/lib/engine/rule-types';
const rule=(id:string,category:PhraseRule['category'],word:string,weight=2):PhraseRule=>({kind:'phrase',id:'test.'+id,category,label:id,weight,phrases:[word],repeat:'once'});
const pack=(rules:PhraseRule[]):RulePack=>({id:'test',name:'Test',description:'Test',rules});
describe('v2 scorecard invariants',()=>{
 it('makes the threshold exactly 40 and compresses smoothly above 60',()=>{expect(evidenceIndex(1)).toBe(40);expect(evidenceIndex(1.5)).toBe(60);expect(evidenceIndex(1.5+1e-6)-60).toBeCloseTo(40e-6,8);expect(HABIT_CAP).toBeLessThanOrEqual(.6*THRESHOLD);});
 it('uses length solely as expected human exposure',()=>{const r=SCORECARD['ai-vocabulary.tier1']!;expect(humanExpectation(r,600)).toBeGreaterThan(humanExpectation(r,30));expect(createEngine([]).analyze({text:'We checked the records yesterday. '.repeat(100)}).score).toBe(0);});
 it('retains every dictionary entry at a positive prior-derived weight',()=>{expect(dictionaries.rules.length).toBeGreaterThan(9000);for(const r of dictionaries.rules)expect(SCORECARD[r.id]!.weight,r.id).toBeGreaterThan(0);});
 it('cannot use vocabulary as a second independent witness',()=>{const r=analyzePost({text:'Delve tapestry intricacies symphony beacon interplay meticulously ever-evolving. '.repeat(6)});expect(r.score).toBeLessThan(40);expect(r.shameable).toBe(false);});
 it('hides counts at or below human expectation',()=>{const r=analyzePost({text:'The team reviewed the report on Tuesday and wrote down the remaining questions. '.repeat(20)});expect(r.signals.some(s=>s.matches.includes('the'))).toBe(false);});
 it('bundles a list introduction, numbering and emoji into one witness',()=>{const r=analyzePost({text:'Here are five simple tips for the team.\n✅ 1. Clarity: Write the goal.\n✅ 2. Ownership: Name the owner.\n✅ 3. Feedback: Check the result.\n✅ 4. Time: Agree a date.\n✅ 5. Close: Save the notes.'});expect(r.signals.filter(s=>['pasted-output.listicle-hook','pasted-output.labeled-list','formatting.emoji-bullets','formatting.section-outline'].includes(s.ruleId)).length).toBeLessThanOrEqual(1);expect(r.score).toBeLessThan(40);});
 it('removing a tell lowers the index by about its displayed points, recomputing the gate',()=>{
  const e=createEngine([pack([rule('a','template-phrases','alpha'),rule('b','inflation','beta'),rule('c','hedging','gamma')])]);const text='alpha beta gamma. We checked the records before sending the report to the team.';const before=e.analyze({text});
  for(const tell of before.signals){const after=e.analyze({text:text.replace(tell.matches[0]!,'plain')});expect(Math.abs(before.score-after.score-tell.weight)).toBeLessThanOrEqual(1.01);expect(after.shameable).toBe(false);}
  const strong=createEngine([pack([rule('a','template-phrases','alpha',1000),rule('b','inflation','beta',1000),rule('c','hedging','gamma',1000)])]);const both=strong.analyze({text});expect(both.score).toBeGreaterThanOrEqual(40);const one=strong.analyze({text:text.replace('alpha','plain').replace('beta','plain')});expect(one.score).toBeLessThan(40);expect(one.shameable).toBe(false);
 });
 it('prefilters cannot require text inside a negative assertion or a backreference name',()=>{
  expect(requiredLiterals('(?<!forbidden)hello')).toEqual([['hello']]);expect(requiredLiterals('(?<word>bar)\\s+\\k<word>')).toBeNull();
 });
});
