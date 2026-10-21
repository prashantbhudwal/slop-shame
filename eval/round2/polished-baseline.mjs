// Development negatives arrived during the first baseline pass. Complete
// these with the immutable baseline; no locked target/human/test set is read.
import {resolve} from 'node:path';
import {readdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {CACHE,OUT,ROOT,loader,jsonl,hash,save,summarize}from'./common.mjs';
const output=resolve(CACHE,'baseline-polished-complete.jsonl');
if(existsSync(output))throw Error('Complete polished baseline already exists');
const rows=[],receipts=[];
for(const file of readdirSync(resolve(ROOT,'data/eval/raw/polished')).filter(f=>f.endsWith('.jsonl')).sort()) {
 const path=resolve(ROOT,'data/eval/raw/polished',file),seen=new Set();let total=0,duplicates=0;
 for await(const r of jsonl(path)){total++;if(seen.has(r.id)){duplicates++;continue;}seen.add(r.id);rows.push({...r,id:`${file}#${r.id}`,label:'human'});}
 receipts.push({file,sha256:hash(readFileSync(path)),total,duplicates,kept:seen.size});
}
const s=await loader();try{
 const {analyzePost}=await s.load(resolve(CACHE,'engine-base/index.ts'));
 const predictions=rows.map(({text,...meta})=>{const r=analyzePost({text});return {...meta,score:r.score,shameable:r.shameable,signals:r.signals};});
 writeFileSync(output,predictions.map(r=>JSON.stringify(r)).join('\n')+'\n');
 save(resolve(OUT,'baseline-polished-complete.json'),{receipts,metrics:summarize(predictions)});
 console.log(receipts, summarize(predictions).mode);
}finally{await s.close();}
