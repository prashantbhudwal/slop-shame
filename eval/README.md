# Offline general-text calibration

Run the public scoring API on real human/AI text and synthetic draft/rewrite pairs.
False positives on human text, especially formal and non-native English, are the
primary criterion. [Data manifest](../data/eval/MANIFEST.md) records source licenses,
selection, and limits; [baseline](BASELINE.md) records the measured engine snapshot.

```sh
pnpm eval                         # fully offline; committed + available research files
pnpm eval --strict                # exit 1 when hard-human FP >5%; exit 2 on missing data/errors
pnpm eval --committed-only        # small redistributable sample; non-native coverage absent
node --test eval/metrics.test.mjs # metrics, denominators, thresholds, corpus validation
```

No new npm dependencies. Node 22+ and the project's existing Vite installation
load TypeScript through **only `src/lib/engine/index.ts`**. The runner calls
`analyzePost({text})`; no internal scoring functions, source edits, browser,
runtime model, or network access. Vite's temporary server is closed even on errors.

The default uses `eval/config.json`. Missing optional local datasets are reported;
normal runs still work on committed samples. **A strict run fails if either formal
or non-native human text is missing**, so a fresh checkout cannot give a misleading
safety pass without fetching learner negatives. `--data path.jsonl` may repeat and
replaces the configured input list. Paths resolve from the repository root.

## Reproduce inputs

The following prep commands use the network. Review source terms in the manifest
first. Restricted/uncleared material and intermediate downloads stay in ignored
`data/eval/raw/`; no raw research text should be added to git.

```sh
# Fetch local non-commercial research inputs: W&I, RAID, AESLC, modern AI news.
# The first RAID download is ~802 MB on disk; parsing is streamed, not loaded in RAM.
python3 scripts/eval/fetch.py --source all --research

# Rebuild committed public samples too, from pinned URLs/snapshots.
python3 scripts/eval/fetch.py --source public --refresh-samples
node scripts/eval/synthetic.mjs

# Or fetch one research source:
python3 scripts/eval/fetch.py --source wi --research
```

Python uses only its standard library. At most three small public-source jobs run
at once, and research corpora are processed sequentially. No model downloads,
LLM API calls, browser processes, or image inference. HTTP retries are bounded.
Source receipts (URL + downloaded-byte SHA-256) are written under `raw/`;
`data/eval/sources.lock.json` preserves the initial snapshot hashes. W&I and AESLC
are non-commercial research only; use their outputs consistently with those terms.

Synthetic drafts and their plainer variants were both authored by the same LLM.
`mixed` is an edited-text **proxy**, never a genuine human label. Illustrative
GPT/Claude/Gemini-style tags are not claims about outputs from those models.
Human Detectors supplies separately tagged released modern-model samples.

## Outputs and interpretation

Each run writes `eval/results/<ISO-timestamp>.json` and `eval/results/latest.md`.
That directory is ignored except for its `.gitignore`; it can contain licensed
research snippets. `pnpm eval --baseline` also writes **aggregate-only**
`eval/BASELINE.md`, suitable for review without copying research quotations.

Reports include:

- Human FP at **score ≥40**, overall and by subset/genre/register/source; separate
  human `shameable === true` FP where the engine supplies the field.
- AI recall at ≥40 and ≥60, label × predicted-tier counts, ASCII score histograms.
- Thresholds 20–90 in steps of five: FP/TPR and pooled formal/non-native FP. The
  minimum **tested** threshold meeting ≤5%, plus a stricter result requiring each
  hard subset individually to meet ≤5%. Neither is a fitted production threshold.
- Top 20 human-firing rules, ordered by FP posts and then all human hits, with
  local example snippets. Each rule counts once per post. Reported signal weights
  are pre-normalization; correlated rule hits are not causal ablation results.
  When no humans cross 40, there are no FP-causing rules; the fallback list shows
  rules worth monitoring during later tuning.
- Warm mean/p95 `analyzePost` latency, cold first call and import time separately.
  Node timing is not a Chromium performance certification. Report cache/JIT effects
  and machine contention may affect latency.
- Input hashes, engine-tree SHA-256, HEAD, Node version, and command. Engine file
  changes during a run cause an error rather than an incoherent baseline.

The JSON includes predictions and signals keyed to item IDs, but not full source
bodies. Mixed rows appear in tier/histogram tables and counts; they never enter FP
or AI recall denominators. Missing denominators are `null`/`n/a`, never zero.
Strict gate uses pooled hard-human FP, matching the requested CI condition; review
each subset's result too so a large group cannot mask a smaller group's errors.

The corpus is for calibration. Preserve grouped, untouched holdouts before release:
parallel RAID outputs, source authors, repeated institutional templates, and
synthetic pairs must not leak across train/calibration/validation partitions.
Pre-2022 provenance excludes modern ChatGPT use, not all possible old generators
or automated accounts. Zero observed FP in a finite sample does not prove zero
population FP; low recall can make a detector pass the FP gate trivially.
