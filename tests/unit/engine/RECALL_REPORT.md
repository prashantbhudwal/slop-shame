# Recall repair: every fixture before / after

Baseline: engine revision e6265fd, frozen before the first red-test run.

Synthetic style labels are not independent authorship proof. The 20 blind AI samples were written without inspecting the packs and are excluded from fitted tier-calibration accuracy.

| Dataset | Cases | Mean before → after | >=60 before → after | Shame before → after |
| --- | ---: | --- | --- | --- |
| human | 36 | 2.36 → 2.36 | 0 → 0 | 0 → 0 |
| mixed | 8 | 24.13 → 25 | 0 → 0 | 0 → 0 |
| original-ai | 16 | 66.38 → 74.44 | 12 → 14 | 16 → 16 |
| blind-ai | 20 | 1.5 → 1.4 | 0 → 0 | 0 → 0 |
| probes | 3 | 21 → 59.33 | 0 → 2 | 0 → 2 |

## Every fixture

| Fixture | Label | Before | After | Shame before → after |
| --- | --- | ---: | ---: | --- |
| realism-ai-01 | ai | 9 | 9 | false → false |
| realism-ai-02 | ai | 0 | 0 | false → false |
| realism-ai-03 | ai | 0 | 0 | false → false |
| realism-ai-04 | ai | 2 | 2 | false → false |
| realism-ai-05 | ai | 0 | 0 | false → false |
| realism-ai-06 | ai | 0 | 0 | false → false |
| realism-ai-07 | ai | 0 | 0 | false → false |
| realism-ai-08 | ai | 0 | 0 | false → false |
| realism-ai-09 | ai | 2 | 2 | false → false |
| realism-ai-10 | ai | 11 | 15 | false → false |
| realism-ai-11 | ai | 0 | 0 | false → false |
| realism-ai-12 | ai | 0 | 0 | false → false |
| realism-ai-13 | ai | 6 | 0 | false → false |
| realism-ai-14 | ai | 0 | 0 | false → false |
| realism-ai-15 | ai | 0 | 0 | false → false |
| realism-ai-16 | ai | 0 | 0 | false → false |
| realism-ai-17 | ai | 0 | 0 | false → false |
| realism-ai-18 | ai | 0 | 0 | false → false |
| realism-ai-19 | ai | 0 | 0 | false → false |
| realism-ai-20 | ai | 0 | 0 | false → false |
| ai-cert-onboarding | ai | 46 | 46 | true → true |
| ai-cert-transition | ai | 45 | 45 | true → true |
| ai-cert-hedging | ai | 40 | 60 | true → true |
| ai-cert-pivot | ai | 45 | 70 | true → true |
| ai-leaked-model | ai | 86 | 98 | true → true |
| ai-leaked-template | ai | 82 | 98 | true → true |
| ai-leaked-url | ai | 82 | 82 | true → true |
| ai-bypassed | ai | 92 | 92 | true → true |
| ai-swamp-culture | ai | 66 | 75 | true → true |
| ai-swamp-innovation | ai | 68 | 75 | true → true |
| ai-swamp-sales | ai | 65 | 75 | true → true |
| ai-swamp-work | ai | 66 | 75 | true → true |
| ai-swamp-data | ai | 68 | 75 | true → true |
| ai-swamp-design | ai | 68 | 75 | true → true |
| ai-swamp-bullets | ai | 75 | 75 | true → true |
| ai-swamp-contrasts | ai | 68 | 75 | true → true |
| normal-job | human | 0 | 0 | false → false |
| normal-technical | human | 0 | 0 | false → false |
| normal-event | human | 0 | 0 | false → false |
| normal-question | human | 0 | 0 | false → false |
| normal-hiring | human | 0 | 0 | false → false |
| normal-thanks | human | 0 | 0 | false → false |
| normal-poll | human | 0 | 0 | false → false |
| normal-ai-research | human | 0 | 0 | false → false |
| normal-dash | human | 0 | 0 | false → false |
| normal-checklist | human | 0 | 0 | false → false |
| normal-offer-help | human | 0 | 0 | false → false |
| normal-launch | human | 0 | 0 | false → false |
| normal-triple-list | human | 0 | 0 | false → false |
| normal-emoji | human | 0 | 0 | false → false |
| normal-terms | human | 5 | 5 | false → false |
| normal-plain-promotion | human | 0 | 0 | false → false |
| normal-story-child | human | 0 | 0 | false → false |
| normal-headline | human | 0 | 0 | false → false |
| normal-short | human | 0 | 0 | false → false |
| normal-empty | human | 0 | 0 | false → false |
| human-formal-non-native | human | 0 | 0 | false → false |
| human-casual-dashes | human | 0 | 0 | false → false |
| human-broetry | human | 0 | 0 | false → false |
| human-typos | human | 0 | 0 | false → false |
| human-ai-engineer | human | 0 | 0 | false → false |
| human-share-certainly | human | 0 | 0 | false → false |
| human-weaver | human | 11 | 11 | false → false |
| human-formal-engineering | human | 8 | 8 | false → false |
| human-negation-literal | human | 9 | 9 | false → false |
| human-emoji-checklist | human | 15 | 15 | false → false |
| human-maths-bold | human | 11 | 11 | false → false |
| human-careful-hedge | human | 14 | 14 | false → false |
| human-russian-mixed-slang | human | 0 | 0 | false → false |
| human-editor-note | human | 12 | 12 | false → false |
| human-code-any | human | 0 | 0 | false → false |
| human-survey-title | human | 0 | 0 | false → false |
| mixed-launch | mixed | 28 | 28 | false → false |
| mixed-meetup | mixed | 27 | 27 | false → false |
| mixed-hiring | mixed | 17 | 17 | false → false |
| mixed-edit | mixed | 26 | 33 | false → false |
| mixed-report | mixed | 26 | 26 | false → false |
| mixed-course | mixed | 31 | 31 | false → false |
| mixed-clean-edit | mixed | 0 | 0 | false → false |
| mixed-technical | mixed | 38 | 38 | false → false |
| probe-textbook-ai | ai | 23 | 74 | false → true |
| probe-chatbot-launch | ai | 36 | 100 | false → true |
| probe-subtle-modern | ai | 4 | 4 | false → false |

