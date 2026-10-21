# Continue the identical optimizer/objective; no extra candidate selection.
exec(open(__file__.replace('converge.py','fit.py')).read().split('# Two predeclared')[0])
previous=json.load(open(OUT/'fit.json'));seed=np.r_[[previous['weights'][s] for s in ids],np.array(previous['sourceWeights'])*scale,previous['bias']]
fit=train(np.ones(n,dtype=bool),previous['chosenStrength'],initial=seed,maxiter=4000)
for j,s in enumerate(ids):table[s]['weight']=float(fit.x[j])
(ROOT/'src/lib/engine/scorecard.ts').write_text('// Generated offline by eval/v2; no post text.\nimport type { EvidenceRule } from \'./scorecard-schema\';\nexport const THRESHOLD = 2.5;\nexport const SCORECARD: Readonly<Record<string,EvidenceRule>> = '+json.dumps(table,separators=(',',':'))+';\n')
previous.update({'success':bool(fit.success),'message':str(fit.message),'continuationIterations':fit.nit,'loss':float(fit.fun),'maxGradient':float(np.max(np.abs(fit.jac))),'sourceWeights':(fit.x[p:p+q]/scale).tolist(),'bias':float(fit.x[-1]),'weights':{s:table[s]['weight'] for s in ids}})
json.dump(previous,open(OUT/'fit.json','w'),indent=2);print({k:previous[k] for k in ['success','message','continuationIterations','loss']},flush=True)
