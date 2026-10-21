# Round 2 implementation report

**PASS: the owner’s final “better than before” ship bar.** Target holdout catches rose from 11/160 to 51/160; the fresh set rose from 24/351 to 61/351. Human FP counts fell on every required final control. This is ready for orchestrator review. No extension was built or delivered; no commit was made.

All baselines use the pre-round-2 `data/eval/raw/hillclimb/engine-base`. Its 20 active TypeScript files are byte-identical to the immutable round2 baseline copy used by the harness (baseline-identity.json). The contaminated live-source fresh count of 68 is excluded. Baseline/final holdouts each ran once, with lock receipts; there was no corrective final selection.

## Before / after at score ≥40

| Check | Baseline | Final |
| --- | --- | --- |
| Target tune, all | 13/290 (4.5%) | 78/290 (26.9%) |
| Target holdout, all | 11/160 (6.9%) | 51/160 (31.9%) |
| Target holdout, panel obvious | 10/106 (9.4%) | 49/106 (46.2%) |
| Target holdout, panel some | 1/53 (1.9%) | 2/53 (3.8%) |
| Target holdout, panel none | 0/1 (0.0%) | 0/1 (0.0%) |
| Fresh 117 prompts × 3 models | 24/351 (6.8%) | 61/351 (17.4%) |
| LinkedIn veto human FP | 19/8189 (0.2%) | 17/8189 (0.2%) |
| LinkedIn holdout human FP | 66/9743 (0.7%) | 43/9743 (0.4%) |
| RAID dev human FP | 29/2354 (1.2%) | 19/2354 (0.8%) |
| RAID test human FP | 28/2342 (1.2%) | 24/2342 (1.0%) |
| External human FP | 19/1351 (1.4%) | 13/1351 (1.0%) |
| Polished light human FP | 2/160 (1.3%) | 0/160 (0.0%) |
| Polished LinkedIn, report only | 4/80 (5.0%) | 37/80 (46.3%) |
| DetectRL-X human FP, warning only | 26/704 (3.7%) | 19/704 (2.7%) |
| DetectRL-X AI recall, report only | 801/2742 (29.2%) | 690/2742 (25.2%) |
| Effortful-prompt AI flagged, report only | 9/210 (4.3%) | 30/210 (14.3%) |
| RAID test chat recall, diagnostic | 1211/10800 (11.2%) | 1089/10800 (10.1%) |
| External AI recall, diagnostic | 114/834 (13.7%) | 107/834 (12.8%) |


## Target holdout by model and smell

| Model | Obvious baseline → final | Some baseline → final |
| --- | --- | --- |
| gemini-3.8-flash-medium | 7/29 (24.1%) → 17/29 (58.6%) | 0/3 (0.0%) → 0/3 (0.0%) |
| gpt-5.6-luna-low | 2/25 (8.0%) → 8/25 (32.0%) | 0/7 (0.0%) → 0/7 (0.0%) |
| gpt-6-luna-low | 1/18 (5.6%) → 8/18 (44.4%) | 1/14 (7.1%) → 1/14 (7.1%) |
| gpt-6-luna-medium | 0/21 (0.0%) → 11/21 (52.4%) | 0/11 (0.0%) → 0/11 (0.0%) |
| gpt-6.1-sol-low | 0/13 (0.0%) → 5/13 (38.5%) | 0/18 (0.0%) → 1/18 (5.6%) |


## Fresh set by model

| Model | Baseline | Final |
| --- | --- | --- |
| gemini-3.8-flash-medium | 16/117 (13.7%) | 28/117 (23.9%) |
| gpt-5.6-luna-low | 3/117 (2.6%) | 2/117 (1.7%) |
| gpt-6-luna-medium | 5/117 (4.3%) | 31/117 (26.5%) |


## Tune by prompt set and model

| Model | Lazy baseline → final | Real prompts baseline → final |
| --- | --- | --- |
| gemini-3.8-flash-medium | 4/19 (21.1%) → 11/19 (57.9%) | 3/39 (7.7%) → 12/39 (30.8%) |
| gpt-5.6-luna-low | 1/19 (5.3%) → 5/19 (26.3%) | 3/39 (7.7%) → 13/39 (33.3%) |
| gpt-6-luna-low | 1/19 (5.3%) → 9/19 (47.4%) | 0/39 (0.0%) → 5/39 (12.8%) |
| gpt-6-luna-medium | 0/19 (0.0%) → 4/19 (21.1%) | 1/39 (2.6%) → 10/39 (25.6%) |
| gpt-6.1-sol-low | 0/19 (0.0%) → 4/19 (21.1%) | 0/39 (0.0%) → 5/39 (12.8%) |


