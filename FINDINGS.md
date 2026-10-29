# Findings (what experiments established) — 2026-10-21

Facts discovered by measurement during the classifier work, for anyone resuming after context loss.

- **Owner intentions:** `INTENTIONS.md`, items 27–34.
- **Live status:** `HANDOFF.md`.
- **Baselines:** compare against a frozen engine snapshot, never against the live `src/lib/engine`, which agents edit in place:
  - `data/eval/raw/hillclimb/engine-base/` is the engine installed on the morning of 2026-10-21.
  - `data/eval/raw/v2/engine-r2/` is the round-2 engine that was shipped.

## 1. What we are building (owner's rules, settled)

- **Slop is *shit AI*, not AI.** It means lazy, low-quality, zero-effort output pasted from a model, with obvious, nameable tells. Good, effortful AI writing and human writing are both negatives. "Everything will be AI; the point is to detect shit AI." This is not an AI detector.
- **Ship bar: "better than before".** No endless hill climbing. The MVP ships.
- **The curated dictionaries are core** (ZeroSlop, vale-ai-tells, slop-radar, Paech, Kobak). Integrate them entry by entry: smoking guns score alone, stock phrases are habits, single words are weak vocabulary. The curators' weights are the prior. Never drop a source on one aggregate eval.
- **Scraped LinkedIn text is for checks only.** This covers the Kaggle 2021 scrape and the Wayback posts. It may be used for false-alarm checks and for setting the alarm threshold, but never for weights or base rates. It is never committed or shipped.
- **Agent routing:** at most one GPT-6-Astra job, on the Codex account with the most headroom. Opus at high or extra-high. The owner sometimes explicitly asks for Opus subagents on the Primary Claude account.

## 2. How the engine behaves

- **The score is additive evidence points, not a density:**
  - index = 100·(1−e^(−points/12)), so 40 ≈ 6.03 points;
  - style-only evidence is capped at 39;
  - any fingerprint floors the index at 80;
  - length is ignored.
- **A single tell can't reach the badge.** One "It's not X. It's Y." was worth 6 points, which is index 39. Short posts with one or two tells get stuck below 40.
- **The badge shows only at "Certified" (index 40+) by default** (settings `minTier: 'certified'`). That is what "caught" means for the owner.
- **Measurement trap:** round 2 edited the engine in place while "today" baselines were being measured. That produced a wrong "68/351" fresh-set baseline; the true value is 24/351.

## 3. Data facts

| Source | Fact |
|---|---|
| RAID `train_none.csv` | 13,371 human / 454,614 AI rows. The AI text is articles, abstracts, reviews, recipes, poetry, Reddit, wiki and news, with **no social posts**. The chat-model AI is a fair stand-in for raw cheap output, but the genre doesn't match LinkedIn. |
| LinkedIn Influencers (Kaggle, 2021 scrape) | 17,932 human posts of 30–600 words from 67 authors. **Line breaks were lost**: paragraph breaks became runs of spaces. It can validate wording rules, not layout rules. A "…see more" label was appended to about 15k posts and has been stripped. Author split in `linkedin-influencers-split.json`: veto 8,189 / holdout 9,743. |
| Morning engine on those LinkedIn humans | 85/17,932 (0.47%) flagged. Mostly rule-of-three (60 posts) and "not X but Y" (44). A few authors are at 2–3%. These broetry habits predate ChatGPT. |
| Google Books Ngram (CC BY 3.0) | Only 1-grams were feasible: 2,795 single words measured, while 2-grams needed 188 GB. 1,025 entries are above 1 per million words and 275 above 10 per million. Tokenization splits contractions several ways. |
| DetectRL-X | The Hugging Face card says MIT, but the paper's repo says non-commercial academic use only, so it is **evaluation only**. Its Academic/News/SEO/Wiki domains contain post-2022 text and were dropped. There is no reliable "human text polished by AI" class. The morning engine flags 4.6% of its (unverified) novel and webtext humans. |
| Gemini research | Wrong twice, on DetectRL-X's licence and on its dates. **Verify Gemini claims before acting on them.** |
| Licensed human LinkedIn data | None exists that can set weights. GOV.UK blogs (Open Government Licence) are the only clean professional corpus, and they are institutional, not personal. |

## 4. The generated test sets

All in `data/eval/generated/`. Baselines below are for the frozen morning engine.

