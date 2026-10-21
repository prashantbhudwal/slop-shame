// Offline, pinned inputs only. Restore every literal, irrespective of former
// editorial drop reason. Regex exclusions are safety/conditional metadata only.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ROOT,OUT,CACHE,hash,json,save,loader,jsonl} from './common.mjs';
import {parseDrops} from '../hillclimb/parse-drops.mjs';
import {normalize,expandFinite,boundRegex,weightForRatio,csv} from '../../scripts/dictionaries/lib.mjs';
import {zeroCategories,valeCategories} from '../../scripts/dictionaries/policy.mjs';
const report=json(resolve(ROOT,'src/lib/engine/packs/vendor/report.json')), map=new Map(),skipped=[];
const raw=(source,p)=>json(resolve(ROOT,'data/dictionaries',source,p));
const z=raw('zeroslop','data/patterns.json'),sampler=raw('paech-sampler','slop_phrase_prob_adjustments.json');
const radar=raw('slop-radar','src/database/patterns.json');
const books=new Map();for await(const r of jsonl(resolve(ROOT,'data/eval/raw/ngram/baseline.jsonl')))books.set(normalize(r.phrase),r);
const entryStats=new Map(json(resolve(ROOT,'eval/hillclimb/entry-stats.json')).map(r=>[r.id,r]));
function originInfo(origin){const {source,ref=''}=origin;let category,weight=2,artifact=false;const i=Number(/\[(\d+)\]/.exec(ref)?.[1]);
 if(source==='zeroslop'){const r=ref.includes('patterns[')?z.patterns[i]:null;if(r){category=zeroCategories[r.cat];weight=r.w;artifact=['artifact','assistant'].includes(r.cat);}else weight=z.lexicon[ref.split('lexicon.')[1]]??2;}
 if(source==='paech-sampler')weight=weightForRatio(1/(sampler[i]?.[1]??.5));
 if(source==='vale-ai-tells'){const name=ref.split('/').at(-1)?.split('.yml')[0];category=valeCategories[name];artifact=/Assistant|Chatbot/.test(name??'');}
 if(source==='slop-radar'){const r=radar.find(r=>ref.endsWith(':'+r.name));if(r){weight=r.weight;artifact=/meta|chatbot/.test(r.name);}}
 return {...origin,priorWeight:weight,category,artifact};
}
function add(kind,value,category,prior,origins,position){
 value=kind==='phrase'?normalize(value):value;const key=JSON.stringify([kind,value,position??'']);
 if(!value)return;const old=map.get(key);if(old){old.origins.push(...origins);old.weight=Math.max(old.weight,prior);return;}
 const id='dictionaries.entry-'+hash(key).slice(0,16),words=value.match(/[\p{L}\p{N}]+/gu)?.length??0;
 const single=kind==='phrase'&&words===1;
 const candidate={kind:'phrase',id,category:single?'ai-vocabulary':category,label:kind==='phrase'?`Dictionary tell: ${value}`:`Dictionary construction: ${category}`,weight:Math.max(.1,prior),repeat:'each',...(kind==='phrase'?{phrases:[value]}:{patterns:[value]}),...(position?{position}:{}),origins,curatorGun:origins.some(o=>o.artifact)||/\b(?:as an ai|as a large language|language model|i hope this helps|certainly.{0,4}here|as of my last update|feel free to adjust|here.s a revised|my knowledge cutoff|regenerate response)\b/i.test(value),vocabulary:single,book:books.get(normalize(value))??null};
 const oldKey=JSON.stringify([kind,value,position??'']);candidate.oldStats=entryStats.get('measured.'+kind+'-'+hash(oldKey).slice(0,12))??null;
 map.set(key,candidate);
}
const s=await loader();try{
 for(const source of ['zeroslop','vale-ai-tells','slop-radar','paech-essays','paech-sampler','kobak']){const {pack}=await s.load(resolve(ROOT,`src/lib/engine/packs/vendor/${source}.ts`));for(const r of pack.rules){const meta=report.rules.find(v=>v.id===r.id);for(const [kind,values]of [['phrase',r.phrases??[]],['pattern',r.patterns??[]]])for(const v of values)add(kind,v,r.category,r.weight,meta.origins.map(originInfo),r.position);}}
 for(const {ref,value,reason}of parseDrops(readFileSync(resolve(ROOT,'src/lib/engine/packs/vendor/DROPPED.md'),'utf8'))){
  if(/^(?:conditional-rider|rider-trigger)/.test(reason)){skipped.push({ref,reason});continue;}
  const [source,...rest]=ref.split(':'),origin=originInfo({source,ref:rest.join(':'),state:'restored',previousReason:reason});
  const category=origin.category??(source==='paech-essays'&&ref.includes('phrases')?'template-phrases':value.includes(' ')?'template-phrases':'ai-vocabulary');
  const position=ref.includes('OpeningCliches')?'opening':ref.includes('ClosingPleasantries')?'closing':undefined;
  if(!/[\\[\]{}()|?+*^$]/.test(value))add('phrase',value,category,origin.priorWeight,[origin],position);
  else{const finite=expandFinite(value);if(finite)for(const v of finite)add('phrase',v,category,origin.priorWeight,[origin],position);else try{if(/^regex-time/.test(reason))throw Error(reason);add('pattern',boundRegex(value),category,origin.priorWeight,[origin],position);}catch(e){skipped.push({ref,reason:'regex-safety:'+e.message});}}
 }
 // All mined lexical candidates survive; replace their expensive positional
 // lookbehind with the shared precompiled literal pass and position guard.
 for await(const r of jsonl(resolve(ROOT,'data/eval/raw/hillclimb/mined-candidates.jsonl'))){const prior=Math.min(6,Math.max(.5,Math.log1p(r.stats?.train?.ratio??1)));add('phrase',r.ngram,r.suggestedCategory??'template-phrases',prior,[{source:'mined',ref:r.id,priorWeight:prior,artifact:/assistant|preamble|chatbot/i.test(r.nameableReason??'')}],r.miningPosition?.startsWith('first')?'opening':r.miningPosition?.startsWith('last')?'closing':undefined);}
 const entries=[...map.values()].sort((a,b)=>a.id.localeCompare(b.id));save(resolve(OUT,'dictionary-entries.json'),entries);save(resolve(OUT,'dictionary-exclusions.json'),skipped);
 const rules=entries.map(({origins,curatorGun,vocabulary,book,oldStats,...r})=>r);
 writeFileSync(resolve(ROOT,'src/lib/engine/packs/dictionaries/index.ts'),`// Generated offline by eval/v2/dictionaries.mjs; modified from pinned sources.\n// MIT: ZeroSlop, vale-ai-tells, slop-radar, Paech essays, Kobak.\n// Apache-2.0: Paech sampler (normalization, restored literals, bounded regexes).\n// Full credits/licenses: THIRD_PARTY_NOTICES.md and data/dictionaries/*/LICENSE.\nimport type { RulePack } from '../../rule-types';\nexport const dictionaries: RulePack = {id:'dictionaries', name:'Curated low-effort tells', description:'Entry-level calibrated dictionaries; words alone cannot accuse.', attribution:'See THIRD_PARTY_NOTICES.md; dictionary provenance in eval/v2/dictionary-entries.json.',rules:${JSON.stringify(rules)}};\n`);
 console.log({entries:entries.length,literals:entries.filter(r=>r.phrases).length,regexes:entries.filter(r=>r.patterns).length,skipped:skipped.length,curatorGun:entries.filter(r=>r.curatorGun).length,books:entries.filter(r=>r.book?.ratePerMillionTokens!=null).length});
}finally{await s.close();}
