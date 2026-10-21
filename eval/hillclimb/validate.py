#!/usr/bin/env python3
"""Apply proposal to an isolated copy of the dirty tree; always remove it."""
import json,os,shutil,subprocess,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];CACHE=ROOT/'data/eval/raw/hillclimb';OUT=ROOT/'eval/hillclimb'
def ignore(src,names):
    p=Path(src);excluded={'.git','node_modules','.playwright','.output','test-results','playwright-report'}
    if p==ROOT/'data/eval':excluded.add('raw')
    if p==ROOT/'assets-src':excluded.update(['raw','processed'])
    if p==ROOT/'eval':excluded.add('results')
    return set(names)&excluded
scratch=Path(tempfile.mkdtemp(prefix='slop-hillclimb-check-',dir=ROOT.parent))
results={}
try:
    shutil.copytree(ROOT,scratch,dirs_exist_ok=True,ignore=ignore)
    # Use the experiment snapshot, including the owner's dirty first-party engine,
    # rather than silently testing a concurrent edit made after the experiment began.
    shutil.rmtree(scratch/'src/lib/engine')
    shutil.copytree(CACHE/'engine-base',scratch/'src/lib/engine')
    shutil.copytree(ROOT/'src/lib/engine/packs/measured',scratch/'src/lib/engine/packs/measured')
    (scratch/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
    subprocess.run(['git','apply',str(OUT/'proposal.patch')],cwd=scratch,check=True)
    env={**os.environ,'OMP_NUM_THREADS':'2','OPENBLAS_NUM_THREADS':'2','VECLIB_MAXIMUM_THREADS':'2'}
    for name,cmd in [('test',['pnpm','test','--maxWorkers=2']),('check',['pnpm','check'])]:
        start=time.time()
        with (CACHE/f'validation-{name}.log').open('w') as log:
            run=subprocess.run(cmd,cwd=scratch,stdout=log,stderr=subprocess.STDOUT,env=env)
        results[name]={'command':' '.join(cmd),'exitCode':run.returncode,'seconds':time.time()-start,'log':f'data/eval/raw/hillclimb/validation-{name}.log'}
        print(name,results[name],flush=True)
finally:
    shutil.rmtree(scratch)
    results['scratchRemoved']=not scratch.exists()
    (OUT/'validation.json').write_text(json.dumps(results,indent=2)+'\n')
