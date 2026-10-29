# Structural feature evaluation

Target: zero-effort pasted output with obvious, nameable generation smells. Clean AI text and carefully edited AI drafts are out of scope. This is not a general AI-authorship detector. RAID AI/human AUROCs below are transfer diagnostics, not ground truth for “slop”. All implemented candidates are `style` evidence and cannot establish a verdict alone. No production pack is registered or existing file edited.

Suggested weights: vague-platitude-count = 1, visible-markdown-headers = 2, visible-markdown-bold = 2, visible-bold-headings = 2.5, transition-share = 0.5, transition-count = 0.75, summary-tail = 0.5. Generic transition/summary scaffolds were demoted after the target clarification; invisible stylometry is never implemented as a standalone tell. Markdown candidates show their literal residue. The concreteness candidate requires an explicit platitude: missing specifics alone earns nothing.

Combined engine: RAID dev 1206 → 1225 /10,800 AI at ≥40; human FP 29 → 29 /2,354. LinkedIn veto 19 → 19 /8,189 human FP. Modern clean/edited-prompt AI 5 → 5 /120. Lazy-prompt cheap-model output 11 → 11 /150. External sets never fit a parameter.

Train/dev incremental results use an independent scratch copy of `data/eval/raw/hillclimb/engine-base`, SHA-256 `055545a3992612b684beed320bbb339edda3c83c015bee92dee2b06f84f44e30`. All 13,154 eligible dev baseline public scores and Shame gates reproduce exactly. No RAID test file was opened. No network, browser, sklearn or worker pool was used.

## Protocol and definitions

- Threshold design uses only 7,166 human + 28,800 chat train rows; frozen validation uses 2,354 human + 10,800 chat dev rows. Models: chatgpt, cohere-chat, gpt4, llama-chat, mistral-chat, mpt-chat. Base models are excluded. Train/dev source-group overlap is zero.
- Train threshold search maximizes macro-domain Youden (mean TPR−FPR), requiring human feature-hit rate ≤1% overall and ≤2.5% in each domain and AI recall ≥0.5%. Candidate selection also requires ≥3× overall human hit rate, ≥5 AI hits in at least two domains with ≥3× their human rates, and ≥5 AI hits in at least three models. The same gates validate unchanged on dev. These are measured feature hits, distinct from engine FP at score ≥40.
- Raw register proxies, absence of punctuation/pronouns, long words and formatting-only corpus artifacts are excluded independently of numerical gates. Neither lexical diversity nor absence of contractions is measured as positive evidence. The selected low-CV direction is fixed for sentence-uniformity hypotheses. No thresholds or weights were fit on LinkedIn humans or modern AI.
- After the owner redefined the target, explicit visible-smell and specificity features were designed on train only, in separately preserved `visible-thresholds.json` and `specifics-thresholds.json`. These rare smells need ≥20 train AI hits and ≥5 dev AI hits, support in ≥2 domains, ≥3× overall human hit rate, and the same ≤1% overall/≤2.5% per-domain human feature-hit limits. Train cut search allows recall ≥0.05%, without a broad AI-recall target or multi-model requirement. Positive visible features are never inverted to score absence. General specificity absence is diagnostic only regardless of numerical gates. Modern/low-effort generated posts are reporting/validation only; veto data can reject only.
- Specifics markers: digit-bearing tokens (including dates), capital-initial tokens outside sentence starts (excluding I and fixed generic acronyms), @mentions, URLs and currency signs. These are heuristic markers, not semantic entities; categories can overlap. Sentence-first names and lowercase product names may be missed; a counted name does not prove factual detail, and a lack of markers does not prove a lack of concrete events. Generic platitude patterns were fixed before evaluating the lazy-prompt set. The conjunction requires 40–300 words, ≥1 matched platitude and zero specificity markers.
- Sentences are the engine’s existing best-effort segments; line breaks also end segments. Paragraphs merge adjacent nonempty lines and break at at least two newlines. Word counts/spans come from `PostContext`/`structureOf`; extraction does not tokenize again. Punctuation and first-person/digit token rates are per 100 engine words. Parenthesis rate counts opening parentheses. Average token length is UTF-16 code units (adequate for this English corpus).
- Mean/CV sentence metrics require ≥80 words and ≥6 nonempty segments. Paragraph mean/CV require ≥120 words and ≥3 paragraphs; line CV requires ≥120 words and ≥5 lines. Sentences/paragraph requires ≥2 paragraphs. Opening repetition requires ≥6 segments and ≥3 occurrences of the most frequent one/two-token opening. The six-sentence sliding-CV feature requires all six segments ≥5 words and a mean of 10–40 words.
- Transition share requires ≥6 segments. Transition count is zero unless ≥2 transitions and ≥6 segments. Summary tail requires ≥80 words/≥3 segments, a summary marker at the start of one of the last two segments, and a remaining tail of 15–120 words occupying ≤35% of all words. It does not require blank lines. Marker sets are frozen in source; no dataset passage is quoted.
- AUROC orientation (↑/↓) is selected on train, then held fixed on dev. Unavailable measurements are tied below observed measurements, representing an eligibility gate. `observed_auroc` in `results.json` separately excludes unavailable rows. A model AUROC compares that model with all human rows; human domain distribution differs from the equally sampled AI domains, so consult the within-domain table as well.
- Reported thresholds are the best feasible train thresholds. A † marks fallback to unconstrained macro-Youden when no threshold meets the precision/recall constraints; those features cannot become candidates. The unconstrained optima are also given below. No dev optimum is fit.

## Corpus-format limitation and rejected features

Only 3/7,166 human train rows have ≥3 blank-line paragraphs and ≥120 words, versus 20,208/28,800 AI rows. Thus paragraph AUROCs around 0.85 and sentences/paragraph around 0.88 largely measure missing/available structure. Ordinary outline/list and paragraph-summary statistics inherit that formatting risk and are excluded on that evidence alone. Literal leftover markdown is nameable and receives an independent real-human LinkedIn veto check. Human broetry, lists, emoji and hashtags are normal; they must not become a generation verdict. Marker-based sentence summaries retain no blank-line requirement and only tiny supporting weight.

Low sentence CV fails on poetry (dev 11/303); its sliding-window variant also overflags poetry. Repeated openings have weak cross-domain precision/lift. Average word length would penalize technical/formal writers; pronoun, digit and punctuation rates largely reflect genre/register. Headers/bold have little support. Low lexical diversity and lack of contractions were never considered for scoring.

## Overall feature results

| Feature | Nameable | AUROC train / dev | Orientation | Train-selected threshold | Train human hits | Dev human hits | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | No visible generation smell; numerical statistic | 0.5057 / 0.5042 | ↑ | ≥ 35.2 | 29/7166 (0.40%) | 12/2354 (0.51%) | Reject: general register/punctuation proxy or weak discrimination |
| sentence_cv | No visible generation smell; numerical statistic | 0.5783 / 0.5773 | ↓ | ≤ 0.12169506 | 26/7166 (0.36%) | 12/2354 (0.51%) | Reject: dev poetry FP 11/303 (3.63%) |
| paragraph_mean | No visible generation smell; numerical statistic | 0.8507 / 0.8494 | ↓ | ≤ 141.33333 | 2/7166 (0.03%) | 1/2354 (0.04%) | Reject: blank-line source-format confound |
| paragraph_cv | No visible generation smell; numerical statistic | 0.8507 / 0.8493 | ↓ | ≥ 0.0066874549 | 3/7166 (0.04%) | 1/2354 (0.04%) | Reject: blank-line source-format confound |
| line_cv | No visible generation smell; numerical statistic | 0.5974 / 0.6059 | ↓ | ≤ 0.095074323 | 32/7166 (0.45%) | 19/2354 (0.81%) | Reject: line/genre formatting confound or weak support |
| sentences_per_paragraph | No visible generation smell; numerical statistic | 0.8845 / 0.8816 | ↓ | ≥ 1 | 23/7166 (0.32%) | 12/2354 (0.51%) | Reject: blank-line source-format confound |
| transition_share | Yes: exact snippet and/or count | 0.5525 / 0.5593 | ↑ | ≥ 0.20833333 | 26/7166 (0.36%) | 9/2354 (0.38%) | Candidate style, weight 0.5 |
| comma_rate | No visible generation smell; numerical statistic | 0.5928 / 0.5874 | ↑ | ≥ 16.593886 | 32/7166 (0.45%) | 7/2354 (0.30%) | Reject: general register/punctuation proxy or weak discrimination |
| colon_rate | No visible generation smell; numerical statistic | 0.5207 / 0.5198 | ↑ | ≥ 1.9073569 | 70/7166 (0.98%) | 28/2354 (1.19%) | Reject: general register/punctuation proxy or weak discrimination |
| semicolon_rate | No visible generation smell; numerical statistic | 0.5795 / 0.5797 | ↓ | ≤ 0 † | 5618/7166 (78.40%) | 1849/2354 (78.55%) | Reject: general register/punctuation proxy or weak discrimination |
| parenthesis_rate | No visible generation smell; numerical statistic | 0.6069 / 0.5963 | ↓ | ≤ 0.33898305 † | 4015/7166 (56.03%) | 1335/2354 (56.71%) | Reject: general register/punctuation proxy or weak discrimination |
| question_rate | No visible generation smell; numerical statistic | 0.5258 / 0.5232 | ↓ | ≤ 0 † | 5950/7166 (83.03%) | 1967/2354 (83.56%) | Reject: general register/punctuation proxy or weak discrimination |
| exclamation_rate | No visible generation smell; numerical statistic | 0.5353 / 0.5284 | ↑ | ≥ 0.26525199 † | 639/7166 (8.92%) | 243/2354 (10.32%) | Reject: general register/punctuation proxy or weak discrimination |
| emdash_rate | No visible generation smell; numerical statistic | 0.5070 / 0.5036 | ↓ | ≤ 0.35842294 † | 7004/7166 (97.74%) | 2315/2354 (98.34%) | Reject: general register/punctuation proxy or weak discrimination |
| endash_rate | No visible generation smell; numerical statistic | 0.5107 / 0.5100 | ↓ | ≤ 0.36630037 † | 6768/7166 (94.45%) | 2222/2354 (94.39%) | Reject: general register/punctuation proxy or weak discrimination |
| header_share | Yes: exact snippet and/or count | 0.5010 / 0.5012 | ↑ | ≥ 0.034482759 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: line/genre formatting confound or weak support |
| bold_share | Yes: exact snippet and/or count | 0.5001 / 0.4997 | ↑ | ≤ 0.83333333 † | 7160/7166 (99.92%) | 2353/2354 (99.96%) | Reject: line/genre formatting confound or weak support |
| numbered_share | Yes: exact snippet and/or count | 0.5576 / 0.5583 | ↑ | ≥ 0.09375 | 8/7166 (0.11%) | 8/2354 (0.34%) | Reject: line/genre formatting confound or weak support |
| bullet_share | Yes: exact snippet and/or count | 0.5597 / 0.5603 | ↑ | ≥ 0.076923077 | 19/7166 (0.27%) | 4/2354 (0.17%) | Reject: line/genre formatting confound or weak support |
| list_share | Yes: exact snippet and/or count | 0.5668 / 0.5671 | ↑ | ≥ 0.17647059 | 11/7166 (0.15%) | 5/2354 (0.21%) | Reject: line/genre formatting confound or weak support |
| label_share | Yes: exact snippet and/or count | 0.5007 / 0.5030 | ↑ | ≥ 0.3125 | 53/7166 (0.74%) | 29/2354 (1.23%) | Reject: line/genre formatting confound or weak support |
| first_person_rate | No visible generation smell; numerical statistic | 0.5799 / 0.5765 | ↓ | ≤ 0.33783784 † | 3000/7166 (41.86%) | 965/2354 (40.99%) | Reject: general register/punctuation proxy or weak discrimination |
| digit_rate | No visible generation smell; numerical statistic | 0.6146 / 0.6157 | ↓ | ≥ 15.656566 | 36/7166 (0.50%) | 14/2354 (0.59%) | Reject: general register/punctuation proxy or weak discrimination |
| average_word_length | No visible generation smell; numerical statistic | 0.6306 / 0.6421 | ↑ | ≥ 6.1254902 | 35/7166 (0.49%) | 10/2354 (0.42%) | Reject: general register/punctuation proxy or weak discrimination |
| repeated_opener1 | Yes: exact snippet and/or count | 0.5310 / 0.5277 | ↑ | ≥ 0.67857143 | 40/7166 (0.56%) | 21/2354 (0.89%) | Reject: inadequate precision/lift; repeated human openings |
| repeated_opener2 | Yes: exact snippet and/or count | 0.5077 / 0.4968 | ↑ | ≥ 0.46428571 | 30/7166 (0.42%) | 13/2354 (0.55%) | Reject: inadequate precision/lift; repeated human openings |
| closing_summary | Yes: exact snippet and/or count | 0.5550 / 0.5534 | ↑ | ≥ 1 | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: blank-line source-format confound |
| closing_ratio | No visible generation smell; numerical statistic | 0.8506 / 0.8493 | ↑ | ≥ 0 | 3/7166 (0.04%) | 1/2354 (0.04%) | Reject: blank-line source-format confound |
| closing_single_sentence | No visible generation smell; numerical statistic | 0.5385 / 0.5404 | ↑ | ≥ 1 | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: blank-line source-format confound |
| transition_count | Yes: exact snippet and/or count | 0.5354 / 0.5397 | ↑ | ≥ 4 | 9/7166 (0.13%) | 1/2354 (0.04%) | Candidate style, weight 0.75 |
| label_count | Yes: exact snippet and/or count | 0.5007 / 0.5030 | ↑ | ≥ 2 | 37/7166 (0.52%) | 14/2354 (0.59%) | Reject: line/genre formatting confound or weak support |
| bold_count | Yes: exact snippet and/or count | 0.5001 / 0.4997 | ↑ | ≥ 2 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: line/genre formatting confound or weak support |
| header_count | Yes: exact snippet and/or count | 0.5010 / 0.5012 | ↑ | ≥ 1 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: line/genre formatting confound or weak support |
| numbered_count | Yes: exact snippet and/or count | 0.5576 / 0.5583 | ↑ | ≥ 2 | 2/7166 (0.03%) | 1/2354 (0.04%) | Reject: line/genre formatting confound or weak support |
| bullet_count | Yes: exact snippet and/or count | 0.5597 / 0.5603 | ↑ | ≥ 2 | 6/7166 (0.08%) | 3/2354 (0.13%) | Reject: line/genre formatting confound or weak support |
| list_count | Yes: exact snippet and/or count | 0.5668 / 0.5671 | ↑ | ≥ 2 | 8/7166 (0.11%) | 4/2354 (0.17%) | Reject: line/genre formatting confound or weak support |
| regular_run_cv6 | No visible generation smell; numerical statistic | 0.5471 / 0.5481 | ↓ | ≤ 0.05756396 | 28/7166 (0.39%) | 10/2354 (0.42%) | Reject: insufficient train lift/support; dev poetry FP 9/303 |
| summary_tail | Yes: exact snippet and/or count | 0.5572 / 0.5614 | ↑ | ≥ 1 | 12/7166 (0.17%) | 0/2354 (0.00%) | Candidate style, weight 0.5 |
| visible_markdown_headers | Yes: exact snippet and/or count | 0.5010 / 0.5012 | ↑ | ≥ 1 | 0/7166 (0.00%) | 0/2354 (0.00%) | Candidate style, weight 2 |
| visible_markdown_bold | Yes: exact snippet and/or count | 0.5002 / 0.5001 | ↑ | ≥ 2 | 0/7166 (0.00%) | 0/2354 (0.00%) | Candidate style, weight 2 |
| visible_bold_headings | Yes: exact snippet and/or count | 0.5005 / 0.5006 | ↑ | ≥ 1 | 1/7166 (0.01%) | 0/2354 (0.00%) | Candidate style, weight 2.5 |
| visible_scaffold_list | Yes: exact snippet and/or count | 0.5000 / 0.5000 | ↑ | ≥ 2 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: insufficient train/dev support/lift or human veto |
| visible_bold_list | Yes: exact snippet and/or count | 0.5003 / 0.5002 | ↑ | ≥ 6 | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: insufficient train/dev support/lift or human veto |
| visible_emoji_list | Yes: exact snippet and/or count | 0.5000 / 0.5000 | ↑ | ≥ 3 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: insufficient train/dev support/lift or human veto |
| visible_outline_list | Yes: exact snippet and/or count | 0.5543 / 0.5543 | ↑ | ≥ 3 | 1/7166 (0.01%) | 1/2354 (0.04%) | Reject: insufficient train/dev support/lift or human veto |
| visible_unicode_bold | Yes: exact snippet and/or count | 0.5000 / 0.5000 | ↑ | ≥ 8 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: insufficient train/dev support/lift or human veto |
| visible_hashtag_wall | Yes: exact snippet and/or count | 0.5000 / 0.5000 | ↑ | ≥ 5 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: insufficient train/dev support/lift or human veto |
| visible_heavy_dash | Yes: exact snippet and/or count | 0.4980 / 0.4985 | ↑ | ≥ 20 † | 0/7166 (0.00%) | 0/2354 (0.00%) | Reject: insufficient train/dev support/lift or human veto |
| visible_closing_question | Yes: exact snippet and/or count | 0.4946 / 0.4974 | ↑ | ≥ 1 † | 298/7166 (4.16%) | 88/2354 (3.74%) | Reject: insufficient train/dev support/lift or human veto |
| visible_hook_lines_cta | Yes: exact snippet and/or count | 0.4986 / 0.4989 | ↑ | ≥ 1 † | 33/7166 (0.46%) | 9/2354 (0.38%) | Reject: insufficient train/dev support/lift or human veto |
| visible_repeated_triples | Yes: exact snippet and/or count | 0.5527 / 0.5416 | ↑ | ≥ 5 | 28/7166 (0.39%) | 14/2354 (0.59%) | Reject: insufficient train/dev support/lift or human veto |
| specifics_rate | Count only; absence needs a positive tell | 0.6053 / 0.6057 | ↓ | ≤ 6.5789474 † | 2821/7166 (39.37%) | 918/2354 (39.00%) | Reject absence alone: broad human hits; not a visible positive tell |
| no_specifics_60 | Count only; absence needs a positive tell | 0.5456 / 0.5444 | ↑ | ≥ 1 † | 288/7166 (4.02%) | 90/2354 (3.82%) | Reject absence alone: broad human hits; not a visible positive tell |
| platitude_density | Yes: exact snippet and/or count | 0.5031 / 0.5029 | ↑ | ≥ 0.25839793 | 9/7166 (0.13%) | 6/2354 (0.25%) | Keep diagnostic; prefer one specific-free platitude conjunction |
| platitude_count | Yes: exact snippet and/or count | 0.5031 / 0.5029 | ↑ | ≥ 1 | 16/7166 (0.22%) | 7/2354 (0.30%) | Keep diagnostic; prefer one specific-free platitude conjunction |
| vague_platitude_count | Yes: platitude snippet + 0 specifics markers | 0.5006 / 0.5007 | ↑ | ≥ 1 | 1/7166 (0.01%) | 0/2354 (0.00%) | Candidate style, weight 1 |
| vague_platitude_density | Yes: platitude snippet + 0 specifics markers | 0.5006 / 0.5007 | ↑ | ≥ 0.36101083 | 1/7166 (0.01%) | 0/2354 (0.00%) | Keep diagnostic; prefer one specific-free platitude conjunction |