## Holdout by prompt set and model

| Model | Lazy baseline → final | Real prompts baseline → final |
| --- | --- | --- |
| gemini-3.8-flash-medium | 4/11 (36.4%) → 7/11 (63.6%) | 3/21 (14.3%) → 10/21 (47.6%) |
| gpt-5.6-luna-low | 0/11 (0.0%) → 3/11 (27.3%) | 2/21 (9.5%) → 5/21 (23.8%) |
| gpt-6-luna-low | 1/11 (9.1%) → 4/11 (36.4%) | 1/21 (4.8%) → 5/21 (23.8%) |
| gpt-6-luna-medium | 0/11 (0.0%) → 3/11 (27.3%) | 0/21 (0.0%) → 8/21 (38.1%) |
| gpt-6.1-sol-low | 0/11 (0.0%) → 2/11 (18.2%) | 0/21 (0.0%) → 4/21 (19.0%) |


## Dev gates and final criteria

| Criterion | Result | Verdict |
| --- | --- | --- |
| More target holdout catches | 11 → 51 | PASS |
| More fresh-set catches | 24 → 61 | PASS |
| No rise in LinkedIn holdout / RAID test / external FP | 66→43 / 28→24 / 19→13 | PASS |
| No rise or new polished light alarms | 2→0; 0 new | PASS |
| LinkedIn veto ≤22 FP, ≤20 shameable | 17 FP; 16 shameable | PASS |
| RAID dev ≤29 FP and every domain ≤2.5% | 19/2354; maximum 3/151 = 1.99% | PASS |
| PLOS / Federal Reserve / UCI FP ≤ baseline | 6→5 / 0→0 / 0→0 | PASS |
| Fingerprints / privacy / perf assertions | Existing assertions retained and pass | PASS |
| pnpm check; pnpm test | 0 errors/warnings; 674 passed, 1 skipped | PASS |
| 300-word mean <0.5ms; worst <1ms; creation <30ms | 0.361 / 0.880 / 8.61 ms | PASS |

The original ≥3×/≥40% requirement was explicitly withdrawn before final evaluation. The final verdict uses the replacement ship bar.

## Scoring and implementation

K remains 12. Category caps and the style-only ceiling of 39 remain unchanged. Ordinary Shame still requires ≥40 words and ≥4 phrase points; explicit fingerprints retain the 80 floor and eight-word Shame guard. Three or more distinct counted phrase categories add one corroboration point per category beyond two, capped at two total; the bonus is spread proportionally over visible phrase signals. Style does not earn this bonus. Style support remains bounded by independent phrase evidence.

Ordinary new social formulas are capped at three base points. A reader question plus an audience call-out, or a stock turning-point sentence plus a reader question, stays below 40. Three separate two-point phrase families can cross 40. Literal unrendered Markdown and unfinished slots are stronger residue. New explicit assistant/prompt fingerprints preserve the distinction between a visible artifact and ordinary style.

The new pack shares a WeakMap-cached linear shape scan, consumes existing line/sentence/word spans and uses module-compiled patterns. Protected examples cannot establish framework labels or template slots. Regex compilation now batches at most sixteen candidate sources, reducing unrelated sticky checks while retaining all overlapping spans and isolated capture semantics. No runtime network, DOM, dependency or platform selector was added.

## New rules

