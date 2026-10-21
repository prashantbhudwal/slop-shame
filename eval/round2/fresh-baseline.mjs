// Newly supplied, final-only fresh prompts. Baseline once; never tune on them.
import{resolve}from'node:path';
import{readdirSync,existsSync,writeFileSync}from'node:fs';
import{ROOT,CACHE,OUT,loader,jsonl,save,summarize}from'./common.mjs';
const receipt=resolve(CACHE,'lock-baseline-fresh.json');if(existsSync(receipt))throw Error('Fresh baseline already started');
save(receipt,{started:new Date().toISOString()});
const s=await loader();try{
 const {analyzePost}=await s.load(resolve(CACHE,'engine-base/index.ts')),rows=[];
 const dir=resolve(ROOT,'data/eval/generated/linkedin-ai-fresh');
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.jsonl')).sort())for await(const {text,...meta}of jsonl(resolve(dir,file))){const r=analyzePost({text});rows.push({...meta,id:`${file}#${meta.promptId}`,label:'ai',model:file.slice(0,-6),score:r.score,shameable:r.shameable,signals:r.signals});}
 writeFileSync(resolve(CACHE,'baseline-fresh.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 save(resolve(OUT,'baseline-fresh.json'),summarize(rows));save(receipt,{completed:new Date().toISOString(),count:rows.length});console.log(summarize(rows).overall);
}finally{await s.close();}
