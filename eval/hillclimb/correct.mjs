// Exactly one permitted correction. No examples or W&I/AESLC results are read.
// Policy change: choose the highest-recall already-tried configuration with ZERO
// RAID-dev human FP, after first final failed on public PLOS/Federal Reserve.
import { readFileSync,existsSync,copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CACHE,OUT,json,save } from './common.mjs';
const audit=resolve(OUT,'correction.json');
if(existsSync(audit))throw Error('The single corrective selection has already been used');
const before=json(resolve(CACHE,'best.json')),entries=json(resolve(CACHE,'entries.json'));
const runs=readFileSync(resolve(OUT,'runs.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.entriesSha256===before.entriesSha256&&r.passed&&r.metrics.overall.fp===0);
runs.sort((a,b)=>b.metrics.macroRecall40-a.metrics.macroRecall40||a.id.localeCompare(b.id));
const chosen=runs[0],fits=json(resolve(CACHE,'fits.json'));if(!chosen)throw Error('No zero-FP tried candidate');
const fit=fits.configs.find(f=>chosen.id.includes(f.id+'-scale'));
const weights=entries.map((r,j)=>{
 if(r.evidence==='fingerprint'&&!r.id.startsWith('measured.'))return r.weight;
 const orig=!r.id.startsWith('measured.');
 const w=Math.min(chosen.cap,fit.weights[j]*chosen.scale)+(orig?chosen.firstPartyMix*r.weight:0);
 return Math.round(w*(orig&&(r.evidence==='style'||['formatting','robotic-rhythm','bypass-tricks'].includes(r.category))?chosen.styleScale:1)*1000)/1000;
});
copyFileSync(resolve(CACHE,'best.json'),resolve(CACHE,'initial-best.json'));
copyFileSync(resolve(OUT,'proposal.json'),resolve(OUT,'initial-proposal.json'));
for(const name of ['performance','validation'])if(existsSync(resolve(OUT,name+'.json')))copyFileSync(resolve(OUT,name+'.json'),resolve(OUT,'initial-'+name+'.json'));
const best={...chosen,fitId:fit.id,weights,engineSha256:before.engineSha256,prior:fits.prior};
save(resolve(CACHE,'best.json'),best);save(resolve(OUT,'best-dev.json'),{...best,weights:undefined});
save(audit,{usedExternalForSelection:true,numberOfCorrectiveSelections:1,reason:'Initial final failed on public PLOS and Federal Reserve controls. Replace dev budget by zero observed human false positives; maximize dev recall among configurations already logged. No new fit, entry filtering or threshold sweep on any external data.',selectionInputs:['existing RAID-dev runs','PLOS aggregate first-final FP','Federal Reserve aggregate first-final FP'],restrictedSourcesUsedForSelection:false,initial:before.id,corrected:best.id,lockedTest:'One baseline, initial final, and this single explicitly permitted corrective final. No test data during climb; no further corrective selection.'});
console.log('Single correction:',best.id,JSON.stringify(best.metrics.overall));