| Set | What | Morning | Round 2 |
|---|---|---|---|
| `linkedin-ai-loweffort/` | 30 lazy prompts × 5 cheap models (Luna low/medium, GPT-5.6-Luna low, Sol low, Gemini Flash medium) = 150 | 11 | 52 |
| `linkedin-ai-realprompts/` | 60 real published prompts × the same 5 models = 300. Half the placeholders filled richly, half lazily | 13 | 77 |
| `linkedin-ai-fresh/` | 117 **unseen** real prompts × 3 cheap models = 351, the honest exam | 24 | 61 |
| `linkedin-ai/` | 30 detailed prompts × 7 stronger models = 210 ("effortful") | 9 | 30 (0 of them on good AI) |
| `data/eval/raw/polished/` | 120 RAID-dev human texts × 2 models; "light" = fix grammar, "linkedin" = "turn into a LinkedIn post" | light 2/160 | light 0/160; linkedin 37/80 |

- **The prompt matters more than the model.**
  - Lazy prompts produce slop from every cheap model.
  - With detailed prompts, Grok 4.7 and GPT-6.1-Sol write clean posts. Gemini Flash writes slop even with detailed prompts.
  - Claude Haiku is a good writer, so it is a poor slop source.
- **Published prompts** are in `data/eval/raw/prompts/`: 222 collected, 177 produce a finished post.

## 5. Blind reader panel (Opus): human judgement is far ahead of our rules

- **On the 450 target posts plus 150 LinkedIn humans:**
  - AI posts: 263 "obvious" smell, 186 "some", 1 "none".
  - Humans: 150/150 "none". Authorship guesses: 0 errors, 7 "unsure".
  - Caveat: the 2021 human posts look dated (`lnkd.in` links, typos), which makes them easier to tell apart.
- **Specifics separate the two sets strongly.** AI posts: 285 have none and 29 have many. Human posts: 2 have none and 77 have many.
- **The giveaways readers named:**
  - a closing engagement question (~108/300)
  - generic advice with no specifics (~92)
  - lists with markdown **bold** headings (~67)
  - "It's not X. It's Y." (~48)
  - "Here are N ways…" (~36)
  - **leaked prompt labels** (Hook:/CTA:/Before–After–Bridge/AIDA) (~28)
  - **unfilled `[placeholders]`** (~24)
  - one-line paragraphs
  - triplets
  - save/DM-keyword calls to action
  - pasted chatbot replies
- **Good-AI panel on the effortful set, "is this shit AI?":** 68 obvious, 65 some, 77 none.

  | Model | Panel verdict |
  |---|---|
  | Grok | 30/30 none |
  | GPT-6.1-Sol | 21 none |
  | Claude Haiku | 13 none |
  | Gemini Flash | 55/60 obvious |

  25 of the 30 anchor posts got the same label as before; 5 moved from obvious to some under the stricter framing.
- **Files:** labels in `data/eval/raw/judge/panel-labels.json` and `effortful-labels.json`.

## 6. Classifier experiments and their lessons

### Round 1 (Sol): fitting weights on RAID

| Measure | Before → after |
|---|---|
| RAID test recall | 11.2% → 23.3% |
| RAID test human false positives | 28 → 1 |
| Cheap-model LinkedIn posts caught | 11 → 4 |

- Its first, higher-recall pick (42% recall on the tuning split) failed on formal prose: PLOS abstracts and Federal Reserve statements.
- **Why it got worse on LinkedIn:** it zeroed 49 of the 77 first-party rules (engagement bait, emoji bullets, hashtags) because RAID AI never contains them.
- **Lesson:** fitting on a mismatched genre deletes platform-native tells. Lower a rule's weight only on *human false-alarm* evidence.

### Other round-1-era experiments

- **Mining n-grams from RAID:** produced review and book clichés ("masterpiece", "a must"), useless for LinkedIn. Keepers: the openers "Sure,", "Sure!", "Here's a possible" and "Title:".
- **Structural features (Sol):**
  - A mechanical "no specifics" count is too noisy: it flags 90/2,354 RAID humans.
  - A short-post curve (K = 11.5) took 11 → 26 of 150 caught, but LinkedIn veto false alarms went 19 → 36.

### Round 2 (Sol): shipped, verified by the orchestrator

