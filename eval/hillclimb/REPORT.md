# Offline classifier hill-climb report

The inactive corrected proposal meets every requested numerical accuracy and timing criterion. RAID-test chat recall increased from **11.21% to 23.29% (+12.07 percentage points)**; human false positives fell from **28 to 1**. The external check improved both recall and false-positive counts. These results measure this corpus, not authorship certainty or release readiness. A low score never establishes human authorship.

The first final candidate failed. The permitted single correction selected the highest-recall configuration **already tried on RAID dev with zero dev human false positives**. **The external set was used once for selection.** Only aggregate PLOS and Federal Reserve failures motivated that correction; W&I/AESLC outputs were not used to choose it, refit weights, filter entries, or set a threshold. There was no second search or correction.

## Baseline versus corrected proposal

| Split / engine | Human FP ≥40 | Chat/AI recall ≥40 | Recall ≥60 | AUROC (unthresholded public score) | Shameable human FP |
| --- | --- | --- | --- | --- | --- |
| dev / baseline | 29/2354 (1.23%) | 1206/10800 (11.17%) | 3.61% | 0.7118 | 26 |
| dev / corrected | 0/2354 (0.00%) | 2566/10800 (23.76%) | 3.94% | 0.8920 | 0 |
| test / baseline | 28/2342 (1.20%) | 1211/10800 (11.21%) | 3.73% | 0.7159 | 26 |
| test / corrected | 1/2342 (0.04%) | 2515/10800 (23.29%) | 4.56% | 0.8863 | 1 |
| external / baseline | 19/1351 (1.41%) | 114/834 (13.67%) | 5.64% | 0.6757 | 17 |
| external / corrected | 1/1351 (0.07%) | 204/834 (24.46%) | 6.00% | 0.8154 | 1 |

RAID recall excludes all base/completion models. External recall includes all rows labelled AI, including the disclosed synthetic positives; mixed rows are excluded from both positive and negative denominators. RAID domains are sampled equally on the AI side, so overall and domain-macro recall coincide. AUROC uses the public integer 0–100 score, with ties worth one half.

A source-group bootstrap of the cached final test predictions (2,000 replicates, fixed seed) gives a 95% percentile interval of **11.06 to 13.07 pp** for the recall improvement. This interval covers sampling variability within RAID, not domain shift.

## Criteria

| Criterion | Measured result | Pass |
| --- | --- | --- |
| RAID-test chat recall ≥ baseline +5 pp | +12.07 pp | yes |
| RAID-test human FP ≤ max(baseline, 1%) | 0.04% ≤ 1.20% | yes |
| RAID-test every domain human FP ≤2.5% | maximum 0.74% | yes |
| External human FP count ≤ baseline | 1 ≤ 19 | yes |
| External pooled formal/non-native FP ≤ baseline | 1 ≤ 14 | yes |
| External shameable FP ≤ baseline | 1 ≤ 17 | yes |
| External AI recall ≥ baseline | 24.46% ≥ 13.67% | yes |
| All 12 frozen artifacts score 80 | 12/12 exactly 80 | yes |
| Mean <0.5 ms, worst <1 ms, creation <30 ms | 0.216 / 0.535 / 7.30 ms | yes |

## Data isolation and reproducibility

The CSV was streamed with Python csv.field_size_limit raised. SHA-256: `c5467bca6fc7f5c728c676450c7f84ce401df6c6ccc6d82c47e3b5f3c6d6fce4`. Keep 30–600 whitespace words. Split by `sha256('slop-hillclimb-v1:'+source_id)[:16] % 100`: train <60, dev 60–79, test ≥80. All eligible humans are kept after external exclusions. Human/AI texts from one source remain together. Excluded 1,280 external RAID row IDs and all 649 represented source groups (22,581 eligible CSV rows), including parallel generations.

| Split | Human | Chat AI | Base AI, informational | Source groups |
| --- | --- | --- | --- | --- |
| train | 7166 | 28800 | 0 | 7663 |
| dev | 2354 | 10800 | 1536 | 2530 |
| test | 2342 | 10800 | 1536 | 2521 |

Chat targets: gpt4, chatgpt, cohere-chat, llama-chat, mistral-chat, mpt-chat. Base models never enter train fitting or the objective. Each observed domain × model × decoding × penalty stratum keeps the lowest deterministic row hashes: at most 200 train / 75 dev / 75 test. Base rows have a separate 12-row stratum cap for informational dev/test results. Models with four released settings therefore have more sampled rows than those with two; per-model results below expose that imbalance.

