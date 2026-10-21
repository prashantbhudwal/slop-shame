#!/usr/bin/env python3
"""Train-only conservative likelihood estimates and constrained sparse logistic fits."""
import os
os.environ.setdefault('OMP_NUM_THREADS','2');os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
import collections,json,math,time
from pathlib import Path
import numpy as np
from scipy import sparse,optimize
from scipy.special import expit
ROOT=Path(__file__).resolve().parents[2]; CACHE=ROOT/'data/eval/raw/hillclimb';OUT=ROOT/'eval/hillclimb'
def load_matrix(split,entries):
    path=CACHE/f'{split}-matrix.npz'; meta=CACHE/f'{split}-meta.json'
    if path.exists():return sparse.load_npz(path),json.load(meta.open())
    ii=[];jj=[];rows=[]
    for i,line in enumerate((CACHE/f'features-{split}.jsonl').open()):
        r=json.loads(line);hits=r.pop('hits');rows.append(r)
        for h in hits:
            if h[4]:ii.append(i);jj.append(h[0])
    X=sparse.csr_matrix((np.ones(len(ii)),(ii,jj)),shape=(len(rows),len(entries)),dtype=np.float64)
    sparse.save_npz(path,X);meta.write_text(json.dumps(rows));return X,rows

def main():
    entries=json.load((CACHE/'entries.json').open());X,rows=load_matrix('train',entries);n,p=X.shape
    y=np.array([r['label']=='ai' for r in rows],dtype=float);h=y==0;a=y==1
    domains=sorted(set(r['domain'] for r in rows));models=sorted(set(r['model'] for r in rows if r['label']=='ai'))
    # Equal class/domain, equal observed model/decoding/penalty strata within each class.
    # Sampling without penalty is 6/18 chat strata (one third), never more because of loops.
    # Binary presence limits each document to one feature occurrence.
    strata=collections.Counter((r['label'],r['domain'],r['model'],r['decoding'],r['repetition_penalty']) for r in rows)
    weights=np.array([1/strata[(r['label'],r['domain'],r['model'],r['decoding'],r['repetition_penalty'])] for r in rows])
    for mask in [h,a]:weights[mask]/=weights[mask].sum()*2
    H=np.asarray(X[h].sum(axis=0)).ravel();A=np.asarray(X[a].sum(axis=0)).ravel()
    domain_stats={};model_stats={}
    for d in domains:
        mask=np.array([r['domain']==d for r in rows]);dh=h&mask;da=a&mask
        domain_stats[d]=(int(dh.sum()),int(da.sum()),np.asarray(X[dh].sum(0)).ravel(),np.asarray(X[da].sum(0)).ravel())
    for m in models:
        mask=np.array([r['model']==m for r in rows]);model_stats[m]=(int(mask.sum()),np.asarray(X[mask].sum(0)).ravel())
    priorfile=ROOT/'data/eval/raw/ngram/baseline.jsonl';prior={}
    if priorfile.exists():
        for line in priorfile.open():
            r=json.loads(line)
            if r.get('coverage') in ['exact','upper-bound'] and r.get('ratePerMillionTokens') is not None:prior[r['phrase'].lower()]=r
    # Only a weak, conservative prior (20 equivalent human documents); never lowers observed human prevalence.
    meanlen=float(np.mean([r['words'] for r in rows if r['label']=='human']))
    priorhits=np.zeros(p)
    for j,e in enumerate(entries):
        if len(e.get('phrases',[]))==1 and (r:=prior.get(e['phrases'][0].lower())):priorhits[j]=20*(-math.expm1(-r['ratePerMillionTokens']*meanlen/1e6))
    stats=[]
    for j,e in enumerate(entries):
        positive=0;supported=0;families=0;perdomain={};permodel={}
        for d,(nh,na,hh,aa) in domain_stats.items():
            if hh[j]+aa[j]>=8:
                supported+=1;positive+=((aa[j]+.5)/(na+1)>(hh[j]+.5)/(nh+1))
            perdomain[d]={'human':int(hh[j]),'humanN':nh,'ai':int(aa[j]),'aiN':na}
        for m,(nm,aa) in model_stats.items():
            families+=aa[j]>=5 and (aa[j]+.5)/(nm+1)>(H[j]+.5)/(h.sum()+1)
            permodel[m]={'ai':int(aa[j]),'aiN':nm}
        stats.append({'id':e['id'],'human':int(H[j]),'humanN':int(h.sum()),'ai':int(A[j]),'aiN':int(a.sum()),'positiveDomains':int(positive),'supportedDomains':supported,'positiveModels':int(families),'priorPseudoHits':float(priorhits[j]),'domains':perdomain,'models':permodel})
    (OUT/'entry-stats.json').write_text(json.dumps(stats,separators=(',',':'))+'\n')
    configs=[]
    # Jeffreys-smoothed log-risk ratio; one-sided lower bound via log-rate SE.
    for z in [1.28,1.645,1.96]:
      llr=np.maximum(0,np.log((A+.5)/(a.sum()+1))-np.log((H+.5+priorhits)/(h.sum()+1+20))-z*np.sqrt(1/(A+.5)+1/(H+.5+priorhits)))
      for support in [10,25,50]:
        consistent=np.array([s['ai']>=support and s['positiveModels']>=2 and s['positiveDomains']>=max(1,math.ceil(s['supportedDomains']*.6)) for s in stats])
        w=np.minimum(3,llr)*consistent
        configs.append({'id':f'llr-z{z}-n{support}','method':'llr','z':z,'minSupport':support,'weights':w.tolist()})
    # Nonnegative L1/L2 logistic regression: projected L-BFGS-B, no sklearn/deps shipped.
    # Penalize weights, never intercept. Sparse gradients handle correlated phrases jointly.
    for l1,l2 in [(0.00003,.0001),(.0001,.0001),(.0003,.0003),(.001,.001)]:
        def fun(v):
            beta=v[:-1];z=X@beta+v[-1];loss=np.dot(weights,np.logaddexp(0,z)-y*z)+l1*beta.sum()+.5*l2*np.dot(beta,beta)
            err=weights*(expit(z)-y);g=np.r_[np.asarray(X.T@err).ravel()+l1+l2*beta,err.sum()]
            return loss,g
        start=time.time();fit=optimize.minimize(fun,np.zeros(p+1),jac=True,bounds=[(0,None)]*p+[(None,None)],method='L-BFGS-B',options={'maxiter':300,'ftol':1e-10,'gtol':1e-6,'maxcor':8})
        beta=fit.x[:-1];beta[beta<.01]=0
        # Cross-domain/model evidence consistency also guards sparse logistic selections.
        consistent=np.array([s['ai']>=10 and s['positiveModels']>=2 and s['positiveDomains']>=max(1,math.ceil(s['supportedDomains']*.6)) for s in stats])
        beta*=consistent
        configs.append({'id':f'logistic-l1{l1}-l2{l2}','method':'logistic','l1':l1,'l2':l2,'intercept':float(fit.x[-1]),'converged':bool(fit.success),'message':str(fit.message),'weights':beta.tolist()})
        print(configs[-1]['id'],f'{time.time()-start:.1f}s',int((beta>0).sum()),fit.message,flush=True)
    save={'trainedOn':'RAID train only','prior':{'present':priorfile.exists(),'usablePhrases':len(prior),'featuresWithPrior':int((priorhits>0).sum()),'equivalentHumanDocuments':20,'meanHumanWords':meanlen},'configs':configs}
    (CACHE/'fits.json').write_text(json.dumps(save)+'\n')
    print('fit complete',len(configs),'prior',save['prior'])
if __name__=='__main__':main()
