# Newly mined lexical candidates

Target: obvious, nameable smells in zero-effort raw model output. General AI authorship, careful AI-assisted writing, and clean output with no smells are outside this target. RAID chat generations remain the positive proxy. Offline train-only discovery; dev is validation only. No RAID test documents, predictions, features, or original held-out external evaluation rows were opened. Authorized LinkedIn veto/modern-AI checks, when present below, are separate from discovery. Dataset passages are not reproduced.

Run: 2026-10-21T07:44:53.379Z. Elapsed: 112.1 seconds. One Node process, no workers, browsers, or network.

## Filter counts

| Stage | Candidates |
| --- | ---: |
| Observed windows across n=1..5 | 6276400 |
| AI DF >=30 | 108586 |
| Train LCB >=4 | 4358 |
| Train >=5 positive domains | 956 |
| Train >=3 positive models | 944 |
| Novel versus dictionary | 433 |
| Production train gates | 433 |
| After containment deduplication | 227 |
| Style/discourse (heuristic; no topic flag) | 25 |
| Topic/content or semantic-review flag | 202 |
| Style-cue forms including concentration flags | 57 |
| Dev all gates (including AI DF >=30) | 20 |
| Dev gates, unflagged style/discourse | 4 |
| Dev LCB >=4 only | 48 |
| LinkedIn veto risk flags (all train candidates) | 45 |
| LinkedIn veto risk flags among dev passes | 8 |
| Dev passes without LinkedIn veto risk flag | 12 |
| Dev passes without either topic or LinkedIn veto flags | 2 |
| Nameable smells | 38 |
| Not nameable; retained and demoted | 189 |
| Nameable smells passing dev | 2 |
| Nameable dev passes without LinkedIn veto flags | 2 |

Each DF is document presence, not occurrence count. Anchors and punctuation variants are separate candidates before deduplication.

## Method and gates

Training: 28800 AI / 7166 human documents. Dev: 10800 AI / 2354 human.

Models: gpt4, chatgpt, cohere-chat, llama-chat, mistral-chat, mpt-chat. Base models are excluded, including from denominators. Domains: abstracts, books, news, poetry, recipes, reddit, reviews, wiki.

The script imports normalizeText, straighten, buildContext and compilePhrases from the current production sources using Node type stripping. Word tokens use the exact engine WORDS expression. Literal windows retain intervening punctuation and collapse whitespace exactly as the current compiler does; punctuation is never removed to invent a match. Trailing comma/semicolon/colon/period/question/exclamation runs (up to three characters) are measured separately. Strings over 160 characters and non-prose symbol gaps are omitted. Each of n=1..5 is counted exactly; prefix pruning uses only AI DF>=30, so it cannot discard a qualifying longer window. Anchored windows cover first/last nonempty line, first/last engine sentence, and sentence beginnings. Sentence segmentation follows the engine, including its abbreviation and punctuation limitations.

Smoothing: pAI=(aiDf+0.5)/(nAi+1), pHuman=(humanDf+0.5)/(nHuman+1). Ratio=pAI/pHuman. LCB=exp(log(ratio)-1.959963984540054*sqrt(1/(aiDf+0.5)-1/(nAi+1)+1/(humanDf+0.5)-1/(nHuman+1))). This is the lower endpoint of a two-sided approximate 95% log risk-ratio interval, not a multiple-testing-adjusted confidence guarantee.

Train gates: AI DF>=30, LCB>=4, smoothed ratio>1 with at least one AI hit in >=5 domains and >=3 of the six named chat models. Domain ratios use that domain's denominators; each model ratio uses that model's AI denominator and the pooled human denominator. Requiring an AI hit prevents smoothing alone from inventing supporting strata. Dev repeats all four thresholds, including DF>=30 despite its smaller size.

Novelty removes both directions of Unicode-boundary literal containment against every phrase in entries.json, including rejected/dropped vocabulary retained there. Existing regular expressions are also tested on each candidate string. This deliberately strict policy removes new collocations containing even weak pre-existing single-word entries. It cannot prove semantic non-overlap with every context-dependent regex or custom detector.

Production compilePhrases remeasures all provisionally novel candidates on train before any dev read. Production train gates are reapplied, and novelty is rechecked. Containment deduplication is frozen on train: prefer the more specific form when its support is at least half and its LCB at least 80% of the strongest overlapping form; otherwise retain the stronger evidence form. Duplicate punctuation and identical strings across anchors collapse. Distinct anchored windows may remain for different strings. No candidate is created, selected, deduplicated, categorized, or ranked using dev performance.

