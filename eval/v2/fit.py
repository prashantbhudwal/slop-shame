"""MAP scorecard; sparse constrained logistic fitting, no LinkedIn inputs.
Dictionary habits: w_j = prior_j * a_(family,source) + delta_j. The deviation
penalty is 100x stronger than the source penalty. Guns have individual priors.
"""
import os
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','VECLIB_MAXIMUM_THREADS','NUMEXPR_NUM_THREADS']:os.environ[k]='4'
import json,pathlib,hashlib,time
import numpy as np
from scipy.sparse import coo_matrix,csr_matrix
from scipy.optimize import minimize
from scipy.special import expit
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'eval/v2';CACHE=ROOT/'data/eval/raw/v2'
meta=json.load(open(OUT/'entry-evidence.json'))['entries'];rules={r['id']:r for r in json.load(open(OUT/'rules.json'))}
ids=[r['id'] for r in meta];ix={s:i for i,s in enumerate(ids)};p=len(ids)
text=(ROOT/'src/lib/engine/scorecard.ts').read_text();table=json.loads(text.split(' = ',2)[2].rstrip(';\n'))
families=sorted({table[s]['family'] for s in ids});fi={s:i for i,s in enumerate(families)};fcol=np.array([fi[table[s]['family']] for s in ids]);caps=np.array([12 if s.startswith('gun:') else 1.5 for s in families])
prior=np.array([r['prior'] for r in meta]);fixed=np.array([r['fixed'] for r in meta]);isdict=np.array([r['dictionary'] and r['tier']!='gun' for r in meta]);gun=np.array([r['tier']=='gun' for r in meta]);vocab=np.array([r['tier']=='vocabulary' for r in meta])
groups=sorted({(table[r['id']]['family'],r['source']) for r in meta if r['dictionary'] and r['tier']!='gun'});gi={g:i for i,g in enumerate(groups)}
gcol=np.array([gi.get((table[r['id']]['family'],r['source']),0) for r in meta]);q=len(groups)
scale=np.sqrt(np.bincount(gcol,weights=prior**2*isdict,minlength=q)+1)
rows=[];names=[]
for name in ['targetTune','humanFit','permissiveFit','polishedFit']:
 for l in open(CACHE/f'features-{name}.jsonl'):rows.append(json.loads(l));names.append(name)
n=len(rows);names=np.array(names);y=np.array([1 if r.get('smell')=='obvious' else .5 if r.get('smell')=='some' else 0 for r in rows]);pos=names=='targetTune'
rr=[];cc=[];vv=[];eligible=np.zeros(n,dtype=bool)
for i,r in enumerate(rows):
 witness=set();hasgun=False
 for s,count,phi,kind in r['features']:
  if phi<=0:continue
  j=ix[s];rr.append(i);cc.append(j);vv.append(phi)
  hasgun|=gun[j]
  if not vocab[j] and not gun[j] and kind!='style':witness.add(table[s]['family'])
 eligible[i]=hasgun or len(witness)>=2
X=csr_matrix((vv,(rr,cc)),shape=(n,p));XC=X.tocoo();rf=XC.row*len(families)+fcol[XC.col]
# Target-length reweighting uses target tune only (no LinkedIn distribution).
bucket=lambda w:0 if w<100 else 1 if w<250 else 2
b=np.array([bucket(r['words']) for r in rows]);pt=np.bincount(b[pos],minlength=3)+.5;pt/=pt.sum();ht=np.bincount(b[~pos],minlength=3)+.5;ht/=ht.sum();rw=np.minimum(5,np.sqrt(pt[b]/ht[b]))
a=np.ones(n);a[~pos]=rw[~pos];a[names=='polishedFit']*=5
# False positives cost eight times all target rows combined; polished rows
# have five times their otherwise-identical negative weight.
a[~pos]*=8*pos.sum()/a[~pos].sum();a/=a.sum()
# Folds group prompt variants and human originals. No generation/model holdout
# is falsely claimed; report leave-one-generator-out as unperformed.
def fold(r):
 key=r.get('promptId') or r.get('source_id') or r['id'];return int(hashlib.sha256(('v2-cv:'+key).encode()).hexdigest()[:8],16)%5
