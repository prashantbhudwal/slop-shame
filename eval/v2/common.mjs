import {resolve} from 'node:path';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {ROOT,loader,jsonl,hash,json,save,digest,tunePrompt} from '../round2/common.mjs';
export {ROOT,loader,jsonl,hash,json,save,digest,tunePrompt};
export const CACHE=resolve(ROOT,'data/eval/raw/v2'),OUT=resolve(ROOT,'eval/v2');
export const engine=resolve(ROOT,'src/lib/engine');
// Group every original and all model variants; no audit sibling in fitting.
export const polishedTune=id=>parseInt(hash('v2-polished:'+id).slice(0,8),16)%2===0;
export function windows(row){
 const words=[...row.text.matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:'[\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu)];
 if(words.length<30)return [];
 if(words.length<=600)return [{...row,words:words.length}];
 const rows=[];for(let a=0;a<words.length;a+=600){let b=Math.min(a+600,words.length);if(b-a<30)break;rows.push({...row,id:row.id+'#w'+a,text:row.text.slice(words[a].index,b===words.length?row.text.length:words[b].index),words:b-a});}return rows;
}
export async function target(final=false){
 const rows=[],panel=json(resolve(ROOT,'data/eval/raw/judge/panel-labels.json'));
 for(const set of ['loweffort','realprompts']){const dir=resolve(ROOT,'data/eval/generated/linkedin-ai-'+set);for(const file of readdirSync(dir).filter(x=>x.endsWith('.jsonl')).sort())for await(const r of jsonl(resolve(dir,file))){if(tunePrompt(r.promptId)===final)continue;const id=`linkedin-ai-${set}/${file}#${r.promptId}`;rows.push({...r,id,label:'ai',smell:panel[id].smell,set,model:file.slice(0,-6)});}}return rows;
}
export async function polished(){
 const fit=[],audit=[],packaging=[];const dir=resolve(ROOT,'data/eval/raw/polished');
 for(const f of readdirSync(dir).filter(x=>x.endsWith('.jsonl')).sort()){const seen=new Set();for await(const r of jsonl(resolve(dir,f))){if(seen.has(r.id))continue;seen.add(r.id);const row={...r,source_id:r.id,id:f+'#'+r.id,label:'human'};if(r.mode==='light')(polishedTune(r.id)?fit:audit).push(row);else packaging.push(row);}}return {fit,audit,packaging};
}
export async function humans(split){const out=[];for await(const r of jsonl(resolve(ROOT,`data/eval/raw/hillclimb/${split}.jsonl`)))if(r.label==='human')out.push(r);return out;}
export async function permissive(){const out=[];for(const n of ['plos','official-releases','uci-reviews'])for await(const r of jsonl(resolve(ROOT,`data/eval/samples/${n}.jsonl`)))if(r.label==='human')out.push(r);return out;}
export async function linkedin(split){const authors=json(resolve(ROOT,'data/eval/raw/normalized/linkedin-influencers-split.json')).authors;const out=[];for await(const r of jsonl(resolve(ROOT,'data/eval/raw/normalized/linkedin-influencers.jsonl')))if(authors[r.author]===split)out.push(r);return out;}
export async function wayback(){const p=resolve(ROOT,'data/eval/raw/normalized/linkedin-wayback.jsonl');return existsSync(p)?Array.fromAsync(jsonl(p)):[];}
