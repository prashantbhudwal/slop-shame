import json,pathlib,re,math
import numpy as np
from scipy.stats import beta
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'eval/v2';CACHE=ROOT/'data/eval/raw/v2'
p=ROOT/'src/lib/engine/scorecard.ts';text=p.read_text();table=json.loads(text.split(' = ',2)[2].rstrip(';\n'))
def score(r):
 groups={};habit=set();gun=False;fp=False;phrase=False
 for s,c,phi,kind in r['features']:
  m=table[s]
  if phi<=0 or m['weight']<=0 or m.get('disabled'):continue
  groups[m['family']]=groups.get(m['family'],0)+m['weight']*phi
  gun|=m['gun'];fp|=kind=='fingerprint' and m['gun'];phrase|=kind!='style'
  if not m['gun'] and m['tier']!='vocabulary':habit.add(m['family'])
 E=sum((12 if g.startswith('gun:') else 1.5)*-math.expm1(-v/(12 if g.startswith('gun:') else 1.5)) for g,v in groups.items())
 return E,gun or len(habit)>=2 and phrase,fp
upper=lambda k,n:float(beta.ppf(.95,k+1,n-k)) if k<n else 1.
sets={name:[json.loads(l) for l in open(CACHE/f'features-{name}.jsonl')] for name in ['linkedinVeto','polishedFit','targetTune','raidDev','permissiveFit','wayback']}
n=len(sets['linkedinVeto']);allowed=max(k for k in range(n) if upper(k,n)<=.001)
values={name:[score(r) for r in rows] for name,rows in sets.items()}
veto=sorted([v for v,gate,fp in values['linkedinVeto'] if gate],reverse=True)
tau=max(2.5,(veto[allowed]+1e-8) if len(veto)>allowed else 2.5)
# Too few polished fitting samples can never establish the 2% bound. Preserve
# the split, target zero observed errors and disclose the unattainable bound.
pol=[v for v,g,fp in values['polishedFit'] if g]
if pol:tau=max(tau,max(pol)+1e-8)
results={}
for name,vals in values.items():
 hits=sum(fp or gate and E>=tau for E,gate,fp in vals);results[name]={'n':len(vals),'hits':hits,'upper95':upper(hits,len(vals))}
 if name=='targetTune':results[name]['smell']={k:{'n':sum(r.get('smell')==k for r in sets[name]),'hits':sum(r.get('smell')==k and (fp or gate and E>=tau) for r,(E,gate,fp) in zip(sets[name],vals))} for k in ['obvious','some','none']}
p.write_text(re.sub(r'export const THRESHOLD = [^;]+;',f'export const THRESHOLD = {tau!r};',text))
result={'threshold':tau,'minThreshold':2.5,'habitCap':1.5,'habitCapFraction':1.5/tau,'allowedLinkedinHits':allowed,'linkedInTargetUpper95':.001,'polishedTargetUpper95':.02,'polishedSampleSizeSufficient':upper(0,len(sets['polishedFit']))<=.02,'results':results,'policy':'Smallest threshold >=2.5 satisfying pointwise CP95 veto criterion; no repeated veto optimization. Polished training half empirical zero safeguard; bound infeasible at n=80.'}
json.dump(result,open(OUT/'threshold.json','w'),indent=2);print(json.dumps(result,indent=2))
