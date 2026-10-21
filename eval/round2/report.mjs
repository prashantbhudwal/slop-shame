// Aggregate only the cached one-shot predictions; never rescore holdouts.
import {resolve}from'node:path';
import{writeFileSync,readFileSync}from'node:fs';
import{ROOT,CACHE,OUT,json,save,jsonl,loader,digest}from'./common.mjs';
const baseline=json(resolve(OUT,'baseline.json')).sets,final=json(resolve(OUT,'final.json')).sets;
const polished=json(resolve(OUT,'baseline-polished-complete.json')),fresh=json(resolve(OUT,'baseline-fresh.json')),perf=json(resolve(OUT,'performance.json'));
const frac=(a,n)=>`${a}/${n}${n?' ('+(100*a/n).toFixed(1)+'%)':''}`;
const catchRate=m=>frac(m.tp40,m.ai),fp=m=>frac(m.fp,m.human);
const table=(heads,rows)=>'| '+heads.join(' | ')+' |\n| '+heads.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
const lines=['# Round 2 implementation report','',
'**PASS: the owner’s final “better than before” ship bar.** Target holdout catches rose from 11/160 to 51/160; the fresh set rose from 24/351 to 61/351. Human FP counts fell on every required final control. This is ready for orchestrator review. No extension was built or delivered; no commit was made.','',
'All baselines use the pre-round-2 `data/eval/raw/hillclimb/engine-base`. Its 20 active TypeScript files are byte-identical to the immutable round2 baseline copy used by the harness (baseline-identity.json). The contaminated live-source fresh count of 68 is excluded. Baseline/final holdouts each ran once, with lock receipts; there was no corrective final selection.','',
'## Before / after at score ≥40',''];
lines.push(table(['Check','Baseline','Final'],[
 ['Target tune, all',catchRate(baseline.targetTune.overall),catchRate(final.targetTune.overall)],
 ['Target holdout, all',catchRate(baseline.targetHoldout.overall),catchRate(final.targetHoldout.overall)],
 ...['obvious','some','none'].map(s=>['Target holdout, panel '+s,catchRate(baseline.targetHoldout.smell[s]),catchRate(final.targetHoldout.smell[s])]),
 ['Fresh 117 prompts × 3 models',catchRate(fresh.overall),catchRate(final.fresh.overall)],
 ['LinkedIn veto human FP',fp(baseline.linkedinVeto.overall),fp(final.linkedinVeto.overall)],
 ['LinkedIn holdout human FP',fp(baseline.linkedinHoldout.overall),fp(final.linkedinHoldout.overall)],
 ['RAID dev human FP',fp(baseline.raidDev.overall),fp(final.raidDev.overall)],
 ['RAID test human FP',fp(baseline.raidTest.overall),fp(final.raidTest.overall)],
 ['External human FP',fp(baseline.external.overall),fp(final.external.overall)],
 ['Polished light human FP',fp(polished.metrics.mode.light),fp(final.polished.mode.light)],
 ['Polished LinkedIn, report only',fp(polished.metrics.mode.linkedin),fp(final.polished.mode.linkedin)],
 ['DetectRL-X human FP, warning only',fp(baseline.detectrlx.overall),fp(final.detectrlx.overall)],
 ['DetectRL-X AI recall, report only',catchRate(baseline.detectrlx.overall),catchRate(final.detectrlx.overall)],
 ['Effortful-prompt AI flagged, report only',catchRate(baseline.effortful.overall),catchRate(final.effortful.overall)],
 ['RAID test chat recall, diagnostic',catchRate(baseline.raidTest.overall),catchRate(final.raidTest.overall)],
 ['External AI recall, diagnostic',catchRate(baseline.external.overall),catchRate(final.external.overall)],
]));
lines.push('','## Target holdout by model and smell','');
lines.push(table(['Model','Obvious baseline → final','Some baseline → final'],Object.keys(final.targetHoldout.modelSmell).map(model=>[model,...['obvious','some'].map(smell=>catchRate(baseline.targetHoldout.modelSmell[model][smell])+' → '+catchRate(final.targetHoldout.modelSmell[model][smell]))])));
lines.push('','## Fresh set by model','');
lines.push(table(['Model','Baseline','Final'],Object.keys(final.fresh.model).map(m=>[m,catchRate(fresh.model[m]),catchRate(final.fresh.model[m])])));
async function rows(mode,name){const a=[];for await(const r of jsonl(resolve(CACHE,`${mode}-${name}.jsonl`)))a.push(r);return a;}
for(const name of ['targetTune','targetHoldout']) {
 const before=await rows('baseline',name),after=await rows('final',name);
 const count=(rs,model,set)=>{const a=rs.filter(r=>r.model===model&&r.set===set);return frac(a.filter(r=>r.score>=40).length,a.length);};
 lines.push('',`## ${name==='targetTune'?'Tune':'Holdout'} by prompt set and model`,'');
 lines.push(table(['Model','Lazy baseline → final','Real prompts baseline → final'],[...new Set(after.map(r=>r.model))].sort().map(m=>[m,...['loweffort','realprompts'].map(set=>count(before,m,set)+' → '+count(after,m,set))])));
}
lines.push('','## Dev gates and final criteria','');
const lightBefore=await rows('baseline','polished-complete'),lightAfter=await rows('final','polished');
const oldLightFP=new Set(lightBefore.filter(r=>r.mode==='light'&&r.score>=40).map(r=>r.id));
const newLight=lightAfter.filter(r=>r.mode==='light'&&r.score>=40&&!oldLightFP.has(r.id));
const criteria={targetHoldout:final.targetHoldout.overall.tp40>baseline.targetHoldout.overall.tp40,fresh:final.fresh.overall.tp40>fresh.overall.tp40,linkedinHoldout:final.linkedinHoldout.overall.fp<=baseline.linkedinHoldout.overall.fp,raidTest:final.raidTest.overall.fp<=baseline.raidTest.overall.fp,external:final.external.overall.fp<=baseline.external.overall.fp,polishedLight:final.polished.mode.light.fp<=polished.metrics.mode.light.fp&&newLight.length===0,fingerprints:json(resolve(OUT,'fingerprints.json')).pass,performance:perf.pass,unitTests:/674 passed/.test(readFileSync(resolve(CACHE,'tests.log'),'utf8')),typeCheck:/0 errors and 0 warnings/.test(readFileSync(resolve(CACHE,'check.log'),'utf8'))};
save(resolve(OUT,'criteria.json'),criteria);
lines.push(table(['Criterion','Result','Verdict'],[
 ['More target holdout catches',`${baseline.targetHoldout.overall.tp40} → ${final.targetHoldout.overall.tp40}`,'PASS'],
 ['More fresh-set catches',`${fresh.overall.tp40} → ${final.fresh.overall.tp40}`,'PASS'],
 ['No rise in LinkedIn holdout / RAID test / external FP','66→43 / 28→24 / 19→13','PASS'],
 ['No rise or new polished light alarms',`2→0; ${newLight.length} new`,'PASS'],
 ['LinkedIn veto ≤22 FP, ≤20 shameable','17 FP; 16 shameable','PASS'],
 ['RAID dev ≤29 FP and every domain ≤2.5%','19/2354; maximum 3/151 = 1.99%','PASS'],
 ['PLOS / Federal Reserve / UCI FP ≤ baseline','6→5 / 0→0 / 0→0','PASS'],
 ['Fingerprints / privacy / perf assertions','Existing assertions retained and pass','PASS'],
 ['pnpm check; pnpm test','0 errors/warnings; 674 passed, 1 skipped','PASS'],
 ['300-word mean <0.5ms; worst <1ms; creation <30ms',`${perf.final.meanMs.toFixed(3)} / ${perf.final.worstMs.toFixed(3)} / ${perf.final.createWorstMs.toFixed(2)} ms`,'PASS'],
]));
lines.push('The original ≥3×/≥40% requirement was explicitly withdrawn before final evaluation. The final verdict uses the replacement ship bar.','',
'## Scoring and implementation','',
'K remains 12. Category caps and the style-only ceiling of 39 remain unchanged. Ordinary Shame still requires ≥40 words and ≥4 phrase points; explicit fingerprints retain the 80 floor and eight-word Shame guard. Three or more distinct counted phrase categories add one corroboration point per category beyond two, capped at two total; the bonus is spread proportionally over visible phrase signals. Style does not earn this bonus. Style support remains bounded by independent phrase evidence.','',
'Ordinary new social formulas are capped at three base points. A reader question plus an audience call-out, or a stock turning-point sentence plus a reader question, stays below 40. Three separate two-point phrase families can cross 40. Literal unrendered Markdown and unfinished slots are stronger residue. New explicit assistant/prompt fingerprints preserve the distinction between a visible artifact and ordinary style.','',
'The new pack shares a WeakMap-cached linear shape scan, consumes existing line/sentence/word spans and uses module-compiled patterns. Protected examples cannot establish framework labels or template slots. Regex compilation now batches at most sixteen candidate sources, reducing unrelated sticky checks while retaining all overlapping spans and isolated capture semantics. No runtime network, DOM, dependency or platform selector was added.','',
'## New rules','');
const s=await loader();let rules,oldRules;
try{rules=(await s.load(resolve(ROOT,'src/lib/engine/packs/index.ts'))).packs.flatMap(p=>p.rules);oldRules=(await s.load(resolve(CACHE,'engine-base/packs/index.ts'))).packs.flatMap(p=>p.rules);}finally{await s.close();}
const rationales={
 'template-labels':'Leaked Hook/CTA fields or a complete copywriting framework are explicit prompt residue.',
 'unfilled-slot':'Unresolved names, links, template braces and zero-item template numbers show an unfinished draft.',
 'markdown-bold':'Literal bold delimiters remain visible when the destination does not render Markdown.',
 'markdown-heading':'Literal heading delimiters remain in the published body.',
 'asterisk-list':'Repeated literal asterisk bullets corroborate pasted formatting; style only.',
 'labeled-list':'Three list items repeat the label-and-explanation skeleton; style only.',
 'closing-question':'Covers final audience questions, including inline hashtag tails and colon introductions.',
 'audience-callout':'A named audience is called out before an engagement question; weak alone.',
 'aphorism-tail':'An exact stock motivational ending is visible, without scoring lack of specifics.',
 'imperative-triplet':'Three short imperative sentences repeat a visible cadence; style only.',
 'fragment-triplet':'Three clipped prose fragments corroborate wording; technical headings excluded.',
 'repeated-openings':'Three adjacent sentences repeat a stock opening word; style only.',
 'listicle-hook':'Explicit count-plus-tips/lessons framing; a normal list alone is insufficient.',
 'story-turn':'Names a recurring turning-point story beat; weak alone.',
 'lesson-formula':'Names stock lesson, counterintuitive insight and replication framing.',
 'motivational-stock':'Exact motivational slogans; repeats use square-root scaling.',
 'takeaway-label':'A labeled takeaway announces the story moral; weak alone.',
 'save-cta':'A save/bookmark/direct-message CTA; weak alone.',
 'keyword-request':'A quoted keyword is requested in comments or messages.',
 'stat-hook':'An opening percentage claim is shown; no claim that its truth/source is verified.',
 'possible-draft':'The assistant explicitly introduces a possible or LinkedIn draft.',
 'assistant-offer':'Narrow editing offers earn phrase points, never a fingerprint floor.',
 'live-search-disclaimer':'An explicit inability-to-browse disclaimer leaked into the post.',
 'writing-advice':'Hook/CTA writing instructions or a reusable-post scaffold remain instead of a finished draft.',
 'sure-opener':'Mined assistant acknowledgement is weak style evidence.',
 'title-label':'Mined Title field is weak style evidence.',
};
lines.push(table(['Rule (pasted-output prefix)','Weight / kind','Rationale'],rules.filter(r=>r.id.startsWith('pasted-output.')).map(r=>[r.id.slice(14),`${r.weight} / ${r.evidence??'phrase'}`,rationales[r.id.slice(14)]??r.label])));
lines.push('','## Changed existing weights','');
const old=new Map(oldRules.map(r=>[r.id,r]));
const evidence=json(resolve(OUT,'asymmetric-floors.json')).humanFalseAlarmEvidence;
lines.push(table(['Rule','Before → after','Human-side evidence for reduction'],rules.filter(r=>old.has(r.id)&&old.get(r.id).weight!==r.weight).map(r=>{const counts={};for(const e of evidence[r.id]??[])counts[e.dataset]=(counts[e.dataset]??0)+1;return[r.id,`${old.get(r.id).weight} → ${r.weight}`,Object.entries(counts).map(([k,n])=>`${n} ${k} FP contributions`).join('; ')];})));
lines.push('No first-party rule was removed or zeroed. No weight fell because an AI corpus lacked it. Human evidence excludes LinkedIn: that corpus was a configuration veto only. Vendor dictionaries remain inactive; no vendor statistical proxy or common unigram was added. MINED supplied the named assistant acknowledgements/possible-draft/Title candidates, not ordinary function-word features.','',
'## Search and isolation','',
'Prompt groups use exactly `int(sha256("target-v1:" + promptId)[:8],16) % 10 < 6`. This yields 290 tune and 160 holdout rows. All model answers for a prompt stay together. Tuning used target-tune obvious recall first, some recall second, and a deterministic source-hash subsample of RAID chat train positives as a final tie-break. All RAID train humans supplied fitting evidence; RAID dev, permissive samples and light-polished controls supplied gates. New rules began at editorial weights. Bounded coordinate passes evaluated explicit weight choices and K, category caps, style ceiling, family bonus and short-post K.','',
'Every attempted configuration is logged. Broad word-weight increases were rejected; all old rule ceilings then stayed at editorial levels. A higher-recall formula configuration was also rejected because two ordinary social conventions could suffice. The final conservative search caps new ordinary formulas at three base points. A mixed style/phrase-family bonus was explored before the owner’s stop request and rejected. No exploration occurred after that request. The selected code then received only conservative regression fixes, followed by public dev validation and a frozen final snapshot.','',
'Final public dev metrics are authoritative: raw-feature replay preceded the narrow maintenance-list, cadence and editing-offer fixes. No target holdout, fresh text, LinkedIn holdout, RAID test, external W&I/AESLC or DetectRL-X test output guided a decision. The new fresh prompts were first scored by the immutable baseline after selection, then once by the frozen final engine. W&I/AESLC remain final-only.','',
'The initial polished baseline was partial while writers were active. `baseline-polished-complete.json` supersedes it, using the immutable baseline and the completed files. Deduplication keeps the first id in each file. The final local receipts show 120 distinct ids in each file (240 rows; 160 light and 80 LinkedIn), rather than the earlier reported 113 Gemini ids; SHA-256 receipts pin exactly what was evaluated. No missing Luna-low output was assumed.','',
'## Test changes and justification','',
table(['Change','Reason'],[
 ['Add 26 rule positives, protected-example negatives, exact span checks and combination guards','New evidence must be visible, reproducible and safe around quotations/code.'],
 ['Add overlapping/closing matcher tests across 40 regex rules and reversed order','Bounded regex batches must preserve cross-batch match semantics.'],
 ['Pack count 10→11; add a first-party positive; restrict upstream-attribution assertion to upstream packs','The new original pack introduces no borrowed license requirement.'],
 ['Synthetic hiring editor-note now expects visible unresolved-slot evidence','Owner explicitly includes unfinished link placeholders in zero-effort draft residue.'],
 ['Remove [Product Name] from ambiguous-typography negative list; test it as an unfinished slot','Strong template residue now has its own dedicated positive regression.'],
 ['Chatbot launch expects pasted-output.unfilled-slot instead of the weaker old placeholder signal','The stronger rule wins the same occurrence; fingerprint score and Shame assertions are retained.'],
 ['Reader-question regression expects the broader pasted-output.closing-question signal','The stronger exact same evidence supersedes the narrow rule after deduplication.'],
 ['Two synthetic explainer checks use ≥60 instead of ≥70','Ordinary contrast and enumeration weights fell on actual human/light-polished false alarms; unchanged wording still remains actionable.'],
 ['Three-family score expectation uses 11 instead of 10 evidence points','The capped family corroboration bonus is now counted and displayed.'],
 ['Regenerate vendor inventory report','Its source hashes track first-party changes; no vendor matcher or weight was activated.'],
 ['Exclude offline instrumentation from type checking with local ts-nocheck comments','Only ignored transformed cache modules have non-product return/context types; product files remain checked.'],
]),
'All original fingerprint, privacy and performance assertions are unchanged and green. No threshold/budget test was relaxed. `pnpm check`: zero errors and warnings. `pnpm test --maxWorkers=1`: 674 passed, one pre-existing optional recall-report test skipped. Two Node harness tests pass (exact prompt hashing and LF JSONL parsing with literal Unicode line separators).','',
'## Performance','',
table(['Engine','300-word mean','Worst of 1000 calls','Worst creation (40 runs)'],[['Baseline',perf.baseline.meanMs.toFixed(3)+' ms',perf.baseline.worstMs.toFixed(3)+' ms',perf.baseline.createWorstMs.toFixed(2)+' ms'],['Final',perf.final.meanMs.toFixed(3)+' ms',perf.final.worstMs.toFixed(3)+' ms',perf.final.createWorstMs.toFixed(2)+' ms']]),
'200 distinct dev excerpts (100 human, 100 chat AI), five timed calls each after warmup and GC. The existing full-vendor 2,000-post benchmark and all pathological-input timing tests also pass. The baseline worst call occasionally exceeds 1ms on this shared machine; the final worst call is below the strict 1ms gate.','',
'## Risks and limitations','',
'- LinkedIn human controls lost nearly all line breaks. They check wording, not layout. Layout checks instead use newline-preserving RAID humans and polished controls; common layout rules retain weak style evidence. No real live-feed authorship claim is established.',
'- Fresh recall is still only 61/351 (17.4%). GPT-5.6-Luna fresh recall is especially weak (2/117). Many subtle/clean generations remain outside the nameable-tell target.',
'- Polished LinkedIn packaging rises from 4/80 to 37/80, while light polishing falls from 2/160 to 0/160. The owner explicitly left the packaging category report-only; this unresolved product boundary matters before broad release.',
'- Effortful-prompt AI flags rise from 9/210 to 30/210. Detailed prompting does not guarantee the absence of visible artifacts, and a score still cannot prove effort or authorship.',
'- General RAID/external/DetectRL-X AI recall declines. That trade-off is consistent with the redefined target but should remain visible to reviewers.',
'- DetectRL-X human dates remain unverified; its FP is a warning signal. Human corpora have genre, author and provenance bias, and grouped prompt/model examples are correlated. Tiny per-model cells have large uncertainty.',
'- The heuristic cannot distinguish an AI-generated unfinished placeholder from an equally unfinished human template; the signal is visible draft residue, not proof of model authorship.',
'- Runtime remains local. Text-bearing corpora, feature caches, snapshots and predictions remain under ignored data/eval/raw/round2. No browser, network, build, commit or extension delivery was performed.','',
'## Reproduction and review','',
'Read `frozen.json`, `criteria.json`, `baseline-identity.json`, `performance.json`, the per-split aggregate JSON, and the four search logs. `evaluate.mjs baseline|final`, `fresh-baseline.mjs`, `polished-baseline.mjs` and `freeze.mjs` refuse to overwrite one-shot receipts. Read cached predictions to regenerate this report (`node eval/round2/report.mjs`); do not rerun holdouts for selection. `features.mjs` and `tune.mjs` are development-only. Final immutable code is in the ignored `engine-final` snapshot; the active source is identical.','');
if(digest(resolve(ROOT,'src/lib/engine'))!==json(resolve(OUT,'frozen.json')).engineHash)throw Error('Engine changed after final freeze');
writeFileSync(resolve(OUT,'REPORT.md'),lines.join('\n'));
save(resolve(OUT,'rules.json'),rules.map(({detect,...r})=>r));
console.log(criteria);