The JSONL includes every final train-qualified candidate, with stats.dev.passesGates marking validation. stats.perDomain and stats.perModel each contain train/dev objects. Rates are fractions; bookRate is per million tokens. miningPosition records the narrow window. Anchors are encoded as patterns rather than invalid production position values; existing opening/closing mean two lines. Anchored patterns use bounded positional lookarounds and require optimization before large-pack deployment.

## Nameability and ranking

True only when the candidate wording supports a concrete reader-facing surface label: assistant residue, generated scaffold, stock opener/closer, recognizable cliche, canned review praise, or an inflated vocabulary/phrase component. A label must describe the words shown, without referring to a statistical AI/human difference. False for ordinary function-word/grammar fragments, neutral subject words, and normal isolated adjectives without a clear stock smell. True is review eligibility, never a verdict; generic praise/idioms can be human and require corroboration. Existing topic and veto flags still apply.

Every candidate has nameable:true|false and nameableReason. nameability.json records the explicit review decisions; unlisted terms are false. This scope/ranking annotation uses candidate strings and the owner's target definition, without changing discovery, numerical gates, phrases, categories or weights. Function-word/grammar and topic candidates remain in the JSONL; they are not silently discarded.

## Top 50 by nameability and train evidence

Rank: nameable smells first; among them assistant residue precedes scaffolds/closers/predictions/transitions, then other cliches/inflated vocabulary components. Within a tier, style cues precede other content, then unflagged precedes topic-flagged, then log2(train LCB)*log2(1+AI DF), with a deterministic string tie-break. This is a review rank, not a fitted weight. semantic-review.json labels were based only on frozen train strings/counts before inspecting individual dev results. The later owner-directed nameability annotation is likewise a surface-wording judgment, not a dev-performance label. Domain-concentrated style phrases remain flagged.

