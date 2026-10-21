import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {ROOT,CACHE,OUT,json,jsonl,save,loader} from './common.mjs';
const s=await loader();try{
 const {buildContext}=await s.load(resolve(ROOT,'src/lib/engine/context.ts'));
 const {evidenceUnits,humanExpectation}=await s.load(resolve(ROOT,'src/lib/engine/score.ts'));
 const names=Object.keys(json(resolve(OUT,'data-roles.json')).totals),totals={};
 for(const name of names){let body='',n=0;for await(const r of jsonl(resolve(CACHE,`raw-${name}.jsonl`))){const ctx=buildContext({text:r.text});const units=evidenceUnits(r.signals,ctx,r.evidence);const features=units.map(u=>[u.signal.ruleId,u.count,Math.max(0,Math.log1p(u.count)-Math.log1p(humanExpectation(u.model,ctx.wordCount))),u.kind]);body+=JSON.stringify({id:r.id,promptId:r.promptId,source_id:r.source_id,label:r.label,smell:r.smell,source:r.source,domain:r.domain,words:ctx.wordCount,features})+'\n';n++;}writeFileSync(resolve(CACHE,`features-${name}.jsonl`),body);totals[name]=n;console.log(name,n);}
 save(resolve(OUT,'feature-totals.json'),totals);
}finally{await s.close();}
