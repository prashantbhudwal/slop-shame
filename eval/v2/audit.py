import os
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','VECLIB_MAXIMUM_THREADS']:os.environ[k]='4'
import json,pathlib,collections,math
import numpy as np
from scipy.stats import beta
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'eval/v2';CACHE=ROOT/'data/eval/raw/v2'
def load(name):return [json.loads(l) for l in open(CACHE/name)]
def upper(k,n):return float(beta.ppf(.95,k+1,n-k)) if k<n else 1.
def metrics(rows):
 n=len(rows);return {'n':n,**{f'flags{t}':sum(r['score']>=t for r in rows) for t in [25,40,60]},'upper95at40':upper(sum(r['score']>=40 for r in rows),n) if n else None}
def bucket(n):return '<30' if n<30 else '30–99' if n<100 else '100–249' if n<250 else '250–600' if n<=600 else '>600'
def bootstrap(rows):
 if not rows:return None
 groups={}
 for r in rows:
  key=r.get('author') or r.get('promptId') or r.get('source_id') or r['id'];v=groups.setdefault(key,[0,0]);v[0]+=r['score']>=40;v[1]+=1
 a=np.array(list(groups.values()));rng=np.random.default_rng(20261021);rates=[]
 for i in range(1000):v=a[rng.integers(0,len(a),len(a))].sum(axis=0);rates.append(v[0]/v[1])
 return {'groups':len(a),'replicates':1000,'percentile95':[float(x) for x in np.quantile(rates,[.025,.975])]}
names=['targetHoldout','fresh','linkedinHoldout','wayback','raidTest','external','polishedAudit','effortful']
sets={m:{n:load(f'{m}-{n}.jsonl') for n in names} for m in ['baseline','final']}
# label 'human' means slop-negative. In the effortful set those rows are generated
# posts the panel rated none/some smell, so human-top50 mixes provenances.
summary={};tops=[]
for name in names:
 summary[name]={}
 for mode in ['baseline','final']:
  rows=sets[mode][name];human=[r for r in rows if r['label']=='human'];pos=[r for r in rows if r['label']=='ai'];summary[name][mode]={'all':metrics(rows),'human':metrics(human),'ai':metrics(pos),'smell':{v:metrics([r for r in rows if r.get('smell')==v]) for v in ['none','some','obvious']},'byLength':{v:metrics([r for r in human if bucket(r['words'])==v]) for v in ['<30','30–99','100–249','250–600','>600']},'bootstrapHuman':bootstrap(human),'bootstrapAI':bootstrap(pos)}
  if mode=='final':tops.extend({'set':name,'id':r['id'],'score':r['score'],'tells':len(r['signals'])} for r in human)
# Tier and family ablations were predeclared before lock; no retraining or
# threshold changes. Removing a matching rule also recomputes span competition.
ablations={name:{} for name in names}
for name,rows in sets['final'].items():
 variants=list(rows[0]['variantScores']) if rows else []
 for v in variants:
  ablations[name][v]={'all':sum(r['variantScores'][v]>=40 for r in rows),'human':sum(r['label']=='human' and r['variantScores'][v]>=40 for r in rows),'obvious':sum(r.get('smell')=='obvious' and r['variantScores'][v]>=40 for r in rows),'none':sum(r.get('smell')=='none' and r['variantScores'][v]>=40 for r in rows)}
flatten={name:{'n':len(sets['final'][name]),'flags':sum(r['score']>=40 for r in sets['final'][name]),'flattenedFlags':sum(r['flattened']>=40 for r in sets['final'][name]),'flagsLost':sum(r['score']>=40 and r['flattened']<40 for r in sets['final'][name]),'flagsGained':sum(r['score']<40 and r['flattened']>=40 for r in sets['final'][name])} for name in ['targetHoldout','fresh','effortful']}
# Rule hit frequencies are counted after protected-example/overlap/bundle and
# exposure filtering, i.e. the tells actually shown by the public API.
rule_stats=collections.defaultdict(lambda:{'targetHits':0,'humanHits':0,'points':0,'targetPoints':0})
positive=sets['final']['targetHoldout']+sets['final']['fresh'];negative=[r for n in ['linkedinHoldout','wayback','raidTest','external','polishedAudit'] for r in sets['final'][n] if r['label']=='human']
for group,rows in [('target',positive),('human',negative)]:
 for r in rows:
  for tell in r['signals']:
   m=rule_stats[tell['ruleId']];m[group+'Hits']+=1;m['points']+=tell['weight'];
   if group=='target':m['targetPoints']+=tell['weight']
entries=json.load(open(OUT/'entry-table.json'));rules=json.load(open(OUT/'rules.json'));byid={r['id']:r for r in rules};table=[]
for entry in entries:
 m=rule_stats[entry['id']];hp=m['humanHits']/len(negative);tp=m['targetHits']/len(positive);table.append({**entry,**m,'targetRate':tp,'humanRate':hp,'ratio':tp/hp if hp else None,'meanPointsPerHit':m['points']/(m['targetHits']+m['humanHits']) if m['targetHits']+m['humanHits'] else 0})
topdict=sorted([r for r in table if r['dictionary']],key=lambda r:-r['targetPoints'])[:50]
for r in topdict:r['matcher']=(byid[r['id']].get('phrases') or byid[r['id']].get('patterns'))[0]
# Partial ROC area for the panel-obvious holdout against independent LinkedIn.
pauc={}
for mode in ['baseline','final']:
 h=sets[mode]['linkedinHoldout'];a=[r for r in sets[mode]['targetHoldout'] if r['smell']=='obvious'];points=[(0.,0.)]
 for t in range(100,-1,-1):points.append((sum(r['score']>=t for r in h)/len(h),sum(r['score']>=t for r in a)/len(a)))
 area=0.;x0=y0=0.
 for x,y in points:
  if x>.01:
   yy=y0+(y-y0)*(.01-x0)/(x-x0);area+=(.01-x0)*(yy+y0)/2;break
  area+=(x-x0)*(y+y0)/2;x0,y0=x,y
 pauc[mode]={'rawArea':area,'areaDividedBy0.01':area/.01}
criteria={
 'moreTargetHoldout':summary['targetHoldout']['final']['all']['flags40']>summary['targetHoldout']['baseline']['all']['flags40'],
 'moreFresh':summary['fresh']['final']['all']['flags40']>summary['fresh']['baseline']['all']['flags40'],
 **{'noMoreFP-'+n:summary[n]['final']['human']['flags40']<=summary[n]['baseline']['human']['flags40'] for n in ['linkedinHoldout','wayback','raidTest','external','polishedAudit']},
 'goodAINone':summary['effortful']['final']['smell']['none']['flags40']==0,
 'vetoUpper95':json.load(open(OUT/'threshold.json'))['results']['linkedinVeto']['upper95']<=.001,
 'polishedAuditUpper95':summary['polishedAudit']['final']['human']['upper95at40']<=.02,
 'performance':json.load(open(OUT/'performance.json'))['pass']}
for name,data in [('audit',summary),('ablations',ablations),('flatten',flatten),('per-rule',table),('dictionary-top50',topdict),('human-top50',sorted(tops,key=lambda r:(-r['score'],r['set'],r['id']))[:50]),('partial-auc',pauc),('ship-bar',{'pass':all(criteria.values()),'criteria':criteria})]:json.dump(data,open(OUT/(name+'.json'),'w'),indent=2)
print(json.dumps({'criteria':criteria,'counts':{n:{m:summary[n][m]['all']['flags40'] for m in ['baseline','final']} for n in names}},indent=2))
