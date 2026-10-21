#!/usr/bin/env node
// Serial checkpoint runner. It never unlocks or overwrites one-shot evaluations.
import { existsSync,appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CACHE,OUT,ROOT,json } from './common.mjs';
const args=process.argv.slice(2);
if(args.some(x=>!['--allow-correction','--help'].includes(x)))throw Error('Usage: node eval/hillclimb/run.mjs [--allow-correction]');
if(args.includes('--help')){console.log('Resume one offline experiment. --allow-correction permits one existing zero-dev-FP configuration to replace an initial final that fails public PLOS/Federal Reserve controls. Never removes locks.');process.exit(0);}
const env={...process.env,OMP_NUM_THREADS:'2',OPENBLAS_NUM_THREADS:'2',VECLIB_MAXIMUM_THREADS:'2'};
function run(command,argv) {appendFileSync(resolve(OUT,'PROGRESS.md'),`\n${new Date().toISOString()}: running ${command} ${argv.join(' ')}.\n`);const r=spawnSync(command,argv,{cwd:ROOT,env,stdio:'inherit'});if(r.status!==0)throw Error(`${command} failed (${r.status}): ${r.error||''}`);}
const py=name=>run('python3',[`eval/hillclimb/${name}.py`]),node=(name,...options)=>run('node',[`eval/hillclimb/${name}.mjs`,...options]);
if(!existsSync(resolve(CACHE,'splits.json')))py('prepare');
if(['dev','test','external'].some(s=>!existsSync(resolve(CACHE,`baseline-${s}.jsonl`))))node('baseline');
if(!existsSync(resolve(CACHE,'features-train.jsonl'))||!existsSync(resolve(CACHE,'features-dev.jsonl')))node('features','--legacy-separator');
if(!existsSync(resolve(CACHE,'fits.json')))py('fit');
if(!existsSync(resolve(CACHE,'climb-complete.json'))&&!existsSync(resolve(OUT,'correction.json')))node('climb');
if(!existsSync(resolve(OUT,'proposal.json')))node('proposal');
if(['dev','test','external'].some(s=>!existsSync(resolve(CACHE,`final-${s}.jsonl`))))node('final');
if(!existsSync(resolve(OUT,'correction.json'))&&args.includes('--allow-correction')) {
 const base=json(resolve(OUT,'baseline-external.json')),first=json(resolve(OUT,'final-external.json'));
 // This decision reads only permissive public controls; restricted-source outputs
 // never affect the corrective selection or the new zero-dev-FP criterion.
 if(['plos-2020','federal-reserve'].some(k=>(first.source[k]?.fp||0)>(base.source[k]?.fp||0))) {node('correct');node('proposal');}
}
if(existsSync(resolve(OUT,'correction.json'))&&['dev','test','external'].some(s=>!existsSync(resolve(CACHE,`corrected-${s}.jsonl`))))node('final','--correction');
if(!existsSync(resolve(OUT,'performance.json')))run('node',['--expose-gc','eval/hillclimb/benchmark.mjs']);
if(!existsSync(resolve(OUT,'validation.json')))py('validate');
if(!existsSync(resolve(OUT,'dev-contributions.json')))node('diagnostics');
if(existsSync(resolve(CACHE,'corrected-test.jsonl')))py('report');
console.log('Checkpoints complete. Read eval/hillclimb/REPORT.md and VALIDATION.md. No proposal was activated.');