## Root causes and repairs

- The textbook probe's 65 words previously fired only the two filler quotes
  (under one rule ID) and `ever-evolving`. Curly apostrophe normalization was
  already correct. Both `Here's the thing` and `Let that sink in` were already
  quotable; their shared rule did not supply independent cross-family strength.
- The negation grammar required `it's not` / `this is not`; it missed a
  subject followed by `isn't about`. It now accepts contracted/uncontracted
  subject-led contrast with comma, semicolon, sentence break, em dash, or en dash.
- Formulaic sentence openers were incorrectly limited to the first two post
  lines. They now match sentence/paragraph starts anywhere in the post. Sentence
  boundary assertions do not consume punctuation from the preceding sentence.
- Landscape collocations were exact literals. Bounded patterns now support
  intervening adjectives and inflected `navigate`, plus possessive full-potential
  variants. Literal trie behavior and word boundaries are unchanged.
- Closing `$` was applied to the whole post, including hashtag footer lines.
  Context now computes the last prose boundary, skipping trailing hashtag and
  emoji-only lines. A second precompiled candidate scanner handles closing
  patterns on the prose prefix; offsets still point into the full display text.
- The explicit three-item construction was blocked below 80 words and required
  two instances. It now acts as weak corroborating discourse at supported lengths
  and cannot score without an independent phrase family. Statistical rhythm is
  still gated at 80 words. Three generic footer hashtags are weak formatting
  corroboration; ordinary topic tags and duplicate metadata do not inflate it.
- The chatbot greeting was below the fingerprint threshold; `Product Name`
  wasn't in the specific placeholder list; and assistant preambles lacked a rule.
  Clear assistant greetings, deliverable preambles, and product/project template
  slots now fire explicit fingerprint rules. Polite `Absolutely!` / `Great
  question!` remain weak rather than fingerprint evidence. Generic editing notes
  retain their low weight.
- Strong fingerprints now floor the score at 80 and permit Shame from 8 words,
  as newly requested. Non-fingerprint Shame still needs 40 words plus score 40
  and phrase/discourse evidence. Bodies below 8 words and style-only reports
  remain ineligible.
- Family caps remain 24/12/8/8. A dense combination of five distinct significant
  quotes across three phrase/discourse families gets a score floor of 60,
  increasing to at most 75 with extra families/tells. Repeated identical quotes
  and style-only signals earn no distinct-tell credit. Sparse long text must
  still meet a three-occurrences-per-100-words support threshold for this floor.

## Precision and independent recall

All 36 human-style guardrails have exactly the same scores as the frozen baseline,
remain at or below whiff, and are not shameable. The original 60-post editorial
calibration remains 60/60 within its existing allowed tier ranges. No original
labels or texts were changed.

The 20 new challenge posts were written by a separate Opus 5.5 agent that read
only AGENTS.md / INTENTIONS.md and did not inspect any pack, scoring code,
dictionary, existing fixture, or research tell list. Their texts are unchanged.
Their broad tier fields do not contribute to calibration accuracy: `evaluation:
"holdout"` separates them, and the three supplied probes are `evaluation:
"regression"`.

**The blind AI holdout remains 0/20 at scores >=40, 0/20 at >=60, and 0/20 shameable.**
Its mean changes from 1.50 to 1.40 because a purely stylistic cadence signal no
longer scores without phrase support. These repairs solve the demonstrated
matching bugs and improve existing AI examples; they do not solve recall on
current-model prose with few known tells. The holdout is preserved as an honest
challenge set for round 2, without fitting its text or declaring it clean human
writing. The modern supplied probe likewise stays at 4 as requested.

## Verification

- Red first: the initial recall test run failed 11 of 14 checks, reproducing
  scores 23 / 36 / 4 before implementation changes.
- Final targeted suite: **150 passed, 1 skipped** across 8 first-party engine
  files. The skip is the explicit opt-in before/after artifact generator,
  which separately passes when invoked with the frozen baseline path.
- **pnpm exec tsc --noEmit -p . passes** for the full workspace.
- Engine creation: **2.573 ms**; 2,000 mixed-length posts: **325.20 ms total,
  0.1626 ms/post mean**, under the 20 ms / 0.5 ms budgets.
- Full `pnpm test` during concurrent integration: **245 passed, 10 failed,
  1 skipped**. Failures: 6 LinkedIn adapter hydration/layout regressions,
  3 store-client expectations being updated in that workstream, and the vendor
  reproducibility comparison. There are no first-party engine failures.
- The vendor test invokes its updater in place; its mismatch was confined to
  `packs/vendor/report.json` metadata. The test refreshed that report itself.
  No vendor rule/test was edited by this task; the vendor owner must review
  the generated metadata refresh. No further vendor updater was run manually.
- No dependencies, runtime networking, browser processes, or commits were added.
  Changes remain in the requested engine/test/post-fixture scope, apart from
  the documented vendor test's own generated metadata side effect.