Training balances classes and domains, and gives equal mass to observed generator/decoding/penalty strata. Sampling without repetition penalty occupies six of eighteen chat strata (one third), rather than dominating by row count or repetition. Presence is binary, so repeating one phrase a thousand times creates one feature. There is no human-source pretraining corpus or external-corpus fit.

The baseline was snapshotted from the dirty working tree, not HEAD: 77 registered first-party rules. Baseline dev/test/external each ran once. No test features were extracted. The test remained unused throughout the climb. Test and external each had one first-final pass and one corrective-final pass under the explicit correction exception; `correction.json` records this departure from the nominal baseline-plus-one-final protocol. No third candidate was evaluated. All locks and predictions are in the ignored cache.

Engine snapshot digest: `055545a3992612b684beed320bbb339edda3c83c015bee92dee2b06f84f44e30`. Current proposal digest: `a281f206ec5635037be8738bd510cbac87bee91e22ab5f561f0d86210d1c3612`. Vite SSR loads immutable snapshot public APIs; baseline and final use `analyzePost({text})`. Dev span replay reproduced every baseline score and Shame decision; the corrected public API matched all threshold and Shame counts. QA found and fixed a zero-word replay early-return mismatch on one punctuation-only dev generation; no threshold or Shame gate changed. All final corrected dev scores now replay exactly. Public results, including AUROC, are authoritative. See `replay.json`.

## Measurement and search

The feature pool has 8,958 features: all 77 first-party rules, every surviving vendor matcher, and safe literal/bounded-regex dropped candidates. 8,639 recovered/kept literals and 242 regexes are compiled in one production compilePhrases pass, alongside first-party raw custom outputs. Conditional riders/triggers and regex safety rejections are excluded; human-control hits, ordinary phrases, topic words and milestones are measured rather than rejected by judgment. Protected example spans are excluded from binary presence, while complete raw spans remain in the private replay cache.

Two train-only approaches were compared: (1) Jeffreys-smoothed AI/human log-rate ratios minus 1.28/1.645/1.96 standard errors, with support 10/25/50; (2) sparse nonnegative logistic regression using scipy L-BFGS-B with L1/L2 penalties. Coefficients below 0.01 are removed. Both require positive lift in at least 60% of supported domains and at least two released chat-model families. Domain support means at least eight combined hits; model support means at least five AI hits. Rare single-domain cues remain a risk.

The logistic fit uses binary first-party rule presence plus dictionary presence. Correlation is addressed jointly. Runtime retains the production span competition, category caps, repeats and style support; dev rescoring therefore uses the real scorer rather than treating a linear prediction as an engine score. Logistic intercepts stay offline. Nonnegative coefficients are scaled/capped to evidence points and the existing ≥40 boundary is calibrated by exact dev rescoring (rounded score 40 starts at approximately 6.03 evidence points with K=12).

All 276 attempted configurations are logged in runs.jsonl; 138 use the final formatting-evidence semantics. Earlier exploratory runs incorrectly treated a recovered format cue as phrase evidence; that was corrected before any final selection. Knobs tried: estimator, confidence, support, L1/L2 strength, common weight scale, per-rule cap, and style scale. K=12, style-only ceiling 39, existing category caps, and fingerprint floor 80 are unchanged. The selected corrected configuration is `27f09434-logistic-l13e-05-l20.0001-scale1-cap3-mix0-style1` (L1=0.00003, L2=0.0001, scale=1, cap=3). The stronger maximum-recall dev choice and its failed final metrics remain in final-*.json; corrected-*.json are the delivered proposal.

The optional Google Books Ngram baseline was absent at fitting and the last pre-final check. It did not influence the proposal. The likelihood fitter can consume exact/upper-bound token rates as 20-document human pseudo-counts using `1-exp(-rate*mean_document_words/1e6)`; unavailable phrases are not treated as observed. The logistic fits currently use RAID alone. The file arrived by the completion audit (see audit.json), after the frozen proposal had been evaluated. It did not help this run. Using it now requires a new, separately isolated experiment; it cannot be used to reopen this test.

Best dev-feasible llr: 32.93% recall, 7 human FP; `27f09434-llr-z1.28-n10-scale0.5-cap3-mix0-style1`.

Best dev-feasible logistic: 41.72% recall, 12 human FP; `27f09434-logistic-l10.0003-l20.0003-scale2-cap3-mix0-style1`.

## First final failure and single correction

| Split | First-final human FP | First-final AI recall ≥40 | Corrected human FP | Corrected AI recall ≥40 |
| --- | --- | --- | --- | --- |
| dev | 12 | 41.72% | 0 | 23.76% |
| test | 21 | 40.73% | 1 | 23.29% |
| external | 36 | 39.33% | 1 | 24.46% |

