# Add an AI-writing tell in 30 seconds

Slop currently means **AI-written text**. The default packs describe AI tells,
not whether somebody announces a job, tells a story, uses short paragraphs,
or has an enthusiastic headline. Those genres have human authors too.

Find the matching pack, add a data-only rule, then run `pnpm test`:

```ts
{
  kind: 'phrase',
  id: 'template-phrases.ceremonial-introduction',
  category: 'template-phrases',
  label: 'The paragraph has requested an introduction',
  weight: 3,
  phrases: ['without further ado'],
  repeat: 'once',
  position: 'opening', // optional: first/last TWO non-empty lines
}
```

Do not add this exact example: `without further ado` already exists. A helper
`phrase(category, suffix, label, weight, data)` in `../rules.ts` supplies the
boilerplate for the built-in packs. Either form produces the same RulePack API.
A future platform-specific pack can be registered without changing the engine.

IDs are stable, globally unique, lowercase kebab-case: `<pack>.<rule>`. The
prefix must equal the pack ID. New packs export a `RulePack` from their own
file and are registered in `index.ts`. Categories come from `../types.ts`.
Pack IDs and categories need not be identical in contributed packs.

Literal phrases ignore case, tolerate straight/curly apostrophes, and use
Unicode word boundaries (`delve` does not match `delved`, `édelve`, or
`delve_thing`). Text is NFKC-normalized, invisible characters stripped, and
Greek/Cyrillic lookalikes folded once. Mathematical fake bold still matches.
Snippets preserve spelling and case in the normalized display text.
Accidental leading/trailing phrase whitespace is trimmed. Internal whitespace
is literal; use a bounded regex if a tell needs to tolerate extra spacing.

`repeat` defaults to `once`; `each` multiplies by occurrence count, `sqrt` by
its square root. Alternatives at the same start count once (longest wins),
and overlapping occurrences within one rule are greedily collapsed. Different
rules may overlap. Display snippets stop at three, but ALL phrase spans feed
the sentence coverage calculation. `opening`/`closing` requires the whole span
to lie in the first/last two non-empty lines, including hashtag footer lines.
Built-in greeting/CTA rules add sentence or line anchors, because the line
window alone cannot distinguish the ends of a one-paragraph post.

For non-literal patterns, use `patterns: ['\\bfoo\\s+bar\\b']` in TypeScript.
Regex sources use `gi`, as specified in the contract, and do not get automatic
boundaries. `\b` is ASCII; use literals when Unicode word boundaries matter.
Regexes run against a precomputed straight-quote text of identical length, so
quote classes and snippets keep correct offsets. Non-capturing groups join one
candidate scanner; sticky per-source checks preserve overlapping rule hits.
Captures and backreferences use isolated matchers so group numbers stay local.
Avoid nullable patterns (rejected), nested quantifiers, unbounded backreference
patterns, and broad `.*` chains. Contribution code is trusted, not sandboxed.

Base weights are evidence strengths, not percentages:

| Weight | Appropriate use |
| --- | --- |
| 1–1.5 | Common professional vocabulary; weak corroboration |
| 2–3 | A recognizable phrase or density-gated vocabulary cluster |
| 4–6 | A specific discourse construction or conspicuous formatting skeleton |
| 7–8 | Assistant boilerplate or reasoning scaffolding |
| 10–14 | Explicit model disclaimer, placeholder, citation token, or bypass pattern |

Avoid duplicate IDs or counting identical evidence under several new rules.
Common technical words are weak; secondary/tertiary word lists need clusters.
A single normal word should never become a verdict. Every borrowed rule needs
`attribution` plus its full license in `THIRD_PARTY_NOTICES.md`. This round uses
only the two reviewed MIT sources, no external dictionary downloads.

For structural rules, `detect(ctx)` returns `{ matches, scale? }` or `null`.
Use `ctx.words`, `ctx.lines`, `ctx.sentences`, `ctx.emojiCount`, `ctx.hashtags`,
and internal `structureOf(ctx)` for precomputed line/sentence token counts.
Never re-split or lowercase the body, compile regexes in `detect`, use the DOM,
call the network, or add dependencies. Return finite positive scales and a
string array. Invalid contributor data gets an error naming the rule.
Class-based rules with prototype `detect()` methods are supported and bound
to their instance; contributed functions remain responsible for their state.

