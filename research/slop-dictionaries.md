# AI-slop dictionaries worth pulling

Research date: 2026-10-19. Scope: open word, phrase, and regex lists of LLM writing tells that could be vendored into Slop Shame (MIT, local heuristics, no runtime network). The two lists already adapted in `src/lib/engine/packs/ai-tells.ts` — [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) and [humanizer](https://github.com/blader/humanizer) — are noted at the end and are not re-ranked.

License gate used below: MIT, Apache-2.0, BSD, CC0, and CC BY are usable in an MIT extension if the notice is kept. **CC BY-SA, GFDL, AGPL, no license, and unclear are marked NOT USABLE** and must not be copied into the extension.

Counts were taken from the raw files on 2026-10-19, not from READMEs.

## Top 5 to integrate

Ranked for this extension: permissive SPDX, machine-readable, a weight or a frequency we can turn into a weight, maintained in 2025–2026, and not a fiction-only or biomedical function-word dump. Pull the files named here and nothing else from those repos.

### 1. Zero Slop — weighted regexes, including a LinkedIn category

| | |
|---|---|
| Name | Zero Slop |
| URL | https://github.com/manavmishra/ZeroSlop |
| Maintainer | Manav Mishra (`manavmishra`; PyPI `zero-slop`) |
| License | MIT (GitHub license SPDX `MIT`; [LICENSE](https://github.com/manavmishra/ZeroSlop/blob/main/LICENSE)) |
| Last update | Pushed 2026-10-17. Pattern `last_confirmed` dates inside the file run 2026-08-03 to 2026-09-03. |
| Size | 273 regex patterns, 95 lexicon weights, 26 inflection riders, 25 rider triggers. Optional extra file: 21 learned patterns. |
| Format | JSON. Patterns are `{name, cat, rx, w, first_seen, last_confirmed}`. Lexicon is a word → weight map. |
| Weights | Yes. Pattern `w` is 1–10. Lexicon weights are ints and floats (top of the lexicon: `delve` 6, `tapestry` 6, `testament` 5). |
| Models / recency | Not a per-model mine. Categories and confirmation dates are 2026 editorial calibration, not a GPT-5/Claude/Gemini frequency table. One category is literally `linkedin` (21 patterns): `announce-excited`, `engagement-bait`, `hashtag-cluster`, `if-this-resonates`, `this-is-your-sign`, `false-vulnerability`, and others. |
| Quality | Best drop-in for the current engine (regex + weight). The LinkedIn category matches feed slop better than creative-writing lists. Still a ban-shaped list: `passionate-about` is weighted 2.5 and will hit ordinary human posts. Use weights as score contribution, and require a cluster, the way the pack already does for em dashes. |

**Pull**

- https://github.com/manavmishra/ZeroSlop/blob/main/data/patterns.json — the only file to vendor. It already contains `patterns`, `lexicon`, `riders`, and `rider_triggers`.
- Optional, small, overlapping: https://github.com/manavmishra/ZeroSlop/blob/main/data/learned.json

PyPI package page: https://pypi.org/project/zero-slop/

### 2. Sam Paech — probability weights and essay-domain counts

Two repos, one research program (EQ-Bench Slop Score). Pull the curated weight file and the essay-domain count files. Leave the fiction dumps and the CC BY-SA wordfreq port alone.

| | |
|---|---|
| Name | AntiSlop Sampler + Slop Forensics + Slop Score |
| URLs | https://github.com/sam-paech/antislop-sampler · https://github.com/sam-paech/slop-forensics · https://github.com/sam-paech/slop-score · leaderboard writeup https://eqbench.com/slop-score.html |
| Maintainer | Samuel J. Paech |
| License | AntiSlop Sampler: Apache-2.0. Slop Forensics: MIT. Slop Score lists in `data/`: MIT, copyright 2025 Sam Paech. **Do not pull** `js/wordfreq.js` or `data/large_en.msgpack.gz`; the Slop Score LICENSE puts those under the wordfreq project's Apache-2.0 and CC BY-SA 4.0 terms. https://github.com/sam-paech/slop-score/blob/main/LICENSE |
| Last update | antislop-sampler pushed 2026-03-05. slop-forensics pushed 2025-11-01. slop-score pushed 2025-11-22. Leaderboard file `generated_at` 2025-11-07. Phrase/word dumps are dated in the filename `2025-04-07`. |
| Size | Curated adjustments: 517 entries (420 single tokens, 97 multi-word). Essay `slop_list_by_freq.json`: 1,500 `[word, frequency]` pairs. Essay `slop_list_phrases.jsonl`: 2,973 `[phrase, count]` lines. Essay bigrams: 390. Essay trigrams: 358. |
| Format | JSON arrays of `[string, number]`, plus JSONL for extracted phrases. Three regexes in `slop_regexes.txt` (contrast and "each/every" frames). |
| Weights | Yes, and this is the valuable part. Curated file values are probability multipliers (`delve` 0.03125, `testament to` 0.03125). Lower means "more slop" in his sampler; invert them for a Slop Index weight. Essay frequencies are within-corpus rates after he filtered common English, not lift versus humans. Raw story counts (`took a deep breath` 28,671) are occurrence counts in a generated-fiction corpus, not ratios. |
| Models / recency | The lists were mined from LLM creative writing and essays compared with `wordfreq` / human essay baselines, then frozen. The Nov 2025 leaderboard *scores* 23 later models against that frozen list, including `claude-sonnet-4-5`, `claude-sonnet-4-20250514`, `openai/gpt-5-mini`, `openai/gpt-5-nano`, `openai/o3`, `meta-llama/llama-4-maverick`, `google/gemini-2.5-flash`, `deepseek/deepseek-v3.2-exp`, Kimi K2, Qwen3, Mistral, GLM-4.5, Gemma 3. That is coverage of who *uses* the old list, not a fresh mine of GPT-5 or Claude 4 tells. EQ-Bench's own page says the score is 60% slop words, 25% "not X but Y", 15% slop trigrams, and that it is tuned for creative writing and essays. https://eqbench.com/slop-score.html · https://eqbench.com/about.html |
| Quality | High false-positive risk if the fiction mine is imported whole. The 50,046-row full adjustment list contains the word `the` (factor 0.458) and `strategic` (0.480). The 2,000-word count file is topped by `elara`, `nodded`, `shadows`, `gaze`. The 517-row curated file is the one he ships as default, and it still bans `elara` at the same strength as `delve`. Essay phrases are closer to LinkedIn (`plays a crucial role`) but the JSONL also contains scraper junk (`amp;amp;amp`). HN readers already noticed the unfiltered list flags ordinary words. https://news.ycombinator.com/item?id=43392998 |

**Pull**

- https://github.com/sam-paech/antislop-sampler/blob/main/slop_phrase_prob_adjustments.json — 517 weighted phrases. Drop proper names and any token that is normal LinkedIn English before scoring.
- https://github.com/sam-paech/slop-forensics/blob/main/results_by_domain/essays/slop_lists/slop_list_phrases.jsonl — multi-word essay phrases with counts.
- https://github.com/sam-paech/slop-forensics/blob/main/results_by_domain/essays/slop_lists/slop_list_by_freq.json — 1,500 essay words with corpus frequency. Threshold hard. `challenges` and `strategic` are near the top and are normal human LinkedIn.

**Do not pull**

- https://github.com/sam-paech/antislop-sampler/blob/main/slop_phrase_prob_adjustments_full_list.json (50,046 rows, includes function words)
- https://github.com/sam-paech/antislop-sampler/blob/main/slop_words_2025-04-07.json and `slop_phrases_2025-04-07.json` (fiction counts; `elara` at 98,586)
- https://github.com/sam-paech/slop-forensics/blob/main/results_by_domain/creative_writing/ (creative-writing profile, ~4 MB)
- https://github.com/sam-paech/slop-score/blob/main/js/wordfreq.js and `data/large_en.msgpack.gz` and `data/human_writing_profile.json` (CC BY-SA wordfreq derivative, and a 76 MB profile)
- https://github.com/sam-paech/slop-score/blob/main/data/slop_list.json — 1,648 unweighted words (`absently`, `abuzz`, `ached`). Same fiction prior, no weights. The EQ-Bench page points at the antislop repo for the list itself. https://eqbench.com/about.html

Method note: the over-representation notebook compares a generated-story dataset (`ajibawa-2023/General-Stories-Collection`) with `wordfreq` human frequencies. https://github.com/sam-paech/antislop-sampler/blob/main/calculate_over_represented_words.ipynb

### 3. vale-ai-tells — maintained phrase and regex rules

| | |
|---|---|
| Name | vale-ai-tells |
| URL | https://github.com/tbhb/vale-ai-tells · package page https://vale.sh/explorer/ai-tells |
| Maintainer | Tony Burns |
| License | MIT |
| Last update | Vale package v1.37.0, listed 15 Sep 2026, 134 rules, 119 stars on the explorer. GitHub `pushed_at` 2026-10-17. https://vale.sh/explorer/ai-tells · https://github.com/tbhb/vale-ai-tells/releases |
| Size | 134 Vale rules in the published package. The files below are the ones worth vendoring; dash-item counts are from the raw YAML on 2026-10-19. |
| Format | Vale YAML (`extends: existence` token lists, plus regex tokens). |
| Weights | No frequency ratios. Rules have a Vale level (error vs warning). Treat error-level vocabulary and formula rules as higher weight than suggestion-level filler. Do not treat the level as a lift. |
| Models / recency | Author describes the pack as 2024–2025 vocabulary, structural, and rhetorical research, aimed at technical documentation. https://github.com/tbhb/vale-ai-tells Actively extended through 2026 (figurative-verb rules, "worth" lookarounds in the Sep 2026 release notes). Not labeled by GPT-5 / Claude / Gemini. |
| Quality | The vocabulary and formula files are the right grain for a feed scorer. The rest of `styles/ai-tells/` is a documentation linter: dozens of `Figurative*.yml` files (sits, holds, reaches, pays) will light up normal human posts. `FormalTransitions.yml` flags `Moreover` and `Furthermore`, which humans use constantly. `EmDashUsage.yml` is a single punctuation rule and is the tell sloptells and Graphite both say has faded. Import the eight files below, not the package. |

**Pull these files only** (all under `styles/ai-tells/`):

| File | Dash items | Why |
|---|---|---|
| [OverusedVocabulary.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/OverusedVocabulary.yml) | 168 | `delve` / `delves` / `delving` / `delved` and the rest of the classic lexicon |
| [OverusedVocabularyVerbs.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/OverusedVocabularyVerbs.yml) | 1 regex | `leverage\|navigate\|showcase\|harness\|embark\|foster\|spearhead` with inflections, nouns excluded |
| [AICompoundPhrases.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/AICompoundPhrases.yml) | 119 | `rich tapestry`, `intricate interplay`, `paradigm shift` |
| [OpeningCliches.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/OpeningCliches.yml) | 92 | `In today's fast-paced`, `In today's rapidly evolving` |
| [ContrastiveFormulas.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/ContrastiveFormulas.yml) | 120 | regexes for "it's not just X, it's Y" |
| [ClosingPleasantries.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/ClosingPleasantries.yml) | 99 | `I hope this helps` and variants |
| [HedgingPhrases.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/HedgingPhrases.yml) | 71 | `It's important to note that` |
| [AffirmativeFormulas.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/AffirmativeFormulas.yml) | 63 | "and that's the beauty of it" style flourishes |

Skip [FormalTransitions.yml](https://github.com/tbhb/vale-ai-tells/blob/main/styles/ai-tells/FormalTransitions.yml) (67 items, mostly ordinary connectives) and every `Figurative*.yml`.

### 4. slop-radar — English phrase bank plus a few weighted structures

| | |
|---|---|
| Name | slop-radar |
| URL | https://github.com/renefichtmueller/slop-radar |
| Maintainer | René Fichtmueller (`renefichtmueller`) |
| License | MIT |
| Last update | Pushed 2026-10-03 |
| Size | 437 English phrases, 16 structural patterns. German file is 210 phrases; skip it unless a German pack is in scope. |
| Format | JSON. Phrases are bare strings. Patterns are `{name, pattern, weight, description}`. |
| Weights | Phrases: no. Patterns: yes (example: em-dash abuse weight 5). README says the scorer also applies a buzzword-density penalty on top of the list. https://github.com/renefichtmueller/slop-radar |
| Models / recency | No model tags. The English list is chatbot pleasantries, stock openers, hype, filler connectors, and significance inflation, which is the LinkedIn failure mode. Maintained in 2026, so it is not the 2023 "As an AI" list. |
| Quality | Phrases are unweighted, so a single `dive into` would score like a chatbot closer unless we assign weights ourselves (pattern weights can seed that). Matching notes in the README are worth copying as behavior: case-insensitive Unicode boundaries, curly apostrophes, longest-match-wins. False positives are the usual ones (`leverage`, `moreover`) plus German inflection rules we do not need. |

**Pull**

- https://github.com/renefichtmueller/slop-radar/blob/main/src/database/phrases-en.json
- https://github.com/renefichtmueller/slop-radar/blob/main/src/database/patterns.json

npm: `slop-radar` (same repo).

### 5. Kobak et al. — the one peer-reviewed frequency table

| | |
|---|---|
| Name | llm-excess-vocab (Kobak, González-Márquez, Horvát, Lause) |
| URL | https://github.com/berenslab/llm-excess-vocab · paper https://www.science.org/doi/10.1126/sciadv.adt3813 · preprint https://arxiv.org/abs/2406.07016 |
| Maintainer | Dmitry Kobak and Rita González-Márquez, Hertie Institute / University of Tübingen |
| License | GitHub LICENSE is MIT, copyright 2024 Kobak and González-Márquez. The Science Advances article is CC BY 4.0, not CC BY-SA. https://par.nsf.gov/servlets/purl/10713000 Zenodo archive of the repo is also CC BY 4.0: https://zenodo.org/records/14898666 Prefer the GitHub MIT files and keep the paper citation. |
| Last update | Repo pushed 2026-05-22. README describes a July 2025 refresh (six more months of PubMed, monthly excess). Paper is Science Advances 11(27), eadt3813 (2025). |
| Size | `results/excess_words.csv`: 900 annotated words. Of those, `type=style` is 407, `content` 462, `content/style` 24, `style/content` 2, `style/count` 1, `other` 4. `results/yearly-counts.csv.gz` is the 362,442 × 15 year-by-word occurrence matrix the README describes. `results/figures_data/figure1.csv` is a tiny yearly-frequency table for a handful of words (`delves`, `crucial`, `potential`, …). |
| Format | CSV. Columns: index, `word`, `type`, `part_of_speech`, `comment`. No ratio column. Ratios have to be computed from `yearly-counts.csv.gz` or read off the paper's figures. |
| Weights | Not in the CSV. The paper's method is the weight: occurrence frequency in 2024 PubMed abstracts versus the pre-ChatGPT baseline. They report style words jumping after late 2022, and give the corpus-level estimate that at least 13.5% of 2024 abstracts were LLM-processed. The matrix is what makes this list more valuable than a vibe list, and also too big to vendor raw. |
| Models / recency | ChatGPT-era biomedical abstracts, 2010–2024, extended through mid-2025 in the repo note. Not GPT-5, Claude 4, or Gemini 2.5. The excess is a population statistic. The paper says the method cannot label an individual abstract. |
| Quality | Worst false-positive profile of the five if used unfiltered. Style words include ordinary function words (`across`, `between`, `both`, `based`, `these`) because they rose in the corpus, not because a LinkedIn post that says "across" is slop. Content words (`ebola`, drug names) are out of scope. Import only `type=style` rows whose 2024/pre-2023 frequency ratio is large *and* whose baseline rate in ordinary English is low. The paper's own examples of the dialect are the right seed: `delve` / `delving`, `intricate`, `pivotal`, `comprehensive`, `meticulously`, `accentuating`. https://www.science.org/doi/10.1126/sciadv.adt3813 A later commentary notes Matsui's Dec 2025 PubMed re-analysis: some "AI vocabulary" was already rising in 2020, and Kobak's own comparison is that `delves` rose sharply while words like `zika` have risen sharply for non-LLM reasons. https://humanizeai.com/blog/wikipedias-signs-of-ai-writing-list-plus-a-prompt-you-can-turn-into-a-skill/ |

**Pull, then filter. Do not vendor the gzip.**

- https://github.com/berenslab/llm-excess-vocab/blob/main/results/excess_words.csv — keep rows with `type` exactly `style`, then drop function words and any word that appears in normal LinkedIn at a similar rate.
- https://github.com/berenslab/llm-excess-vocab/blob/main/results/figures_data/figure1.csv — yearly frequencies for the headline words, useful as a sanity check on weights.
- Use `results/yearly-counts.csv.gz` locally to compute a fold-change, and commit only the short resulting table. The gzip is 5.8 MB of mostly biomedical content words.

## Usable, not in the top 5

These have a clean license and a real file. They are smaller, staler, or the wrong register.

### slop-gate vocabulary pack

https://github.com/hwajongpark/slop-gate · maintainer Hwajong Park · MIT · pushed 2026-10-14.

`rules/vocabulary.json`: 41 regex rules with inflection baked in (`delv(e|es|ed|ing)`, `leverag(e|es|ed|ing)`) and a human hint string. No weights, no model tags. High precision, too small to be a dictionary on its own. Good as a cross-check that a candidate phrase survived someone else's false-positive edit. Other packs in `rules/` (Korean, Russian, Vietnamese, Chinese, Filipino) are translationese, not English LinkedIn. Companion index, CC0, is a link list rather than a word list: https://github.com/hwajongpark/awesome-slop

### llm-cliches

https://github.com/nanxstats/llm-cliches · Nan Xiao · MIT · pushed 2025-04-03.

Three unweighted text files: `adjectives.txt` 40, `verbs.txt` 21 (`delve`, `embark`, `foster`, `galvanize`, `harness`, `unleash`), `nouns.txt` 16 (`tapestry`, `testament`, `landscape`, `paradigm`). No ratios, no model tags, frozen in the 2023–early-2025 cliché set. Safe to mine for gaps against pack `ai-tells`, not worth a separate pack.

### stop-slop

https://github.com/hardikpandya/stop-slop · Hardik Pandya · MIT · pushed 2026-03-17 · ~18k stars.

`references/phrases.md` is about 65 bullet phrases (throat-clearing, "here's the thing", "the real X is"). `references/structures.md` is prose advice (binary contrasts, em dashes, no sentence-initial "wh-"). No weights. The README also bans "all adverbs", which is a style preference, not a measured tell. Overlaps the phrases already in `ai-tells.ts`.

### vale-llm-slop

https://github.com/Syntaf/vale-llm-slop · Grant Mercer · MIT in the repo LICENSE file (GitHub's license API returns `NOASSERTION` because of the extra STE notice; the copyright grant is MIT) · pushed 2026-09-15.

About 20 Vale rules under `styles/Slop/`. Several are code-comment rules (`RestatesCode`, `Anthropomorphism`) and do not belong on LinkedIn posts. The prose ones (`Vocabulary.yml`, `NegativeParallelism.yml`, `Assistant.yml`, `Overused.yml`, `Transitions.yml`) overlap vale-ai-tells and are shorter. The STE rules are ASD-STE100-inspired and the LICENSE says the project does not reproduce the ASD dictionary; do not import `styles/STE/`.

### krishnasunkam/vale-ai-tells

https://github.com/krishnasunkam/vale-ai-tells · MIT · pushed 2026-08-25 · 17 rules.

A personal editing floor (em dash as error, file paths, passive voice, a few clichés). The author says rules were scored on a labeled bench. Too mixed with non-AI house style, and much smaller than Tony Burns's package of the same name.

### Claudisms

https://claudisms.ai/ · about page https://claudisms.ai/about/ · maintainer Wes Pomeroy.

The about page says the list is CC0 1.0 and that Markdown and JSON exist. On 2026-10-19 the homepage fetch was ~127 markdown bullets and no JSON URL was discoverable, and the about page's invitation to correct it "on GitHub" did not resolve to a repository in search. Usable in principle because of the CC0 statement, but there is no file to pin. Entries are Claude-marketing tics ("worth noting", "it's not X, it's Y", "sit with", "the whole game") kept as an editor's scrub file, not a measured corpus. Several are his house bans and will false-positive reflective human posts. A June 2026 LinkedIn post points at the list: https://www.linkedin.com/posts/wespomeroy_all-right-its-getting-too-much-ive-debated-activity-7477442936725512192-wkNo Treat as a reading list until a versioned JSON appears.

### Already in the tree

Do not vendor these again. `ai-tells.ts` already attributes them.

| Source | URL | License | Last push | What it actually is |
|---|---|---|---|---|
| avoid-ai-writing | https://github.com/conorbronsdon/avoid-ai-writing | MIT, © 2026 Conor Bronsdon | 2026-10-18 | Agent skill. The long pattern writeup is `references/patterns.md` (~120 KB of prose, not a weighted table). |
| humanizer | https://github.com/blader/humanizer | MIT, © 2025 Siqi Chen | 2026-10-16 | Agent skill, `SKILL.md`. Patterns track Wikipedia: Signs of AI writing. Copying the Wikipedia article would be CC BY-SA; copying this MIT skill's own wording is what the pack already does. |

## Not usable for code inclusion

Cited because they are the lists people mean by "the slop list". Do not copy them into the repo.

### sloptells — best ratios, no license

https://sloptells.com/ · API https://sloptells.com/api/v1/tells · methodology https://sloptells.com/methodology · snapshot markdown https://sloptells.com/tells.md

Fetched 2026-10-19. JSON `version` v1, `generated_at` 2026-10-19T09:28:44Z, `count` 46. Fields include `rate_per_10k`, `human_rate_per_10k`, `collateral`, `model_specificity`, `status`, `first_detected`. No `license` field, no maintainer name, no SPDX on the site or the API. **Unclear license → NOT USABLE.** The extension also cannot call the API at runtime.

What the measurement says, as facts about their corpus rather than as a list to copy: tells are lifecycle-tagged (`active` 30, `saturated` 8, `fading` 2, `stale` 2, `retired` 4). They compare current models and 2024/25 predecessors with pre-2022 human writing on matched prompts (HN comments, cooking, parenting), then demote anything that also fires on a private canon of pre-2022 prose. Highest lifts in that JSON include em dash ~24× (status `stale`, collateral `high`), `genuinely` ~23× (`active`, collateral `low`), "that said" ~18×, "one of those" ~15×, "here's what actually happened" ~15×, "the real X" ~14×, curly quotes ~13× (`stale`, `high`), "worth noting" ~11×. `model_specificity` is mostly `cross-model`, with single notes for `gpt-5.4-mini`, Claude, and vintage `gpt-4o`. `delve` and `tapestry` are in the retired/fading group on the homepage. This is the right *shape* for our weights (lift × inverse collateral × status). Recompute it, or wait for a license. Do not paste `tells.md`.

### Wikipedia: Signs of AI writing

https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing

Maintainer: WikiProject AI Cleanup and other Wikipedia editors. License: **CC BY-SA 4.0 and GFDL → NOT USABLE.** https://en.wikipedia.org/wiki/Wikipedia:Copyrights The article's own lead says the signs are descriptive, trained on human writing including Wikipedia, and not sufficient on their own. The October 2026 lead names the current Wikipedia-specific signs as Markdown, AI edit summaries, hedging about sources, vague association, and canned emphasis on coverage, and it says GPT-4o (ChatGPT's model from May 2024 to August 2025) was an outlier versus other models of that period. The "words to watch" tables (`delve`, `pivotal`, `tapestry`, `underscores its importance`, trailing `-ing` analyses) are the prose behind humanizer. Ideas can inform a rule we write ourselves. The tables cannot be copied. A third-party JSON that claims CC0 over those tables does not clear the share-alike (see humzakt below).

### Graphite, "AI Tells"

https://graphite.io/five-percent/research/ai-tells · dated 20 Aug 2026, with an Opus 5.5 follow-up listed 28 Sep 2026 on https://graphite.io/five-percent/research

Maintainer: Graphite. The article says they compared 10,000 pre-ChatGPT Common Crawl articles with 10,000 generated articles each from nine models: GPT-4.1, GPT-5, GPT-5.6 Sol, GPT-6 Astra, Claude Opus 4, Claude Opus 4.6, Claude Opus 5, Gemini 2.5 Pro, Gemini 3.1 Pro. They report 12,877 tells at ≥2× the human rate, about 2,355–3,746 per model, 7,043 unique to the three newest, 65% of tells unique to one model family. Examples they publish in prose: Claude Opus 5 "less like a _ and more like" ~105× human; GPT-6 Astra prefers "rather than" and "not simply"; Claude Opus 5 prefers "single most"; Gemini 3.1 Pro prefers "furthermore"; Claude Opus 5 uses em dashes near the human rate while GPT-6 Astra and Gemini 3.1 Pro use them less. The article says "the tells data and raw article data are available to download" and does not attach an SPDX or a stable file URL. **Unclear license → NOT USABLE.** Also the right reminder that a 2024 `delve` list is the wrong prior for 2026 models.

### GPTZero AI Vocabulary

https://gptzero.me/ai-vocabulary

Maintainer: GPTZero. The page says a public Top 50 was updated October 2026, ranked on 3.3 million texts, and that those 50 are used 10× to 200×+ more by AI than by humans, with a discovery threshold of 2–3×. The static fetch on 2026-10-19 contained the headings and the FAQ and did not contain the 50 rows (they are client-rendered). No open license. **NOT USABLE.** Marketing copy on the same site names GPT-4.1, o3, Gemini 2.5 Pro / Flash, and Claude Sonnet 4 as detector training models; that is not evidence those models produced the Top 50. Pangram's technical report describes a classifier and publishes no word list. https://arxiv.org/html/2402.14873v3

### AlpinDale/gptslop

https://github.com/AlpinDale/gptslop · AGPL-3.0 · pushed 2023-11-19.

**NOT USABLE in an MIT extension.** The list is also stale and tiny: `gptslop.yaml` is five assistant refusals (`As an AI`, `However, it is important to note`). `claudeslop.yaml` is ~50 lines, mostly fiction and romance clichés (`ministrations`, `half-lidded eyes`), seeded from https://rentry.org/claudeisms which is not a maintained corpus.

### CWOnline/AIWords

https://github.com/CWOnline/AIWords · no license file · GitHub license `null` · pushed 2025-03-08.

**NOT USABLE.** `json/full-lexicon.json` has 198 title-cased strings (`Additionally`, `Adventure`, `Aficionado`) plus smaller formal / metaphor / transition files. No weights. Claiming ChatGPT, Claude, and DeepSeek in the README is not the same as a measured list.

### archiewood/claudeisms

https://github.com/archiewood/claudeisms · no license file · pushed 2026-07-16.

**NOT USABLE**, which is a shame because the shape is exactly what we want. `claudeisms.csv` has a header plus 144 words. Columns include `claude_pm`, `so_pm` (Stack Overflow comments per million), `eng_pm`, and `vs_so` (ratio). Top rows: `gating` 759× versus Stack Overflow, `dedup` 647×. README: one person's Claude Code sessions, Opus 4.7/4.8 only, ~5 weeks, agent-visible replies only, compared with `wordfreq` and with Stack Overflow. HN thread he cites: https://news.ycombinator.com/item?id=48905248 Register is coding-agent English (`prod`, `pr`, `handoff`). Even with a license, most of it would false-positive a LinkedIn post about deploys, and `load-bearing` (the word the README leads with) is a 2026 Claude tic that Graphite-style article prose also picked up. Ask the author for an MIT or CC0 grant before using the ratios. Do not copy the CSV in the meantime.

### humzakt/ai-writing-markers

https://github.com/humzakt/ai-writing-markers · dataset card https://huggingface.co/datasets/humzakt/ai-writing-markers · author Humza Tareen · repo pushed 2026-07-15.

`markers.json` / `markers.jsonl`: 87 markers. Categories: vocabulary 38, phrases 24, transitions 10, structural 7, punctuation/format 6, statistical 2. Era tags exist (`2023-mid2024` through `2024-2026`) and there are no weights. The LICENSE file is MIT for the code and says the dataset is additionally CC0, then says Wikipedia-derived content remains CC BY-SA 4.0. Source ids on the rows: `wikipedia_aisigns` is on 29 rows alone and on several more combined rows. A downstream CC0 dedication cannot relicense the Wikipedia tables. **NOT USABLE as a bulk pull.** The era field is a good schema to copy as an idea.

### tropes.fyi

https://tropes.fyi/directory · Show HN (32 tropes at the time): https://news.ycombinator.com/item?id=47088813

The live directory is prose: named tropes with examples (negative parallelism, tricolon, "quietly", "serves as", "let's break this down", synonym cycling, bold-first bullets). No versioned JSON, no SPDX on the directory page. **Unclear license → NOT USABLE.** Useful as a map of 2026 structural tells that word lists miss (premise stacking, compulsive counting, invented "X paradox" labels, Opus 5 metaphor reuse). Write our own regexes if we want them.

### Other pages that are not licenses to copy

- ContentBeta's "300+ AI words" blog list, unweighted, no data license. https://www.contentbeta.com/blog/list-of-words-overused-by-ai/
- Jordan Gibbs, "every AI writing tell you know is already dead" (Medium). Prose survey of 2023–24 deaths (`delve`, `tapestry`) versus a claimed 2026 lexicon (`quietly`, `genuinely`, `load-bearing`) and model fingerprints (Grok, Claude "notably", Gemini "Great question", ChatGPT "Certainly"). Copyrighted essay, not a dataset. https://medium.com/@jordan_gibbs/every-ai-writing-tell-you-know-is-already-dead-762cadf46f6b
- A personal banned-word comment on HN (load-bearing, spine, "it's worth noting", "that said"). Not a repo. https://news.ycombinator.com/item?id=49365100

## Checked and set aside

- **write-good** (https://github.com/btford/write-good), **alex** (https://github.com/get-alex/alex), **proselint**: general prose or inclusive-language linters. awesome-slop lists them as linters, not as AI-tell dictionaries. https://github.com/hwajongpark/awesome-slop No AI-tell lexicon to pull.
- **Taste-AI/ai-slop-patterns** (https://huggingface.co/datasets/Taste-AI/ai-slop-patterns): lift scores for landing-page design (64 dimension rows, 234 itemsets, 15 content rows such as `phrase.elevate`). Not prose tells.
- **ChuckMcSneed/ExampleAntislop**: dataset card is a fiction-and-refusal ban string (`Elara`, `tapestry`, "as an AI"). The Hub page showed an empty dataset. Not a maintained lexicon.
- **Pangram**: classifier technical report, no public word list. https://arxiv.org/html/2402.14873v3
- **Antislop sampler paper** (arXiv:2510.15061): describes the backtracking sampler. The lists live in the GitHub repos above, not in a separate weighted release. https://arxiv.org/abs/2510.15061

## How to merge without drowning the feed

The current pack already scores a few dozen phrases, templates, and chatbot leaks, with sqrt repeat and a couple of density thresholds. The failure mode of every large list above is a single ordinary word (`the`, `across`, `strategic`, `moreover`, `leverage`) flipping a human post.

1. Vendor files 1–4 almost as-is, and file 5 only after a fold-change cutoff.
2. Store a weight on every entry. Paech factors invert into weights. Kobak fold-changes become weights. Vale error-level and slop-radar pattern weights are weak stand-ins where no ratio exists. Unweighted strings from slop-radar phrases should get a low default, raised only when the same post hits several.
3. Prefer multi-word and regex entries over bare words. Paech's own essay phrases and vale-ai-tells compound phrases are safer than either unigram list.
4. Split fiction names (`elara` and friends) into a pack that does not run on LinkedIn, or drop them.
5. Tag era. `delve` / `tapestry` are saturated or retired on sloptells and in the Wikipedia October 2026 lead's "what is common now" paragraph; Graphite's 2026 model notes say the tells moved to "rather than", superlatives, and formal transitions, and that em dashes are no longer a Claude-vs-human separator. Keep the old words at low weight so a 2024-style post still scores, and put the 2026 constructions (`rather than` used as a tic, "not just X", "genuinely", "worth noting", "that said") at higher weight once we have a license or our own counts.
6. Do not call any of these an authorship detector. Kobak, EQ-Bench, GPTZero's own vocabulary FAQ, and the Wikipedia page all say a hit is a style signal. Density is the score.