The first final had 16 PLOS FP versus baseline 6, and 6 Federal Reserve FP versus baseline 0. Repeated institutional templates and formal vocabulary generalized poorly despite meeting original dev gates. The correction tightened the dev false-positive budget to zero and selected from existing runs, without examining or copying any external text or retuning to the restricted sources. External results are no longer an untouched estimate for the final selection, and no further correction is permitted.

## Dev breakdowns

### By domain

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| abstracts | 11 → 0 / 304 | 12.89% → 27.33% (1350) | 3.56% → 2.37% | 8 → 0 |
| books | 3 → 0 / 257 | 11.78% → 42.74% (1350) | 2.74% → 9.33% | 3 → 0 |
| news | 0 → 0 / 332 | 11.04% → 20.74% (1350) | 3.11% → 2.96% | 0 → 0 |
| poetry | 5 → 0 / 303 | 14.67% → 13.04% (1350) | 5.93% → 0.44% | 5 → 0 |
| recipes | 0 → 0 / 353 | 0.22% → 0.67% (1350) | 0.07% → 0.07% | 0 → 0 |
| reddit | 3 → 0 / 341 | 4.67% → 5.93% (1350) | 1.04% → 0.89% | 3 → 0 |
| reviews | 6 → 0 / 151 | 22.74% → 52.96% (1350) | 9.11% → 11.19% | 6 → 0 |
| wiki | 1 → 0 / 313 | 11.33% → 26.67% (1350) | 3.33% → 4.22% | 1 → 0 |

### By model

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| chatgpt | 0 → 0 / 0 | 22.92% → 46.58% (1200) | 9.58% → 15.50% | 0 → 0 |
| cohere | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| cohere-chat | 0 → 0 / 0 | 4.17% → 5.33% (1200) | 0.58% → 0.33% | 0 → 0 |
| gpt2 | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| gpt3 | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| gpt4 | 0 → 0 / 0 | 24.25% → 30.42% (1200) | 10.58% → 3.00% | 0 → 0 |
| human | 29 → 0 / 2354 | n/a → n/a (0) | n/a → n/a | 26 → 0 |
| llama-chat | 0 → 0 / 0 | 14.75% → 27.75% (2400) | 4.58% → 4.33% | 0 → 0 |
| mistral | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| mistral-chat | 0 → 0 / 0 | 6.04% → 22.67% (2400) | 0.75% → 2.38% | 0 → 0 |
| mpt | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| mpt-chat | 0 → 0 / 0 | 3.79% → 15.33% (2400) | 0.54% → 1.58% | 0 → 0 |

### By length

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| 150–299 | 17 → 0 / 1682 | 10.27% → 22.30% (5111) | 3.17% → 2.80% | 14 → 0 |
| 300–600 | 10 → 0 / 414 | 23.02% → 42.28% (2654) | 8.06% → 10.47% | 10 → 0 |
| 30–79 | 0 → 0 / 13 | 0.00% → 3.27% (490) | 0.00% → 0.00% | 0 → 0 |
| 80–149 | 2 → 0 / 245 | 2.75% → 11.32% (2545) | 0.55% → 0.16% | 2 → 0 |

### By decoding

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| greedy | 0 → 0 / 0 | 11.22% → 25.20% (5400) | 3.80% → 4.26% | 0 → 0 |
| n/a | 29 → 0 / 2354 | n/a → n/a (0) | n/a → n/a | 26 → 0 |
| sampling | 0 → 0 / 0 | 11.11% → 22.31% (5400) | 3.43% → 3.61% | 0 → 0 |

### By repetition_penalty

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| n/a | 29 → 0 / 2354 | n/a → n/a (0) | n/a → n/a | 26 → 0 |
| no | 0 → 0 / 0 | 12.99% → 23.94% (7200) | 4.72% → 4.19% | 0 → 0 |
| yes | 0 → 0 / 0 | 7.53% → 23.39% (3600) | 1.39% → 3.42% | 0 → 0 |

### Base/completion models (informational only)

| Model | N | Recall ≥40 baseline → corrected |
| --- | --- | --- |
| cohere | 192 | 0.52% → 0.00% |
| gpt2 | 384 | 2.08% → 0.26% |
| gpt3 | 192 | 1.56% → 0.00% |
| mistral | 384 | 1.04% → 0.52% |
| mpt | 384 | 2.08% → 1.30% |

## Test breakdowns