# Scoring and the Shame gate

Scoring uses strength-weighted sentence coverage, blended with tells per 100
words, then family caps and a saturating curve. See the documented formula in
`../score.ts`. Normalize density **before** capping so duplicating equally
dense paragraphs does not change a 100-word result into a 300-word false clean.
The raw evidence entering the final curve is capped by these shared buckets:

| Bucket | Cap | Families |
| --- | --- | --- |
| Phrases/vocabulary | 24 | ai-vocabulary, template-phrases, inflation, hedging |
| Discourse | 12 | negation-pivot, engagement-bait, repeated rule-of-three |
| Formatting | 8 | formatting, including fake bold and em dash corroboration |
| Rhythm | 8 | remaining robotic-rhythm rules |
| Fingerprints | Exempt | chatbot-leak, bypass-tricks |

Signal `weight` and `categoryWeights` expose the actual apportioned, capped
contribution before the final curve, not uncapped dictionary counts. An em dash
needs another positive phrase/discourse family and contributes at most two.
There are no positive low-TTR, entropy/perplexity, missing-contraction, or
formal-grammar rules. Rhythm needs at least 80 words and 4+ sentences; current
uniformity uses six sentences for additional caution. Human broetry is not a
rule. Mathematical fake bold is moderate formatting evidence, not a fingerprint.

`shameable` is true only when score >=40, wordCount >=40, AND a signal from
ai-vocabulary, template-phrases, chatbot-leak, negation-pivot, inflation, hedging,
or engagement-bait fired. Style-only results and short posts cannot enable
Shame. Bodies below eight words return a clean report. Author headlines do not
contribute. These are comedy-oriented heuristic tells, not a probability or
proof of authorship.

# Upstream coverage

`upstream-map.ts` maps **all 48** avoid-ai-writing detector types to our ten
families. Rule implementations adapt cheap social-length patterns rather than
copying upstream weights or its algorithm. `negation-pivot` and rule-of-three
also draw on humanizer. The following mapped types deliberately earn no points:

- `low-ttr`: lexical diversity is unsafe positive evidence for non-native writers.
- `fnword-trigram-entropy`: excluded as an unvalidated grammar-distribution proxy.
- `unnecessary-hyphenation`: upstream itself assigns zero authorship weight.

`tier3-phrase` and `tier3-phrase-cluster` are represented by repeated boilerplate
phrases. `formatting` covers emoji lists/density; `normalization-flag` splits into
mixed-script words and repeated invisible characters inside Latin words. Emoji
ZWJ sequences and pure non-Latin writing are not bypass evidence.
Homoglyph fingerprints additionally require mostly Latin prose and a mostly
Latin word with an internal script substitution; bilingual suffixes are skipped.
Only specific identity placeholders get a fingerprint weight. Generic editing
notes such as `[insert link in comments]` are weak assistant-formatting evidence.

# Testing and calibration

Add positive and innocent-negative examples to `tests/unit/engine/packs.test.ts`.
Add realistic posts under `tests/fixtures/posts/`, with fields `{ id, text,
authorship: 'human'|'ai'|'mixed', synthetic: true, expectTier, hashtags?,
authorHeadline? }`. `expectTier` is one tier or adjacent acceptable tiers.
Every human example must stay <=whiff and `shameable:false`; preserve formal
non-native prose, casual em-dash usage, and human broetry as guardrails.

The synthetic labels describe the intended writing style, **not independently
verified provenance**. High tier-calibration accuracy here is not real-world
AI detection accuracy. Lightly edited AI may score low; that is preferable to
accusing human writers. Keep tier sets editorial and fixed before scoring.

`pnpm test` exercises context, compiler, every pack, contributor errors, the
full corpus, caps/gating, and 2,000 posts of 50–400 words. Budget: <0.5ms/post
mean and <20ms full engine creation on warmed Node. No new dependencies.

The upstream offline `corpus/manifest.json` lists human/AI controls but its cache
is absent in this workspace. `examples/` contains house-style configurations,
not labeled text. No third-party dataset was copied or evaluated this round;
CC BY-SA samples are not used. Broader held-out social/ESL evaluation remains
necessary before interpreting this hand-written corpus as a release claim.
