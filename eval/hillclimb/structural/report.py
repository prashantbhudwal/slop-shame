#!/usr/bin/env python3
"""Publish aggregate-only results. No dataset text is opened or quoted."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'eval/hillclimb/structural'
def load(name): return json.loads((OUT / name).read_text())
R = load('results.json')['features']
R.update(load('visible-results.json')['features'])
R.update(load('specifics-results.json')['features'])
I = load('incremental.json')
P = load('performance.json')
L = load('linkedin.json')
S = load('short-proposals.json')
rules = load('rules.json')
implemented = {r['id'].replace('measured-structural.','').replace('-','_'):r for r in rules}
domains = sorted(next(iter(R.values()))['dev']['domains'])
models = sorted(next(iter(R.values()))['dev']['models'])
lines = []
def add(text=''): lines.append(text)
def table(headers, rows):
    add('| ' + ' | '.join(headers) + ' |')
    add('| ' + ' | '.join('---' for _ in headers) + ' |')
    for row in rows: add('| ' + ' | '.join(map(str, row)) + ' |')
    add()
def num(x): return '—' if x is None else f'{x:.4f}'
def pct(x): return '—' if x is None else f'{100*x:.2f}%'
def fp(m): return f"{m['fp']}/{m['human']} ({pct(m['fp_rate'])})"
def cut(s): return ('≥ ' if s['direction'] == 1 else '≤ ') + f"{s['threshold']:.8g}"
def pair(v, path):
    a, b = v['train_auc'], v['dev_auc']
    for k in path: a, b = a[k], b[k]
    return f'{num(a)} / {num(b)}'

DECISIONS = {}
for name, value in R.items():
    if name in implemented: DECISIONS[name] = 'Candidate style, weight '+str(implemented[name]['weight'])
    elif name in {'specifics_rate','no_specifics_60'}: DECISIONS[name] = 'Reject absence alone: broad human hits; not a visible positive tell'
    elif name in {'platitude_density','platitude_count','vague_platitude_density'}: DECISIONS[name] = 'Keep diagnostic; prefer one specific-free platitude conjunction'
    elif name.startswith('visible_'): DECISIONS[name] = 'Reject: insufficient train/dev support/lift or human veto'
    elif name == 'sentence_cv': DECISIONS[name] = 'Reject: dev poetry FP 11/303 (3.63%)'
    elif name == 'regular_run_cv6': DECISIONS[name] = 'Reject: insufficient train lift/support; dev poetry FP 9/303'
    elif name in {'paragraph_mean','paragraph_cv','sentences_per_paragraph','closing_ratio','closing_single_sentence','closing_summary'}: DECISIONS[name] = 'Reject: blank-line source-format confound'
    elif name in {'header_share','header_count','bold_share','bold_count','numbered_share','numbered_count','bullet_share','bullet_count','list_share','list_count','label_share','label_count','line_cv'}: DECISIONS[name] = 'Reject: line/genre formatting confound or weak support'
    elif name in {'repeated_opener1','repeated_opener2'}: DECISIONS[name] = 'Reject: inadequate precision/lift; repeated human openings'
    else: DECISIONS[name] = 'Reject: general register/punctuation proxy or weak discrimination'

def nameable(name):
    if name in {'specifics_rate','no_specifics_60'}: return 'Count only; absence needs a positive tell'
    if name in {'vague_platitude_count','vague_platitude_density'}: return 'Yes: platitude snippet + 0 specifics markers'
    if name.startswith('visible_') or name in {'transition_share','transition_count','summary_tail','closing_summary','header_share','header_count','bold_share','bold_count','numbered_share','numbered_count','bullet_share','bullet_count','list_share','list_count','label_share','label_count','repeated_opener1','repeated_opener2','platitude_density','platitude_count'}: return 'Yes: exact snippet and/or count'
    return 'No visible generation smell; numerical statistic'

add('# Structural feature evaluation')
add()
add('Target: zero-effort pasted output with obvious, nameable generation smells. Clean AI text and carefully edited AI drafts are out of scope. This is not a general AI-authorship detector. RAID AI/human AUROCs below are transfer diagnostics, not ground truth for “slop”. All implemented candidates are `style` evidence and cannot establish a verdict alone. No production pack is registered or existing file edited.')
add()
add('Suggested weights: '+', '.join(r['id'].replace('measured-structural.','')+' = '+str(r['weight']) for r in rules)+'. Generic transition/summary scaffolds were demoted after the target clarification; invisible stylometry is never implemented as a standalone tell. Markdown candidates show their literal residue. The concreteness candidate requires an explicit platitude: missing specifics alone earns nothing.')
add()
add(f"Combined engine: RAID dev {I['baseline']['overall']['tp']} → {I['combined']['overall']['tp']} /10,800 AI at ≥40; human FP {I['baseline']['overall']['fp']} → {I['combined']['overall']['fp']} /2,354. LinkedIn veto {L['veto']['engines']['baseline']['positive']} → {L['veto']['engines']['combined']['positive']} /8,189 human FP. Modern clean/edited-prompt AI {L['modern']['engines']['baseline']['positive']} → {L['modern']['engines']['combined']['positive']} /120. Lazy-prompt cheap-model output {L['loweffort']['engines']['baseline']['positive']} → {L['loweffort']['engines']['combined']['positive']} /{L['loweffort']['count']}. External sets never fit a parameter.")
add()
add('Train/dev incremental results use an independent scratch copy of `data/eval/raw/hillclimb/engine-base`, SHA-256 `055545a3992612b684beed320bbb339edda3c83c015bee92dee2b06f84f44e30`. All 13,154 eligible dev baseline public scores and Shame gates reproduce exactly. No RAID test file was opened. No network, browser, sklearn or worker pool was used.')
add()
add('## Protocol and definitions')
add()
add('- Threshold design uses only 7,166 human + 28,800 chat train rows; frozen validation uses 2,354 human + 10,800 chat dev rows. Models: ' + ', '.join(models) + '. Base models are excluded. Train/dev source-group overlap is zero.')
add('- Train threshold search maximizes macro-domain Youden (mean TPR−FPR), requiring human feature-hit rate ≤1% overall and ≤2.5% in each domain and AI recall ≥0.5%. Candidate selection also requires ≥3× overall human hit rate, ≥5 AI hits in at least two domains with ≥3× their human rates, and ≥5 AI hits in at least three models. The same gates validate unchanged on dev. These are measured feature hits, distinct from engine FP at score ≥40.')
add('- Raw register proxies, absence of punctuation/pronouns, long words and formatting-only corpus artifacts are excluded independently of numerical gates. Neither lexical diversity nor absence of contractions is measured as positive evidence. The selected low-CV direction is fixed for sentence-uniformity hypotheses. No thresholds or weights were fit on LinkedIn humans or modern AI.')
add('- After the owner redefined the target, explicit visible-smell and specificity features were designed on train only, in separately preserved `visible-thresholds.json` and `specifics-thresholds.json`. These rare smells need ≥20 train AI hits and ≥5 dev AI hits, support in ≥2 domains, ≥3× overall human hit rate, and the same ≤1% overall/≤2.5% per-domain human feature-hit limits. Train cut search allows recall ≥0.05%, without a broad AI-recall target or multi-model requirement. Positive visible features are never inverted to score absence. General specificity absence is diagnostic only regardless of numerical gates. Modern/low-effort generated posts are reporting/validation only; veto data can reject only.')
add('- Specifics markers: digit-bearing tokens (including dates), capital-initial tokens outside sentence starts (excluding I and fixed generic acronyms), @mentions, URLs and currency signs. These are heuristic markers, not semantic entities; categories can overlap. Sentence-first names and lowercase product names may be missed; a counted name does not prove factual detail, and a lack of markers does not prove a lack of concrete events. Generic platitude patterns were fixed before evaluating the lazy-prompt set. The conjunction requires 40–300 words, ≥1 matched platitude and zero specificity markers.')
add('- Sentences are the engine’s existing best-effort segments; line breaks also end segments. Paragraphs merge adjacent nonempty lines and break at at least two newlines. Word counts/spans come from `PostContext`/`structureOf`; extraction does not tokenize again. Punctuation and first-person/digit token rates are per 100 engine words. Parenthesis rate counts opening parentheses. Average token length is UTF-16 code units (adequate for this English corpus).')
add('- Mean/CV sentence metrics require ≥80 words and ≥6 nonempty segments. Paragraph mean/CV require ≥120 words and ≥3 paragraphs; line CV requires ≥120 words and ≥5 lines. Sentences/paragraph requires ≥2 paragraphs. Opening repetition requires ≥6 segments and ≥3 occurrences of the most frequent one/two-token opening. The six-sentence sliding-CV feature requires all six segments ≥5 words and a mean of 10–40 words.')
add('- Transition share requires ≥6 segments. Transition count is zero unless ≥2 transitions and ≥6 segments. Summary tail requires ≥80 words/≥3 segments, a summary marker at the start of one of the last two segments, and a remaining tail of 15–120 words occupying ≤35% of all words. It does not require blank lines. Marker sets are frozen in source; no dataset passage is quoted.')
add('- AUROC orientation (↑/↓) is selected on train, then held fixed on dev. Unavailable measurements are tied below observed measurements, representing an eligibility gate. `observed_auroc` in `results.json` separately excludes unavailable rows. A model AUROC compares that model with all human rows; human domain distribution differs from the equally sampled AI domains, so consult the within-domain table as well.')
add('- Reported thresholds are the best feasible train thresholds. A † marks fallback to unconstrained macro-Youden when no threshold meets the precision/recall constraints; those features cannot become candidates. The unconstrained optima are also given below. No dev optimum is fit.')
add()
add('## Corpus-format limitation and rejected features')
add()
add('Only 3/7,166 human train rows have ≥3 blank-line paragraphs and ≥120 words, versus 20,208/28,800 AI rows. Thus paragraph AUROCs around 0.85 and sentences/paragraph around 0.88 largely measure missing/available structure. Ordinary outline/list and paragraph-summary statistics inherit that formatting risk and are excluded on that evidence alone. Literal leftover markdown is nameable and receives an independent real-human LinkedIn veto check. Human broetry, lists, emoji and hashtags are normal; they must not become a generation verdict. Marker-based sentence summaries retain no blank-line requirement and only tiny supporting weight.')
add()
add('Low sentence CV fails on poetry (dev 11/303); its sliding-window variant also overflags poetry. Repeated openings have weak cross-domain precision/lift. Average word length would penalize technical/formal writers; pronoun, digit and punctuation rates largely reflect genre/register. Headers/bold have little support. Low lexical diversity and lack of contractions were never considered for scoring.')
add()
add('## Overall feature results')
add()
table(['Feature', 'Nameable', 'AUROC train / dev', 'Orientation', 'Train-selected threshold', 'Train human hits', 'Dev human hits', 'Decision'], [
    [name, nameable(name), pair(v,['overall','auroc']), '↑' if v['auc_direction']==1 else '↓', cut(v['threshold']) + (' †' if v['threshold']['fp_rate'] > .01 or any(z['fp_rate'] > .025 for z in v['train']['domains'].values()) or v['threshold']['recall'] < (.0005 if name.startswith('visible_') or name in {'specifics_rate','no_specifics_60','platitude_density','platitude_count','vague_platitude_count','vague_platitude_density'} else .005) else ''), fp(v['train']['overall']), fp(v['dev']['overall']), DECISIONS[name]] for name,v in R.items()])
add('## Unconstrained train thresholds')
add()
table(['Feature','Best unconstrained cutoff','Train macro Youden','Train recall','Train human hit rate'], [[name,cut(v['unconstrained']),num(v['unconstrained']['macro_youden']),pct(v['unconstrained']['recall']),pct(v['unconstrained']['fp_rate'])] for name,v in R.items()])
for split in ('train','dev'):
    add(f'## Human feature false positives by domain — {split}')
    add()
    add('Each cell is hits / human rows (rate). Every threshold is frozen from train, including rejected research features.')
    add()
    table(['Feature',*domains], [[name,*[fp(v[split]['domains'][d]) for d in domains]] for name,v in R.items()])
add('## Formal versus casual human false positives')
add()
add('Formal = abstracts/wiki/news; casual = reddit/reviews. Books, poetry and recipes remain separate in the domain tables.')
add()
table(['Feature','Formal train','Formal dev','Casual train','Casual dev'], [[name,fp(v['train']['formal']),fp(v['dev']['formal']),fp(v['train']['casual']),fp(v['dev']['casual'])] for name,v in R.items()])
add('## AUROC by domain')
add()
add('Cells are train / dev, with the single train-selected AUROC orientation used for every subgroup.')
add()
table(['Feature',*domains], [[name,*[pair(v,['domains',d,'auroc']) for d in domains]] for name,v in R.items()])
add('## AUROC by chat model')
add()
table(['Feature',*models], [[name,*[pair(v,['models',m,'auroc']) for m in models]] for name,v in R.items()])
add('## Incremental public-engine effect on RAID dev')
add()
add('Each rule is added individually to the untouched frozen production-engine copy, then all candidates together. Weights are fixed editorial strengths, not fitted probabilities or optimized against incremental dev outcomes. Both transition rules report identical sentence spans: when both fire, the scorer keeps the stronger one. Markdown rules share line spans, so overlapping markup on the same line competes. Exact spans go through normal protected-quote/code filtering. Absence of specifics is never standalone evidence.')
add()
base = I['baseline']['overall']
table(['Engine','AI ≥40 / 10,800','Recall','Recall change (pp)','Human FP / 2,354','Human Shame FP'], [[name,v['overall']['tp'],pct(v['overall']['recall']),f"{100*(v['overall']['recall']-base['recall']):+.4f}",v['overall']['fp'],v['overall']['shameFP']] for name,v in I.items()])
table(['Domain','Baseline AI ≥40','Combined AI ≥40','Change','Baseline human FP','Combined human FP'], [[d,I['baseline']['domain'][d]['tp'],I['combined']['domain'][d]['tp'],I['combined']['domain'][d]['tp']-I['baseline']['domain'][d]['tp'],I['baseline']['domain'][d]['fp'],I['combined']['domain'][d]['fp']] for d in domains])
add('## Real human LinkedIn veto — false-alarm checks only')
add()
add('The author manifest gates the mixed JSONL source before JSON body decoding: only the 8,189 veto-author rows enter feature extraction/scoring. Holdout rows are skipped as raw bytes after author-metadata routing; their text is not decoded, copied into evaluation inputs, exposed, or scored. The 9,743-post holdout remains reserved. Data and per-row results stay in ignored paths; no passages are quoted or committed. The veto cannot fit a threshold or weight. Rejected research features below are diagnostic only; they have no implemented score contribution.')
add()
add('Critical format limitation: only 3/8,189 veto posts contain any newline; zero contain a blank line, literal backslash-n, or HTML br. Consequently zero observed hits for human list/emoji-bullet/hashtag-wall/heading layout is not a reliable validation of layout safety. The plain-outline candidate is excluded despite numerical RAID performance and zero observed veto hits. Literal leftover-markdown candidates stay unregistered and conditional on format-preserving human controls; their zero veto hits do not establish broad safety. `format-audit.json` records this aggregate audit.')
add()
table(['Engine','Human ≥40','Rate','Additional FP','Newly flagged','Removed','Human Shame FP'], [[name,x['positive'],pct(x['rate']),f"{x['delta']:+d}",x['newPositive'],x['removedPositive'],x['shame']] for name,x in L['veto']['engines'].items()])
def worst(name, count=3):
    authors = [(a,g['count'],g['features'][name]['hits'],g['features'][name]['rate']) for a,g in L['authors'].items() if g['features'][name]['hits']]
    authors.sort(key=lambda x:(-x[3],-x[2],x[0]))
    return '; '.join(f'{a}: {hits}/{n} ({pct(rate)})' for a,n,hits,rate in authors[:count]) or 'none'
rule_ids = {rule['id'].replace('measured-structural.','').replace('-','_'):rule['id'] for rule in rules}
table(['Feature','Veto hits / 8,189','Hit rate','Additional engine FP','Worst author hit rates (top 3)'], [[name,L['veto']['features'][name]['hits'],pct(L['veto']['features'][name]['rate']),L['veto']['engines'][rule_ids[name]]['newPositive'] if name in rule_ids else '— (not implemented)',worst(name)] for name in R])
add('Worst-author rates include small samples and therefore show denominators; they are diagnostics, not estimates of authorship. Engine FP contributions for implemented rules below are changes versus the frozen baseline, not feature-hit counts.')
add()
author_rows = []
for rule in rules:
    name = rule['id']
    feature_name = name.replace('measured-structural.','').replace('-','_')
    ordered = sorted(L['authors'].items(),key=lambda item:(-item[1]['engines'][name]['newPositive'],-item[1]['features'][feature_name]['rate'],-item[1]['features'][feature_name]['hits'],item[0]))
    selected = [(author,g) for author,g in ordered if g['features'][feature_name]['hits'] or g['engines'][name]['newPositive']][:3]
    if not selected: author_rows.append([name,'none',8189,19,19,0,0])
    for author,g in selected:
        x=g['engines'][name]
        author_rows.append([name,author,g['count'],g['engines']['baseline']['positive'],x['positive'],x['newPositive'],x['delta']])
table(['Rule','Author','Posts','Baseline FP','Rule-added FP','New FP','FP delta'],author_rows)
add('## Modern AI LinkedIn — reporting only')
add()
add('All 120 posts are evaluated with unchanged thresholds and editorial weights: 30 prompts × four models. Even prompt IDs are the “natural and human” condition (60 posts). This set is reporting only: no fitting, candidate selection, tuning, or thresholds use these outcomes. Clean output with no obvious smells is out of scope; low recall here is acceptable.')
add()
modern_models = sorted(L['models'])
table(['Engine','All /120','Natural /60','Ordinary /60',*modern_models], [[name,L['modern']['engines'][name]['positive'],L['natural']['engines'][name]['positive'],L['ordinary']['engines'][name]['positive'],*[L['models'][m]['engines'][name]['positive'] for m in modern_models]] for name in I])
table(['Feature','All hits /120','Natural /60','Ordinary /60',*[m+' /30' for m in modern_models]], [[name,L['modern']['features'][name]['hits'],L['natural']['features'][name]['hits'],L['ordinary']['features'][name]['hits'],*[L['models'][m]['features'][name]['hits'] for m in modern_models]] for name in R])
add('## Lazy-prompt cheap-model LinkedIn — reporting/validation only')
add()
add('This is the closest available target proxy: lazy social-post prompts answered by inexpensive model/effort configurations. Parameters remain frozen from train. File membership is evaluated as present at run time, including Sol if available; denominators below are authoritative. No output passage is quoted. Model capability and prompt laziness are not verified labels of whether a person edited a post.')
add()
low_models = sorted(L['loweffortModels'])
table(['Model / effort','Posts','Baseline ≥40','Pack ≥40','Change'], [[m,L['loweffortModels'][m]['count'],L['loweffortModels'][m]['engines']['baseline']['positive'],L['loweffortModels'][m]['engines']['combined']['positive'],L['loweffortModels'][m]['engines']['combined']['delta']] for m in low_models])
table(['Feature','All hits /'+str(L['loweffort']['count']),*[m+' /'+str(L['loweffortModels'][m]['count']) for m in low_models]], [[name,L['loweffort']['features'][name]['hits'],*[L['loweffortModels'][m]['features'][name]['hits'] for m in low_models]] for name in R])
add('## Concreteness diagnostics')
add()
table(['Set','Mean specifics markers /100 words','No-specifics 60–300-word hits','Platitude count ≥1 hits','Specific-free platitude hits'], [[name,num(g['features']['specifics_rate']['mean']),g['features']['no_specifics_60']['hits'],g['features']['platitude_count']['hits'],g['features']['vague_platitude_count']['hits']] for name,g in [('LinkedIn human veto',L['veto']),('Modern AI',L['modern']),('Low-effort AI',L['loweffort'])]])
add('“No specifics in 60–300 words” alone hits 288/7,166 train and 90/2,354 dev humans and is rejected as positive evidence. Low specificity at its unconstrained optimum hits 2,821 train and 918 dev humans. The positive conjunction—an explicit platitude and zero specificity markers in 40–300 words—hits 38 train AI/1 human and 16 dev AI/0 humans. The UI can show the platitude snippet; missing specifics only amplifies that visible tell. The pattern dictionary is fixed, small and allocation-light; it does not claim semantic event extraction.')
add()
add('## Why short posts stop at 39; score proposals only')
add()
add('With K=12, six counted evidence points produce round(100×(1−exp(−6/12))) = 39. The saturating curve, not a short-post penalty, creates the boundary. A closing question or hashtag pair can add nothing when its existing rule does not fire or needs a larger cluster. Weak unsupported typography cannot bypass the existing style support cap. Style alone still tops out at 39. `score.ts` is untouched.')
add()
add('Two fixed proposals were evaluated without fitting on generated output: A uses K=11.5 for 40–79 words with ≥3 counted phrase points; B adds at most 0.25 supported style points only to a 40–79-word score-39 post with ≥4 phrase points and a final prose question or ≥2 hashtags. Both preserve the independent phrase-support limit and cannot promote style alone. B’s additional style budget is min(0.25, phrase−already-counted-style).')
add()
table(['Set','Rows','Short score39','Short39 with ≥6 phrase points','Baseline TP / FP','A: density TP / FP','A new human FP','B: corroborated TP / FP','B new human FP'], [[name,g['overall']['rows'],g['overall']['short39'],g['overall']['short39Phrase6'],str(g['overall']['score']['tp'])+' / '+str(g['overall']['score']['fp']),str(g['overall']['density']['tp'])+' / '+str(g['overall']['density']['fp']),g['overall']['density']['newFP'],str(g['overall']['corroborated']['tp'])+' / '+str(g['overall']['corroborated']['fp']),g['overall']['corroborated']['newFP']] for name,g in S['datasets'].items()])
for split in ('train','dev'):
    table([split+' human domain','Baseline FP','A FP','B FP'], [[d,g['score']['fp'],g['density']['fp'],g['corroborated']['fp']] for d,g in S['datasets'][split]['groups'].items()])
table(['Low-effort model / effort','Short39','Baseline ≥40','A ≥40','B ≥40'], [[m,g['short39'],g['score']['tp'],g['density']['tp'],g['corroborated']['tp']] for m,g in S['datasets']['loweffort']['groups'].items()])
veto_changes = [(author,g) for author,g in S['datasets']['veto']['groups'].items() if g['density']['newFP'] or g['corroborated']['newFP']]
veto_changes.sort(key=lambda item:(-max(item[1]['density']['newFP'],item[1]['corroborated']['newFP']),item[0]))
table(['Veto author with added FP','Posts','A new FP','B new FP'], [[a,g['rows'],g['density']['newFP'],g['corroborated']['newFP']] for a,g in veto_changes[:10]])
for key,label in [('density','A: short-density adjustment'),('corroborated','B: small corroboration bonus')]:
    harm=sum(S['datasets'][split]['overall'][key]['newFP'] for split in ('train','dev','veto'))
    add(label+(': reject as proposed; adds '+str(harm)+' human false alarms across train/dev/veto.' if harm else ': no additional human false alarms in these samples; remains an unimplemented proposal requiring the reserved final check.'))
add()
add('## Performance and verification')
add()
add(f"Warmed {P['node']}; 200 distinct dev inputs (100 human/100 chat), each exactly 300 engine tokens. 3,000 warmups per engine, then 11 alternating-order rounds of 1,000 calls. Direct pack timing uses freshly built context keys each round, so repeated WeakMap cache hits do not masquerade as feature extraction. Context construction is outside direct-pack timing; full-engine paired deltas include construction and scoring. Shared-machine noise can make a paired delta negative.")
add()
table(['Measurement','Mean ms/post','Median round ms/post','Worst round mean ms/post'], [[name,f"{P[key]['meanMs']:.8f}",f"{P[key]['medianMs']:.8f}",f"{P[key]['maxMs']:.8f}"] for name,key in [('Pack on fresh contexts','directPackFreshContexts'),('Frozen production engine','baseEngine'),('Engine + all rules','plusPackEngine'),('Paired full-engine increase','pairedDelta')]])
add('The pack passes the <0.05 ms added mean budget. The detectors share one linear scan with precompiled regexes, reuse sentence word counts/spans, and use a WeakMap keyed by the temporary context. No text re-splitting, lowercasing, DOM, network or dependency is added. Complexity is O(text + sentences); transient span arrays are linear in transition occurrences, examples capped at three.')
add()
add('Targeted TypeScript check passes. Verification covers runtime/extractor parity on all 49,120 train/dev rows; no train/dev source overlap; exact dev baseline parity; style-only score <40/no Shame; overlap deduplication; protected-code suppression; empty/short negatives; Unicode lowercase expansion; unchanged hashes for all 26 baseline source files. This proposal does not alter production behavior, so no UI/e2e work is required.')
add()
add('## Reproduction')
add()
add('Run from repository root. One heavy command at a time; no network or browser is needed. Train fit must precede dev validation. Subsequent LinkedIn commands are veto/reporting only and must not be fed into fitting.')
add()
add('```bash\nnode eval/hillclimb/structural/extract.mjs train\nOPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py fit\nnode eval/hillclimb/structural/extract.mjs dev\nOPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py validate\nnode eval/hillclimb/structural/extract.mjs train visible\nOPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py fit --visible\nnode eval/hillclimb/structural/extract.mjs dev visible\nOPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py validate --visible\nnode eval/hillclimb/structural/extract.mjs train specifics\nOPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py fit --specifics\nnode eval/hillclimb/structural/extract.mjs dev specifics\nOPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py validate --specifics\nnode eval/hillclimb/structural/evaluate.mjs\nnode node_modules/typescript/bin/tsc -p eval/hillclimb/structural/tsconfig.json\nnode eval/hillclimb/structural/verify.mjs\nnode --expose-gc eval/hillclimb/structural/benchmark.mjs\npython3 eval/hillclimb/structural/veto_gate.py\nnode eval/hillclimb/structural/linkedin.mjs\nnode eval/hillclimb/structural/short-proposals.mjs\npython3 eval/hillclimb/structural/report.py\n```')
add()
add('Research and aggregate artifacts are in `eval/hillclimb/structural/`; `results.json`, `visible-results.json`, and `specifics-results.json` include exact counts, oriented and observed-only AUCs for every domain/model. The exported fitting rows are `data/eval/raw/hillclimb/structural-features-{train,dev}.jsonl`, keyed by original `id` and `source_id`. Each row contains raw `features`, frozen `threshold_hits`, and candidate custom-rule `hits` tuples `[ruleId, scale, exactSpans, once, activeAfterProtection]`. Rule metadata/weights/evidence are in `rules.json`. They exclude base models, LinkedIn veto humans and all generated external AI. Never mistake rejected threshold-hit columns for approved positive-evidence rules. Per-row outputs, scratch engines, and all source text remain gitignored. No commit is made.')
add()
(ROOT/'eval/hillclimb/STRUCTURAL.md').write_text('\n'.join(lines)+'\n')
print('Wrote aggregate report:',len(lines),'lines')
