// Extract shipped matcher counts on fitting data only. All text stays ignored.
import {resolve} from 'node:path';
import {cpSync,readFileSync,writeFileSync} from 'node:fs';
import {ROOT,CACHE,OUT,loader,save,digest,engine,target,polished,humans,permissive,windows,hash,linkedin,wayback} from './common.mjs';
const scratch=resolve(CACHE,'feature-engine');cpSync(engine,scratch,{recursive:true});
const p=resolve(scratch,'index.ts');writeFileSync(p,'// @ts-nocheck -- offline extraction only\n'+readFileSync(p,'utf8').replace('if (!ctx.wordCount) return scoreSignals([], ctx, []);','if (!ctx.wordCount) return {ctx,signals:[],evidence:[]};').replace('return scoreSignals(signals, ctx, evidence);','return {ctx,signals,evidence};'));
const s=await loader();try{
 const {createEngine}=await s.load(p),{packs}=await s.load(resolve(scratch,'packs/index.ts')),{structureOf}=await s.load(resolve(scratch,'context.ts'));
 const e=createEngine(packs),rules=packs.flatMap(p=>p.rules).map(({detect,...r})=>r);save(resolve(OUT,'rules.json'),rules);
 const pol=await polished();
 // Polished source originals may occur in RAID train: remove the entire group.
 const forbidden=new Set([...pol.fit,...pol.audit,...pol.packaging].map(r=>r.source_id));
 const sets={targetTune:await target(),humanFit:(await humans('train')).filter(r=>!forbidden.has(r.id)&&!forbidden.has(r.source_id)).flatMap(windows),permissiveFit:(await permissive()).flatMap(windows),polishedFit:pol.fit.flatMap(windows),raidDev:await humans('dev'),linkedinVeto:await linkedin('veto'),wayback:await wayback()};
 const totals={};for(const [name,rows]of Object.entries(sets)){let body='';for(const row of rows){const {ctx,signals,evidence}=e.analyze({text:row.text});body+=JSON.stringify({...row,wordCount:ctx.wordCount,signals,evidence,protectedSpans:structureOf(ctx).protectedSpans})+'\n';}writeFileSync(resolve(CACHE,`raw-${name}.jsonl`),body);totals[name]=rows.length;console.log(name,rows.length);}
 save(resolve(OUT,'data-roles.json'),{snapshotHash:digest(resolve(CACHE,'engine-r2')),totals,polished:{fit:pol.fit.length,audit:pol.audit.length,fitGroups:new Set(pol.fit.map(r=>r.source_id)).size,auditGroups:new Set(pol.audit.map(r=>r.source_id)).size},excludedPolishedSourceGroups:forbidden.size,linkedIn:'CHECK ONLY: excluded from features, base rates and optimizer. Veto threshold authorized separately.',fitHashes:Object.fromEntries(Object.keys(sets).map(n=>[n,hash(readFileSync(resolve(CACHE,`raw-${n}.jsonl`)))]))});
}finally{await s.close();}
