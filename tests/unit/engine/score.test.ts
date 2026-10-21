import { describe, expect, it } from 'vitest';
import { analyzePost, createEngine } from '../../../src/lib/engine';
import { evidenceIndex } from '../../../src/lib/engine/score';
import { HABIT_CAP } from '../../../src/lib/engine/scorecard-schema';
import { THRESHOLD } from '../../../src/lib/engine/scorecard';
import type { CustomRule, PhraseRule, RulePack } from '../../../src/lib/engine/rule-types';
const phrase: PhraseRule = { kind:'phrase', id:'test.first', category:'ai-vocabulary', label:'First', weight:10, phrases:['obvious'], repeat:'each' };
const pack = (rules: RulePack['rules'] = [phrase]): RulePack => ({id:'test',name:'Test',description:'Test',rules});
const text = 'One obvious example among enough ordinary words to be scored.';
const sum = (report: ReturnType<typeof analyzePost>) => report.signals.reduce((a,s)=>a+s.weight,0);

describe('length-aware, capped evidence scorecard',()=>{
  // v2 weights are exact displayed index points, replacing editorial point sums.
  it('reports exact points, sorted signals and independent category totals',()=>{
    const custom:CustomRule={kind:'custom',id:'test.custom',category:'inflation',label:'Custom',weight:20,detect:()=>({matches:['One','example','ordinary','words'],scale:2})};
    const report=createEngine([pack([phrase,custom])]).analyze({text:text+' obvious obvious obvious'});
    expect(report.signals.every((s,i,a)=>!i||a[i-1]!.weight>=s.weight)).toBe(true);
    expect(report.signals.every(s=>s.matches.length<=3)).toBe(true);
    expect(Object.values(report.categoryWeights).reduce((a,b)=>a+b,0)).toBeCloseTo(sum(report));
    expect(report.score).toBe(Math.floor(sum(report)+1e-10));
  });
  it('ignores empty bodies and unscored metadata',()=>{
    for(const body of ['', ' \n ', 'obvious obvious obvious'])expect(analyzePost({text:body,isBareRepost:true,authorHeadline:'Visionary | Ninja'})).toMatchObject({score:0,shameable:false,signals:[],topCategory:null});
    expect(createEngine([pack()]).analyze({text}).score).toBeGreaterThan(0);
  });
  // v2 exposure reduces sparse habits; length itself never earns evidence.
  it('reduces sparse evidence with exposure and smoothly caps repetitions',()=>{
    const e=createEngine([pack()]);const a=e.analyze({text});const b=e.analyze({text:text+' We checked the records.'.repeat(100)});
    expect(b.score).toBeLessThanOrEqual(a.score);expect(b.signals[0]?.matches).toEqual(a.signals[0]?.matches);
    const repeated=e.analyze({text:'obvious '.repeat(100)});expect(repeated.score).toBeLessThan(40);
    expect(sum(repeated)).toBeLessThanOrEqual(40*HABIT_CAP/THRESHOLD);
    expect(evidenceIndex(1)).toBe(40);expect(evidenceIndex(1.5)).toBe(60);expect(evidenceIndex(1e6)).toBe(100);
  });
  // v2 smooth caps and two witnesses replace hard category point caps and bonuses.
  it('requires two independent habit families and keeps each family <=24 points',()=>{
    const cats=['template-phrases','inflation','hedging'] as const;
    const rules=cats.map((category,i)=>({...phrase,id:`test.cap-${i}`,category,weight:1000,phrases:[['alpha','beta','gamma'][i]!]}));
    const a=createEngine([pack([rules[0]!])]).analyze({text:'alpha '+text});expect(a.score).toBeLessThan(40);
    const b=createEngine([pack(rules)]).analyze({text:'alpha beta gamma '+text});expect(b.score).toBeGreaterThanOrEqual(40);
    for(const value of Object.values(b.categoryWeights))expect(value).toBeLessThanOrEqual(24);
  });
  it('deduplicates cross-category occurrences independent of registration order',()=>{
    const rules=[phrase,{...phrase,id:'test.second',category:'inflation' as const}];const one=createEngine([pack([phrase])]).analyze({text});
    expect(createEngine([pack(rules)]).analyze({text}).score).toBe(one.score);
    expect(createEngine([pack(rules.toReversed())]).analyze({text})).toEqual(createEngine([pack(rules)]).analyze({text}));
  });
  it('keeps explicit fingerprints >=80 and preserves the eight-word action guard',()=>{
    for(const body of ['As an AI language model, I can help you write this post.',text.repeat(10)]){
      const e=createEngine([pack([{...phrase,category:'chatbot-leak',evidence:'fingerprint'}])]);
      const r=body.includes('obvious')?e.analyze({text:body}):analyzePost({text:body});expect(r.score).toBeGreaterThanOrEqual(80);expect(r.shameable).toBe(true);
    }
    expect(analyzePost({text:'As an AI language model, I cannot.'})).toMatchObject({shameable:false});
  });
  it('keeps style alone below the accusation boundary',()=>{
    const e=createEngine([pack([{...phrase,category:'formatting',weight:999},{...phrase,id:'test.rhythm',category:'robotic-rhythm',weight:999}])]);const r=e.analyze({text:text.repeat(10)});expect(r.score).toBeLessThan(40);expect(r.shameable).toBe(false);
  });
  it('snapshots contributors and returns independent reports',()=>{
    const r={...phrase,phrases:['obvious']};const e=createEngine([pack([r])]);const before=e.analyze({text});r.phrases[0]='other';r.weight=999;expect(e.analyze({text})).toEqual(before);
    const input={text:'As an AI language model, I can help write the announcement.'};const report=analyzePost(input);report.signals.length=0;expect(analyzePost(input).signals.length).toBeGreaterThan(0);
  });
  it('binds class-based custom methods and does not mutate contributor spans',()=>{
    class Rule implements CustomRule {kind='custom' as const;id='test.class-rule';category='inflation' as const;label='Class';weight=2;snippet='obvious';detect(){return{matches:[this.snippet]};}}
    expect(createEngine([pack([new Rule()])]).analyze({text}).signals[0]?.ruleId).toBe('test.class-rule');
    const spans=Object.freeze([Object.freeze([0,3] as const),Object.freeze([0,3] as const)]);const r:CustomRule={kind:'custom',id:'test.custom',category:'ai-vocabulary',label:'Custom',weight:2,detect:()=>({matches:[],spans})};
    expect(createEngine([pack([r])]).analyze({text}).signals[0]?.matches).toEqual(['One']);expect(spans).toEqual([[0,3],[0,3]]);
  });
});