### By domain

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| abstracts | 10 → 0 / 344 | 13.33% → 25.93% (1350) | 3.26% → 2.81% | 9 → 0 |
| books | 1 → 0 / 264 | 10.37% → 40.74% (1350) | 2.00% → 9.48% | 1 → 0 |
| news | 3 → 0 / 299 | 11.56% → 20.96% (1350) | 3.48% → 3.78% | 2 → 0 |
| poetry | 0 → 0 / 321 | 14.30% → 11.56% (1350) | 5.78% → 0.81% | 0 → 0 |
| recipes | 1 → 0 / 322 | 0.15% → 0.15% (1350) | 0.07% → 0.07% | 1 → 0 |
| reddit | 1 → 0 / 306 | 5.26% → 5.93% (1350) | 1.78% → 0.81% | 1 → 0 |
| reviews | 11 → 1 / 135 | 22.37% → 54.59% (1350) | 9.04% → 13.78% | 11 → 1 |
| wiki | 1 → 0 / 351 | 12.37% → 26.44% (1350) | 4.44% → 4.96% | 1 → 0 |

### By model

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| chatgpt | 0 → 0 / 0 | 24.25% → 48.00% (1200) | 10.33% → 15.00% | 0 → 0 |
| cohere | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| cohere-chat | 0 → 0 / 0 | 3.83% → 6.58% (1200) | 1.00% → 0.42% | 0 → 0 |
| gpt2 | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| gpt3 | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| gpt4 | 0 → 0 / 0 | 23.50% → 32.17% (1200) | 10.17% → 5.00% | 0 → 0 |
| human | 28 → 1 / 2342 | n/a → n/a (0) | n/a → n/a | 26 → 1 |
| llama-chat | 0 → 0 / 0 | 14.08% → 26.21% (2400) | 4.21% → 4.58% | 0 → 0 |
| mistral | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| mistral-chat | 0 → 0 / 0 | 6.75% → 22.12% (2400) | 1.33% → 4.50% | 0 → 0 |
| mpt | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| mpt-chat | 0 → 0 / 0 | 3.83% → 13.08% (2400) | 0.50% → 1.25% | 0 → 0 |

### By length

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| 150–299 | 15 → 0 / 1645 | 10.68% → 22.79% (5067) | 3.41% → 3.91% | 14 → 0 |
| 300–600 | 12 → 1 / 457 | 21.99% → 40.54% (2679) | 8.36% → 10.71% | 11 → 1 |
| 30–79 | 0 → 0 / 18 | 0.78% → 2.35% (510) | 0.00% → 0.00% | 0 → 0 |
| 80–149 | 1 → 0 / 222 | 3.03% → 10.30% (2544) | 0.24% → 0.31% | 1 → 0 |

### By decoding

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| greedy | 0 → 0 / 0 | 10.76% → 24.46% (5400) | 3.70% → 5.09% | 0 → 0 |
| n/a | 28 → 1 / 2342 | n/a → n/a (0) | n/a → n/a | 26 → 1 |
| sampling | 0 → 0 / 0 | 11.67% → 22.11% (5400) | 3.76% → 4.04% | 0 → 0 |

### By repetition_penalty

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| n/a | 28 → 1 / 2342 | n/a → n/a (0) | n/a → n/a | 26 → 1 |
| no | 0 → 0 / 0 | 12.96% → 24.22% (7200) | 4.82% → 4.76% | 0 → 0 |
| yes | 0 → 0 / 0 | 7.72% → 21.42% (3600) | 1.56% → 4.17% | 0 → 0 |

### Base/completion models (informational only)

| Model | N | Recall ≥40 baseline → corrected |
| --- | --- | --- |
| cohere | 192 | 2.08% → 0.52% |
| gpt2 | 384 | 1.82% → 0.26% |
| gpt3 | 192 | 0.52% → 0.00% |
| mistral | 384 | 1.04% → 0.52% |
| mpt | 384 | 1.56% → 0.52% |

## External breakdowns