| # | Candidate | Window | Nameable | Topic/review flag | Train AI/H DF | Train ratio / LCB | Dev AI/H rate | Dev ratio / LCB | Dev gates |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sure, | first-sentence | yes | no | 492/1 | 81.70 / 16.45 | 1.722% / 0.000% | 81.33 / 5.07 | pass |
| 2 | here's a possible | first-line | yes | no | 165/0 | 82.37 / 5.13 | 0.667% / 0.000% | 31.62 / 1.96 | fail |
| 3 | sure! | first-line | yes | yes | 590/0 | 293.89 / 18.36 | 2.083% / 0.000% | 98.33 / 6.13 | pass |
| 4 | is not just a | any | yes | no | 217/1 | 36.08 / 7.24 | 0.676% / 0.085% | 6.41 / 1.82 | fail |
| 5 | title: | first-line | yes | no | 146/0 | 72.91 / 4.54 | 0.602% / 0.000% | 28.56 / 1.77 | fail |
| 6 | is a must | last-line | yes | yes | 1229/5 | 55.63 / 24.08 | 4.037% / 0.127% | 27.19 / 9.51 | fail |
| 7 | for fans | last-line | yes | yes | 800/1 | 132.80 / 26.77 | 2.472% / 0.042% | 38.88 / 7.82 | fail |
| 8 | along the way, | sentence-initial | yes | yes | 1073/8 | 31.43 / 16.01 | 3.593% / 0.085% | 33.88 / 9.78 | fail |
| 9 | is sure to | last-line | yes | yes | 299/1 | 49.69 / 9.99 | 1.046% / 0.000% | 49.49 / 3.08 | fail |
| 10 | until the very end. | any | yes | yes | 292/1 | 48.52 / 9.76 | 0.907% / 0.000% | 42.95 / 2.67 | fail |
| 11 | will keep you | any | yes | yes | 284/2 | 28.32 / 8.16 | 0.824% / 0.000% | 39.03 / 2.42 | fail |
| 12 | is a powerful and | any | yes | yes | 220/1 | 36.58 / 7.34 | 1.009% / 0.000% | 47.75 / 2.97 | fail |
| 13 | in the end, | sentence-initial | yes | yes | 659/23 | 6.98 / 4.63 | 2.426% / 0.425% | 5.45 / 2.95 | fail |
| 14 | sure to leave | any | yes | yes | 192/1 | 31.94 / 6.41 | 0.556% / 0.000% | 26.38 / 1.63 | fail |
| 15 | anyone interested in | any | yes | yes | 138/0 | 68.93 / 4.29 | 0.519% / 0.000% | 24.64 / 1.52 | fail |
| 16 | a thrilling | any | yes | no | 913/3 | 64.95 / 22.74 | 3.500% / 0.042% | 55.02 / 11.08 | fail |
| 17 | and the power of | any | yes | no | 489/1 | 81.21 / 16.35 | 1.278% / 0.042% | 20.13 / 4.03 | fail |
| 18 | the harsh realities of | any | yes | no | 253/1 | 42.05 / 8.45 | 0.907% / 0.000% | 42.95 / 2.67 | fail |
| 19 | a poignant | any | yes | no | 246/0 | 122.68 / 7.65 | 0.667% / 0.042% | 10.54 / 2.09 | fail |
| 20 | in the face of | any | yes | no | 439/15 | 7.06 / 4.25 | 1.657% / 0.170% | 8.70 / 3.42 | fail |
| 21 | heartwarming | any | yes | yes | 563/4 | 31.16 / 12.33 | 1.759% / 0.042% | 27.69 / 5.56 | fail |
| 22 | the essence of | any | yes | yes | 396/5 | 17.94 / 7.74 | 1.259% / 0.085% | 11.90 / 3.41 | fail |
| 23 | a timeless | any | yes | yes | 278/3 | 19.80 / 6.90 | 0.880% / 0.212% | 3.79 / 1.60 | fail |
| 24 | unforgettable | any | yes | yes | 444/10 | 10.53 / 5.72 | 1.639% / 0.127% | 11.06 / 3.84 | fail |
| 25 | masterpiece | any | yes | yes | 689/29 | 5.82 / 4.03 | 2.259% / 0.595% | 3.68 / 2.17 | fail |
| 26 | heartfelt | any | yes | yes | 285/7 | 9.47 / 4.59 | 1.028% / 0.042% | 16.21 / 3.24 | fail |
| 27 | a powerful tool | any | yes | yes | 167/3 | 11.91 / 4.13 | 0.519% / 0.042% | 8.21 / 1.62 | fail |
| 28 | is a classic | any | yes | yes | 148/2 | 14.78 / 4.24 | 0.500% / 0.042% | 7.92 / 1.57 | fail |
| 29 | at every turn | any | yes | yes | 135/0 | 67.44 / 4.20 | 0.472% / 0.000% | 22.46 / 1.39 | fail |
| 30 | the human spirit | any | yes | yes | 322/0 | 160.51 / 10.02 | 1.046% / 0.000% | 49.49 / 3.08 | fail |
| 31 | the truth behind | any | yes | yes | 305/1 | 50.68 / 10.19 | 1.009% / 0.042% | 15.92 / 3.18 | fail |
| 32 | action-packed | any | yes | yes | 294/3 | 20.94 / 7.30 | 1.204% / 0.085% | 11.38 / 3.26 | fail |
| 33 | will stop at nothing to | any | yes | yes | 245/0 | 122.18 / 7.62 | 0.880% / 0.000% | 41.64 / 2.59 | fail |
| 34 | emotional depth | any | yes | yes | 208/0 | 103.77 / 6.47 | 0.704% / 0.042% | 11.12 / 2.21 | fail |
| 35 | to come to terms with | any | yes | yes | 217/3 | 15.46 / 5.38 | 0.852% / 0.000% | 40.34 / 2.51 | fail |
| 36 | an extra layer of | any | yes | yes | 169/0 | 84.36 / 5.26 | 0.444% / 0.000% | 21.15 / 1.30 | fail |
| 37 | rollercoaster | any | yes | yes | 143/1 | 23.81 / 4.77 | 0.417% / 0.085% | 3.97 / 1.11 | fail |
| 38 | to make ends meet | any | yes | yes | 140/2 | 13.99 / 4.01 | 0.454% / 0.042% | 7.20 / 1.42 | fail |
| 39 | reminder of | any | no | no | 450/0 | 224.21 / 14.00 | 1.759% / 0.042% | 27.69 / 5.56 | pass |
| 40 | making it a | any | no | no | 378/1 | 62.79 / 12.64 | 1.102% / 0.000% | 52.11 / 3.24 | fail |
| 41 | immersive | any | no | no | 340/1 | 56.49 / 11.36 | 1.046% / 0.042% | 16.50 / 3.30 | fail |
| 42 | the importance of | any | no | no | 1097/28 | 9.58 / 6.61 | 3.806% / 0.170% | 19.94 / 7.88 | pass |
| 43 | its ability to | any | no | no | 395/4 | 21.87 / 8.64 | 1.093% / 0.127% | 7.38 / 2.55 | fail |
| 44 | unique and | any | no | no | 311/2 | 31.01 / 8.93 | 0.935% / 0.085% | 8.85 / 2.53 | fail |
| 45 | dedication to | any | no | no | 271/1 | 45.04 / 9.05 | 1.056% / 0.042% | 16.64 / 3.33 | fail |
| 46 | with its | sentence-initial | no | no | 580/14 | 9.96 / 5.92 | 1.861% / 0.170% | 9.76 / 3.84 | fail |
| 47 | a symbol of | any | no | no | 405/7 | 13.45 / 6.54 | 1.287% / 0.085% | 12.17 / 3.49 | fail |
| 48 | a unique | any | no | no | 652/18 | 8.78 / 5.53 | 1.981% / 0.467% | 4.07 / 2.25 | fail |
| 49 | alike. | any | no | no | 439/9 | 11.51 / 6.06 | 1.843% / 0.085% | 17.40 / 5.00 | pass |
| 50 | iconic | any | no | no | 701/21 | 8.12 / 5.29 | 2.722% / 0.127% | 18.35 / 6.40 | fail |