## Unconstrained train thresholds

| Feature | Best unconstrained cutoff | Train macro Youden | Train recall | Train human hit rate |
| --- | --- | --- | --- | --- |
| sentence_mean | ≥ 18.782609 | 0.0756 | 39.59% | 30.55% |
| sentence_cv | ≤ 0.33643107 | 0.2744 | 45.33% | 18.13% |
| paragraph_mean | ≤ 141.33333 | 0.7014 | 70.17% | 0.03% |
| paragraph_cv | ≥ 0.0066874549 | 0.7013 | 70.17% | 0.04% |
| line_cv | ≤ 1.7619808 | 0.2932 | 58.33% | 31.54% |
| sentences_per_paragraph | ≥ 1 | 0.7673 | 77.01% | 0.32% |
| transition_share | ≥ 0.05 | 0.2089 | 32.55% | 11.55% |
| comma_rate | ≥ 4.6808511 | 0.1444 | 65.87% | 51.23% |
| colon_rate | ≥ 0.61919505 | 0.0889 | 18.07% | 9.11% |
| semicolon_rate | ≤ 0 | 0.1563 | 93.96% | 78.40% |
| parenthesis_rate | ≤ 0.33898305 | 0.1947 | 76.27% | 56.03% |
| question_rate | ≤ 0 | 0.0591 | 88.48% | 83.03% |
| exclamation_rate | ≥ 0.26525199 | 0.0685 | 16.83% | 8.92% |
| emdash_rate | ≤ 0.35842294 | 0.0148 | 99.24% | 97.74% |
| endash_rate | ≤ 0.36630037 | 0.0301 | 97.92% | 94.45% |
| header_share | ≥ 0.034482759 | 0.0021 | 0.21% | 0.00% |
| bold_share | ≤ 0.83333333 | 0.0018 | 99.99% | 99.92% |
| numbered_share | ≥ 0.09375 | 0.1173 | 11.83% | 0.11% |
| bullet_share | ≥ 0.076923077 | 0.1208 | 12.35% | 0.27% |
| list_share | ≥ 0.17647059 | 0.1383 | 13.98% | 0.15% |
| label_share | ≥ 0.032258065 | 0.0044 | 3.65% | 3.22% |
| first_person_rate | ≤ 0.33783784 | 0.1726 | 58.07% | 41.86% |
| digit_rate | ≤ 0.35460993 | 0.2246 | 59.08% | 34.86% |
| average_word_length | ≥ 4.8215768 | 0.2167 | 50.97% | 31.64% |
| repeated_opener1 | ≥ 0.24324324 | 0.0944 | 38.89% | 29.40% |
| repeated_opener2 | ≥ 0.15 | 0.0144 | 11.51% | 7.66% |
| closing_summary | ≥ 1 | 0.1100 | 11.00% | 0.00% |
| closing_ratio | ≥ 0 | 0.7013 | 70.17% | 0.04% |
| closing_single_sentence | ≥ 1 | 0.0770 | 7.70% | 0.00% |
| transition_count | ≥ 2 | 0.0714 | 10.95% | 3.91% |
| label_count | ≥ 1 | 0.0016 | 3.70% | 3.56% |
| bold_count | ≥ 2 | 0.0009 | 0.09% | 0.00% |
| header_count | ≥ 1 | 0.0021 | 0.21% | 0.00% |
| numbered_count | ≥ 2 | 0.1179 | 11.82% | 0.03% |
| bullet_count | ≥ 2 | 0.1217 | 12.25% | 0.08% |
| list_count | ≥ 2 | 0.1397 | 14.07% | 0.11% |
| regular_run_cv6 | ≤ 0.21275612 | 0.1734 | 37.54% | 19.86% |
| summary_tail | ≥ 1 | 0.1139 | 11.61% | 0.17% |
| visible_markdown_headers | ≥ 1 | 0.0021 | 0.21% | 0.00% |
| visible_markdown_bold | ≥ 2 | 0.0009 | 0.09% | 0.00% |
| visible_bold_headings | ≥ 1 | 0.0009 | 0.11% | 0.01% |
| visible_scaffold_list | ≥ 2 | 0.0000 | 0.00% | 0.00% |
| visible_bold_list | ≥ 6 | 0.0005 | 0.05% | 0.00% |
| visible_emoji_list | ≥ 3 | 0.0000 | 0.00% | 0.00% |
| visible_outline_list | ≥ 3 | 0.1086 | 10.87% | 0.01% |
| visible_unicode_bold | ≥ 8 | 0.0000 | 0.00% | 0.00% |
| visible_hashtag_wall | ≥ 5 | 0.0000 | 0.00% | 0.00% |
| visible_heavy_dash | ≥ 20 | 0.0000 | 0.00% | 0.00% |
| visible_closing_question | ≥ 1 | -0.0066 | 3.09% | 4.16% |
| visible_hook_lines_cta | ≥ 1 | -0.0025 | 0.18% | 0.46% |
| visible_repeated_triples | ≥ 2 | 0.1050 | 21.45% | 11.09% |
| specifics_rate | ≤ 6.5789474 | 0.1466 | 53.05% | 39.37% |
| no_specifics_60 | ≥ 1 | 0.0944 | 13.14% | 4.02% |
| platitude_density | ≥ 0.25839793 | 0.0068 | 0.80% | 0.13% |
| platitude_count | ≥ 1 | 0.0061 | 0.84% | 0.22% |
| vague_platitude_count | ≥ 1 | 0.0012 | 0.13% | 0.01% |
| vague_platitude_density | ≥ 0.36101083 | 0.0012 | 0.13% | 0.01% |

## Human feature false positives by domain — train

Each cell is hits / human rows (rate). Every threshold is frozen from train, including rejected research features.