### By domain

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| abstracts | 1 → 0 / 80 | 16.25% → 31.25% (80) | 3.75% → 5.00% | 1 → 0 |
| academic-abstract | 6 → 1 / 160 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 6 → 1 |
| books | 0 → 0 / 80 | 12.50% → 52.50% (80) | 2.50% → 12.50% | 0 → 0 |
| email | 1 → 0 / 118 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 1 → 0 |
| essay | 7 → 0 / 255 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 5 → 0 |
| forum | 0 → 0 / 0 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| instructions | 0 → 0 / 0 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| letter | 0 → 0 / 43 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| narrative | 0 → 0 / 0 | 20.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| news | 0 → 0 / 80 | 17.46% → 23.02% (126) | 5.56% → 3.17% | 0 → 0 |
| poetry | 0 → 0 / 80 | 22.50% → 18.75% (80) | 13.75% → 0.00% | 0 → 0 |
| product-review | 0 → 0 / 2 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| professional-release | 0 → 0 / 25 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| recipes | 0 → 0 / 80 | 0.00% → 0.00% (80) | 0.00% → 0.00% | 0 → 0 |
| reddit | 1 → 0 / 80 | 3.75% → 3.75% (80) | 1.25% → 1.25% | 1 → 0 |
| reference | 0 → 0 / 0 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| review | 0 → 0 / 80 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| reviews | 3 → 0 / 80 | 43.75% → 72.50% (80) | 23.75% → 23.75% | 3 → 0 |
| service-review | 0 → 0 / 4 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| social-post | 0 → 0 / 24 | 0.00% → 0.00% (98) | 0.00% → 0.00% | 0 → 0 |
| wiki | 0 → 0 / 80 | 15.00% → 40.00% (80) | 5.00% → 15.00% | 0 → 0 |

### By model

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| Meta-Llama-3-8B-Instruct | 0 → 0 / 0 | 0.00% → 0.00% (15) | 0.00% → 0.00% | 0 → 0 |
| Mistral-7B-Instruct-v0.2 | 0 → 0 / 0 | 0.00% → 0.00% (16) | 0.00% → 0.00% | 0 → 0 |
| Qwen2-7B-Instruct | 0 → 0 / 0 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| chatgpt | 0 → 0 / 0 | 23.12% → 39.38% (160) | 10.00% → 15.62% | 0 → 0 |
| claude | 0 → 0 / 0 | 12.50% → 37.50% (8) | 0.00% → 0.00% | 0 → 0 |
| gpt-4o | 0 → 0 / 0 | 54.55% → 72.73% (11) | 18.18% → 18.18% | 0 → 0 |
| gpt4 | 0 → 0 / 0 | 25.62% → 30.00% (160) | 10.62% → 5.00% | 0 → 0 |
| gpt4o | 0 → 0 / 0 | 0.00% → 0.00% (57) | 0.00% → 0.00% | 0 → 0 |
| human | 5 → 0 / 640 | n/a → n/a (0) | n/a → n/a | 5 → 0 |
| humanized_o1-pro | 0 → 0 / 0 | 0.00% → 0.00% (5) | 0.00% → 0.00% | 0 → 0 |
| llama-chat | 0 → 0 / 0 | 10.62% → 29.38% (160) | 4.38% → 5.62% | 0 → 0 |
| mistral-chat | 0 → 0 / 0 | 3.75% → 18.75% (160) | 1.25% → 3.75% | 0 → 0 |
| o1-pro | 0 → 0 / 0 | 0.00% → 12.50% (8) | 0.00% → 0.00% | 0 → 0 |
| paraphrased_gpt-4o | 0 → 0 / 0 | 55.56% → 44.44% (9) | 33.33% → 0.00% | 0 → 0 |
| unknown | 14 → 1 / 711 | 1.67% → 0.00% (60) | 0.00% → 0.00% | 12 → 1 |

### By length

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| 150–299 | 9 → 0 / 769 | 14.81% → 28.70% (324) | 7.41% → 4.63% | 8 → 0 |
| 300–600 | 9 → 1 / 246 | 25.31% → 42.74% (241) | 9.54% → 14.52% | 8 → 1 |
| 30–79 | 0 → 0 / 199 | 0.61% → 0.00% (164) | 0.00% → 0.00% | 0 → 0 |
| 80–149 | 1 → 0 / 137 | 3.81% → 7.62% (105) | 0.00% → 0.00% | 1 → 0 |

### By decoding

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| n/a | 19 → 1 / 1351 | 13.67% → 24.46% (834) | 5.64% → 6.00% | 17 → 1 |

### By repetition_penalty

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| n/a | 19 → 1 / 1351 | 13.67% → 24.46% (834) | 5.64% → 6.00% | 17 → 1 |

### By source

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| aeslc-2019 | 1 → 0 / 118 | n/a → n/a (0) | n/a → n/a | 1 → 0 |
| federal-reserve | 0 → 0 / 25 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| human-detectors-2025 | 0 → 0 / 0 | 29.27% → 39.02% (41) | 12.20% → 4.88% | 0 → 0 |
| plos-2020 | 6 → 1 / 160 | n/a → n/a (0) | n/a → n/a | 6 → 1 |
| raid-2024 | 5 → 0 / 640 | 15.78% → 29.38% (640) | 6.56% → 7.50% | 5 → 0 |
| synthetic-general-v1 | 0 → 0 / 0 | 1.67% → 0.00% (60) | 0.00% → 0.00% | 0 → 0 |
| uci-sentiment-2015 | 0 → 0 / 86 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| unmasking | 0 → 0 / 24 | 0.00% → 0.00% (93) | 0.00% → 0.00% | 0 → 0 |
| write-improve-2.1 | 7 → 0 / 298 | n/a → n/a (0) | n/a → n/a | 5 → 0 |