## Risks and interpretation

- Missing optional book measurements have bookRate:null, bookRisk:null and bookCoverage:unavailable when a baseline is present. Missing rates are never treated as zero. Exact book measurements, if available, flag bookRisk only above 5 per million tokens.
- RAID generations share source/title groups inside a split. Document-level confidence intervals treat them as independent and can be overconfident; aiSourceDf/humanSourceDf are provided. Source-grouped splitting prevents train/dev source overlap, but does not remove within-split correlation.
- Many n-grams were searched. LCBs are exploratory, with no familywise/FDR correction. A dev pass is replication of a mined association, not calibrated real-world authorship accuracy. Repeated future fits on this dev set will consume its independence.
- TopicFlag is conservative: content/grammar fragments, unreviewed vocabulary, >65% single-domain AI-hit concentration, and <20 distinct AI source groups are flagged. Style-cue review labels identify discourse, evaluative/promotional diction and assistant scaffolding, including incomplete constructions explicitly called out in review.semanticReview. An unflagged style collocation can still reflect topic, genre, sentiment, prompt framing, or model-specific artifacts. Five positive domains can include sparse evidence; inspect per-domain counts, not just their signs.
- Named model support is not vendor independence: gpt4 and chatgpt are related; decoding and repetition settings are pooled. Llama/Mistral/MPT contribute twice as many samples as each of GPT4/ChatGPT/Cohere. Pooled ratios therefore reflect this experiment's mixture.
- Dev has only 151 human reviews and unequal human domain proportions. Rare human hits create broad intervals. A large ratio does not establish that a phrase is unsafe for human authors, including formal or non-native authors. Do not assign verdict-producing weights to these candidates without the next fit and independent safeguards.
- Current literal matching collapses whitespace (including newlines); regex anchors use engine gi matching and English positional boundaries. Exact production train/dev remeasurement is authoritative when mining-window approximations differ. Protected quotations/code are counted as lexical occurrences here; a score may suppress them or resolve overlaps differently. The script does not estimate incremental recall or false-positive rate for an integrated detector.
- Containment deduplication can trade broad coverage for a more specific cue. Related morphological, punctuation, or syntactic variants without exact containment can remain correlated and should compete during fitting.
- Optional book prior: 8806 baseline rows available; 0 exact annotations, 0 above 5/million. Book frequency is a risk annotation only; it never selects candidates. New phrases may be outside the other agent's dictionary-only book query list.

## Reproduction

From the repository root, with the original split caches and entries.json present, using Node >=22.13 with node:module.stripTypeScriptTypes:

```sh
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/check.mjs
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning --max-old-space-size=2048 eval/hillclimb/mine/mine.mjs
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/linkedin-check.mjs
UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--v8-pool-size=1 node --disable-warning=ExperimentalWarning eval/hillclimb/mine/check.mjs --outputs
```

No install/download step. Run one heavy process at a time. These commands write only miner-owned files. The train freeze file is written before the first dev open. The check program rejects a test split request, checks synthetic normalization/matcher parity, and audits final schema, gates, uniqueness, containment, and split provenance.

Per-n exact discovery counts:

