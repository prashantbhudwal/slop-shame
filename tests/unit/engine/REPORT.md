# Engine implementation report — 2026-10-19

Completed the AI-text definition of slop, the ten-family contract, density
scoring, and the research guardrails. No dependencies, runtime network calls,
DOM access, or git commits were added. Changes stay within the engine, engine
unit tests, post fixtures, and third-party notices.

## Files

Created:

- `src/lib/engine/context.ts`, `compile.ts`, `score.ts`, `index.ts`, `rules.ts`.
- `src/lib/engine/packs/ai-vocabulary.ts`, `template-phrases.ts`,
  `chatbot-leak.ts`, `negation-pivot.ts`, `inflation.ts`, `hedging.ts`,
  `engagement-bait.ts`, `formatting.ts`, `robotic-rhythm.ts`, `bypass-tricks.ts`.
- `src/lib/engine/packs/index.ts`, `upstream-map.ts`, `README.md`.
- `tests/unit/engine/context.test.ts`, `compile.test.ts`, `score.test.ts`,
  `packs.test.ts`, `calibration.test.ts`, `performance.test.ts`, `corpus.ts`,
  and this report.
- `tests/fixtures/posts/human.json`, `mixed.json`, `ai-certified.json`,
  `ai-swamp.json`, `ai-fingerprints.json` (60 synthetic posts in total).
- `THIRD_PARTY_NOTICES.md`, retaining both complete MIT licenses and the exact
  requested copyright lines for Conor Bronsdon and Siqi Chen.

Modified contracts:

- `types.ts`: added the specifically approved `SlopReport.shameable` field.
- `tiers.ts`: three non-null assertions and a comment to resolve existing
  `noUncheckedIndexedAccess` errors. No API, tiers, or thresholds changed.
- `rule-types.ts` is unchanged. The category union was supplied by the owner.

The initial LinkedIn-genre packs were removed before delivery. No author-headline
bonus, job-announcement penalty, or human broetry detector remains.

## Matcher

`buildContext` normalizes once (NFKC, invisibles, Greek/Cyrillic lookalikes),
precomputes straight/lower text, words, lines, sentences, sentence/line word
counts, emoji, hashtags, and structural metadata. A WeakMap holds metadata
without retaining analyzed contexts. Rare Unicode lowercase expansion gets an
offset map, preserving exact snippets in the normalized display text.

All literal phrases from all packs share one Aho–Corasick trie. Regex sources
share a combined candidate scanner; sticky per-source checks at candidate
offsets preserve overlapping rules. Sources with captures/backreferences use
isolated matchers to preserve local group numbering. All are compiled once at
engine creation. Literal boundaries are Unicode-aware; regexes follow the
contract's `gi` semantics. Repeats support once/each/sqrt. Matches at the same
start are deduped, overlap within a rule is greedily collapsed, and independent
rules may overlap. Only three snippets are displayed; every phrase span informs
sentence coverage. Opening/closing windows remain the first/last two non-empty
lines; built-in openers/closers add sentence anchors.

## Scoring

For each evidence bucket j:

```
P_j = sum(base weight × repeat/custom scale)
C_j = mean(1 - exp(-sentenceStrength / 6))
D_j = 100 × P_j / max(60, wordCount)
E_j = min(cap_j, 0.5 × cap_j × C_j + 0.5 × D_j)
score = round(100 × (1 - exp(-sum(E_j) / 32)))
```

Rule strengths are distributed over all matching spans and touched sentences.
Caps are shared buckets: phrases/vocabulary 24; discourse 12; formatting 8;
rhythm 8. Density is normalized before capping, keeping equally dense 100- and
300-word posts approximately invariant. Returned weights expose actual capped
contributions entering the final curve. Chatbot/bypass fingerprints are exempt
from caps. Strong fingerprints also supply a length-independent floor
`100 × (1 - exp(-F/7))`.

Low-TTR, function-word entropy/perplexity proxies, missing contractions, and
formal grammar earn no points. All 48 upstream detector types are mapped;
`low-ttr`, `fnword-trigram-entropy`, and zero-weight `unnecessary-hyphenation`
are intentionally mapped but not scored. Rhythmic rules need at least 80 words
and at least four sentences (current uniformity uses six). Em dash evidence
needs a phrase/discourse companion and contributes at most two raw points.
Mathematical fake bold is moderate formatting evidence, counted by code points.

`shameable` exactly follows the approved gate: score >=40, wordCount >=40,
and at least one signal from an allowed phrase/discourse family. Formatting,
rhythm, or bypass-only reports cannot enable Shame. Bodies below eight words
are clean even if metadata is noisy, as required by the original brief.

Two independent read-only reviews were addressed. Regression cases now cover
ordinary mixed Russian/Latin slang, generic bracketed editing notes, TypeScript
`type 'any'`, a first-sentence `Agree?`, class-based contributed custom rules,
phrase-edge whitespace, and four-glyph math labels.

## Calibration

Accuracy below means **within the fixture's allowed tier range**, grouped by
its primary expected tier. It is not empirical authorship-detection accuracy.
These are synthetic examples labeled by intended writing style, not independently
proven human or model provenance. Label sets were kept fixed while fixing rules.

| Expected tier | Cases | Within allowed tiers | Accuracy |
| --- | ---: | ---: | ---: |
| Artisanal | 37 | 37 | 100% |
| Whiff | 7 | 7 | 100% |
| Certified | 4 | 4 | 100% |
| Swamp | 8 | 8 | 100% |
| Slopocalypse | 4 | 4 | 100% |
| Total | 60 | 60 | 100% |

| Intended style | Cases | Mean score | Shame eligible |
| --- | ---: | ---: | ---: |
| Human | 36 | 2.4 | 0 |
| Mixed / edited AI | 8 | 24.1 | 0 |
| AI | 16 | 66.4 | 16 |

All human guardrails stay <=whiff and `shameable:false`, including formal
non-native English, casual em dashes, human broetry, real technical vocabulary,
legitimate weaving terminology, plain job announcements, code discussion, and
bilingual script mixing.

The offline upstream corpus has a manifest but no cached texts. Its `examples/`
files are house-style configurations, not labeled samples. No external dataset
was evaluated or committed; no CC BY-SA or new external dictionary was used.
Broader independent social-post and ESL validation is still needed before any
release claim about detection accuracy.

## Verification

Final engine run:

- 6 engine test files, 122 tests passed.
- Engine creation: **2.157 ms** (budget <20 ms).
- 2,000 posts of 50–400 words: **251.42 ms total, 0.1257 ms/post mean**
  (budget <0.5 ms/post).
- `pnpm test`: **12 files / 200 tests passed**, 19.44 seconds in the shared
  workspace while other agents were working.
- `pnpm exec tsc --noEmit -p .`: **no engine or engine-test errors**. The full
  workspace command exits 2 on two out-of-scope integration errors:
  - `src/entrypoints/linkedin.content/controller.ts:26`: missing
    `../../lib/ui/shame-modal` module.
  - `tests/unit/shame/generate.test.ts:35`: helper report needs `shameable`.

The orchestrator owns those integration fixes, updating `INTENTIONS.md`, and
committing the reviewed implementation.


## Follow-up: recall repairs

This initial report describes the committed first-pass engine. The current
recall repairs, policy changes, every-fixture before/after table, challenge-set
limitations, and latest verification are in [RECALL_REPORT.md](./RECALL_REPORT.md).