### By subset

| Group | Human FP before → after / N | AI recall ≥40 before → after (N) | Recall ≥60 before → after | Shameable FP |
| --- | --- | --- | --- | --- |
| casual | 4 → 0 / 270 | n/a → n/a (0) | n/a → n/a | 4 → 0 |
| creative | 0 → 0 / 80 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| dataset-ai | 0 → 0 / 0 | 16.59% → 29.96% (681) | 6.90% → 7.34% | 0 → 0 |
| formal | 7 → 1 / 425 | n/a → n/a (0) | n/a → n/a | 7 → 1 |
| instructions | 0 → 0 / 80 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| narrative | 0 → 0 / 80 | n/a → n/a (0) | n/a → n/a | 0 → 0 |
| non-native | 7 → 0 / 298 | n/a → n/a (0) | n/a → n/a | 5 → 0 |
| professional | 1 → 0 / 118 | n/a → n/a (0) | n/a → n/a | 1 → 0 |
| social-ai | 0 → 0 / 0 | 0.00% → 0.00% (93) | 0.00% → 0.00% | 0 → 0 |
| synthetic-ai | 0 → 0 / 0 | 1.67% → 0.00% (60) | 0.00% → 0.00% | 0 → 0 |
| synthetic-mixed | 0 → 0 / 0 | n/a → n/a (0) | n/a → n/a | 0 → 0 |

## Top contributing measured cues

Ranked by counted evidence points across chat-AI dev documents. These are co-occurring contributions, not causal ablations. Matcher strings below come from the dictionary inventory, not dataset quotations.

| Matcher / rule | Points | Train human hits / N | Train AI hits / N | Dev AI posts | Counted AI points |
| --- | --- | --- | --- | --- | --- |
| ['overall,'] | 2.142 | 27/7166 | 3703/28800 | 1415 | 3030.9 |
| ['including'] | 0.672 | 544/7166 | 6211/28800 | 2297 | 1543.6 |
| ['navigate'] | 2.523 | 7/7166 | 1356/28800 | 545 | 1375.0 |
| ['significant'] | 0.923 | 133/7166 | 3126/28800 | 1150 | 1061.5 |
| [':[ \\t]{0,8}\\n[ \\t]{0,8}[-*1]'] | 2.046 | 37/7166 | 2171/28800 | 822 | 1030.9 |
| ['challenges'] | 0.93 | 75/7166 | 2668/28800 | 1013 | 942.1 |
| ['journey'] | 0.835 | 94/7166 | 2983/28800 | 1107 | 924.3 |
| ['despite'] | 0.697 | 261/7166 | 3548/28800 | 1302 | 907.5 |
| ['thought-provoking'] | 1.985 | 0/7166 | 1118/28800 | 430 | 853.6 |
| ['insights'] | 2.086 | 13/7166 | 1082/28800 | 379 | 790.6 |
| ['various'] | 0.551 | 230/7166 | 3384/28800 | 1313 | 723.5 |
| ['must-see'] | 1.813 | 2/7166 | 1054/28800 | 380 | 688.9 |
| ['top-notch'] | 2.234 | 0/7166 | 828/28800 | 308 | 688.1 |
| ['explores'] | 0.963 | 29/7166 | 1485/28800 | 568 | 547.0 |
| ['implications'] | 1.284 | 30/7166 | 1103/28800 | 389 | 499.5 |
| ['delves'] | 1.249 | 5/7166 | 1035/28800 | 397 | 495.9 |
| ['solace'] | 2.017 | 5/7166 | 600/28800 | 242 | 488.1 |
| ['presents'] | 1.039 | 65/7166 | 1226/28800 | 459 | 476.9 |
| ['resilience'] | 1.464 | 3/7166 | 803/28800 | 322 | 471.4 |
| ['navigates'] | 2.275 | 0/7166 | 616/28800 | 204 | 464.1 |

## Guesswork reversed

435 selected features include a previously dropped origin; 2733 surviving-vendor features receive zero weight. Duplicates may have both kept and dropped origins. Entries absent from this RAID sample receive no coefficient even if the dictionary sounds plausible. Per-entry and per-domain/model train counts are in entry-stats.json; the generated pack includes compact counts and source provenance.

