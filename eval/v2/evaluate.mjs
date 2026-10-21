// One locked release evaluation. Predictions and snippets remain ignored.
import {resolve}from'node:path';import{readFileSync,writeFileSync,existsSync,cpSync}from'node:fs';
import{ROOT,CACHE,OUT,engine,loader,json,save,jsonl,digest,hash,target,polished,humans,linkedin,wayback}from'./common.mjs';
const mode=process.argv[2];if(!['baseline','final'].includes(mode))throw Error('baseline | final');
const path=mode==='baseline'?resolve(CACHE,'engine-r2'):engine;const lock=resolve(CACHE,`lock-${mode}.json`);if(existsSync(lock))throw Error('One-shot evaluation already started');
const codeHash=digest(path);if(mode==='final'&&json(resolve(OUT,'frozen.json')).engineHash!==codeHash)throw Error('Engine changed after freeze');
save(lock,{started:new Date().toISOString(),engineHash:codeHash});
const pol=await polished();const sets={targetHoldout:await target(true),fresh:[],linkedinHoldout:await linkedin('holdout'),wayback:await wayback(),raidTest:await humans('test'),external:[],polishedAudit:pol.audit,effortful:[]};
const {readdirSync}=await import('node:fs');for(const [name,dir]of [['fresh','linkedin-ai-fresh'],['effortful','linkedin-ai']])for(const f of readdirSync(resolve(ROOT,'data/eval/generated',dir)).filter(f=>f.endsWith('.jsonl')).sort())for await(const r of jsonl(resolve(ROOT,'data/eval/generated',dir,f))){const id=`${dir}/${f}#${r.promptId}`;sets[name].push({...r,id,label:'ai',model:f.slice(0,-6)});}
const labels=json(resolve(ROOT,'data/eval/raw/judge/effortful-labels.json'));for(const r of sets.effortful){const label=labels[r.id];if(!label)throw Error('Missing effortful panel label');r.smell=label.smell??label;r.label=r.smell==='obvious'?'ai':'human';}
const{loadCorpus}=await import('../lib/corpus.mjs');const cfg=json(resolve(ROOT,'eval/config.json'));sets.external=(await loadCorpus([...cfg.files,...cfg.optionalFiles.filter(existsSync)],cfg)).items;
const receipts=Object.fromEntries(Object.entries(sets).map(([name,rows])=>[name,{rows:rows.length,sha256:hash(rows.map(r=>JSON.stringify(r)).join('\n'))}]));save(resolve(OUT,`${mode}-inputs.json`),receipts);
const s=await loader();try{
 const module=await s.load(resolve(path,'index.ts'));const variants={main:module.analyzePost};
 if(mode==='final'){
  const {packs}=await s.load(resolve(path,'packs/index.ts')),{SCORECARD}=await s.load(resolve(path,'scorecard.ts'));
  for(const tier of ['all','gun','habit','vocabulary']){const ps=packs.map(p=>({...p,rules:p.rules.filter(r=>p.id!=='dictionaries'||tier!=='all'&&SCORECARD[r.id]?.tier!==tier)}));variants['withoutDictionary-'+tier]=module.createEngine(ps).analyze;}
  const families=[...new Set(Object.values(SCORECARD).filter(r=>!r.gun).map(r=>r.family))].sort();for(const family of families){const ps=packs.map(p=>({...p,rules:p.rules.filter(r=>SCORECARD[r.id]?.family!==family)}));variants['withoutFamily-'+family]=module.createEngine(ps).analyze;}
 }
 const result={engineHash:codeHash,sets:{},variants:Object.keys(variants)};
 for(const[name,rows]of Object.entries(sets)){let body='';const sums=Object.fromEntries(Object.keys(variants).map(v=>[v,{n:0,flags:0,human:0,fp:0,ai:0,tp:0,smell:{}}]));
  for(const row of rows){const reports={};for(const[v,fn]of Object.entries(variants)){const report=fn({text:row.text});reports[v]=report;const m=sums[v];m.n++;m.flags+=report.score>=40;if(row.label==='human'){m.human++;m.fp+=report.score>=40;}else{m.ai++;m.tp+=report.score>=40;}if(row.smell){const sm=m.smell[row.smell]??={n:0,flags:0};sm.n++;sm.flags+=report.score>=40;}}
   const {text,...meta}=row;body+=JSON.stringify({...meta,words:reports.main.wordCount,score:reports.main.score,shameable:reports.main.shameable,signals:reports.main.signals,variantScores:Object.fromEntries(Object.entries(reports).map(([v,r])=>[v,r.score])),...(mode==='final'&&['targetHoldout','fresh','effortful'].includes(name)?{flattened:variants.main({text:text.replace(/\r?\n/g,' ')}).score}:{})})+'\n';}
  writeFileSync(resolve(CACHE,`${mode}-${name}.jsonl`),body);result.sets[name]=sums;console.log(name,sums.main);
 }
 if(digest(path)!==codeHash)throw Error('Engine changed during one-shot scoring');save(resolve(OUT,`${mode}.json`),result);save(lock,{...json(lock),completed:new Date().toISOString()});
}finally{await s.close();}
