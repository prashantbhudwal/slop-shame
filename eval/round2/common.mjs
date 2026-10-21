import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, createReadStream } from 'node:fs';
import { resolve, relative } from 'node:path';
import { loader, metrics } from '../hillclimb/common.mjs';
export { loader, metrics };
// JSONL is delimited by LF. Node 26 readline also breaks on a literal U+2028
// inside a valid JSON string; that would corrupt some LinkedIn cache rows.
export async function* jsonl(file) {
  let pending='';
  for await(const chunk of createReadStream(file,{encoding:'utf8'})) {
    pending+=chunk;let start=0,end;
    while((end=pending.indexOf('\n',start))>=0) {const line=pending.slice(start,end);if(line.trim())yield JSON.parse(line);start=end+1;}
    pending=pending.slice(start);
  }
  if(pending.trim())yield JSON.parse(pending);
}
export const ROOT = resolve(import.meta.dirname, '../..');
export const CACHE = resolve(ROOT, 'data/eval/raw/round2');
export const OUT = resolve(ROOT, 'eval/round2');
export const hash = x => createHash('sha256').update(x).digest('hex');
export const json = p => JSON.parse(readFileSync(p, 'utf8'));
export const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n');
export const tunePrompt = id => parseInt(hash('target-v1:' + id).slice(0, 8), 16) % 10 < 6;
export function digest(path) {
  const files = [];
  function visit(p) { for (const e of readdirSync(p, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const f = resolve(p,e.name); if(e.isDirectory()) visit(f); else if(e.name.endsWith('.ts')) files.push([relative(path,f),hash(readFileSync(f))]);
  }} visit(path); return hash(JSON.stringify(files));
}
export async function datasets({final = false, train = false} = {}) {
  const sets = {};
  const panel = json(resolve(ROOT,'data/eval/raw/judge/panel-labels.json'));
  sets.targetTune = []; if(final) sets.targetHoldout = [];
  for(const set of ['loweffort','realprompts']) {
    const dir = resolve(ROOT, 'data/eval/generated/linkedin-ai-' + set);
    for(const file of readdirSync(dir).filter(f=>f.endsWith('.jsonl')).sort()) for await(const r of jsonl(resolve(dir,file))) {
      const tune = tunePrompt(r.promptId); if(!tune && !final) continue;
      const id = `linkedin-ai-${set}/${file}#${r.promptId}`;
      const label = panel[id]; if(!label) throw Error('Missing panel label: '+id);
      sets[tune?'targetTune':'targetHoldout'].push({...r,id,label:'ai',set,smell:label.smell,model:file.slice(0,-6)});
    }
  }
  sets.raidDev=[];
  for await(const r of jsonl(resolve(ROOT,'data/eval/raw/hillclimb/dev.jsonl'))) if(r.family!=='base') sets.raidDev.push(r);
  if(train) { sets.raidTrain=[]; for await(const r of jsonl(resolve(ROOT,'data/eval/raw/hillclimb/train.jsonl'))) if(r.family!=='base') sets.raidTrain.push(r); }
  sets.permissive=[];
  for(const name of ['plos','official-releases','uci-reviews']) for await(const r of jsonl(resolve(ROOT,`data/eval/samples/${name}.jsonl`))) sets.permissive.push(r);
  sets.linkedinVeto=[]; if(final) sets.linkedinHoldout=[];
  const authors = json(resolve(ROOT,'data/eval/raw/normalized/linkedin-influencers-split.json')).authors;
  for await(const r of jsonl(resolve(ROOT,'data/eval/raw/normalized/linkedin-influencers.jsonl'))) {
    const split = authors[r.author]; if(split==='veto') sets.linkedinVeto.push(r); else if(final && split==='holdout') sets.linkedinHoldout.push(r);
  }
  sets.polished=[];
  const polished=resolve(ROOT,'data/eval/raw/polished');
  if(existsSync(polished)) for(const f of readdirSync(polished).filter(f=>f.endsWith('.jsonl')).sort()) {
    const seen=new Set();
    for await(const r of jsonl(resolve(polished,f))) {if(seen.has(r.id))continue;seen.add(r.id);sets.polished.push({...r,id:`${f}#${r.id}`,label:'human'});}
  }
  if(final) {
    sets.fresh=[]; const freshDir=resolve(ROOT,'data/eval/generated/linkedin-ai-fresh');
    for(const f of readdirSync(freshDir).filter(f=>f.endsWith('.jsonl')).sort())for await(const r of jsonl(resolve(freshDir,f)))sets.fresh.push({...r,id:`${f}#${r.promptId}`,label:'ai',model:f.slice(0,-6)});
    sets.raidTest=[]; for await(const r of jsonl(resolve(ROOT,'data/eval/raw/hillclimb/test.jsonl'))) if(r.family!=='base') sets.raidTest.push(r);
    const {loadCorpus}=await import('../lib/corpus.mjs'); const cfg=json(resolve(ROOT,'eval/config.json'));
    sets.external=(await loadCorpus([...cfg.files,...cfg.optionalFiles.filter(existsSync)],cfg)).items;
    sets.detectrlx=[]; for await(const r of jsonl(resolve(ROOT,'data/eval/raw/hillclimb/detectrlx-test.jsonl'))) sets.detectrlx.push(r);
    sets.effortful=[]; const dir=resolve(ROOT,'data/eval/generated/linkedin-ai');
    for(const f of readdirSync(dir).filter(f=>f.endsWith('.jsonl')).sort()) for await(const r of jsonl(resolve(dir,f))) sets.effortful.push({...r,id:`${f}#${r.promptId}`,label:'ai',model:f.slice(0,-6)});
  }
  return sets;
}
export function summarize(rows) {
  const normalized=rows.map(r=>({...r,domain:r.domain||r.original_domain||r.genre,model:r.model||r.generator||'unknown'}));
  const result=metrics(normalized);
  for(const field of ['smell','set','mode','slopClass']) result[field]=Object.fromEntries([...new Set(normalized.map(r=>r[field]).filter(Boolean))].sort().map(k=>[k,metrics(normalized.filter(r=>r[field]===k)).overall]));
  result.modelSmell=Object.fromEntries([...new Set(normalized.map(r=>r.model))].sort().map(k=>[k,Object.fromEntries(['obvious','some','none'].map(smell=>[smell,metrics(normalized.filter(r=>r.model===k&&r.smell===smell)).overall]))]));
  return result;
}