| Previously dropped matcher | Prior reason(s) | Now points | Train human / AI hits |
| --- | --- | --- | --- |
| ['navigate'] | pos-tag-required, unigram-evidence | 2.523 | 7 / 1356 |
| ['navigates'] | pos-tag-required, unigram-evidence | 2.275 | 0 / 616 |
| ['top-notch'] | short-or-hyphenated | 2.234 | 0 / 828 |
| ['overall,'] | unigram-evidence | 2.142 | 27 / 3703 |
| ['insights'] | unigram-evidence | 2.086 | 13 / 1082 |
| [':[ \\t]{0,8}\\n[ \\t]{0,8}[-*1]'] | format-or-grammar-alone | 2.046 | 37 / 2171 |
| ['solace'] | unigram-evidence | 2.017 | 5 / 600 |
| ['thought-provoking'] | short-or-hyphenated | 1.985 | 0 / 1118 |
| ['a reminder'] | fiction-or-generic | 1.892 | 2 / 473 |
| ['must-see'] | short-or-hyphenated | 1.813 | 2 / 1054 |
| ['prioritize'] | non-style, unigram-evidence | 1.773 | 1 / 173 |
| ['beacon'] | unigram-evidence | 1.577 | 4 / 511 |
| ['unwavering'] | unigram-evidence | 1.574 | 1 / 287 |
| ["\\b(?:i (?:know\|realize) i(?:'\|')m not alone\|you(?:'\|')re not (?:alone\|imagining it)\|if you(?:'\|')ve (?:felt\|noticed) [\\w ''-]{2,36}, you(?:'\|')re not (?:alone\|imagining it))\\b"] | human-control | 1.501 | 1 / 67 |
| ['enthusiasts'] | unigram-evidence | 1.485 | 2 / 238 |
| ['sparked'] | unigram-evidence | 1.466 | 11 / 296 |
| ['resilience'] | unigram-evidence | 1.464 | 3 / 803 |
| ['fleeting'] | unigram-evidence | 1.434 | 7 / 239 |

| Previously kept matcher, now zero | Train human / AI hits |
| --- | --- |
| ['\\b(?:game.?chang(?:er\|ing)\|paradigm shift\|cutting.?edge\|state-of-the-art\|best-in-class\|world-class\|next-level\|seamless(?:ly)?\|frictionless\|turnkey\|synergy\|supercharge\|revolutioniz\\w{1,32}\|transformative\|disruptive innovation)\\b'] | 230 / 2057 |
| ['delves into'] | 3 / 425 |
| ['is able to'] | 51 / 211 |
| ['\\bnavigat\\w{1,32} the (?:complexities\|challenges\|nuances\|uncertaint\\w{1,32}) of\\b'] | 0 / 163 |
| ['serves as a reminder'] | 0 / 114 |
| ['a tapestry of'] | 1 / 83 |
| ['^(?:[^.!?\\n]{0,80}\\?)'] | 69 / 80 |
| ['delve into'] | 2 / 77 |
| ['the transformative power of'] | 0 / 68 |
| ['at the heart of'] | 5 / 64 |
| ['has the ability to'] | 7 / 57 |
| ['leaves a lasting'] | 0 / 55 |
| ['delving into'] | 1 / 48 |
| ['navigate the complexities'] | 0 / 48 |
| ['left an indelible mark'] | 0 / 46 |
| ["let's be real"] | 1 / 45 |
| ['the truth is'] | 13 / 45 |
| ['embarking on'] | 5 / 41 |

First-party examples removed or downweighted include social-closer and formulaic-opener rules, generic transitions, emoji/hashtag/bypass cues and several narrative tropes. Explicit fingerprints retain their original weights regardless of sample support. This preserves rare explicit artifacts but regresses some earlier hand-written synthetic expectations; those tradeoffs are visible in validation.

## Performance and scratch validation

| Engine | Mean analyze | p95 | Worst single call | Worst engine creation |
| --- | --- | --- | --- | --- |
| engine-base | 0.310 ms | 0.456 ms | 0.680 ms | 6.29 ms |
| engine-variant | 0.216 ms | 0.284 ms | 0.535 ms | 7.30 ms |

Timing used 200 different 300-whitespace-word excerpts from dev (100 human, 100 chat AI), 2,500 warm calls, explicit GC before timing, then five calls per input (1,000 calls). Reported worst is the actual maximum call, not a median or trimmed tail. Engine creation includes every selected rule and takes the maximum of 40 creations. Import/transpilation is excluded. Baseline and proposal ran serially; these Node timings do not certify Chromium or future machine contention.

