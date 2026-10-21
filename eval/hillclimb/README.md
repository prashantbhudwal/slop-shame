# Offline measure-and-hill-climb harness

This experiment measures local AI-text cues using RAID, fits nonnegative evidence weights, searches on grouped dev data, and produces an **inactive** engine proposal. A low Slop Index does not establish human authorship.

Read [REPORT.md](REPORT.md), [PROGRESS.md](PROGRESS.md), [VALIDATION.md](VALIDATION.md), and [correction.json](correction.json). `corrected-*.json` describes the delivered proposal. `final-*.json` preserves the failed first final. Nothing registers the generated pack in the working extension.

## Run or resume

From the repository root, with existing pnpm dependencies, Python 3, numpy and scipy. No installation, dataset download, browser, model API, or network call is needed. The CSV must already exist at `data/eval/raw/downloads/raid-train_none.csv`.

```sh
node --test eval/hillclimb/harness.test.mjs
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 VECLIB_MAXIMUM_THREADS=2 \
  node eval/hillclimb/run.mjs --allow-correction
```

The runner executes serially and resumes cached checkpoints. `--allow-correction` authorizes exactly one existing zero-dev-FP configuration to replace a first final that fails public PLOS/Federal Reserve controls. It does not use W&I or AESLC results for the choice. The recorded experiment used that correction; it evaluates one extra final candidate and says explicitly that the external set was used once for selection.

One-shot receipts are written **before** baseline and final scoring. Existing completed predictions are reused; an incomplete receipt stops the run for audit. There is no automatic test unlock/reset command. Do not delete locks to continue climbing. Keep a completed experiment intact; a genuinely new experiment needs a new independent holdout, not repeated selection on this test.

`run.mjs` is intended to resume this experiment, not overwrite aggregate artifacts from a different experiment. The snapshot and caches must travel together. Aggregate outputs alone cannot reproduce fitting without the local CSV. Full cache locations and SHA-256 receipts are in `splits.json`, `proposal.json`, and `external-inputs.json`.

## Recorded stages

These commands document the sequence used on a fresh cache. On the completed cache, use the resume runner above; do not rerun `correct.mjs` (it deliberately refuses a second correction).

```sh
python3 eval/hillclimb/prepare.py
node eval/hillclimb/baseline.mjs
node eval/hillclimb/features.mjs --legacy-separator
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python3 eval/hillclimb/fit.py
node eval/hillclimb/climb.mjs
node eval/hillclimb/proposal.mjs
node eval/hillclimb/final.mjs

# Only after the first-final failure; this was the sole corrective selection:
node eval/hillclimb/correct.mjs
node eval/hillclimb/proposal.mjs
node eval/hillclimb/final.mjs --correction

node --expose-gc eval/hillclimb/benchmark.mjs
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python3 eval/hillclimb/validate.py
node eval/hillclimb/diagnostics.mjs
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python3 eval/hillclimb/report.py
```

`prepare.py` streams CSV with a raised field-size limit, hashes source groups into 60/20/20 splits, excludes all external RAID source groups, keeps all eligible humans, and bounds deterministic AI samples within domain/model/decoding/penalty strata. The committed split manifest contains only counts, settings and hashes.

`baseline.mjs` snapshots the dirty engine under the ignored cache, imports the public API through Vite SSR, and runs baseline dev/test/external once. Baseline is the owner's current dirty tree, not git HEAD. The snapshot has 77 first-party rules.

`features.mjs` uses production `compilePhrases` plus first-party custom detectors on **train/dev only**. It retains raw spans privately for exact scoring replay and binary document presence for fitting. It recovers literals and bounded regexes rejected by earlier editorial policy; unsafe regexes and conditional riders remain excluded. One Markdown separator row was unintentionally recovered as `---`; it is disclosed in REPORT.md and remains in the frozen proposal rather than silently changing evaluated results. The parser now excludes table delimiters by default. The explicit `--legacy-separator` option exists only to reproduce frozen v1; the resume runner uses that compatibility option. Candidate-hash guards prevent silently mixing a cleaned pool with the frozen feature cache. Future independent experiments should use the default parser and classify punctuation features as style.

`fit.py` compares conservative smoothed log-rate bounds and sparse nonnegative L1/L2 logistic fits. It uses RAID train only. Class/domain/observed setting strata are balanced. Sampling without penalty accounts for one third of chat strata, and binary features prevent repeated loops from multiplying presence. Coefficients below 0.01, negative or weakly supported evidence get zero. No runtime dependency is added.

`climb.mjs` replays the production scorer on cached dev spans, preserving repeat modes, span competition, caps, quote protection, style support and fingerprint floors. It logs **every attempted configuration**, even failures, to `runs.jsonl`. It checks the 12 shared-grammar artifacts in `tests/unit/engine/artifacts.test.ts`. QA fixed the replay's missing public zero-word early return on one below-threshold punctuation-only generation. No threshold/Shame gate or selected weight changed; all corrected dev scores now replay exactly. Final metrics always come from the public API.

`proposal.mjs` emits `src/lib/engine/packs/measured/index.ts`, a numerical first-party weight map, `proposal.patch`, and a private engine copy with the patch applied. The pack is **not registered** in the real checkout. The patch changes only pack registration/reweighting; the score algorithm is unchanged.

`final.mjs` runs the public API in the private engine copy. The original final and explicitly permitted corrective final have separate immutable receipts. Final-only external inputs use the existing `eval/lib/corpus.mjs` deduplication and the same configured optional files as `pnpm eval`.

`benchmark.mjs` measures 200 distinct 300-word dev excerpts, 1,000 warmed calls, true maximum single-call timing, and 40 engine creations. It reports GC policy and both engines. `validate.py` copies the dirty checkout to a temporary directory, applies the proposal there, runs `pnpm test --maxWorkers=2` and `pnpm check`, and removes the scratch tree in `finally`. Failures remain failures; existing tests are never edited. Logs stay private in the ignored cache.

## Data and output boundaries

- Corpus text, normalized splits, hits/spans, row-level predictions, model fits, engine copies and logs: `data/eval/raw/hillclimb/` (already gitignored).
- Committable experiment outputs: aggregate metrics, numerical entry counts, dictionary provenance, configuration logs and reports under this directory. Dictionary strings are not dataset quotations.
- Optional prior: `data/eval/raw/ngram/baseline.jsonl`, phrase/token rates from exact or upper-bound modern-book coverage. The likelihood estimator can add conservative human pseudo-counts. It was absent during fitting and pre-final checks, and arrived by the completion audit. It did not affect this run; do not reopen the frozen experiment.
- W&I/AESLC: final checks only, never features, fitting or selection. Their restrictions cover derived product data. This evaluation does not grant commercial-use rights.
- RAID: weights are numerical derivatives of text with mixed underlying source rights. No text is redistributed. Read `data/eval/MANIFEST.md` before product use.

No existing source/test/eval-library file, INTENTIONS.md or HANDOFF.md is changed. No commit or push is made. Do not activate the proposal until its 35 unit regressions and the extraction artifact have been reviewed.