folds=np.array([fold(r) for r in rows]);
G=csr_matrix((np.ones(p),(np.arange(p),fcol)),shape=(p,len(families)))
bounds=[]
for j,r in enumerate(meta):
 if fixed[j]:bounds.append((prior[j],prior[j]))
 elif gun[j]:bounds.append((6,max(12,prior[j]*2)))
 elif vocab[j]:bounds.append((.000001,.5))
 else:bounds.append((.000001,max(6,prior[j]*4)))
bounds += [(.025*v,3*v) for v in scale] + [(-8,-.2)]
initial=np.r_[prior,scale.copy(),-2.5]
start=time.monotonic();runs=[]
def train(mask,strength,initial=initial,maxiter=220):
 aa=a*mask;aa/=aa.sum()
 def loss(t):
  w=t[:p];src=t[p:p+q]/scale;bias=t[-1]
  raw=np.asarray(X.multiply(w).dot(G).todense());decay=np.exp(-raw/caps);E=caps*(1-decay);z=bias+E.sum(axis=1)
  ce=np.logaddexp(0,z)-y*z;hinge=np.maximum(0,E.sum(axis=1)-2.)*(~pos)
  value=np.sum(aa*(ce+1.5*hinge**2))
  dz=aa*(expit(z)-y+3*hinge)
  grad=np.bincount(XC.col,weights=XC.data*(dz[:,None]*decay).ravel()[rf],minlength=p)
  # MAP toward the shipped first-party coefficients; vocabulary never grows
  # enough to be a witness. Hierarchical dictionary deviations shrink hard.
  delta=w-prior*src[gcol];d=2*strength*delta*isdict
  value+=strength*np.sum(delta[isdict]**2)+.01*np.sum((src-.5)**2)
  grad+=d;sg=-np.bincount(gcol,weights=d*prior,minlength=q)+.02*(src-.5)
  own=~isdict;own_delta=w-prior;value+=.025*strength*np.sum(own_delta[own]**2);grad+=.05*strength*own_delta*own
  return value,np.r_[grad,sg/scale,np.sum(aa*(expit(z)-y))]
 return minimize(loss,initial,jac=True,bounds=bounds,method='L-BFGS-B',options={'maxiter':maxiter,'ftol':1e-8,'gtol':1e-4,'maxcor':12})
# Two predeclared shrinkage settings; five prompt/source-grouped folds.
for strength in [1.,4.]:
 losses=[]
 for f in range(5):
  fit=train(folds!=f,strength,maxiter=140);w=fit.x[:p];raw=np.asarray(X.multiply(w).dot(G).todense());z=fit.x[-1]+(caps*(1-np.exp(-raw/caps))).sum(axis=1);mask=folds==f;losses.append(float(np.sum(a[mask]*(np.logaddexp(0,z[mask])-y[mask]*z[mask]))/a[mask].sum()))
  print('cv',strength,f,round(losses[-1],6),fit.nit,flush=True)
 runs.append({'strength':strength,'foldLoss':losses,'meanLoss':float(np.mean(losses))})
best=min(runs,key=lambda r:r['meanLoss'])['strength'];fit=train(np.ones(n,dtype=bool),best,maxiter=2000)
for j,s in enumerate(ids):table[s]['weight']=float(fit.x[j])
(ROOT/'src/lib/engine/scorecard.ts').write_text('// Generated offline by eval/v2; no post text.\nimport type { EvidenceRule } from \'./scorecard-schema\';\nexport const THRESHOLD = 2.5;\nexport const SCORECARD: Readonly<Record<string,EvidenceRule>> = '+json.dumps(table,separators=(',',':'))+';\n')
result={'objective':'FP-weighted capped logistic MAP; source/family hierarchy; nonnegative coefficients','positiveRows':int(pos.sum()),'negatives':int((~pos).sum()),'negativeRelativeWeight':8,'polishedMultiplier':5,'groups':groups,'sourceWeights':(fit.x[p:p+q]/scale).tolist(),'bias':float(fit.x[-1]),'cv':runs,'chosenStrength':best,'success':bool(fit.success),'message':str(fit.message),'iterations':fit.nit,'loss':float(fit.fun),'seconds':time.monotonic()-start,'weights':{s:table[s]['weight'] for s in ids}}
json.dump(result,open(OUT/'fit.json','w'),indent=2);print({k:result[k] for k in ['success','message','iterations','seconds','chosenStrength']},flush=True)