| Rule (pasted-output prefix) | Weight / kind | Rationale |
| --- | --- | --- |
| template-labels | 12 / fingerprint | Leaked Hook/CTA fields or a complete copywriting framework are explicit prompt residue. |
| unfilled-slot | 8 / phrase | Unresolved names, links, template braces and zero-item template numbers show an unfinished draft. |
| markdown-bold | 4.5 / phrase | Literal bold delimiters remain visible when the destination does not render Markdown. |
| markdown-heading | 4.5 / phrase | Literal heading delimiters remain in the published body. |
| asterisk-list | 2 / style | Repeated literal asterisk bullets corroborate pasted formatting; style only. |
| labeled-list | 3 / style | Three list items repeat the label-and-explanation skeleton; style only. |
| closing-question | 3 / phrase | Covers final audience questions, including inline hashtag tails and colon introductions. |
| audience-callout | 2 / phrase | A named audience is called out before an engagement question; weak alone. |
| aphorism-tail | 1.5 / phrase | An exact stock motivational ending is visible, without scoring lack of specifics. |
| imperative-triplet | 2.25 / style | Three short imperative sentences repeat a visible cadence; style only. |
| fragment-triplet | 0.25 / style | Three clipped prose fragments corroborate wording; technical headings excluded. |
| repeated-openings | 1 / style | Three adjacent sentences repeat a stock opening word; style only. |
| listicle-hook | 2 / phrase | Explicit count-plus-tips/lessons framing; a normal list alone is insufficient. |
| story-turn | 3 / phrase | Names a recurring turning-point story beat; weak alone. |
| lesson-formula | 2 / phrase | Names stock lesson, counterintuitive insight and replication framing. |
| motivational-stock | 3 / phrase | Exact motivational slogans; repeats use square-root scaling. |
| takeaway-label | 1.5 / phrase | A labeled takeaway announces the story moral; weak alone. |
| save-cta | 1.5 / phrase | A save/bookmark/direct-message CTA; weak alone. |
| keyword-request | 3 / phrase | A quoted keyword is requested in comments or messages. |
| stat-hook | 3 / phrase | An opening percentage claim is shown; no claim that its truth/source is verified. |
| possible-draft | 12 / fingerprint | The assistant explicitly introduces a possible or LinkedIn draft. |
| assistant-offer | 4 / phrase | Narrow editing offers earn phrase points, never a fingerprint floor. |
| live-search-disclaimer | 12 / fingerprint | An explicit inability-to-browse disclaimer leaked into the post. |
| writing-advice | 8 / phrase | Hook/CTA writing instructions or a reusable-post scaffold remain instead of a finished draft. |
| sure-opener | 2 / style | Mined assistant acknowledgement is weak style evidence. |
| title-label | 2 / style | Mined Title field is weak style evidence. |


## Changed existing weights

| Rule | Before → after | Human-side evidence for reduction |
| --- | --- | --- |
| ai-vocabulary.explainer-idioms | 2 → 0.25 | 1 raidTrain FP contributions |
| ai-vocabulary.tier2 | 2 → 1 | 2 raidTrain FP contributions |
| negation-pivot.not-x-but-y | 6 → 4 | 28 raidTrain FP contributions; 14 raidDev FP contributions; 1 polished FP contributions |
| hedging.parenthetical | 3 → 0.25 | 1 raidTrain FP contributions |
| engagement-bait.formulaic-opener | 5 → 0.25 | 1 raidTrain FP contributions |
| robotic-rhythm.rule-of-three | 3 → 1.5 | 60 raidTrain FP contributions; 24 raidDev FP contributions; 4 permissive FP contributions; 2 polished FP contributions |

No first-party rule was removed or zeroed. No weight fell because an AI corpus lacked it. Human evidence excludes LinkedIn: that corpus was a configuration veto only. Vendor dictionaries remain inactive; no vendor statistical proxy or common unigram was added. MINED supplied the named assistant acknowledgements/possible-draft/Title candidates, not ordinary function-word features.

## Search and isolation

Prompt groups use exactly `int(sha256("target-v1:" + promptId)[:8],16) % 10 < 6`. This yields 290 tune and 160 holdout rows. All model answers for a prompt stay together. Tuning used target-tune obvious recall first, some recall second, and a deterministic source-hash subsample of RAID chat train positives as a final tie-break. All RAID train humans supplied fitting evidence; RAID dev, permissive samples and light-polished controls supplied gates. New rules began at editorial weights. Bounded coordinate passes evaluated explicit weight choices and K, category caps, style ceiling, family bonus and short-post K.

Every attempted configuration is logged. Broad word-weight increases were rejected; all old rule ceilings then stayed at editorial levels. A higher-recall formula configuration was also rejected because two ordinary social conventions could suffice. The final conservative search caps new ordinary formulas at three base points. A mixed style/phrase-family bonus was explored before the owner’s stop request and rejected. No exploration occurred after that request. The selected code then received only conservative regression fixes, followed by public dev validation and a frozen final snapshot.

Final public dev metrics are authoritative: raw-feature replay preceded the narrow maintenance-list, cadence and editing-offer fixes. No target holdout, fresh text, LinkedIn holdout, RAID test, external W&I/AESLC or DetectRL-X test output guided a decision. The new fresh prompts were first scored by the immutable baseline after selection, then once by the frozen final engine. W&I/AESLC remain final-only.

The initial polished baseline was partial while writers were active. `baseline-polished-complete.json` supersedes it, using the immutable baseline and the completed files. Deduplication keeps the first id in each file. The final local receipts show 120 distinct ids in each file (240 rows; 160 light and 80 LinkedIn), rather than the earlier reported 113 Gemini ids; SHA-256 receipts pin exactly what was evaluated. No missing Luna-low output was assumed.

