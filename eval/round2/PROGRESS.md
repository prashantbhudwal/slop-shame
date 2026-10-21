# Round 2 progress

2026-10-21: Started in place from the dirty 77-rule editorial engine. Read owner definition (INTENTIONS item 31), first-party engine/packs, round-one reports and data manifest. Round-one measured pack remains inactive. No UI, adapter, entrypoint, public assets, intentions or handoff changes permitted; no builds/commits/network/browsers.

Frozen engine in ignored `data/eval/raw/round2/engine-base`. Harness enforces target prompt-group salt `target-v1:` and author-group human veto/holdout. Baseline and final evaluations use one-shot lock receipts and the public API; text-bearing predictions stay ignored. Candidate tuning may use only target tune, RAID train/dev, permissive human samples and polished controls; LinkedIn veto is rejection-only.

Next: run baseline once, inspect only tune-panel tells, implement visible artifacts and formula rules, extract tune/dev features, conduct inspectable gated coordinate search, freeze once, evaluate final once, run check/test/performance and report. Polished generators are still writing files; record completeness and score new baseline rows with the frozen engine before final freeze.

Baseline one-shot completed: target holdout obvious 10/106, some 1/53; LinkedIn holdout FP 66/9743; RAID test FP 28/2342; external FP 19/1351; DetectRL-X FP 26/704. Baseline polished was partial (68 rows) because generators were active; complete polished baseline will be scored separately with the same frozen engine. No final holdout has been rescored.

Two development searches retained (first-search*.json*, runs.jsonl). First exploratory search was rejected: allowing ordinary vocabulary/collocation increases could make one stock phrase decisive. Second search caps all old rules at editorial weights and allows decreases only when a counted contribution caused a human FP on RAID/permissive/light controls. LinkedIn is never used for weight evidence. 84/157 obvious and 18/133 some tune positives caught; dev gates: LI veto FP21/shame20, RAID human21 (every domain <=2.5%), permissive5, light0/160. Actual matched raw outputs replay public scorer exactly (59,110 rows). Search also compares K, short K, style ceilings, category caps and family bonuses. Selected K12/style39/unchanged caps, capped family bonus1 per phrase family beyond two, maximum2.

Integration QA in progress before freeze: fix labeled-list false match spanning unrelated maintenance labels; avoid counting numbered/capital headings as fragment cadence; keep unresolved placeholders as strong visible draft evidence (tests explicitly need new-definition expectations). New broad question detector supersedes old narrower question spans. Current baseline-only vendor benchmark exceeds budget; testing bounded regex batches to reduce unrelated sticky checks while retaining overlapping occurrences. No performance/privacy/fingerprint guard will be weakened.

Node26 readline splits valid JSON strings at literal U+2028. Round2 now streams LF-delimited JSONL directly, fixing cache parsing without modifying text. Earlier failed search starts loaded no holdouts and produced no candidate outputs.

## Complete — final review handoff

Owner stopped exploration and replaced the original 3×/40% criterion with “catch more on target holdout AND fresh, with no rise in final human controls.” No search occurred after that steer. Picked the conservative search: ordinary new formulas <=3 base points; no reliance on two weak social conventions. Final public tune: 78/290 total, including 70/157 obvious and 8/133 some. Dev gates all pass: LinkedIn veto17 FP/16 shameable; RAID19/2354 with max domain1.99%; PLOS5/Fed0/UCI0; polished light0/160.

Frozen pre-round2 baseline active sources are byte-identical to hillclimb/engine-base (20 files; baseline-identity.json). Newly supplied fresh set baseline scored once:24/351. Do not use the withdrawn contaminated live-source count68. Completed polished files:120 distinct ids per file in the final bytes, dedup keeps first id; baseline light2/160, LinkedIn4/80. Receipts pin the files, including the change from the earlier reported113 Gemini ids.

Final engine hash:262d4950092e01b7ac50e6b83d000417d4c150b0e9bd77d53347936efda5d31a. Frozen code copy: ignored engine-final. Final-only checks each ran once, with locks. Target holdout11→51/160 (obvious10→49/106; some1→2/53); fresh24→61/351. Human FP: LinkedIn holdout66→43/9743; RAID test28→24/2342; external19→13/1351; polished light2→0/160, no new alarms. ALL updated ship criteria pass. No corrective selection or holdout rerun.

Report-only: polished LinkedIn4→37/80, effortful-prompt9→30/210. DetectRL-X human26→19/704; AI801→690/2742. Fresh GPT-5.6-Luna3→2/117 remains weak. General RAID/external AI recall declines; this is not an improved universal AI detector. Layout limitation: human LinkedIn scrape lacks line breaks.

Engineering complete: pnpm check zero errors/warnings; pnpm test --maxWorkers=1:674 pass,1 optional report-generation skip. All12 frozen artifacts exactly80. Performance final mean0.361ms, worst0.880ms per300-word post, worst creation8.61ms. Existing vendor/pathological/privacy/fingerprint performance assertions pass without weaker budgets. Baseline worst timing1.074ms is disclosed; final passes strict budget. Two harness tests pass.

26 new first-party rules;6 old weights decreased solely on counted human FP contributions; none removed/zeroed. K12, original caps, style ceiling39; phrase-family bonus1 beyond2 categories, max2. Regex batches max16 preserve overlap behavior and satisfy full-vendor timing tests. Vendor report inventory hashes regenerated; vendors remain inactive.

Deliverables: REPORT.md (all baseline/final/model/set tables, rule weights/rationales, scoring, test expectation changes, risks); criteria.json; frozen.json; fingerprints.json; performance.json; rules.json; one-shot aggregates and search logs. All text-bearing inputs/caches/outputs remain ignored. INTENTIONS/HANDOFF/UI/adapter/entrypoints/public untouched by this task. No build, delivery, commit, network or browser. No task processes remain. Ready for orchestrator review; no implementation work remains.
