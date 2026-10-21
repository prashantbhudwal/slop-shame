import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, cpSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { createServer } from 'vite';
export const ROOT=resolve(import.meta.dirname,'../..');
export const CACHE=resolve(ROOT,'data/eval/raw/hillclimb');
export const OUT=resolve(ROOT,'eval/hillclimb');
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const json=p=>JSON.parse(readFileSync(p,'utf8'));
export const save=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
export async function* jsonl(file) { const reader=createInterface({input:createReadStream(file),crlfDelay:Infinity}); for await(const line of reader) if(line.trim()) yield JSON.parse(line); }
export function snapshot() {
  const path=resolve(CACHE,'engine-base');
  if(!existsSync(path)) { cpSync(resolve(ROOT,'src/lib/engine'),path,{recursive:true}); }
  const files=[]; const visit=p=>{for(const e of readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {const f=resolve(p,e.name); if(e.isDirectory())visit(f);else if(e.name.endsWith('.ts'))files.push([relative(path,f),hash(readFileSync(f))]);}};visit(path);
  const sha256=hash(JSON.stringify(files));
  if(existsSync(resolve(CACHE,'engine.json')) && json(resolve(CACHE,'engine.json')).sha256!==sha256)throw Error('Immutable snapshot modified');
  save(resolve(CACHE,'engine.json'),{sha256,files,node:process.version});
  return path;
}
export async function loader() { const s=await createServer({root:ROOT,configFile:false,server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'}); return {load:p=>s.ssrLoadModule(p),close:()=>s.close()}; }
export function groupMetrics(rows) {
  const human=rows.filter(r=>r.label==='human'), ai=rows.filter(r=>r.label==='ai' && r.family!=='base');
  const base=rows.filter(r=>r.family==='base');
  const fp=human.filter(r=>r.score>=40).length, shame=human.filter(r=>r.shameable).length;
  const rate=(a,n)=>n?a/n:null;
  // Mann-Whitney with ties, on the non-thresholded public score.
  const bins=Array.from({length:101},()=>[0,0]);for(const r of [...human,...ai])bins[r.score][r.label==='human'?0:1]++;
  let lower=0,wins=0;for(const [h,a] of bins){wins+=a*(lower+h/2);lower+=h;}
  return {human:human.length,fp,fpRate:rate(fp,human.length),shameFP:shame,ai:ai.length,
    tp40:ai.filter(r=>r.score>=40).length,recall40:rate(ai.filter(r=>r.score>=40).length,ai.length),
    tp60:ai.filter(r=>r.score>=60).length,recall60:rate(ai.filter(r=>r.score>=60).length,ai.length),
    auroc:human.length&&ai.length?wins/(human.length*ai.length):null,
    base:base.length,baseRecall40:rate(base.filter(r=>r.score>=40).length,base.length),
    hardHuman:human.filter(r=>r.subset==='formal'||r.subset==='non-native').length,
    hardFP:human.filter(r=>(r.subset==='formal'||r.subset==='non-native')&&r.score>=40).length};
}
export function metrics(rows) {
 const result={overall:groupMetrics(rows)};
 for(const field of ['domain','model','length','decoding','repetition_penalty','subset','source']) {
   const groups=new Map();for(const r of rows) {const v=field==='length'?(r.words<80?'30–79':r.words<150?'80–149':r.words<300?'150–299':'300–600'):r[field]||'n/a';if(!groups.has(v))groups.set(v,[]);groups.get(v).push(r);}
   result[field]=Object.fromEntries([...groups].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,groupMetrics(v)]));
 }
 const recall=Object.values(result.domain).map(x=>x.recall40).filter(x=>x!==null);result.macroRecall40=recall.length?recall.reduce((a,b)=>a+b,0)/recall.length:null;
 return result;
}
export function gates(m,b) {return m.overall.fpRate<=Math.max(b.overall.fpRate,.01)+1e-12 && Object.values(m.domain).every(v=>v.human<200||v.fpRate<=.025+1e-12) && m.overall.shameFP<=b.overall.shameFP;}
