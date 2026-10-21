# Vendor rule packs

Generated, data-only PhraseRules. **Not registered** in ../index.ts. The later calibration round must decide which packs and weight replacements to enable. No engine contract or first-party pack was changed.

Run from the repository root (Node >=22.15; project devDependencies installed):

```sh
node scripts/dictionaries/update.mjs          # deterministic, checked-in pins; offline when data exists
node scripts/dictionaries/update.mjs --fetch  # re-fetch the SAME pins and verify every SHA-256
pnpm exec vitest run tests/unit/engine/vendor
node scripts/dictionaries/benchmark.mjs       # real createEngine integration and 2,000-post timings
```

No new npm dependencies. TypeScript, already a devDependency, is used only for read-only AST inspection of first-party packs. Runtime packs import only RulePack types. To advance upstream versions, deliberately edit scripts/dictionaries/sources.lock.json after inspecting each LICENSE and NOTICE at the new commit; hashes are never silently refreshed. Missing/raw modified files fail verification.

## Sources and counts

| Source | URL | Commit pin | SPDX | Raw entries | Kept / dropped raw entries | Emitted literals / regexes |
| --- | --- | --- | --- | --- | --- | --- |
| zeroslop | [manavmishra/ZeroSlop](https://github.com/manavmishra/ZeroSlop) | [16785a69512e](https://github.com/manavmishra/ZeroSlop/tree/16785a69512ee283bd28e64319fa36e33c6ba8ed) | MIT | 419 | 146 / 273 | 1995 / 43 |
| paech-sampler | [sam-paech/antislop-sampler](https://github.com/sam-paech/antislop-sampler) | [0ae330e98fbe](https://github.com/sam-paech/antislop-sampler/tree/0ae330e98fbe6f09351f2d1063a51956378a44b2) | Apache-2.0 | 517 | 8 / 509 | 7 / 0 |
| paech-essays | [sam-paech/slop-forensics](https://github.com/sam-paech/slop-forensics) | [c313f042620f](https://github.com/sam-paech/slop-forensics/tree/c313f042620f027d49101da3256bd306b628071a) | MIT | 4473 | 52 / 4421 | 46 / 0 |
| vale-ai-tells | [tbhb/vale-ai-tells](https://github.com/tbhb/vale-ai-tells) | [51f646e366ba](https://github.com/tbhb/vale-ai-tells/tree/51f646e366ba7c9dcb078ebeae345b7ff353eb3b) | MIT | 733 | 372 / 361 | 429 / 133 |
| slop-radar | [renefichtmueller/slop-radar](https://github.com/renefichtmueller/slop-radar) | [711f3a862a61](https://github.com/renefichtmueller/slop-radar/tree/711f3a862a6153d57cc42fe82704d937ab2cbe10) | MIT | 453 | 219 / 234 | 150 / 6 |
| kobak | [berenslab/llm-excess-vocab](https://github.com/berenslab/llm-excess-vocab) | [53db991afc25](https://github.com/berenslab/llm-excess-vocab/tree/53db991afc251782106cd817a1c3fa47a4d41781) | MIT | 900 | 2 / 898 | 2 / 0 |

Totals: **2629 literal phrases**, **182 regexes**, **2811 rules**; 122 duplicate matcher occurrences merged; 39 exact first-party matchers omitted. Kept raw entries include those merged into another source's emitted pack; one upstream regex can produce several literals, so raw rows and emitted rules are different units. ZeroSlop counts include its 26 conditional riders and 25 trigger metadata entries, all excluded rather than misrepresented as standalone evidence.

Redis 6.0.0 README (BSD-3-Clause, 2020), pinned separately under data/dictionaries/human-control-redis, is a pre-LLM human technical negative control, never a scoring pack. scripts/dictionaries/human-controls.json supplies additional **synthetic project-authored** controls for ESL/formal writing, career changes, technical language, idioms and ordinary correspondence. Hits in either corpus are removed, without claiming an independent accuracy estimate.

## Category mapping

| Upstream family | SlopCategory |
| --- | --- |
| ZeroSlop hedging | hedging |
| ZeroSlop scaffolding, filler, misc, cliche, email | template-phrases (idioms/email are filtered) |
| ZeroSlop artifact / explicit assistant residue | chatbot-leak |
| ZeroSlop marketing, puffery, drama | inflation |
| ZeroSlop linkedin, performed, stakes, overcorrection | engagement-bait (career/milestone rules filtered) |
| ZeroSlop contrast | negation-pivot |
| ZeroSlop triads | robotic-rhythm (excluded: lacks length/repetition guard) |
| ZeroSlop verbs / lexicon / riders | ai-vocabulary (conditional riders excluded) |
| Paech sampler; essay unigram list | ai-vocabulary |
| Paech essay phrase list | template-phrases |
| Vale vocabulary / compounds / verb forms | ai-vocabulary (POS-dependent verbs excluded) |
| Vale openers / contrast / closers / hedges / affirmations | engagement-bait / negation-pivot / template-phrases / hedging / inflation |
| Radar openers / worth-noting / hype / other phrases | engagement-bait / hedging / inflation / template-phrases; unigrams ai-vocabulary |
| Radar contrasts / headers and lists / grammar and triads | negation-pivot / formatting / robotic-rhythm (unguarded grammar and triads excluded) |
| Kobak exactly-style rows | ai-vocabulary |
| Explicit model disclaimers / generation offers in any source | chatbot-leak |
| No accepted source has a valid bypass rule | bypass-tricks: no generated rule |

## Evidence and weights

**w = clamp(round(1.3 * log2(r)), 1, 10)**. Alpha **1.3** maps 10x to 4 and 60x to 8. Kobak uses the pinned count matrix's exact published counterfactual projection, including add-one smoothing: p_y=(count_y+1)/(total_y+1); q2024=p2022+2*max(0,p2022-p2021); r=p2024/q2024. For example delves is 28.0328x here. These are changes in the prevalence of words across biomedical abstracts, **not** AI/human likelihoods or measurements on LinkedIn.

Paech factors m are sampler probability penalties; r_proxy=1/m uses the same logarithmic formula **as an editorial proxy**, explicitly marked as such on every rule. A multiplier is never used as empirical evidence to admit an ordinary single word. A measured Kobak ratio takes precedence for the same exact word. Essay counts/frequencies are not ratios and earn the faint default 2. Vale severity is not a numeric lift and also defaults to 2. ZeroSlop weights 1..3 ->2, >3..6 ->5, >6 ->10; Radar weights 1..2 ->2, >2..4 ->5, >4 ->10. Explicit model disclaimers and unmistakable generation artifacts may be 10.

research/frequency-evidence.md informed the logarithmic transform, but its approximate social/collocation ratios are not promoted into measurements without reproducible denominators. Some rows mix sampler multipliers, editorial weights and actual lifts; fresh Kobak derivation supersedes those summary numbers. Em-dash measurements conflict across the reports, so no standalone dash detector is imported.

## False-positive policy and drops

[DROPPED.md](DROPPED.md) records every excluded expanded candidate and upstream location. Single words require measured r>=5, projected baseline<=0.1% of abstracts, and no human-control hit. Normal professional/function words are explicitly excluded (including across, between, within, additionally, showcasing and ordinary evaluative verbs). Fiction names, sampler fiction phrases and essay topic labels are rejected; Paech multiword phrases require an explicit rhetorical construction in policy.mjs. Career announcements, email pleasantries, ordinary idioms/transitions and broad real-value claims are removed. These are conservative editorial filters, **not validated English usage estimates**.

A top-5k list was considered but **not vendored**: first20hours/google-10000-english LICENSE.md restricts commercial usage via LDC, and wordfreq-derived lists contain CC BY-SA data. Rather than claim a licensed top-5k test, this pipeline rejects all unmeasured unigrams and uses a rare high-fold gate plus an explicit professional-word denylist and pre-LLM human prose. The calibration round may add a verified permissive general-English frequency source.

## Matching, deduplication and speed

Finite regex alternatives and inflections become normalized lowercase literal phrases whenever possible. Each surviving matcher gets a stable SHA-256-derived id prefixed by its vendor pack; every origin is recorded in its adjacent comment and report.json. Exact normalized duplicates across sources merge into one rule with the **maximum final weight**, even across category/position differences. Ownership prefers Kobak, Paech sampler, ZeroSlop, Paech essays, Vale, Radar; it does not increase weight. A position restriction is retained only when all duplicate origins agree. Opening/closing literals use the engine's first/last-two-lines semantics. Phrase expansion narrows whitespace to ordinary spaces and boundaries to the engine's Unicode-aware literal semantics. ZeroSlop prefix stems are not broadened into arbitrary word prefixes.

[OVERLAPS.md](OVERLAPS.md) reports exact first-party matches, proposed weights and source locations; those candidates are omitted. It also reports literal containment. Semantic overlap between regexes/custom detectors remains a calibration decision; exact deduplication does not solve correlated evidence. First-party hashes make concurrent edits visible.

Remaining regexes have spans bounded to 80 characters (word spans 32, whitespace 8), no lookaround/backreferences, no nested quantifiers and no u-only escapes. Unsupported or overly broad constructions are dropped. Python anchors become JS anchors; m anchors are explicitly translated to start-or-newline. Radar's emoji header uses explicit UTF-16 pairs because the contract supplies only gi; its repeated-modifier contrast is narrowed to zero or one modifier. DOTALL/nested generic benefit stacks are excluded.

Each regex is compiled once and scanned globally over six adversarial inputs of up to 10KB, including long words, whitespace, repeated negations and list fragments. The worst input's median of seven warmed full scans must be <1ms (reduces scheduler/GC noise; no cold-start claim). The benchmark warms separately, then analyzes **2,000 mixed posts, 50–400 words**, with ALL vendor and current first-party packs; reports full, baseline, vendor-only and per-pack timings. BENCHMARK.json is the last measured result, not regenerated by this deterministic converter.

## License gate and exclusions

Only MIT, Apache-2.0, BSD-2-Clause/BSD-3-Clause, CC0-1.0 or CC-BY-4.0 data may enter the lock. Every fetched input has a pinned upstream license and SHA-256; SPDX alone is insufficient. Full source LICENSE texts and SOURCE.md files are retained. Apache sampler generated files prominently state modifications; the pinned repository archive has no NOTICE/NOTICE.* file, so no upstream NOTICE text was fabricated. Any NOTICE found on a deliberate pin update must be preserved and appended to THIRD_PARTY_NOTICES.md.

Explicitly excluded: Wikipedia tables (CC BY-SA/GFDL), gptslop (AGPL), GPL/AGPL code or dictionaries, sloptells and archiewood/claudeisms (no license), Graphite/GPTZero proprietary lists (no grant), Paech 50k adjustments, fiction dumps, creative_writing profiles, wordfreq ports and CC BY-SA data. Vale Figurative*.yml and FormalTransitions.yml are outside the allowlisted inputs.

## Calibration handoff

Review partial overlaps and weight replacements before registration; test on held-out human social/ESL writing. Decide whether sampler proxy weights need an additional cap, whether topic filters are too strict, whether the bounded contrast variants add evidence beyond the first-party rules, and whether any corpus-filtered assistant wording merits a contextual rule. These packs do not implement density gates, score normalization, category caps or Shame policy. Registration and score calibration remain separate work.