The proposal was applied to an isolated temporary copy of the current dirty checkout with the frozen engine snapshot, using proposal.patch. No worktree/checkout source files were changed. `pnpm check` passed with zero errors/warnings. `pnpm test --maxWorkers=2` finished with **35 failures, 562 passes, 1 skipped** in **6 failing files**. The temporary copy was removed. These failures are not silently waived; the proposal is not ready to activate.

Failures fall into changed first-party rule-presence/weight expectations, synthetic recall and score floors, one ordinary checklist scoring 27 where a previous guardrail required <20 (although still below the ≥40 flag threshold), and tests assuming exactly ten packs/a fixture for every registered pack. API-level absence of formerly active weak bypass evidence also fails expectations. Engine compiler/context/score contracts, vendor checks, non-engine tests, and all 12 explicit fingerprints remain intact. All individual failing assertions are listed in VALIDATION.md without dataset text.

## Risks and limits

- RAID topic/domain correlation can turn genre words into signals. Per-domain consistency mitigates but does not remove it. Poetry and reviews differ from professional social posts. Models with more released decoding settings have more sampled rows; report per-model results rather than interpreting pooled recall as a market share estimate.
- RAID is dominated by 2023-era model generations and prompt continuations; it does not establish performance on contemporary reasoning models, paraphrasing, editing or adversarial attacks. The small external modern-model set and synthetic positives are heterogeneous.
- There is no provenance-verified LinkedIn-style human cohort. W&I learner essays and formal controls expose some risks but are evaluation only. Institutional releases are correlated; dozens of hits may describe one repeated template.
- The external set was used once for the permitted correction. A fresh independent release holdout is needed. The corrective-final evaluation is an explicit exception to the nominal single-final locked-test count; audit receipts preserve both candidates.
- Zero observed FP on dev and one on test do not imply zero population FP. Editorial score values are not calibrated authorship probabilities. Lower scores cannot be used as human-authorship claims.
- The dictionary Markdown separator row was inadvertently ingested as an extra `---` matcher (0.97 points, six human and 109 AI train presences). It remains in the frozen proposal to preserve the locked experiment and is documented as a harness artifact, not a licensed upstream entry. The parser now excludes Markdown delimiters by default; an explicit legacy compatibility option preserves v1 reproducibility and cache hashes reject silent changes. Audit its classification/provenance before activation; no post-final tuning or hidden result replacement was performed.
- Nonnegative logistic weights are not causal language markers. Correlated candidate lists, rare support and pre-existing vocabulary rules can still overlap. Historical search logs include one below-threshold score discrepancy on a zero-word punctuation-only generation. The replay now honors the public early return; no gate or proposal weight changed.
- W&I and AESLC licences prohibit using their data or derived information to build product data. They were final checks only and never entered feature extraction, fitting or selection. Outputs are aggregate only. Do not treat this report as commercial-use permission.
- Statistical weights are numbers derived from RAID text. RAID repository code is MIT, but underlying books/news/reviews/Reddit rights are mixed and not independently cleared. No text is bundled or redistributed; provenance and numeric derivation do not settle rights to product use.
- Unit regressions remain, including a human-style below-40 score guardrail. This is an experimental proposal, not a recommendation to register it without review.

## Files and reproduction

See README.md for commands, lock behavior and the single-correction workflow. Existing engine/test/eval-lib files, INTENTIONS.md and HANDOFF.md were not edited; no commit, push, browser or network call was made. All corpus text, spans, row-level predictions, engine copies and logs remain under ignored data/eval/raw/hillclimb/.

New source proposal: `src/lib/engine/packs/measured/index.ts` (not registered). Activation patch: `eval/hillclimb/proposal.patch` (registry import and reweighting only; no score.ts or index.ts algorithm change).

| New artifact group | Files |
| --- | --- |
| Harness | prepare.py; common.mjs; baseline.mjs; parse-drops.mjs; features.mjs; fit.py; climb.mjs; proposal.mjs; final.mjs; correct.mjs; benchmark.mjs; validate.py; diagnostics.mjs; report.py; run.mjs; harness.test.mjs |
| Docs | README.md; REPORT.md; PROGRESS.md; VALIDATION.md |
| Aggregate inventories | splits.json; candidates.json; entry-stats.json; dev-contributions.json; runs.jsonl; proposal.json; best-dev.json; correction.json; external-inputs.json; replay.json; audit.json |
| Aggregate outcomes | baseline-{dev,test,external}.json; final-{dev,test,external}.json (failed first final); corrected-{dev,test,external}.json (delivered); initial-{proposal,performance,validation}.json; performance.json; validation.json; frozen.json; uncertainty.json; criteria.json |
