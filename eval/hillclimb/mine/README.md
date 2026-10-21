# Train-only lexical mining

Target: nameable AI smells in zero-effort raw output, rather than general AI
authorship. Clean or careful AI-assisted output without smells is out of scope.
`nameability.json` documents the reviewer rule and concrete smell labels.
Every candidate is tagged `nameable`; ordinary grammar and topic terms remain
available as `false` and rank after recognizable smells. Ranking uses only
train evidence and the wording, never modern AI coverage or dev performance.

New offline candidates for the next weight fitting round. No engine rules are
changed. Read `../MINED.md` for counts, caveats, input digests and top candidates.

From the repository root:

```sh
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/check.mjs
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning --max-old-space-size=2048 eval/hillclimb/mine/mine.mjs
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/linkedin-check.mjs
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/check.mjs --outputs
```

Node must support `node:module.stripTypeScriptTypes` (>=22.13) and Set intersection
(>=22). No dependencies or network are used. One process, no worker threads;
V8 and libuv pools are limited to one helper apiece. Run sequentially on the
shared machine. The miner writes only its own output files and `mine-work/`.
It never imports the other experiment's scripts, since some have side effects.

Train discovery is exhaustive within the documented 1–5-word prose windows,
subject to the length/symbol limits. Apriori prefix pruning skips windows whose
shorter prefix has AI document frequency below 30. It cannot skip a longer
qualifying window. All candidate selection, categories, containment choices,
and ordering are frozen in `mine-work/train-freeze.json` before dev is opened.

The JSONL contains **all train-qualified candidates**, including those failing
dev. Use `stats.dev.passesGates` to distinguish validation outcomes. Do not
silently treat failed dev candidates as validated. `miningPosition` describes
the discovery window; narrower anchored rules use actual production regex
patterns rather than unsupported values of `PhraseRule.position`.

`semantic-review.json` records a manual style/content review based on frozen
train strings and train counts, without per-candidate dev results. `topicFlag`
also flags >65% domain concentration, including for an apparent style cue.
Inspect the phrases, review notes and per-domain support before fitting.
No score-level recall, human false-positive rate, or verdict weight is claimed.

`linkedin-check.mjs` adds an authorized false-alarm check from veto authors
only. It streams the shared human JSONL as bytes, extracts top-level author
metadata, then decodes post objects only for allowed veto authors. Holdout
texts are never decoded, matched, copied, or quoted. Risk means >=3 authors
and >=0.1% veto document frequency; all train-qualified candidates stay in the
JSONL. It then reports lexical coverage of the modern AI generation files for
all train candidates, dev-qualified candidates, and dev-qualified candidates
without veto flags. Modern AI output cannot affect candidate selection.