```json
[
  {
    "n": 1,
    "observedAfterPrefixPruning": 406317,
    "frequentCores": 10589,
    "aiDf30": 30926,
    "lcb4": 650,
    "domains5": 319,
    "models3": 319,
    "novel": 129
  },
  {
    "n": 2,
    "observedAfterPrefixPruning": 2841709,
    "frequentCores": 23726,
    "aiDf30": 41451,
    "lcb4": 1590,
    "domains5": 393,
    "models3": 388,
    "novel": 180
  },
  {
    "n": 3,
    "observedAfterPrefixPruning": 2118887,
    "frequentCores": 13389,
    "aiDf30": 21507,
    "lcb4": 1213,
    "domains5": 188,
    "models3": 181,
    "novel": 93
  },
  {
    "n": 4,
    "observedAfterPrefixPruning": 686010,
    "frequentCores": 5983,
    "aiDf30": 9826,
    "lcb4": 602,
    "domains5": 46,
    "models3": 46,
    "novel": 27
  },
  {
    "n": 5,
    "observedAfterPrefixPruning": 223477,
    "frequentCores": 2909,
    "aiDf30": 4876,
    "lcb4": 303,
    "domains5": 10,
    "models3": 10,
    "novel": 4
  }
]
```

Input digests (train/dev only; no test file digest computed):

```json
{
  "train": "4ce51a65a5a1823587b643bd1209e0a1fc5641cfa38a5fd1fc0a5182f22d38fc",
  "entries": "40cb9190d3b6bcdeec8f5a51d2b983bfcf745078b04a8893a6ec4fae95a39ea6",
  "context": "e51ab7a1cd0902b16e677937c04271082ae6a556b39b14743c866d9ae963418f",
  "compile": "d45033d8d1151dc5617ea9b773985a4d31490633a931cbd51342b79588b7f1b6",
  "semanticReview": "888c9df8aab7a1462673904bc6410da803240ffaddc29cd31c75e6a4b2ffa34a",
  "dev": "1bfee384a122da663d5206863b01830ac867f5fa23cce6514227974eab376805",
  "nameability": "534807688e33ba4fb7e1605b3a148f76b2b007511c6ca985a30223fd43ac6071"
}
```

Files: eval/hillclimb/mine/{mine.mjs,check.mjs,linkedin-check.mjs,README.md,semantic-review.json,nameability.json}; eval/hillclimb/MINED.md; data/eval/raw/hillclimb/{mined-candidates.jsonl,mine-work/{train-freeze.json,run.json}}. Cache outputs are gitignored. Existing files outside this list are never written.

## Authorized LinkedIn false-alarm check

Only the author-split veto partition was decoded and matched: 8189 posts from 29 authors. The shared JSONL was streamed as bytes for author selection; holdout text values were never UTF-8 decoded, parsed into post objects, passed to the matcher, quoted, written, or scored. The split metadata was read to identify allowed authors. No score threshold or engine verdict was computed on this corpus.

Policy, fixed before corpus access: flag a candidate when >=3 distinct veto authors use it and its veto document rate is >=0.1% (at least 9 of 8,189 posts). Flags do not alter train/dev statistics, ranking, phrases, categories, or weights. All train-qualified rows remain in the handoff JSONL. Each has linkedinVetoDf, linkedinVetoAuthorCount, linkedinVetoRate and linkedinVetoRisk. Several independent human authors using a phrase is a reason to distrust it as standalone positive evidence.

Risk flags: 45/227 train-qualified candidates; 8/20 dev-qualified candidates. 12 dev-qualified candidates remain without this veto risk flag, of which 2 are nameable smells. Across the 8189 veto posts, any dev-qualified candidate appears in 269 (3.285%); any unflagged dev-qualified candidate appears in 40 (0.488%). These are raw phrase-presence rates, not an integrated detector false-positive rate.

Dev-qualified candidates, in the unchanged train evidence order:

| Candidate | Window | Nameable | Topic flag | Veto DF / authors | Veto rate | Veto risk |
| --- | --- | --- | --- | ---: | ---: | --- |
| sure, | first-sentence | yes | no | 1 / 1 | 0.012% | clear |
| sure! | first-line | yes | yes | 1 / 1 | 0.012% | clear |
| reminder of | any | no | no | 13 / 4 | 0.159% | flag |
| the importance of | any | no | no | 41 / 12 | 0.501% | flag |
| alike. | any | no | no | 5 / 2 | 0.061% | clear |
| relatable | any | no | yes | 9 / 2 | 0.110% | clear |
| engaging | any | no | yes | 34 / 11 | 0.415% | flag |
| 3. | sentence-initial | no | yes | 46 / 12 | 0.562% | flag |
| fans of | any | no | yes | 1 / 1 | 0.012% | clear |
| depth and | any | no | yes | 2 / 2 | 0.024% | clear |
| self-discovery | any | no | yes | 1 / 1 | 0.012% | clear |
| obstacles | any | no | yes | 8 / 4 | 0.098% | clear |
| captures the | any | no | yes | 6 / 3 | 0.073% | clear |
| and determination | any | no | yes | 4 / 1 | 0.049% | clear |
| struggles | any | no | yes | 15 / 8 | 0.183% | flag |
| and thought | any | no | yes | 13 / 9 | 0.159% | flag |
| storytelling | any | no | yes | 29 / 6 | 0.354% | flag |
| embrace | any | no | yes | 50 / 12 | 0.611% | flag |
| known for his | any | no | yes | 1 / 1 | 0.012% | clear |
| twists | any | no | yes | 2 / 2 | 0.024% | clear |

Veto risks among the first 30 train-ranked forms:

| Candidate | Veto DF | Authors | Risk |
| --- | ---: | ---: | --- |
| sure, | 1 | 1 | clear |
| here's a possible | 0 | 0 | clear |
| sure! | 1 | 1 | clear |
| is not just a | 1 | 1 | clear |
| title: | 1 | 1 | clear |
| is a must | 15 | 8 | flag |
| for fans | 1 | 1 | clear |
| along the way, | 3 | 3 | clear |
| is sure to | 3 | 2 | clear |
| until the very end. | 0 | 0 | clear |
| will keep you | 0 | 0 | clear |
| is a powerful and | 0 | 0 | clear |
| in the end, | 1 | 1 | clear |
| sure to leave | 0 | 0 | clear |
| anyone interested in | 2 | 2 | clear |
| a thrilling | 0 | 0 | clear |
| and the power of | 2 | 2 | clear |
| the harsh realities of | 0 | 0 | clear |
| a poignant | 1 | 1 | clear |
| in the face of | 14 | 9 | flag |
| heartwarming | 2 | 2 | clear |
| the essence of | 5 | 3 | clear |
| a timeless | 0 | 0 | clear |
| unforgettable | 3 | 3 | clear |
| masterpiece | 1 | 1 | clear |
| heartfelt | 6 | 2 | clear |
| a powerful tool | 3 | 1 | clear |
| is a classic | 0 | 0 | clear |
| at every turn | 0 | 0 | clear |
| the human spirit | 2 | 2 | clear |

## Modern AI LinkedIn coverage — reporting only

The four generation files are evaluated only after train selection, dev validation and veto policy are frozen. No words, rules, weights or thresholds are mined or fitted from them. The same 30 prompt IDs are present once per model. A hit means at least one candidate lexical pattern occurs; it does not mean score>=40 or a reliable AI verdict, and it is not directly comparable with the owner's 5/120 current-engine result.

| Model | Posts | Any train candidate | Any dev-qualified candidate | Dev-qualified, no veto risk |
| --- | ---: | ---: | ---: | ---: |
| claude-opus-5-5 | 30 | 6 | 4 | 0 |
| gemini-3.8-flash | 30 | 14 | 12 | 0 |
| gpt-6.1-sol | 30 | 2 | 1 | 0 |
| grok-4.7 | 30 | 6 | 1 | 0 |
| Total | 120 | 28 | 18 | 0 |

The 2 nameable dev-qualified candidates without veto flags hit 0/120 modern examples. Under the revised target, clean modern AI output without obvious smells is out of scope: zero hits are not evidence of target failure, and these reporting examples have not been labeled for smell/effort. Conversely, RAID discrimination alone does not establish detection of zero-effort writing.

Human veto and modern AI results are cross-checks only. The human sample consists of 2021 influencers, and the modern AI set contains only 30 shared prompts, so neither establishes generalization to all human LinkedIn writing or modern AI output. Genre/topic flags still apply even when a candidate is absent from the veto sample. No LinkedIn holdout result is available or implied.

Only veto-row bytes contributed to the recorded human input digest. The combined corpus file was not copied, modified, committed, or hashed as a whole. Modern AI input digests appear in mine-work/run.json. No author names or dataset passages appear in these outputs.
