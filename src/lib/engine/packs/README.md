# Add an AI-writing tell in 30 seconds

Slop means **zero-effort pasted model output with visible, nameable smells**.
Careful AI-assisted writing and clean output without a tell are outside the
target. Every point must have a snippet or visible pattern the reader can
inspect. A job announcement, a story, short paragraphs or an enthusiastic
headline alone do not establish slop. See INTENTIONS item 31.

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
  position: 'opening', // optional: first TWO non-empty lines
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
to lie in the first two non-empty lines / last two prose lines. Closing rules
skip trailing hashtag and emoji-only lines. Closing regex `$` anchors run on
that prose prefix, with offsets preserved into the complete display text.
Built-in greeting/CTA rules add sentence or line anchors, because the line
window alone cannot distinguish the ends of a one-paragraph post.

For non-literal patterns, use `patterns: ['\\bfoo\\s+bar\\b']` in TypeScript.
Regex sources use `gi`, as specified in the contract, and do not get automatic
boundaries. `\b` is ASCII; use literals when Unicode word boundaries matter.
Regexes run against a precomputed straight-quote text of identical length, so
quote classes and snippets keep correct offsets. Non-capturing groups join two
bounded candidate batches (full text and closing prose); sticky per-source checks
preserve overlapping rule hits.
Captures and backreferences use isolated matchers so group numbers stay local.
Avoid nullable patterns (rejected), nested quantifiers, unbounded backreference
patterns, and broad `.*` chains. Contribution code is trusted, not sandboxed.

Base weights are evidence strengths, not percentages:

| Weight | Appropriate use |
| --- | --- |
| 1–1.5 | Common professional vocabulary; weak corroboration |
| 2–3 | A recognizable phrase or vocabulary cluster |
| 4–6 | A specific discourse construction or conspicuous formatting skeleton |
| 7–8 | Assistant boilerplate or reasoning scaffolding |
| 10–14 | Direct model disclaimer, assistant preamble or distinctive generation artifact |

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

Evidence adds up without dividing by post length. Rules apply their declared
`once`, `each`, or `sqrt` repeat behavior. Competing rules describing the same
lexical occurrence contribute once; a stronger collocation replaces its
contained vocabulary tell. A grammatical contrast may also provide independent
construction evidence. Quoted and fenced code examples do not become evidence
that the surrounding author is speaking as a chatbot.

`score.ts` applies category caps and a saturating curve:
`100 * (1 - exp(-evidence / K))`. The scale is editorial, not an authorship
probability. Category caps are vocabulary 20, template phrases 20, contrasts 16,
inflation 16, hedging 12, engagement 16, formatting 12, rhythm 8, chatbot 20,
and bypass typography 8. Three or more distinct phrase-evidence categories earn
one corroboration point per category beyond two, capped at two extra points.
This bonus is distributed proportionally across the visible phrase signals.
`weight` and `categoryWeights` report counted contributions, including that
corroboration, after occurrence, category, and style limits. K remains 12;
short-post K and lower style ceilings were tested and rejected on dev gates.

Rule `evidence` can be `phrase`, `style`, or `fingerprint`. Formatting, rhythm,
and bypass categories default to style; other categories default to phrase.
Repeated labels, generic greetings, tracking URLs and unusual characters are
style evidence. Explicit unfinished slots and unrendered Markdown are phrase
evidence in the new `pasted-output` pack. Prompt-framework labels, explicit
assistant deliverables and live-browsing disclaimers can opt into fingerprint.
Ordinary editing offers remain weak phrase evidence. Direct model identity,
assistant revision preambles and distinctive generation artifacts retain their
fingerprint floor.
A high rule weight or repetition never changes that classification.

Style-only evidence tops out at 39 and cannot permit Shame. A weak phrase cannot
unlock arbitrary formatting points: style can contribute only as much as its
independent phrase support, or retain its own bounded style index, whichever
is higher. Em dashes and list cadence need phrase support. Vocabulary clusters
use counts, not whole-document percentages; ordinary appended prose cannot
erase an existing tell. All matching is local and dependency-free.

Ordinary `shameable` requires score >=40, >=40 words and at least four counted
phrase-evidence points. An explicit fingerprint has a score floor of 80 and
permits Shame from eight words. Shorter text still retains its evidence and
score. Empty bodies and author headlines add no evidence. These heuristic
signals identify AI-like slop; a low score never establishes human authorship.

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
Unfinished slots such as `[Company]`, `[link]`, `{name}` and `<insert company>`
are strong draft-residue evidence (8 points), without an automatic fingerprint
floor. This includes `[insert link in comments]`: an unfinished draft is the
owner's explicit round-two target. Quoted or fenced examples remain protected.

# Testing and calibration

Add positive and innocent-negative examples to `tests/unit/engine/packs.test.ts`.
Add realistic posts under `tests/fixtures/posts/`, with fields `{ id, text,
authorship: 'human'|'ai'|'mixed', synthetic: true, expectTier, hashtags?,
authorHeadline? }`. `expectTier` is one tier or adjacent acceptable tiers.
Human controls must stay <=whiff and `shameable:false`; preserve formal
non-native prose, casual em-dash usage, and human broetry as guardrails. The
historical synthetic `human-editor-note` is explicitly an unfinished draft,
now checked for visible slot evidence rather than treated as a clean negative.

The synthetic labels describe the intended writing style, **not independently
verified provenance**. High tier-calibration accuracy here is not real-world
AI detection accuracy. Lightly edited AI may score low; that is preferable to
accusing human writers. Keep tier sets editorial and fixed before scoring.
The independent `adversarial-realism.json` holdout and the orchestrator probes
have `evaluation` labels and are excluded from that calibration percentage.
Holdout recall is printed separately. All 85 fixtures are evaluated before and
after in `tests/unit/engine/RECALL_REPORT.md` and `recall-before-after.json`.
Regenerate those artifacts by setting `SLOP_BASELINE_ENGINE` to a frozen old
`index.ts` path and optionally `SLOP_BASELINE_REVISION`, then running
`pnpm exec vitest run tests/unit/engine/recall-report.test.ts --silent=false`.
The report generator is skipped during ordinary unit runs.

`pnpm test` exercises context, compiler, every pack, contributor errors, the
full corpus, caps/gating, and 2,000 posts of 50–400 words. Budget: <0.5ms/post
mean and <20ms full engine creation on warmed Node. No new dependencies.

The upstream offline `corpus/manifest.json` lists human/AI controls but its cache
is absent in this workspace. `examples/` contains house-style configurations,
not labeled text. No third-party dataset was copied or evaluated this round;
CC BY-SA samples are not used. Broader held-out social/ESL evaluation remains
necessary before interpreting this hand-written corpus as a release claim.