## Test changes and justification

| Change | Reason |
| --- | --- |
| Add 26 rule positives, protected-example negatives, exact span checks and combination guards | New evidence must be visible, reproducible and safe around quotations/code. |
| Add overlapping/closing matcher tests across 40 regex rules and reversed order | Bounded regex batches must preserve cross-batch match semantics. |
| Pack count 10→11; add a first-party positive; restrict upstream-attribution assertion to upstream packs | The new original pack introduces no borrowed license requirement. |
| Synthetic hiring editor-note now expects visible unresolved-slot evidence | Owner explicitly includes unfinished link placeholders in zero-effort draft residue. |
| Remove [Product Name] from ambiguous-typography negative list; test it as an unfinished slot | Strong template residue now has its own dedicated positive regression. |
| Chatbot launch expects pasted-output.unfilled-slot instead of the weaker old placeholder signal | The stronger rule wins the same occurrence; fingerprint score and Shame assertions are retained. |
| Reader-question regression expects the broader pasted-output.closing-question signal | The stronger exact same evidence supersedes the narrow rule after deduplication. |
| Two synthetic explainer checks use ≥60 instead of ≥70 | Ordinary contrast and enumeration weights fell on actual human/light-polished false alarms; unchanged wording still remains actionable. |
| Three-family score expectation uses 11 instead of 10 evidence points | The capped family corroboration bonus is now counted and displayed. |
| Regenerate vendor inventory report | Its source hashes track first-party changes; no vendor matcher or weight was activated. |
| Exclude offline instrumentation from type checking with local ts-nocheck comments | Only ignored transformed cache modules have non-product return/context types; product files remain checked. |

All original fingerprint, privacy and performance assertions are unchanged and green. No threshold/budget test was relaxed. `pnpm check`: zero errors and warnings. `pnpm test --maxWorkers=1`: 674 passed, one pre-existing optional recall-report test skipped. Two Node harness tests pass (exact prompt hashing and LF JSONL parsing with literal Unicode line separators).

## Performance

| Engine | 300-word mean | Worst of 1000 calls | Worst creation (40 runs) |
| --- | --- | --- | --- |
| Baseline | 0.328 ms | 1.074 ms | 6.55 ms |
| Final | 0.361 ms | 0.880 ms | 8.61 ms |

200 distinct dev excerpts (100 human, 100 chat AI), five timed calls each after warmup and GC. The existing full-vendor 2,000-post benchmark and all pathological-input timing tests also pass. The baseline worst call occasionally exceeds 1ms on this shared machine; the final worst call is below the strict 1ms gate.

## Risks and limitations

- LinkedIn human controls lost nearly all line breaks. They check wording, not layout. Layout checks instead use newline-preserving RAID humans and polished controls; common layout rules retain weak style evidence. No real live-feed authorship claim is established.
- Fresh recall is still only 61/351 (17.4%). GPT-5.6-Luna fresh recall is especially weak (2/117). Many subtle/clean generations remain outside the nameable-tell target.
- Polished LinkedIn packaging rises from 4/80 to 37/80, while light polishing falls from 2/160 to 0/160. The owner explicitly left the packaging category report-only; this unresolved product boundary matters before broad release.
- Effortful-prompt AI flags rise from 9/210 to 30/210. Detailed prompting does not guarantee the absence of visible artifacts, and a score still cannot prove effort or authorship.
- General RAID/external/DetectRL-X AI recall declines. That trade-off is consistent with the redefined target but should remain visible to reviewers.
- DetectRL-X human dates remain unverified; its FP is a warning signal. Human corpora have genre, author and provenance bias, and grouped prompt/model examples are correlated. Tiny per-model cells have large uncertainty.
- The heuristic cannot distinguish an AI-generated unfinished placeholder from an equally unfinished human template; the signal is visible draft residue, not proof of model authorship.
- Runtime remains local. Text-bearing corpora, feature caches, snapshots and predictions remain under ignored data/eval/raw/round2. No browser, network, build, commit or extension delivery was performed.

## Reproduction and review

Read `frozen.json`, `criteria.json`, `baseline-identity.json`, `performance.json`, the per-split aggregate JSON, and the four search logs. `evaluate.mjs baseline|final`, `fresh-baseline.mjs`, `polished-baseline.mjs` and `freeze.mjs` refuse to overwrite one-shot receipts. Read cached predictions to regenerate this report (`node eval/round2/report.mjs`); do not rerun holdouts for selection. `features.mjs` and `tune.mjs` are development-only. Final immutable code is in the ignored `engine-final` snapshot; the active source is identical.