describe('contributor validation', () => {
  it.each([
    ['missing namespace', { ...phrase, id: 'oops' }, /namespaced.*test/],
    ['wrong prefix', { ...phrase, id: 'other.rule' }, /namespaced.*test/],
    ['empty suffix', { ...phrase, id: 'test.' }, /namespaced/],
    ['zero weight', { ...phrase, weight: 0 }, /finite positive weight/],
    ['NaN weight', { ...phrase, weight: NaN }, /finite positive weight/],
    ['infinite weight', { ...phrase, weight: Infinity }, /finite positive weight/],
    ['negative weight', { ...phrase, weight: -3 }, /finite positive weight/],
    ['empty label', { ...phrase, label: ' ' }, /readable label/],
    ['empty phrases', { ...phrase, phrases: [] }, /non-empty/],
    ['blank phrase', { ...phrase, phrases: [' '] }, /non-empty/],
    ['invisible phrase', { ...phrase, phrases: ['\u200B'] }, /non-empty/],
    ['nullable pattern', { ...phrase, patterns: ['(?:foo)?'] }, /empty text/],
    ['non-array phrases', { ...phrase, phrases: 'obvious' }, /array of strings/],
    ['empty pattern', { ...phrase, phrases: [], patterns: [''] }, /non-empty/],
    ['invalid regex', { ...phrase, patterns: ['['] }, /Invalid pattern.*test.first/],
    ['invalid category', { ...phrase, category: 'nonsense' }, /Unknown category/],
    ['invalid evidence', { ...phrase, evidence: 'certain' }, /Invalid evidence kind/],
    ['invalid repeat', { ...phrase, repeat: 'forever' }, /repeat mode/],
    ['invalid position', { ...phrase, position: 'middle' }, /position/],
    ['invalid custom rule', { ...phrase, kind: 'custom' }, /detect/],
  ])('rejects %s', (_name, badRule, expected) => {
    expect(() => createEngine([pack([badRule as PhraseRule])])).toThrow(expected as RegExp);
  });
  it('rejects duplicate rule IDs, duplicate packs, and invalid pack namespaces', () => {
    expect(() => createEngine([pack([phrase, phrase])])).toThrow(/Duplicate rule id.*test.first/);
    expect(() => createEngine([pack(), pack()])).toThrow(/Duplicate pack id.*test/);
    expect(() => createEngine([{ ...pack(), id: 'bad.ID' }])).toThrow(/Invalid pack id/);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid custom scale %s', (scale) => {
    const engine = createEngine([pack([{ ...phrase, kind: 'custom', detect: () => ({ matches: [], scale }) }])]);
    expect(() => engine.analyze({ text })).toThrow(/test.first.*invalid scale/);
  });
  it.each([
    [[-1, 3]], [[3, 3]], [[4, 3]], [[0, text.length + 1]], [[0.5, 3]], [[0, NaN]], [[0, Infinity]], [[0]],
  ])('rejects invalid custom spans %j', (span) => {
    const custom: CustomRule = {
      kind: 'custom', id: 'test.custom', category: 'ai-vocabulary', label: 'Custom', weight: 2,
      detect: () => ({ matches: [], spans: [span] as unknown as readonly (readonly [number, number])[] }),
    };
    expect(() => createEngine([pack([custom])]).analyze({ text })).toThrow(/test.custom.*valid spans/);
  });
  it('allows an empty engine and clean posts', () => {
    expect(createEngine([]).analyze({ text })).toMatchObject({ score: 0, topCategory: null, signals: [] });
  });
});