| Feature | abstracts | books | news | poetry | recipes | reddit | reviews | wiki |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | 0/1038 (0.00%) | 10/825 (1.21%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 13/1049 (1.24%) | 2/401 (0.50%) | 4/1035 (0.39%) |
| sentence_cv | 0/1038 (0.00%) | 1/825 (0.12%) | 1/894 (0.11%) | 23/940 (2.45%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 1/1035 (0.10%) |
| paragraph_mean | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 2/1035 (0.19%) |
| paragraph_cv | 0/1038 (0.00%) | 0/825 (0.00%) | 1/894 (0.11%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 2/1035 (0.19%) |
| line_cv | 25/1038 (2.41%) | 0/825 (0.00%) | 0/894 (0.00%) | 7/940 (0.74%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| sentences_per_paragraph | 0/1038 (0.00%) | 0/825 (0.00%) | 4/894 (0.45%) | 0/940 (0.00%) | 1/984 (0.10%) | 0/1049 (0.00%) | 0/401 (0.00%) | 18/1035 (1.74%) |
| transition_share | 0/1038 (0.00%) | 17/825 (2.06%) | 1/894 (0.11%) | 0/940 (0.00%) | 0/984 (0.00%) | 4/1049 (0.38%) | 0/401 (0.00%) | 4/1035 (0.39%) |
| comma_rate | 1/1038 (0.10%) | 2/825 (0.24%) | 3/894 (0.34%) | 23/940 (2.45%) | 0/984 (0.00%) | 0/1049 (0.00%) | 1/401 (0.25%) | 2/1035 (0.19%) |
| colon_rate | 8/1038 (0.77%) | 7/825 (0.85%) | 4/894 (0.45%) | 20/940 (2.13%) | 12/984 (1.22%) | 1/1049 (0.10%) | 8/401 (2.00%) | 10/1035 (0.97%) |
| semicolon_rate | 946/1038 (91.14%) | 580/825 (70.30%) | 824/894 (92.17%) | 524/940 (55.74%) | 617/984 (62.70%) | 998/1049 (95.14%) | 330/401 (82.29%) | 799/1035 (77.20%) |
| parenthesis_rate | 335/1038 (32.27%) | 485/825 (58.79%) | 662/894 (74.05%) | 816/940 (86.81%) | 253/984 (25.71%) | 1049/1049 (100.00%) | 240/401 (59.85%) | 175/1035 (16.91%) |
| question_rate | 1019/1038 (98.17%) | 785/825 (95.15%) | 825/894 (92.28%) | 536/940 (57.02%) | 975/984 (99.09%) | 492/1049 (46.90%) | 292/401 (72.82%) | 1026/1035 (99.13%) |
| exclamation_rate | 3/1038 (0.29%) | 33/825 (4.00%) | 5/894 (0.56%) | 369/940 (39.26%) | 131/984 (13.31%) | 0/1049 (0.00%) | 85/401 (21.20%) | 13/1035 (1.26%) |
| emdash_rate | 1038/1038 (100.00%) | 757/825 (91.76%) | 894/894 (100.00%) | 894/940 (95.11%) | 984/984 (100.00%) | 1044/1049 (99.52%) | 400/401 (99.75%) | 993/1035 (95.94%) |
| endash_rate | 1038/1038 (100.00%) | 790/825 (95.76%) | 894/894 (100.00%) | 908/940 (96.60%) | 984/984 (100.00%) | 1049/1049 (100.00%) | 394/401 (98.25%) | 711/1035 (68.70%) |
| header_share | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| bold_share | 1038/1038 (100.00%) | 825/825 (100.00%) | 894/894 (100.00%) | 940/940 (100.00%) | 984/984 (100.00%) | 1049/1049 (100.00%) | 395/401 (98.50%) | 1035/1035 (100.00%) |
| numbered_share | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 8/984 (0.81%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| bullet_share | 1/1038 (0.10%) | 1/825 (0.12%) | 16/894 (1.79%) | 0/940 (0.00%) | 1/984 (0.10%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| list_share | 0/1038 (0.00%) | 1/825 (0.12%) | 10/894 (1.12%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| label_share | 0/1038 (0.00%) | 8/825 (0.97%) | 18/894 (2.01%) | 0/940 (0.00%) | 0/984 (0.00%) | 6/1049 (0.57%) | 9/401 (2.24%) | 12/1035 (1.16%) |
| first_person_rate | 106/1038 (10.21%) | 711/825 (86.18%) | 267/894 (29.87%) | 141/940 (15.00%) | 800/984 (81.30%) | 38/1049 (3.62%) | 64/401 (15.96%) | 873/1035 (84.35%) |
| digit_rate | 5/1038 (0.48%) | 1/825 (0.12%) | 2/894 (0.22%) | 0/940 (0.00%) | 23/984 (2.34%) | 0/1049 (0.00%) | 0/401 (0.00%) | 5/1035 (0.48%) |
| average_word_length | 25/1038 (2.41%) | 0/825 (0.00%) | 0/894 (0.00%) | 5/940 (0.53%) | 0/984 (0.00%) | 3/1049 (0.29%) | 0/401 (0.00%) | 2/1035 (0.19%) |
| repeated_opener1 | 0/1038 (0.00%) | 5/825 (0.61%) | 0/894 (0.00%) | 6/940 (0.64%) | 0/984 (0.00%) | 21/1049 (2.00%) | 1/401 (0.25%) | 7/1035 (0.68%) |
| repeated_opener2 | 0/1038 (0.00%) | 2/825 (0.24%) | 0/894 (0.00%) | 9/940 (0.96%) | 0/984 (0.00%) | 2/1049 (0.19%) | 9/401 (2.24%) | 8/1035 (0.77%) |
| closing_summary | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| closing_ratio | 0/1038 (0.00%) | 0/825 (0.00%) | 1/894 (0.11%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 2/1035 (0.19%) |
| closing_single_sentence | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| transition_count | 6/1038 (0.58%) | 2/825 (0.24%) | 1/894 (0.11%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| label_count | 3/1038 (0.29%) | 0/825 (0.00%) | 8/894 (0.89%) | 18/940 (1.91%) | 3/984 (0.30%) | 0/1049 (0.00%) | 0/401 (0.00%) | 5/1035 (0.48%) |
| bold_count | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| header_count | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| numbered_count | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 2/940 (0.21%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| bullet_count | 1/1038 (0.10%) | 0/825 (0.00%) | 4/894 (0.45%) | 1/940 (0.11%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| list_count | 1/1038 (0.10%) | 0/825 (0.00%) | 4/894 (0.45%) | 3/940 (0.32%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| regular_run_cv6 | 4/1038 (0.39%) | 1/825 (0.12%) | 0/894 (0.00%) | 21/940 (2.23%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 2/1035 (0.19%) |
| summary_tail | 0/1038 (0.00%) | 6/825 (0.73%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 2/1049 (0.19%) | 3/401 (0.75%) | 1/1035 (0.10%) |
| visible_markdown_headers | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_markdown_bold | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_bold_headings | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 1/940 (0.11%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_scaffold_list | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_bold_list | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_emoji_list | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_outline_list | 1/1038 (0.10%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_unicode_bold | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_hashtag_wall | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_heavy_dash | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 0/940 (0.00%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_closing_question | 0/1038 (0.00%) | 8/825 (0.97%) | 4/894 (0.45%) | 34/940 (3.62%) | 1/984 (0.10%) | 245/1049 (23.36%) | 6/401 (1.50%) | 0/1035 (0.00%) |
| visible_hook_lines_cta | 2/1038 (0.19%) | 0/825 (0.00%) | 0/894 (0.00%) | 25/940 (2.66%) | 6/984 (0.61%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| visible_repeated_triples | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 3/940 (0.32%) | 23/984 (2.34%) | 0/1049 (0.00%) | 0/401 (0.00%) | 2/1035 (0.19%) |
| specifics_rate | 662/1038 (63.78%) | 138/825 (16.73%) | 31/894 (3.47%) | 793/940 (84.36%) | 107/984 (10.87%) | 871/1049 (83.03%) | 155/401 (38.65%) | 64/1035 (6.18%) |
| no_specifics_60 | 75/1038 (7.23%) | 5/825 (0.61%) | 0/894 (0.00%) | 114/940 (12.13%) | 0/984 (0.00%) | 78/1049 (7.44%) | 4/401 (1.00%) | 12/1035 (1.16%) |
| platitude_density | 0/1038 (0.00%) | 1/825 (0.12%) | 3/894 (0.34%) | 2/940 (0.21%) | 0/984 (0.00%) | 3/1049 (0.29%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| platitude_count | 0/1038 (0.00%) | 1/825 (0.12%) | 8/894 (0.89%) | 2/940 (0.21%) | 1/984 (0.10%) | 3/1049 (0.29%) | 1/401 (0.25%) | 0/1035 (0.00%) |
| vague_platitude_count | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 1/940 (0.11%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |
| vague_platitude_density | 0/1038 (0.00%) | 0/825 (0.00%) | 0/894 (0.00%) | 1/940 (0.11%) | 0/984 (0.00%) | 0/1049 (0.00%) | 0/401 (0.00%) | 0/1035 (0.00%) |

## Human feature false positives by domain — dev

Each cell is hits / human rows (rate). Every threshold is frozen from train, including rejected research features.

| Feature | abstracts | books | news | poetry | recipes | reddit | reviews | wiki |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | 0/304 (0.00%) | 5/257 (1.95%) | 1/332 (0.30%) | 0/303 (0.00%) | 0/353 (0.00%) | 3/341 (0.88%) | 1/151 (0.66%) | 2/313 (0.64%) |
| sentence_cv | 0/304 (0.00%) | 1/257 (0.39%) | 0/332 (0.00%) | 11/303 (3.63%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| paragraph_mean | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 1/353 (0.28%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| paragraph_cv | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 1/353 (0.28%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| line_cv | 11/304 (3.62%) | 0/257 (0.00%) | 0/332 (0.00%) | 8/303 (2.64%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| sentences_per_paragraph | 0/304 (0.00%) | 0/257 (0.00%) | 1/332 (0.30%) | 0/303 (0.00%) | 3/353 (0.85%) | 0/341 (0.00%) | 0/151 (0.00%) | 8/313 (2.56%) |
| transition_share | 0/304 (0.00%) | 4/257 (1.56%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 1/341 (0.29%) | 2/151 (1.32%) | 2/313 (0.64%) |
| comma_rate | 0/304 (0.00%) | 0/257 (0.00%) | 1/332 (0.30%) | 4/303 (1.32%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 2/313 (0.64%) |
| colon_rate | 1/304 (0.33%) | 3/257 (1.17%) | 0/332 (0.00%) | 3/303 (0.99%) | 6/353 (1.70%) | 1/341 (0.29%) | 6/151 (3.97%) | 8/313 (2.56%) |
| semicolon_rate | 278/304 (91.45%) | 181/257 (70.43%) | 309/332 (93.07%) | 158/303 (52.15%) | 225/353 (63.74%) | 324/341 (95.01%) | 124/151 (82.12%) | 250/313 (79.87%) |
| parenthesis_rate | 104/304 (34.21%) | 155/257 (60.31%) | 240/332 (72.29%) | 267/303 (88.12%) | 73/353 (20.68%) | 341/341 (100.00%) | 91/151 (60.26%) | 64/313 (20.45%) |
| question_rate | 301/304 (99.01%) | 240/257 (93.39%) | 311/332 (93.67%) | 185/303 (61.06%) | 347/353 (98.30%) | 166/341 (48.68%) | 109/151 (72.19%) | 308/313 (98.40%) |
| exclamation_rate | 1/304 (0.33%) | 10/257 (3.89%) | 5/332 (1.51%) | 120/303 (39.60%) | 60/353 (17.00%) | 0/341 (0.00%) | 39/151 (25.83%) | 8/313 (2.56%) |
| emdash_rate | 304/304 (100.00%) | 239/257 (93.00%) | 332/332 (100.00%) | 294/303 (97.03%) | 353/353 (100.00%) | 340/341 (99.71%) | 151/151 (100.00%) | 302/313 (96.49%) |
| endash_rate | 304/304 (100.00%) | 247/257 (96.11%) | 332/332 (100.00%) | 293/303 (96.70%) | 353/353 (100.00%) | 341/341 (100.00%) | 148/151 (98.01%) | 204/313 (65.18%) |
| header_share | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| bold_share | 304/304 (100.00%) | 257/257 (100.00%) | 332/332 (100.00%) | 303/303 (100.00%) | 353/353 (100.00%) | 341/341 (100.00%) | 150/151 (99.34%) | 313/313 (100.00%) |
| numbered_share | 1/304 (0.33%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 7/353 (1.98%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| bullet_share | 0/304 (0.00%) | 0/257 (0.00%) | 4/332 (1.20%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| list_share | 1/304 (0.33%) | 0/257 (0.00%) | 4/332 (1.20%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| label_share | 0/304 (0.00%) | 3/257 (1.17%) | 11/332 (3.31%) | 0/303 (0.00%) | 3/353 (0.85%) | 3/341 (0.88%) | 3/151 (1.99%) | 6/313 (1.92%) |
| first_person_rate | 24/304 (7.89%) | 226/257 (87.94%) | 98/332 (29.52%) | 40/303 (13.20%) | 285/353 (80.74%) | 11/341 (3.23%) | 19/151 (12.58%) | 262/313 (83.71%) |
| digit_rate | 3/304 (0.99%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 10/353 (2.83%) | 0/341 (0.00%) | 0/151 (0.00%) | 1/313 (0.32%) |
| average_word_length | 5/304 (1.64%) | 1/257 (0.39%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 1/341 (0.29%) | 0/151 (0.00%) | 3/313 (0.96%) |
| repeated_opener1 | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 4/303 (1.32%) | 0/353 (0.00%) | 10/341 (2.93%) | 1/151 (0.66%) | 6/313 (1.92%) |
| repeated_opener2 | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 3/303 (0.99%) | 0/353 (0.00%) | 1/341 (0.29%) | 4/151 (2.65%) | 5/313 (1.60%) |
| closing_summary | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| closing_ratio | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 1/353 (0.28%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| closing_single_sentence | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| transition_count | 1/304 (0.33%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| label_count | 0/304 (0.00%) | 0/257 (0.00%) | 4/332 (1.20%) | 5/303 (1.65%) | 2/353 (0.57%) | 0/341 (0.00%) | 0/151 (0.00%) | 3/313 (0.96%) |
| bold_count | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| header_count | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| numbered_count | 1/304 (0.33%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| bullet_count | 0/304 (0.00%) | 0/257 (0.00%) | 3/332 (0.90%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| list_count | 1/304 (0.33%) | 0/257 (0.00%) | 3/332 (0.90%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| regular_run_cv6 | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 9/303 (2.97%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 1/313 (0.32%) |
| summary_tail | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_markdown_headers | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_markdown_bold | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_bold_headings | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_scaffold_list | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_bold_list | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_emoji_list | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_outline_list | 1/304 (0.33%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_unicode_bold | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_hashtag_wall | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_heavy_dash | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_closing_question | 0/304 (0.00%) | 3/257 (1.17%) | 3/332 (0.90%) | 9/303 (2.97%) | 0/353 (0.00%) | 71/341 (20.82%) | 2/151 (1.32%) | 0/313 (0.00%) |
| visible_hook_lines_cta | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 6/303 (1.98%) | 3/353 (0.85%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| visible_repeated_triples | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 2/303 (0.66%) | 11/353 (3.12%) | 0/341 (0.00%) | 1/151 (0.66%) | 0/313 (0.00%) |
| specifics_rate | 194/304 (63.82%) | 47/257 (18.29%) | 9/332 (2.71%) | 256/303 (84.49%) | 37/353 (10.48%) | 292/341 (85.63%) | 65/151 (43.05%) | 18/313 (5.75%) |
| no_specifics_60 | 25/304 (8.22%) | 0/257 (0.00%) | 0/332 (0.00%) | 37/303 (12.21%) | 0/353 (0.00%) | 25/341 (7.33%) | 0/151 (0.00%) | 3/313 (0.96%) |
| platitude_density | 0/304 (0.00%) | 0/257 (0.00%) | 1/332 (0.30%) | 0/303 (0.00%) | 0/353 (0.00%) | 4/341 (1.17%) | 0/151 (0.00%) | 1/313 (0.32%) |
| platitude_count | 0/304 (0.00%) | 0/257 (0.00%) | 2/332 (0.60%) | 0/303 (0.00%) | 0/353 (0.00%) | 4/341 (1.17%) | 0/151 (0.00%) | 1/313 (0.32%) |
| vague_platitude_count | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |
| vague_platitude_density | 0/304 (0.00%) | 0/257 (0.00%) | 0/332 (0.00%) | 0/303 (0.00%) | 0/353 (0.00%) | 0/341 (0.00%) | 0/151 (0.00%) | 0/313 (0.00%) |

## Formal versus casual human false positives

Formal = abstracts/wiki/news; casual = reddit/reviews. Books, poetry and recipes remain separate in the domain tables.

| Feature | Formal train | Formal dev | Casual train | Casual dev |
| --- | --- | --- | --- | --- |
| sentence_mean | 4/2967 (0.13%) | 3/949 (0.32%) | 15/1450 (1.03%) | 4/492 (0.81%) |
| sentence_cv | 2/2967 (0.07%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| paragraph_mean | 2/2967 (0.07%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| paragraph_cv | 3/2967 (0.10%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| line_cv | 25/2967 (0.84%) | 11/949 (1.16%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| sentences_per_paragraph | 22/2967 (0.74%) | 9/949 (0.95%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| transition_share | 5/2967 (0.17%) | 2/949 (0.21%) | 4/1450 (0.28%) | 3/492 (0.61%) |
| comma_rate | 6/2967 (0.20%) | 3/949 (0.32%) | 1/1450 (0.07%) | 0/492 (0.00%) |
| colon_rate | 22/2967 (0.74%) | 9/949 (0.95%) | 9/1450 (0.62%) | 7/492 (1.42%) |
| semicolon_rate | 2569/2967 (86.59%) | 837/949 (88.20%) | 1328/1450 (91.59%) | 448/492 (91.06%) |
| parenthesis_rate | 1172/2967 (39.50%) | 408/949 (42.99%) | 1289/1450 (88.90%) | 432/492 (87.80%) |
| question_rate | 2870/2967 (96.73%) | 920/949 (96.94%) | 784/1450 (54.07%) | 275/492 (55.89%) |
| exclamation_rate | 21/2967 (0.71%) | 14/949 (1.48%) | 85/1450 (5.86%) | 39/492 (7.93%) |
| emdash_rate | 2925/2967 (98.58%) | 938/949 (98.84%) | 1444/1450 (99.59%) | 491/492 (99.80%) |
| endash_rate | 2643/2967 (89.08%) | 840/949 (88.51%) | 1443/1450 (99.52%) | 489/492 (99.39%) |
| header_share | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| bold_share | 2967/2967 (100.00%) | 949/949 (100.00%) | 1444/1450 (99.59%) | 491/492 (99.80%) |
| numbered_share | 0/2967 (0.00%) | 1/949 (0.11%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| bullet_share | 17/2967 (0.57%) | 4/949 (0.42%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| list_share | 10/2967 (0.34%) | 5/949 (0.53%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| label_share | 30/2967 (1.01%) | 17/949 (1.79%) | 15/1450 (1.03%) | 6/492 (1.22%) |
| first_person_rate | 1246/2967 (42.00%) | 384/949 (40.46%) | 102/1450 (7.03%) | 30/492 (6.10%) |
| digit_rate | 12/2967 (0.40%) | 4/949 (0.42%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| average_word_length | 27/2967 (0.91%) | 8/949 (0.84%) | 3/1450 (0.21%) | 1/492 (0.20%) |
| repeated_opener1 | 7/2967 (0.24%) | 6/949 (0.63%) | 22/1450 (1.52%) | 11/492 (2.24%) |
| repeated_opener2 | 8/2967 (0.27%) | 5/949 (0.53%) | 11/1450 (0.76%) | 5/492 (1.02%) |
| closing_summary | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| closing_ratio | 3/2967 (0.10%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| closing_single_sentence | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| transition_count | 7/2967 (0.24%) | 1/949 (0.11%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| label_count | 16/2967 (0.54%) | 7/949 (0.74%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| bold_count | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| header_count | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| numbered_count | 0/2967 (0.00%) | 1/949 (0.11%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| bullet_count | 5/2967 (0.17%) | 3/949 (0.32%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| list_count | 5/2967 (0.17%) | 4/949 (0.42%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| regular_run_cv6 | 6/2967 (0.20%) | 1/949 (0.11%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| summary_tail | 1/2967 (0.03%) | 0/949 (0.00%) | 5/1450 (0.34%) | 0/492 (0.00%) |
| visible_markdown_headers | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_markdown_bold | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_bold_headings | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_scaffold_list | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_bold_list | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_emoji_list | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_outline_list | 1/2967 (0.03%) | 1/949 (0.11%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_unicode_bold | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_hashtag_wall | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_heavy_dash | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_closing_question | 4/2967 (0.13%) | 3/949 (0.32%) | 251/1450 (17.31%) | 73/492 (14.84%) |
| visible_hook_lines_cta | 2/2967 (0.07%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| visible_repeated_triples | 2/2967 (0.07%) | 0/949 (0.00%) | 0/1450 (0.00%) | 1/492 (0.20%) |
| specifics_rate | 757/2967 (25.51%) | 221/949 (23.29%) | 1026/1450 (70.76%) | 357/492 (72.56%) |
| no_specifics_60 | 87/2967 (2.93%) | 28/949 (2.95%) | 82/1450 (5.66%) | 25/492 (5.08%) |
| platitude_density | 3/2967 (0.10%) | 2/949 (0.21%) | 3/1450 (0.21%) | 4/492 (0.81%) |
| platitude_count | 8/2967 (0.27%) | 3/949 (0.32%) | 4/1450 (0.28%) | 4/492 (0.81%) |
| vague_platitude_count | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |
| vague_platitude_density | 0/2967 (0.00%) | 0/949 (0.00%) | 0/1450 (0.00%) | 0/492 (0.00%) |

## AUROC by domain

Cells are train / dev, with the single train-selected AUROC orientation used for every subgroup.

| Feature | abstracts | books | news | poetry | recipes | reddit | reviews | wiki |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | 0.5289 / 0.5395 | 0.4573 / 0.4616 | 0.6647 / 0.6587 | 0.6370 / 0.6051 | 0.1528 / 0.1589 | 0.3469 / 0.3485 | 0.5802 / 0.5808 | 0.4770 / 0.4980 |
| sentence_cv | 0.4815 / 0.4929 | 0.7021 / 0.7177 | 0.6615 / 0.6441 | 0.7873 / 0.7574 | 0.0946 / 0.1081 | 0.5122 / 0.5103 | 0.7749 / 0.7789 | 0.6812 / 0.6708 |
| paragraph_mean | 0.6242 / 0.6256 | 0.8243 / 0.8159 | 0.9458 / 0.9448 | 0.8972 / 0.9033 | 0.9336 / 0.9342 | 0.7615 / 0.7563 | 0.8596 / 0.8556 | 0.9598 / 0.9596 |
| paragraph_cv | 0.6242 / 0.6256 | 0.8243 / 0.8159 | 0.9457 / 0.9448 | 0.8972 / 0.9033 | 0.9336 / 0.9320 | 0.7615 / 0.7563 | 0.8596 / 0.8556 | 0.9598 / 0.9596 |
| line_cv | 0.0620 / 0.0763 | 0.6990 / 0.7063 | 0.8431 / 0.8551 | 0.6149 / 0.5915 | 0.9570 / 0.9578 | 0.6844 / 0.6844 | 0.7524 / 0.7511 | 0.8636 / 0.8496 |
| sentences_per_paragraph | 0.6506 / 0.6519 | 0.8381 / 0.8304 | 0.9612 / 0.9614 | 0.9808 / 0.9796 | 0.9896 / 0.9881 | 0.8071 / 0.7989 | 0.8725 / 0.8681 | 0.9797 / 0.9790 |
| transition_share | 0.3850 / 0.3969 | 0.4973 / 0.4879 | 0.6881 / 0.7000 | 0.4768 / 0.4932 | 0.4513 / 0.4563 | 0.5218 / 0.5217 | 0.7409 / 0.7397 | 0.7238 / 0.7301 |
| comma_rate | 0.4489 / 0.4738 | 0.5350 / 0.5281 | 0.6621 / 0.6488 | 0.7817 / 0.7746 | 0.5404 / 0.5243 | 0.7270 / 0.7401 | 0.6662 / 0.6237 | 0.5221 / 0.4780 |
| colon_rate | 0.4854 / 0.4979 | 0.4273 / 0.4353 | 0.3949 / 0.3902 | 0.3973 / 0.3783 | 0.9495 / 0.9428 | 0.5667 / 0.5631 | 0.4326 / 0.4579 | 0.4976 / 0.4998 |
| semicolon_rate | 0.5360 / 0.5346 | 0.6144 / 0.6160 | 0.5257 / 0.5193 | 0.6794 / 0.6999 | 0.6460 / 0.6457 | 0.5117 / 0.5119 | 0.5489 / 0.5531 | 0.5763 / 0.5635 |
| parenthesis_rate | 0.6863 / 0.6588 | 0.7268 / 0.7133 | 0.5847 / 0.5735 | 0.5770 / 0.5656 | 0.5344 / 0.5629 | 0.4421 / 0.4511 | 0.6440 / 0.6300 | 0.7280 / 0.7010 |
| question_rate | 0.5054 / 0.5008 | 0.4271 / 0.4287 | 0.5234 / 0.5113 | 0.6649 / 0.6518 | 0.5008 / 0.5033 | 0.4526 / 0.4486 | 0.6186 / 0.6256 | 0.4970 / 0.4973 |
| exclamation_rate | 0.5008 / 0.4998 | 0.4934 / 0.4921 | 0.5051 / 0.5022 | 0.3297 / 0.3306 | 0.7624 / 0.7496 | 0.6926 / 0.6874 | 0.4479 / 0.4269 | 0.5075 / 0.5008 |
| emdash_rate | 0.4996 / 0.4993 | 0.5422 / 0.5268 | 0.4972 / 0.4989 | 0.5081 / 0.4974 | 0.4975 / 0.4985 | 0.4985 / 0.4978 | 0.4964 / 0.4978 | 0.5164 / 0.5157 |
| endash_rate | 0.4985 / 0.4985 | 0.5083 / 0.5067 | 0.4839 / 0.4844 | 0.5093 / 0.5037 | 0.4836 / 0.4863 | 0.4886 / 0.4852 | 0.4936 / 0.4935 | 0.6122 / 0.6250 |
| header_share | 0.5000 / 0.5004 | 0.5001 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5043 / 0.5044 | 0.5000 / 0.5000 | 0.5001 / 0.5000 | 0.5038 / 0.5048 |
| bold_share | 0.5003 / 0.5004 | 0.5004 / 0.5000 | 0.5006 / 0.5011 | 0.4985 / 0.4967 | 0.5011 / 0.4977 | 0.5014 / 0.5019 | 0.4928 / 0.4971 | 0.5019 / 0.5026 |
| numbered_share | 0.5025 / 0.5016 | 0.5001 / 0.5000 | 0.5010 / 0.5007 | 0.4992 / 0.4983 | 0.9407 / 0.9484 | 0.5188 / 0.5200 | 0.5000 / 0.5000 | 0.5111 / 0.5070 |
| bullet_share | 0.5166 / 0.5204 | 0.5001 / 0.5000 | 0.4919 / 0.4955 | 0.4930 / 0.4921 | 0.9522 / 0.9525 | 0.5071 / 0.5078 | 0.5001 / 0.5000 | 0.5156 / 0.5152 |
| list_share | 0.5192 / 0.5221 | 0.5002 / 0.5000 | 0.4929 / 0.4962 | 0.4922 / 0.4905 | 0.9904 / 0.9893 | 0.5258 / 0.5278 | 0.5001 / 0.5000 | 0.5260 / 0.5222 |
| label_share | 0.5173 / 0.5162 | 0.4989 / 0.5008 | 0.4820 / 0.4835 | 0.4751 / 0.4630 | 0.5218 / 0.5418 | 0.5064 / 0.5041 | 0.5019 / 0.5186 | 0.5006 / 0.5013 |
| first_person_rate | 0.5559 / 0.5757 | 0.4958 / 0.4924 | 0.6156 / 0.6113 | 0.5595 / 0.5346 | 0.5903 / 0.5840 | 0.5977 / 0.5764 | 0.8180 / 0.8208 | 0.5085 / 0.4894 |
| digit_rate | 0.6944 / 0.6725 | 0.6454 / 0.6535 | 0.7321 / 0.7504 | 0.5933 / 0.5815 | 0.3351 / 0.3417 | 0.6771 / 0.6682 | 0.6564 / 0.6131 | 0.6763 / 0.6746 |
| average_word_length | 0.7293 / 0.7464 | 0.6046 / 0.6199 | 0.7828 / 0.7678 | 0.5796 / 0.5939 | 0.5774 / 0.5592 | 0.7904 / 0.7963 | 0.9051 / 0.8896 | 0.6631 / 0.6561 |
| repeated_opener1 | 0.4593 / 0.4769 | 0.4337 / 0.4434 | 0.5566 / 0.5506 | 0.5796 / 0.5653 | 0.5676 / 0.5596 | 0.4255 / 0.4294 | 0.6948 / 0.6829 | 0.5413 / 0.5311 |
| repeated_opener2 | 0.5041 / 0.5065 | 0.5094 / 0.5106 | 0.5151 / 0.5073 | 0.4601 / 0.4671 | 0.5481 / 0.5344 | 0.5091 / 0.5132 | 0.3094 / 0.2839 | 0.6156 / 0.5877 |
| closing_summary | 0.5515 / 0.5500 | 0.5103 / 0.5078 | 0.5408 / 0.5400 | 0.5007 / 0.5007 | 0.5000 / 0.5000 | 0.5260 / 0.5211 | 0.7462 / 0.7441 | 0.5643 / 0.5637 |
| closing_ratio | 0.6242 / 0.6256 | 0.8243 / 0.8159 | 0.9453 / 0.9448 | 0.8972 / 0.9033 | 0.9336 / 0.9337 | 0.7615 / 0.7563 | 0.8596 / 0.8556 | 0.9593 / 0.9596 |
| closing_single_sentence | 0.5356 / 0.5356 | 0.5275 / 0.5322 | 0.6196 / 0.6244 | 0.5079 / 0.5081 | 0.5367 / 0.5389 | 0.5144 / 0.5152 | 0.5147 / 0.5141 | 0.5517 / 0.5548 |
| transition_count | 0.5080 / 0.5156 | 0.5004 / 0.5030 | 0.5965 / 0.6031 | 0.4963 / 0.4971 | 0.4970 / 0.4972 | 0.5356 / 0.5333 | 0.5634 / 0.5749 | 0.5893 / 0.5895 |
| label_count | 0.5170 / 0.5158 | 0.4989 / 0.5008 | 0.4826 / 0.4846 | 0.4748 / 0.4627 | 0.5248 / 0.5458 | 0.5065 / 0.5041 | 0.5022 / 0.5191 | 0.5006 / 0.5015 |
| bold_count | 0.5003 / 0.5004 | 0.5004 / 0.5000 | 0.5006 / 0.5011 | 0.4985 / 0.4967 | 0.5011 / 0.4977 | 0.5014 / 0.5019 | 0.4928 / 0.4971 | 0.5019 / 0.5026 |
| header_count | 0.5000 / 0.5004 | 0.5001 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5043 / 0.5044 | 0.5000 / 0.5000 | 0.5001 / 0.5000 | 0.5038 / 0.5048 |
| numbered_count | 0.5025 / 0.5016 | 0.5001 / 0.5000 | 0.5010 / 0.5007 | 0.4992 / 0.4983 | 0.9408 / 0.9487 | 0.5188 / 0.5200 | 0.5000 / 0.5000 | 0.5111 / 0.5070 |
| bullet_count | 0.5166 / 0.5204 | 0.5001 / 0.5000 | 0.4919 / 0.4955 | 0.4930 / 0.4921 | 0.9522 / 0.9525 | 0.5071 / 0.5078 | 0.5001 / 0.5000 | 0.5156 / 0.5152 |
| list_count | 0.5192 / 0.5220 | 0.5002 / 0.5000 | 0.4929 / 0.4962 | 0.4922 / 0.4905 | 0.9904 / 0.9894 | 0.5258 / 0.5278 | 0.5001 / 0.5000 | 0.5260 / 0.5222 |
| regular_run_cv6 | 0.6511 / 0.6781 | 0.6572 / 0.6872 | 0.5456 / 0.5806 | 0.4739 / 0.4584 | 0.0600 / 0.0602 | 0.5611 / 0.5687 | 0.7171 / 0.7327 | 0.7566 / 0.7574 |
| summary_tail | 0.6333 / 0.6493 | 0.5196 / 0.5248 | 0.5364 / 0.5330 | 0.5004 / 0.5007 | 0.5001 / 0.5000 | 0.5206 / 0.5196 | 0.6906 / 0.7070 | 0.5547 / 0.5567 |
| visible_markdown_headers | 0.5000 / 0.5004 | 0.5001 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5043 / 0.5044 | 0.5000 / 0.5000 | 0.5001 / 0.5000 | 0.5038 / 0.5048 |
| visible_markdown_bold | 0.5001 / 0.5004 | 0.5004 / 0.5000 | 0.5003 / 0.5011 | 0.4985 / 0.4967 | 0.5020 / 0.5005 | 0.5014 / 0.5015 | 0.4928 / 0.4971 | 0.5019 / 0.5026 |
| visible_bold_headings | 0.5001 / 0.5004 | 0.5003 / 0.5000 | 0.5003 / 0.5011 | 0.4996 / 0.5000 | 0.5026 / 0.5015 | 0.5000 / 0.5004 | 0.5000 / 0.5000 | 0.5008 / 0.5011 |
| visible_scaffold_list | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_bold_list | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5021 / 0.5015 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_emoji_list | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_outline_list | 0.5077 / 0.5128 | 0.5006 / 0.5000 | 0.5008 / 0.5015 | 0.5004 / 0.5000 | 0.8988 / 0.8907 | 0.5182 / 0.5196 | 0.5000 / 0.5000 | 0.5079 / 0.5093 |
| visible_unicode_bold | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_hashtag_wall | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_heavy_dash | 0.5000 / 0.5000 | 0.4953 / 0.4969 | 0.5000 / 0.5000 | 0.4918 / 0.4932 | 0.5003 / 0.5000 | 0.5000 / 0.5007 | 0.5001 / 0.5000 | 0.4971 / 0.4968 |
| visible_closing_question | 0.5026 / 0.5033 | 0.5433 / 0.5416 | 0.4994 / 0.4992 | 0.4857 / 0.4877 | 0.5002 / 0.5007 | 0.4466 / 0.4626 | 0.4943 / 0.4945 | 0.5014 / 0.5030 |
| visible_hook_lines_cta | 0.4990 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.4930 / 0.4949 | 0.4978 / 0.4972 | 0.5001 / 0.5000 | 0.5000 / 0.5000 | 0.5001 / 0.5000 |
| visible_repeated_triples | 0.5339 / 0.5403 | 0.5417 / 0.5447 | 0.5169 / 0.5096 | 0.5307 / 0.5182 | 0.5613 / 0.5545 | 0.5293 / 0.5167 | 0.5710 / 0.5493 | 0.6446 / 0.6199 |
| specifics_rate | 0.6704 / 0.6544 | 0.8447 / 0.8576 | 0.7873 / 0.8010 | 0.7600 / 0.7681 | 0.3394 / 0.3515 | 0.6019 / 0.5717 | 0.4914 / 0.4458 | 0.7329 / 0.7288 |
| no_specifics_60 | 0.5975 / 0.5815 | 0.5086 / 0.5100 | 0.5040 / 0.5044 | 0.7244 / 0.7223 | 0.5000 / 0.5000 | 0.5473 / 0.5456 | 0.4974 / 0.5011 | 0.4986 / 0.4997 |
| platitude_density | 0.5000 / 0.5000 | 0.5090 / 0.5074 | 0.5018 / 0.5033 | 0.5030 / 0.5041 | 0.4995 / 0.5000 | 0.5103 / 0.5071 | 0.4999 / 0.5030 | 0.5010 / 0.4999 |
| platitude_count | 0.5000 / 0.5000 | 0.5090 / 0.5074 | 0.5018 / 0.5033 | 0.5030 / 0.5041 | 0.4995 / 0.5000 | 0.5102 / 0.5071 | 0.4999 / 0.5030 | 0.5010 / 0.4999 |
| vague_platitude_count | 0.5000 / 0.5000 | 0.5004 / 0.5004 | 0.5000 / 0.5000 | 0.5017 / 0.5026 | 0.5000 / 0.5000 | 0.5026 / 0.5030 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| vague_platitude_density | 0.5000 / 0.5000 | 0.5004 / 0.5004 | 0.5000 / 0.5000 | 0.5017 / 0.5026 | 0.5000 / 0.5000 | 0.5026 / 0.5030 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |

## AUROC by chat model

| Feature | chatgpt | cohere-chat | gpt4 | llama-chat | mistral-chat | mpt-chat |
| --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | 0.5372 / 0.5325 | 0.4816 / 0.4767 | 0.5152 / 0.5167 | 0.5978 / 0.5945 | 0.5348 / 0.5420 | 0.3761 / 0.3693 |
| sentence_cv | 0.6960 / 0.6925 | 0.5555 / 0.5458 | 0.6114 / 0.6112 | 0.6608 / 0.6609 | 0.6373 / 0.6417 | 0.3728 / 0.3707 |
| paragraph_mean | 0.8372 / 0.8408 | 0.7822 / 0.7791 | 0.9332 / 0.9325 | 0.9793 / 0.9798 | 0.8611 / 0.8587 | 0.7116 / 0.7076 |
| paragraph_cv | 0.8372 / 0.8407 | 0.7822 / 0.7790 | 0.9332 / 0.9324 | 0.9792 / 0.9797 | 0.8610 / 0.8586 | 0.7115 / 0.7075 |
| line_cv | 0.6833 / 0.6918 | 0.4712 / 0.4838 | 0.7076 / 0.7125 | 0.7336 / 0.7475 | 0.5741 / 0.5812 | 0.4495 / 0.4538 |
| sentences_per_paragraph | 0.8538 / 0.8505 | 0.8758 / 0.8825 | 0.9356 / 0.9352 | 0.9914 / 0.9905 | 0.9025 / 0.8969 | 0.7537 / 0.7457 |
| transition_share | 0.6153 / 0.6373 | 0.4836 / 0.4939 | 0.5770 / 0.5863 | 0.6445 / 0.6476 | 0.6082 / 0.6162 | 0.3958 / 0.3945 |
| comma_rate | 0.5977 / 0.5992 | 0.5928 / 0.5799 | 0.6860 / 0.6729 | 0.6620 / 0.6583 | 0.5972 / 0.5884 | 0.4702 / 0.4706 |
| colon_rate | 0.4734 / 0.4783 | 0.5504 / 0.5604 | 0.4893 / 0.4851 | 0.5511 / 0.5494 | 0.5172 / 0.5189 | 0.5184 / 0.5088 |
| semicolon_rate | 0.5993 / 0.5988 | 0.5843 / 0.5874 | 0.5820 / 0.5822 | 0.5883 / 0.5865 | 0.5886 / 0.5917 | 0.5481 / 0.5464 |
| parenthesis_rate | 0.6331 / 0.6239 | 0.6046 / 0.6013 | 0.6245 / 0.6107 | 0.5838 / 0.5723 | 0.5946 / 0.5817 | 0.6214 / 0.6112 |
| question_rate | 0.5394 / 0.5369 | 0.5255 / 0.5216 | 0.5307 / 0.5278 | 0.4935 / 0.4919 | 0.5416 / 0.5439 | 0.5332 / 0.5254 |
| exclamation_rate | 0.5204 / 0.5117 | 0.5055 / 0.4947 | 0.5246 / 0.5141 | 0.5504 / 0.5458 | 0.5273 / 0.5201 | 0.5559 / 0.5517 |
| emdash_rate | 0.5104 / 0.5083 | 0.5068 / 0.5033 | 0.5036 / 0.5021 | 0.5097 / 0.5065 | 0.5116 / 0.5083 | 0.4997 / 0.4948 |
| endash_rate | 0.5229 / 0.5199 | 0.5081 / 0.5037 | 0.5069 / 0.5099 | 0.5146 / 0.5144 | 0.5126 / 0.5106 | 0.5020 / 0.5035 |
| header_share | 0.5000 / 0.5000 | 0.5055 / 0.5046 | 0.5009 / 0.5017 | 0.5002 / 0.5004 | 0.5012 / 0.5019 | 0.5002 / 0.5000 |
| bold_share | 0.4990 / 0.4985 | 0.5012 / 0.5010 | 0.5012 / 0.5010 | 0.4996 / 0.4993 | 0.5002 / 0.4989 | 0.4999 / 0.5002 |
| numbered_share | 0.5611 / 0.5617 | 0.5547 / 0.5575 | 0.5644 / 0.5638 | 0.5681 / 0.5652 | 0.5615 / 0.5642 | 0.5396 / 0.5412 |
| bullet_share | 0.5609 / 0.5601 | 0.5287 / 0.5284 | 0.5604 / 0.5610 | 0.5764 / 0.5779 | 0.5587 / 0.5593 | 0.5585 / 0.5593 |
| list_share | 0.5594 / 0.5599 | 0.5587 / 0.5619 | 0.5658 / 0.5640 | 0.5829 / 0.5817 | 0.5657 / 0.5678 | 0.5602 / 0.5594 |
| label_share | 0.5073 / 0.5167 | 0.4947 / 0.4925 | 0.5064 / 0.5134 | 0.5074 / 0.5110 | 0.4969 / 0.4992 | 0.4947 / 0.4920 |
| first_person_rate | 0.6121 / 0.6110 | 0.6019 / 0.5975 | 0.6133 / 0.6200 | 0.5223 / 0.5143 | 0.5834 / 0.5774 | 0.5904 / 0.5885 |
| digit_rate | 0.6422 / 0.6393 | 0.5738 / 0.5686 | 0.6244 / 0.6266 | 0.6102 / 0.6110 | 0.6158 / 0.6192 | 0.6194 / 0.6231 |
| average_word_length | 0.7012 / 0.7082 | 0.5096 / 0.5273 | 0.6817 / 0.6882 | 0.5926 / 0.6036 | 0.6147 / 0.6286 | 0.6841 / 0.6956 |
| repeated_opener1 | 0.5859 / 0.5838 | 0.5951 / 0.5992 | 0.6176 / 0.6163 | 0.6268 / 0.6162 | 0.5114 / 0.5097 | 0.3519 / 0.3491 |
| repeated_opener2 | 0.5260 / 0.5185 | 0.5551 / 0.5388 | 0.5511 / 0.5456 | 0.5270 / 0.5183 | 0.4879 / 0.4722 | 0.4537 / 0.4437 |
| closing_summary | 0.5687 / 0.5725 | 0.5219 / 0.5229 | 0.5445 / 0.5387 | 0.5791 / 0.5792 | 0.5781 / 0.5758 | 0.5226 / 0.5183 |
| closing_ratio | 0.8372 / 0.8407 | 0.7821 / 0.7790 | 0.9331 / 0.9324 | 0.9792 / 0.9797 | 0.8610 / 0.8587 | 0.7115 / 0.7076 |
| closing_single_sentence | 0.5128 / 0.5150 | 0.5459 / 0.5521 | 0.5378 / 0.5442 | 0.5451 / 0.5442 | 0.5359 / 0.5413 | 0.5440 / 0.5408 |
| transition_count | 0.5683 / 0.5799 | 0.4980 / 0.5053 | 0.5462 / 0.5454 | 0.5498 / 0.5525 | 0.5447 / 0.5521 | 0.5086 / 0.5085 |
| label_count | 0.5077 / 0.5172 | 0.4946 / 0.4924 | 0.5067 / 0.5138 | 0.5074 / 0.5110 | 0.4967 / 0.4990 | 0.4946 / 0.4919 |
| bold_count | 0.4990 / 0.4985 | 0.5012 / 0.5010 | 0.5012 / 0.5010 | 0.4996 / 0.4993 | 0.5002 / 0.4989 | 0.4999 / 0.5002 |
| header_count | 0.5000 / 0.5000 | 0.5055 / 0.5046 | 0.5009 / 0.5017 | 0.5002 / 0.5004 | 0.5012 / 0.5019 | 0.5002 / 0.5000 |
| numbered_count | 0.5611 / 0.5617 | 0.5547 / 0.5575 | 0.5644 / 0.5638 | 0.5681 / 0.5653 | 0.5615 / 0.5642 | 0.5396 / 0.5412 |
| bullet_count | 0.5609 / 0.5602 | 0.5287 / 0.5284 | 0.5604 / 0.5610 | 0.5764 / 0.5780 | 0.5588 / 0.5594 | 0.5585 / 0.5593 |
| list_count | 0.5594 / 0.5599 | 0.5587 / 0.5619 | 0.5659 / 0.5640 | 0.5829 / 0.5817 | 0.5657 / 0.5678 | 0.5602 / 0.5594 |
| regular_run_cv6 | 0.6315 / 0.6337 | 0.5206 / 0.5280 | 0.5952 / 0.5951 | 0.6358 / 0.6368 | 0.5721 / 0.5769 | 0.3806 / 0.3744 |
| summary_tail | 0.5389 / 0.5454 | 0.5253 / 0.5275 | 0.5210 / 0.5212 | 0.5570 / 0.5602 | 0.5912 / 0.5938 | 0.5667 / 0.5752 |
| visible_markdown_headers | 0.5000 / 0.5000 | 0.5055 / 0.5046 | 0.5009 / 0.5017 | 0.5002 / 0.5004 | 0.5012 / 0.5019 | 0.5002 / 0.5000 |
| visible_markdown_bold | 0.4992 / 0.4989 | 0.5012 / 0.5014 | 0.5014 / 0.5014 | 0.4998 / 0.4998 | 0.5003 / 0.4994 | 0.4998 / 0.5004 |
| visible_bold_headings | 0.4999 / 0.5000 | 0.5013 / 0.5017 | 0.5010 / 0.5017 | 0.5000 / 0.5004 | 0.5010 / 0.5004 | 0.4999 / 0.5000 |
| visible_scaffold_list | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_bold_list | 0.5000 / 0.5000 | 0.5003 / 0.5000 | 0.5002 / 0.5000 | 0.5001 / 0.5004 | 0.5009 / 0.5004 | 0.5000 / 0.5000 |
| visible_emoji_list | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_outline_list | 0.5335 / 0.5273 | 0.5540 / 0.5548 | 0.5279 / 0.5327 | 0.5706 / 0.5729 | 0.5644 / 0.5648 | 0.5516 / 0.5490 |
| visible_unicode_bold | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_hashtag_wall | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 | 0.5000 / 0.5000 |
| visible_heavy_dash | 0.4979 / 0.4981 | 0.4984 / 0.4998 | 0.4979 / 0.4981 | 0.4979 / 0.4983 | 0.4979 / 0.4981 | 0.4981 / 0.4987 |
| visible_closing_question | 0.4845 / 0.4884 | 0.5045 / 0.5088 | 0.4848 / 0.4884 | 0.5018 / 0.5017 | 0.4946 / 0.4946 | 0.4926 / 0.4990 |
| visible_hook_lines_cta | 0.4980 / 0.4981 | 0.4996 / 0.4981 | 0.4983 / 0.4985 | 0.4986 / 0.4985 | 0.4984 / 0.4993 | 0.4989 / 0.4998 |
| visible_repeated_triples | 0.5917 / 0.5812 | 0.5365 / 0.5225 | 0.5980 / 0.5748 | 0.5927 / 0.5857 | 0.5416 / 0.5308 | 0.4897 / 0.4813 |
| specifics_rate | 0.6345 / 0.6290 | 0.5569 / 0.5568 | 0.6094 / 0.6124 | 0.6200 / 0.6172 | 0.6143 / 0.6158 | 0.5889 / 0.5933 |
| no_specifics_60 | 0.5576 / 0.5488 | 0.5437 / 0.5392 | 0.5393 / 0.5359 | 0.5302 / 0.5311 | 0.5564 / 0.5613 | 0.5483 / 0.5455 |
| platitude_density | 0.5034 / 0.5048 | 0.5004 / 0.5010 | 0.5014 / 0.5027 | 0.5051 / 0.5027 | 0.5046 / 0.5050 | 0.5015 / 0.5012 |
| platitude_count | 0.5034 / 0.5048 | 0.5004 / 0.5010 | 0.5014 / 0.5027 | 0.5051 / 0.5027 | 0.5046 / 0.5050 | 0.5015 / 0.5012 |
| vague_platitude_count | 0.5007 / 0.5008 | 0.5004 / 0.5000 | 0.5002 / 0.5000 | 0.5002 / 0.5000 | 0.5008 / 0.5019 | 0.5009 / 0.5010 |
| vague_platitude_density | 0.5007 / 0.5008 | 0.5004 / 0.5000 | 0.5002 / 0.5000 | 0.5002 / 0.5000 | 0.5008 / 0.5019 | 0.5009 / 0.5010 |

## Incremental public-engine effect on RAID dev

Each rule is added individually to the untouched frozen production-engine copy, then all candidates together. Weights are fixed editorial strengths, not fitted probabilities or optimized against incremental dev outcomes. Both transition rules report identical sentence spans: when both fire, the scorer keeps the stronger one. Markdown rules share line spans, so overlapping markup on the same line competes. Exact spans go through normal protected-quote/code filtering. Absence of specifics is never standalone evidence.

| Engine | AI ≥40 / 10,800 | Recall | Recall change (pp) | Human FP / 2,354 | Human Shame FP |
| --- | --- | --- | --- | --- | --- |
| baseline | 1206 | 11.17% | +0.0000 | 29 | 26 |
| measured-structural.vague-platitude-count | 1206 | 11.17% | +0.0000 | 29 | 26 |
| measured-structural.visible-markdown-headers | 1206 | 11.17% | +0.0000 | 29 | 26 |
| measured-structural.visible-markdown-bold | 1206 | 11.17% | +0.0000 | 29 | 26 |
| measured-structural.visible-bold-headings | 1206 | 11.17% | +0.0000 | 29 | 26 |
| measured-structural.transition-share | 1209 | 11.19% | +0.0278 | 29 | 26 |
| measured-structural.transition-count | 1206 | 11.17% | +0.0000 | 29 | 26 |
| measured-structural.summary-tail | 1218 | 11.28% | +0.1111 | 29 | 26 |
| combined | 1225 | 11.34% | +0.1759 | 29 | 26 |

| Domain | Baseline AI ≥40 | Combined AI ≥40 | Change | Baseline human FP | Combined human FP |
| --- | --- | --- | --- | --- | --- |
| abstracts | 174 | 182 | 8 | 11 | 11 |
| books | 159 | 160 | 1 | 3 | 3 |
| news | 149 | 152 | 3 | 0 | 0 |
| poetry | 198 | 198 | 0 | 5 | 5 |
| recipes | 3 | 3 | 0 | 0 | 0 |
| reddit | 63 | 67 | 4 | 3 | 3 |
| reviews | 307 | 310 | 3 | 6 | 6 |
| wiki | 153 | 153 | 0 | 1 | 1 |

## Real human LinkedIn veto — false-alarm checks only

The author manifest gates the mixed JSONL source before JSON body decoding: only the 8,189 veto-author rows enter feature extraction/scoring. Holdout rows are skipped as raw bytes after author-metadata routing; their text is not decoded, copied into evaluation inputs, exposed, or scored. The 9,743-post holdout remains reserved. Data and per-row results stay in ignored paths; no passages are quoted or committed. The veto cannot fit a threshold or weight. Rejected research features below are diagnostic only; they have no implemented score contribution.

Critical format limitation: only 3/8,189 veto posts contain any newline; zero contain a blank line, literal backslash-n, or HTML br. Consequently zero observed hits for human list/emoji-bullet/hashtag-wall/heading layout is not a reliable validation of layout safety. The plain-outline candidate is excluded despite numerical RAID performance and zero observed veto hits. Literal leftover-markdown candidates stay unregistered and conditional on format-preserving human controls; their zero veto hits do not establish broad safety. `format-audit.json` records this aggregate audit.

| Engine | Human ≥40 | Rate | Additional FP | Newly flagged | Removed | Human Shame FP |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.vague-platitude-count | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.visible-markdown-headers | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.visible-markdown-bold | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.visible-bold-headings | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.transition-share | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.transition-count | 19 | 0.23% | +0 | 0 | 0 | 17 |
| measured-structural.summary-tail | 19 | 0.23% | +0 | 0 | 0 | 17 |
| combined | 19 | 0.23% | +0 | 0 | 0 | 17 |

| Feature | Veto hits / 8,189 | Hit rate | Additional engine FP | Worst author hit rates (top 3) |
| --- | --- | --- | --- | --- |
| sentence_mean | 1 | 0.01% | — (not implemented) | String Nguyen: 1/293 (0.34%) |
| sentence_cv | 0 | 0.00% | — (not implemented) | none |
| paragraph_mean | 1 | 0.01% | — (not implemented) | Julie Kliger: 1/228 (0.44%) |
| paragraph_cv | 1 | 0.01% | — (not implemented) | Julie Kliger: 1/228 (0.44%) |
| line_cv | 0 | 0.00% | — (not implemented) | none |
| sentences_per_paragraph | 3 | 0.04% | — (not implemented) | Julie Kliger: 2/228 (0.88%); Hansi Mehrotra: 1/170 (0.59%) |
| transition_share | 2 | 0.02% | 0 | Julie Kliger: 1/228 (0.44%); Justin Bariso: 1/358 (0.28%) |
| comma_rate | 46 | 0.56% | — (not implemented) | Gary Frisch: 18/46 (39.13%); 🏉 Pascal Bouvier: 9/417 (2.16%); Vikram Mansharamani: 1/61 (1.64%) |
| colon_rate | 2123 | 25.93% | — (not implemented) | Chris McCann: 33/42 (78.57%); Richard Branson: 225/296 (76.01%); Vikram Mansharamani: 42/61 (68.85%) |
| semicolon_rate | 7848 | 95.84% | — (not implemented) | Natalie Riso: 140/140 (100.00%); Russell Benaroya: 94/94 (100.00%); Gary Frisch: 46/46 (100.00%) |
| parenthesis_rate | 6166 | 75.30% | — (not implemented) | Gillian Zoe Segal: 6/6 (100.00%); Richard Branson: 283/296 (95.61%); Kaia Niambi Shivers Ph.D.: 60/63 (95.24%) |
| question_rate | 6093 | 74.40% | — (not implemented) | Gillian Zoe Segal: 6/6 (100.00%); Chris McCann: 41/42 (97.62%); Mohamed El-Erian: 1309/1352 (96.82%) |
| exclamation_rate | 1985 | 24.24% | — (not implemented) | Gillian Zoe Segal: 6/6 (100.00%); AJ Wilcox: 178/252 (70.63%); Steve Blakeman: 9/13 (69.23%) |
| emdash_rate | 7864 | 96.03% | — (not implemented) | 🏉 Pascal Bouvier: 417/417 (100.00%); AJ Wilcox: 252/252 (100.00%); Hansi Mehrotra: 170/170 (100.00%) |
| endash_rate | 8008 | 97.79% | — (not implemented) | 🏉 Pascal Bouvier: 417/417 (100.00%); Russell Benaroya: 94/94 (100.00%); Tom Foremski: 84/84 (100.00%) |
| header_share | 0 | 0.00% | — (not implemented) | none |
| bold_share | 8182 | 99.91% | — (not implemented) | Bertalan Meskó, MD, PhD: 1624/1624 (100.00%); Mohamed El-Erian: 1352/1352 (100.00%); Rachel Jones: 915/915 (100.00%) |
| numbered_share | 2 | 0.02% | — (not implemented) | Justin Bariso: 2/358 (0.56%) |
| bullet_share | 3 | 0.04% | — (not implemented) | 🏉 Pascal Bouvier: 2/417 (0.48%); Bertalan Meskó, MD, PhD: 1/1624 (0.06%) |
| list_share | 5 | 0.06% | — (not implemented) | Justin Bariso: 2/358 (0.56%); 🏉 Pascal Bouvier: 2/417 (0.48%); Bertalan Meskó, MD, PhD: 1/1624 (0.06%) |
| label_share | 250 | 3.05% | — (not implemented) | Julie Kliger: 33/228 (14.47%); Simon Owens: 2/17 (11.76%); Vikram Mansharamani: 5/61 (8.20%) |
| first_person_rate | 2239 | 27.34% | — (not implemented) | Gary Frisch: 25/46 (54.35%); Steve Blakeman: 7/13 (53.85%); Simon Owens: 9/17 (52.94%) |
| digit_rate | 42 | 0.51% | — (not implemented) | Geoffrey Garrett: 10/136 (7.35%); Ian Bremmer: 6/233 (2.58%); Mohamed El-Erian: 20/1352 (1.48%) |
| average_word_length | 482 | 5.89% | — (not implemented) | Simon Owens: 3/17 (17.65%); Rachel Jones: 145/915 (15.85%); Steve Blakeman: 2/13 (15.38%) |
| repeated_opener1 | 3 | 0.04% | — (not implemented) | String Nguyen: 1/293 (0.34%); Justin Bariso: 1/358 (0.28%); 🏉 Pascal Bouvier: 1/417 (0.24%) |
| repeated_opener2 | 6 | 0.07% | — (not implemented) | Geoffrey Garrett: 1/136 (0.74%); String Nguyen: 1/293 (0.34%); Justin Bariso: 1/358 (0.28%) |
| closing_summary | 0 | 0.00% | — (not implemented) | none |
| closing_ratio | 1 | 0.01% | — (not implemented) | Julie Kliger: 1/228 (0.44%) |
| closing_single_sentence | 2 | 0.02% | — (not implemented) | Julie Kliger: 2/228 (0.88%) |
| transition_count | 0 | 0.00% | 0 | none |
| label_count | 0 | 0.00% | — (not implemented) | none |
| bold_count | 0 | 0.00% | — (not implemented) | none |
| header_count | 0 | 0.00% | — (not implemented) | none |
| numbered_count | 0 | 0.00% | — (not implemented) | none |
| bullet_count | 0 | 0.00% | — (not implemented) | none |
| list_count | 0 | 0.00% | — (not implemented) | none |
| regular_run_cv6 | 0 | 0.00% | — (not implemented) | none |
| summary_tail | 1 | 0.01% | 0 | 🏉 Pascal Bouvier: 1/417 (0.24%) |
| visible_markdown_headers | 0 | 0.00% | 0 | none |
| visible_markdown_bold | 0 | 0.00% | 0 | none |
| visible_bold_headings | 0 | 0.00% | 0 | none |
| visible_scaffold_list | 0 | 0.00% | — (not implemented) | none |
| visible_bold_list | 0 | 0.00% | — (not implemented) | none |
| visible_emoji_list | 0 | 0.00% | — (not implemented) | none |
| visible_outline_list | 0 | 0.00% | — (not implemented) | none |
| visible_unicode_bold | 5 | 0.06% | — (not implemented) | AJ Wilcox: 5/252 (1.98%) |
| visible_hashtag_wall | 0 | 0.00% | — (not implemented) | none |
| visible_heavy_dash | 0 | 0.00% | — (not implemented) | none |
| visible_closing_question | 93 | 1.14% | — (not implemented) | Marianne Griebler: 6/59 (10.17%); Hansi Mehrotra: 8/170 (4.71%); AJ Wilcox: 8/252 (3.17%) |
| visible_hook_lines_cta | 0 | 0.00% | — (not implemented) | none |
| visible_repeated_triples | 0 | 0.00% | — (not implemented) | none |
| specifics_rate | 2362 | 28.84% | — (not implemented) | 🏉 Pascal Bouvier: 305/417 (73.14%); Marianne Griebler: 36/59 (61.02%); Bertalan Meskó, MD, PhD: 817/1624 (50.31%) |
| no_specifics_60 | 92 | 1.12% | — (not implemented) | 🏉 Pascal Bouvier: 22/417 (5.28%); Marianne Griebler: 3/59 (5.08%); Hansi Mehrotra: 6/170 (3.53%) |
| platitude_density | 40 | 0.49% | — (not implemented) | Simon Owens: 1/17 (5.88%); String Nguyen: 7/293 (2.39%); Marianne Griebler: 1/59 (1.69%) |
| platitude_count | 40 | 0.49% | — (not implemented) | Simon Owens: 1/17 (5.88%); String Nguyen: 7/293 (2.39%); Marianne Griebler: 1/59 (1.69%) |
| vague_platitude_count | 4 | 0.05% | 0 | Marianne Griebler: 1/59 (1.69%); Natalie Riso: 1/140 (0.71%); Bertalan Meskó, MD, PhD: 2/1624 (0.12%) |
| vague_platitude_density | 4 | 0.05% | — (not implemented) | Marianne Griebler: 1/59 (1.69%); Natalie Riso: 1/140 (0.71%); Bertalan Meskó, MD, PhD: 2/1624 (0.12%) |

Worst-author rates include small samples and therefore show denominators; they are diagnostics, not estimates of authorship. Engine FP contributions for implemented rules below are changes versus the frozen baseline, not feature-hit counts.

| Rule | Author | Posts | Baseline FP | Rule-added FP | New FP | FP delta |
| --- | --- | --- | --- | --- | --- | --- |
| measured-structural.vague-platitude-count | Marianne Griebler | 59 | 0 | 0 | 0 | 0 |
| measured-structural.vague-platitude-count | Natalie Riso | 140 | 0 | 0 | 0 | 0 |
| measured-structural.vague-platitude-count | Bertalan Meskó, MD, PhD | 1624 | 4 | 4 | 0 | 0 |
| measured-structural.visible-markdown-headers | none | 8189 | 19 | 19 | 0 | 0 |
| measured-structural.visible-markdown-bold | none | 8189 | 19 | 19 | 0 | 0 |
| measured-structural.visible-bold-headings | none | 8189 | 19 | 19 | 0 | 0 |
| measured-structural.transition-share | Julie Kliger | 228 | 0 | 0 | 0 | 0 |
| measured-structural.transition-share | Justin Bariso | 358 | 2 | 2 | 0 | 0 |
| measured-structural.transition-count | none | 8189 | 19 | 19 | 0 | 0 |
| measured-structural.summary-tail | 🏉 Pascal Bouvier | 417 | 0 | 0 | 0 | 0 |

## Modern AI LinkedIn — reporting only

All 120 posts are evaluated with unchanged thresholds and editorial weights: 30 prompts × four models. Even prompt IDs are the “natural and human” condition (60 posts). This set is reporting only: no fitting, candidate selection, tuning, or thresholds use these outcomes. Clean output with no obvious smells is out of scope; low recall here is acceptable.

| Engine | All /120 | Natural /60 | Ordinary /60 | claude-opus-5-5 | gemini-3.8-flash | gpt-6.1-sol | grok-4.7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.vague-platitude-count | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.visible-markdown-headers | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.visible-markdown-bold | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.visible-bold-headings | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.transition-share | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.transition-count | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| measured-structural.summary-tail | 5 | 1 | 4 | 2 | 2 | 0 | 1 |
| combined | 5 | 1 | 4 | 2 | 2 | 0 | 1 |

| Feature | All hits /120 | Natural /60 | Ordinary /60 | claude-opus-5-5 /30 | gemini-3.8-flash /30 | gpt-6.1-sol /30 | grok-4.7 /30 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sentence_cv | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph_mean | 87 | 49 | 38 | 29 | 27 | 9 | 22 |
| paragraph_cv | 87 | 49 | 38 | 29 | 27 | 9 | 22 |
| line_cv | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sentences_per_paragraph | 120 | 60 | 60 | 30 | 30 | 30 | 30 |
| transition_share | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| comma_rate | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| colon_rate | 14 | 2 | 12 | 5 | 7 | 2 | 0 |
| semicolon_rate | 113 | 53 | 60 | 30 | 24 | 29 | 30 |
| parenthesis_rate | 104 | 51 | 53 | 21 | 23 | 30 | 30 |
| question_rate | 86 | 44 | 42 | 15 | 18 | 24 | 29 |
| exclamation_rate | 31 | 6 | 25 | 9 | 14 | 8 | 0 |
| emdash_rate | 108 | 54 | 54 | 30 | 23 | 25 | 30 |
| endash_rate | 117 | 59 | 58 | 30 | 27 | 30 | 30 |
| header_share | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bold_share | 120 | 60 | 60 | 30 | 30 | 30 | 30 |
| numbered_share | 17 | 10 | 7 | 3 | 12 | 1 | 1 |
| bullet_share | 23 | 10 | 13 | 6 | 14 | 3 | 0 |
| list_share | 39 | 19 | 20 | 9 | 25 | 4 | 1 |
| label_share | 2 | 2 | 0 | 0 | 0 | 1 | 1 |
| first_person_rate | 7 | 5 | 2 | 0 | 4 | 2 | 1 |
| digit_rate | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| average_word_length | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| repeated_opener1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| repeated_opener2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| closing_summary | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| closing_ratio | 87 | 49 | 38 | 29 | 27 | 9 | 22 |
| closing_single_sentence | 9 | 5 | 4 | 0 | 4 | 4 | 1 |
| transition_count | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| label_count | 4 | 3 | 1 | 0 | 2 | 1 | 1 |
| bold_count | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| header_count | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| numbered_count | 17 | 10 | 7 | 3 | 12 | 1 | 1 |
| bullet_count | 23 | 10 | 13 | 6 | 14 | 3 | 0 |
| list_count | 39 | 19 | 20 | 9 | 25 | 4 | 1 |
| regular_run_cv6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| summary_tail | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_markdown_headers | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_markdown_bold | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_bold_headings | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_scaffold_list | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| visible_bold_list | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_emoji_list | 5 | 0 | 5 | 4 | 1 | 0 | 0 |
| visible_outline_list | 38 | 18 | 20 | 9 | 24 | 4 | 1 |
| visible_unicode_bold | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_hashtag_wall | 9 | 0 | 9 | 1 | 8 | 0 | 0 |
| visible_heavy_dash | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_closing_question | 7 | 5 | 2 | 5 | 2 | 0 | 0 |
| visible_hook_lines_cta | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_repeated_triples | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| specifics_rate | 102 | 56 | 46 | 24 | 18 | 30 | 30 |
| no_specifics_60 | 17 | 8 | 9 | 0 | 0 | 11 | 6 |
| platitude_density | 5 | 2 | 3 | 2 | 1 | 1 | 1 |
| platitude_count | 5 | 2 | 3 | 2 | 1 | 1 | 1 |
| vague_platitude_count | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| vague_platitude_density | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Lazy-prompt cheap-model LinkedIn — reporting/validation only

This is the closest available target proxy: lazy social-post prompts answered by inexpensive model/effort configurations. Parameters remain frozen from train. File membership is evaluated as present at run time, including Sol if available; denominators below are authoritative. No output passage is quoted. Model capability and prompt laziness are not verified labels of whether a person edited a post.

| Model / effort | Posts | Baseline ≥40 | Pack ≥40 | Change |
| --- | --- | --- | --- | --- |
| gemini-3.8-flash / medium | 30 | 8 | 8 | 0 |
| gpt-5.6-luna / low | 30 | 1 | 1 | 0 |
| gpt-6-luna / low | 30 | 2 | 2 | 0 |
| gpt-6-luna / medium | 30 | 0 | 0 | 0 |
| gpt-6.1-sol / low | 30 | 0 | 0 | 0 |

| Feature | All hits /150 | gemini-3.8-flash / medium /30 | gpt-5.6-luna / low /30 | gpt-6-luna / low /30 | gpt-6-luna / medium /30 | gpt-6.1-sol / low /30 |
| --- | --- | --- | --- | --- | --- | --- |
| sentence_mean | 0 | 0 | 0 | 0 | 0 | 0 |
| sentence_cv | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph_mean | 24 | 24 | 0 | 0 | 0 | 0 |
| paragraph_cv | 24 | 24 | 0 | 0 | 0 | 0 |
| line_cv | 0 | 0 | 0 | 0 | 0 | 0 |
| sentences_per_paragraph | 149 | 30 | 30 | 30 | 29 | 30 |
| transition_share | 0 | 0 | 0 | 0 | 0 | 0 |
| comma_rate | 0 | 0 | 0 | 0 | 0 | 0 |
| colon_rate | 35 | 7 | 6 | 9 | 6 | 7 |
| semicolon_rate | 140 | 23 | 30 | 29 | 28 | 30 |
| parenthesis_rate | 149 | 29 | 30 | 30 | 30 | 30 |
| question_rate | 66 | 6 | 27 | 7 | 19 | 7 |
| exclamation_rate | 14 | 7 | 0 | 2 | 0 | 5 |
| emdash_rate | 120 | 18 | 27 | 22 | 27 | 26 |
| endash_rate | 150 | 30 | 30 | 30 | 30 | 30 |
| header_share | 0 | 0 | 0 | 0 | 0 | 0 |
| bold_share | 150 | 30 | 30 | 30 | 30 | 30 |
| numbered_share | 17 | 16 | 0 | 0 | 0 | 1 |
| bullet_share | 20 | 12 | 0 | 0 | 0 | 8 |
| list_share | 33 | 24 | 0 | 0 | 0 | 9 |
| label_share | 15 | 0 | 5 | 4 | 6 | 0 |
| first_person_rate | 78 | 14 | 17 | 17 | 17 | 13 |
| digit_rate | 0 | 0 | 0 | 0 | 0 | 0 |
| average_word_length | 0 | 0 | 0 | 0 | 0 | 0 |
| repeated_opener1 | 0 | 0 | 0 | 0 | 0 | 0 |
| repeated_opener2 | 0 | 0 | 0 | 0 | 0 | 0 |
| closing_summary | 0 | 0 | 0 | 0 | 0 | 0 |
| closing_ratio | 24 | 24 | 0 | 0 | 0 | 0 |
| closing_single_sentence | 7 | 2 | 2 | 0 | 3 | 0 |
| transition_count | 0 | 0 | 0 | 0 | 0 | 0 |
| label_count | 3 | 1 | 1 | 0 | 0 | 1 |
| bold_count | 0 | 0 | 0 | 0 | 0 | 0 |
| header_count | 0 | 0 | 0 | 0 | 0 | 0 |
| numbered_count | 17 | 16 | 0 | 0 | 0 | 1 |
| bullet_count | 20 | 12 | 0 | 0 | 0 | 8 |
| list_count | 33 | 24 | 0 | 0 | 0 | 9 |
| regular_run_cv6 | 0 | 0 | 0 | 0 | 0 | 0 |
| summary_tail | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_markdown_headers | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_markdown_bold | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_bold_headings | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_scaffold_list | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_bold_list | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_emoji_list | 4 | 4 | 0 | 0 | 0 | 0 |
| visible_outline_list | 33 | 24 | 0 | 0 | 0 | 9 |
| visible_unicode_bold | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_hashtag_wall | 8 | 8 | 0 | 0 | 0 | 0 |
| visible_heavy_dash | 0 | 0 | 0 | 0 | 0 | 0 |
| visible_closing_question | 64 | 17 | 1 | 18 | 7 | 21 |
| visible_hook_lines_cta | 4 | 1 | 0 | 0 | 0 | 3 |
| visible_repeated_triples | 0 | 0 | 0 | 0 | 0 | 0 |
| specifics_rate | 137 | 19 | 28 | 30 | 30 | 30 |
| no_specifics_60 | 22 | 1 | 0 | 1 | 2 | 18 |
| platitude_density | 7 | 3 | 0 | 2 | 1 | 1 |
| platitude_count | 7 | 3 | 0 | 2 | 1 | 1 |
| vague_platitude_count | 4 | 1 | 0 | 1 | 1 | 1 |
| vague_platitude_density | 4 | 1 | 0 | 1 | 1 | 1 |

## Concreteness diagnostics

| Set | Mean specifics markers /100 words | No-specifics 60–300-word hits | Platitude count ≥1 hits | Specific-free platitude hits |
| --- | --- | --- | --- | --- |
| LinkedIn human veto | 13.5610 | 92 | 40 | 4 |
| Modern AI | 3.5090 | 17 | 5 | 0 |
| Low-effort AI | 1.9780 | 22 | 7 | 4 |

“No specifics in 60–300 words” alone hits 288/7,166 train and 90/2,354 dev humans and is rejected as positive evidence. Low specificity at its unconstrained optimum hits 2,821 train and 918 dev humans. The positive conjunction—an explicit platitude and zero specificity markers in 40–300 words—hits 38 train AI/1 human and 16 dev AI/0 humans. The UI can show the platitude snippet; missing specifics only amplifies that visible tell. The pattern dictionary is fixed, small and allocation-light; it does not claim semantic event extraction.

## Why short posts stop at 39; score proposals only

With K=12, six counted evidence points produce round(100×(1−exp(−6/12))) = 39. The saturating curve, not a short-post penalty, creates the boundary. A closing question or hashtag pair can add nothing when its existing rule does not fire or needs a larger cluster. Weak unsupported typography cannot bypass the existing style support cap. Style alone still tops out at 39. `score.ts` is untouched.

Two fixed proposals were evaluated without fitting on generated output: A uses K=11.5 for 40–79 words with ≥3 counted phrase points; B adds at most 0.25 supported style points only to a 40–79-word score-39 post with ≥4 phrase points and a final prose question or ≥2 hashtags. Both preserve the independent phrase-support limit and cannot promote style alone. B’s additional style budget is min(0.25, phrase−already-counted-style).

| Set | Rows | Short score39 | Short39 with ≥6 phrase points | Baseline TP / FP | A: density TP / FP | A new human FP | B: corroborated TP / FP | B new human FP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| train | 35966 | 9 | 6 | 3286 / 79 | 3295 / 79 | 0 | 3286 / 79 | 0 |
| dev | 13154 | 4 | 2 | 1206 / 29 | 1210 / 29 | 0 | 1207 / 29 | 0 |
| veto | 8189 | 19 | 7 | 0 / 19 | 0 / 36 | 17 | 0 / 22 | 3 |
| loweffort | 150 | 15 | 15 | 11 / 0 | 26 / 0 | 0 | 16 / 0 | 0 |
| modern | 120 | 0 | 0 | 5 / 0 | 5 / 0 | 0 | 5 / 0 | 0 |

| train human domain | Baseline FP | A FP | B FP |
| --- | --- | --- | --- |
| abstracts | 17 | 17 | 17 |
| books | 8 | 8 | 8 |
| news | 5 | 5 | 5 |
| poetry | 3 | 3 | 3 |
| recipes | 1 | 1 | 1 |
| reddit | 5 | 5 | 5 |
| reviews | 30 | 30 | 30 |
| wiki | 10 | 10 | 10 |

| dev human domain | Baseline FP | A FP | B FP |
| --- | --- | --- | --- |
| abstracts | 11 | 11 | 11 |
| books | 3 | 3 | 3 |
| news | 0 | 0 | 0 |
| poetry | 5 | 5 | 5 |
| recipes | 0 | 0 | 0 |
| reddit | 3 | 3 | 3 |
| reviews | 6 | 6 | 6 |
| wiki | 1 | 1 | 1 |

| Low-effort model / effort | Short39 | Baseline ≥40 | A ≥40 | B ≥40 |
| --- | --- | --- | --- | --- |
| gemini-3.8-flash / medium | 0 | 8 | 8 | 8 |
| gpt-5.6-luna / low | 7 | 1 | 8 | 1 |
| gpt-6-luna / low | 5 | 2 | 7 | 7 |
| gpt-6-luna / medium | 3 | 0 | 3 | 0 |
| gpt-6.1-sol / low | 0 | 0 | 0 | 0 |

| Veto author with added FP | Posts | A new FP | B new FP |
| --- | --- | --- | --- |
| Mohamed El-Erian | 1352 | 5 | 1 |
| Bertalan Meskó, MD, PhD | 1624 | 3 | 1 |
| Andrew Yang | 143 | 2 | 0 |
| 🏉 Pascal Bouvier | 417 | 2 | 0 |
| Glenn Leibowitz | 207 | 1 | 0 |
| Ian Bremmer | 233 | 1 | 0 |
| Julie Kliger | 228 | 1 | 0 |
| Justin Bariso | 358 | 1 | 1 |
| Kevin O'Leary | 252 | 1 | 0 |

A: short-density adjustment: reject as proposed; adds 17 human false alarms across train/dev/veto.
B: small corroboration bonus: reject as proposed; adds 3 human false alarms across train/dev/veto.

## Performance and verification

Warmed v26.7.0; 200 distinct dev inputs (100 human/100 chat), each exactly 300 engine tokens. 3,000 warmups per engine, then 11 alternating-order rounds of 1,000 calls. Direct pack timing uses freshly built context keys each round, so repeated WeakMap cache hits do not masquerade as feature extraction. Context construction is outside direct-pack timing; full-engine paired deltas include construction and scoring. Shared-machine noise can make a paired delta negative.

| Measurement | Mean ms/post | Median round ms/post | Worst round mean ms/post |
| --- | --- | --- | --- |
| Pack on fresh contexts | 0.01240594 | 0.01233300 | 0.01288283 |
| Frozen production engine | 0.34744873 | 0.34762338 | 0.35052213 |
| Engine + all rules | 0.36169778 | 0.35911996 | 0.37220796 |
| Paired full-engine increase | 0.01424906 | 0.01376013 | 0.02516596 |

The pack passes the <0.05 ms added mean budget. The detectors share one linear scan with precompiled regexes, reuse sentence word counts/spans, and use a WeakMap keyed by the temporary context. No text re-splitting, lowercasing, DOM, network or dependency is added. Complexity is O(text + sentences); transient span arrays are linear in transition occurrences, examples capped at three.

Targeted TypeScript check passes. Verification covers runtime/extractor parity on all 49,120 train/dev rows; no train/dev source overlap; exact dev baseline parity; style-only score <40/no Shame; overlap deduplication; protected-code suppression; empty/short negatives; Unicode lowercase expansion; unchanged hashes for all 26 baseline source files. This proposal does not alter production behavior, so no UI/e2e work is required.

## Reproduction

Run from repository root. One heavy command at a time; no network or browser is needed. Train fit must precede dev validation. Subsequent LinkedIn commands are veto/reporting only and must not be fed into fitting.

```bash
node eval/hillclimb/structural/extract.mjs train
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py fit
node eval/hillclimb/structural/extract.mjs dev
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py validate
node eval/hillclimb/structural/extract.mjs train visible
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py fit --visible
node eval/hillclimb/structural/extract.mjs dev visible
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py validate --visible
node eval/hillclimb/structural/extract.mjs train specifics
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py fit --specifics
node eval/hillclimb/structural/extract.mjs dev specifics
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python3 eval/hillclimb/structural/analyze.py validate --specifics
node eval/hillclimb/structural/evaluate.mjs
node node_modules/typescript/bin/tsc -p eval/hillclimb/structural/tsconfig.json
node eval/hillclimb/structural/verify.mjs
node --expose-gc eval/hillclimb/structural/benchmark.mjs
python3 eval/hillclimb/structural/veto_gate.py
node eval/hillclimb/structural/linkedin.mjs
node eval/hillclimb/structural/short-proposals.mjs
python3 eval/hillclimb/structural/report.py
```

Research and aggregate artifacts are in `eval/hillclimb/structural/`; `results.json`, `visible-results.json`, and `specifics-results.json` include exact counts, oriented and observed-only AUCs for every domain/model. The exported fitting rows are `data/eval/raw/hillclimb/structural-features-{train,dev}.jsonl`, keyed by original `id` and `source_id`. Each row contains raw `features`, frozen `threshold_hits`, and candidate custom-rule `hits` tuples `[ruleId, scale, exactSpans, once, activeAfterProtection]`. Rule metadata/weights/evidence are in `rules.json`. They exclude base models, LinkedIn veto humans and all generated external AI. Never mistake rejected threshold-hit columns for approved positive-evidence rules. Per-row outputs, scratch engines, and all source text remain gitignored. No commit is made.