| Measure | Before → after |
|---|---|
| Fresh set caught | 24 → 61 / 351 |
| Target holdout caught | 11 → 51 / 160 |
| LinkedIn holdout human false alarms | 66 → 43 / 9,743 |
| RAID test human false alarms | 28 → 24 |
| External set human false alarms | 19 → 13 |
| Polished-light false alarms | 2 → 0 |
| Speed | 0.2–0.36 ms per post |

- **What changed:** 26 pasted-output rules, with labels rewritten in house tone, and six weights lowered:
  - not-x-but-y 6 → 4
  - rule-of-three 3 → 1.5
  - formulaic-opener 5 → 0.25
  - explainer-idioms 2 → 0.25
  - parenthetical 3 → 0.25
  - tier2 2 → 1
- **The owner saw *fewer* badges on the real feed afterwards.** Restoring the six weights takes the fresh set to 69/351 but doubles human false alarms: 123 vs 60 on all 17,932 posts (the morning engine had 85).
- **Lesson:** our sets are not the owner's real 2026 feed. Real-feed posts were never captured; the fixtures hold only about 2 usable posts.

### Architecture research (Opus and Astra, independent)

Both converged on a **constrained evidence scorecard**, the SpamAssassin approach: hand-written rules with learned scores. Its parts:
- **Length-aware "surprise over human expectation":** φ = max(0, ln(1+c) − ln(1+m(n))).
- Family caps.
- **Two-witness gate:** one smoking gun, or two independent habit families.
- **Fitting:** false-positive-weighted, non-negative, constrained logistic regression, shrunk toward a prior.
- **Threshold:** Neyman–Pearson, so that the 95% upper bound of human FPR is ≤ 0.1%.
- **Index:** linear, with 40 = the calibrated boundary, and exact additive explanations.

Proposals are in `research/scoring-architecture-{opus,astra}.md`. Classifier v2 implements this together with per-entry dictionary tiering.

## 7. Operational lessons

- **"Model at capacity" is a transient error.** Resend to the same thread to continue. Switch only after 3–4 failures in a row. This rule is in the orchestrator skill.
- **GPT-6-Luna low fails on long single-file inputs** (truncation). Split inputs into 20-item files and append output per file.
- **Playwright wipes `test-results/`.** Save screenshots elsewhere, e.g. `design/…`.
- **The installed build** lives at `~/slop-shame-extension`. Releases, with a backup, zip and BUILD-INFO, go in `~/slop-shame-builds/<label>/`. Round 2 shipped as `mvp-20261021T091406Z`.
- **A build from the working tree bundles whatever engine is mid-edit.** The Drip Edge release shipped the unfinished v2 engine (6.2 MB content script). While an engine agent is working, build releases from an isolated copy with a frozen engine.
- **Commit before building releases.** On 2026-10-21 the working tree held days of uncommitted agent work; it was committed later in `8de3565` and `bdb9281`.

## 8. In flight at the time of writing

| Task | T3 clientRequestId | Account | Notes |
|---|---|---|---|
| Classifier v2: scorecard and dictionaries tiered entry by entry | `slop-classifier-v2-sol-r1-20261021` | Codex Quaternary | **Final comparison failed; do not ship.** Fresh 61 -> 7/351, target holdout 51 -> 18/160; effortful-obvious 20 -> 18/68; good-AI none 0/77; LinkedIn human holdout 43 -> 38/9,743. Child finishing report. Owner rejected the 1 MB cap; withdrawn. 9,107 dictionary candidates retained. Warm mean 0.360 ms/post; cold Node + first call 184 ms vs 82 ms round 2. No worker integration implemented. |
| Drip Edge highlight UI | `slop-ui-drip-edge-opus-r1-20261021` | Claude Primary | **Done.** Its own install bundled the unfinished v2 engine; reinstalled as `mvp-20261021T101358Z` with the round-2 engine (see HANDOFF). |
| Wayback human LinkedIn posts with line breaks | `slop-wayback-linkedin-sol-r1-20261021` | Codex Secondary | Output `data/eval/raw/normalized/linkedin-wayback.jsonl`. Check-only. |

**Next:**
1. V2 reviewed: failed the ship bar; do not install or tune on the final sets.
2. Avatar monster + ring restored alongside Drip Edge; installed with round 2
   as `mvp-20261021T103441Z` (see HANDOFF.md for verification).
3. Owner reloads extension and uses the restored round-2 build on the real feed.
4. Commit, once the owner says so.
5. Chrome Web Store submission.
