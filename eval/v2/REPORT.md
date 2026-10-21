# Scoring v2 — frozen evaluation and handoff

**DO NOT SHIP v2 over round 2.** The locked comparison fails the owner’s required recall improvements. All five required human-control FP counts improve or tie, and good-AI panel-none remains 0/77. There was no tuning after the frozen final evaluation. The existing installation was not changed.

| Check at index ≥40 | Shipped round 2 | Frozen v2 |
|---|---:|---:|
| Target holdout, all | 51/160 | 18/160 |
| Target holdout, obvious | 49/106 | 18/106 |
| Target holdout, some | 2/53 | 0/53 |
| Fresh cheap-model prompts | 61/351 | 7/351 |
| LinkedIn holdout false alarms | 43/9743 | 38/9743 |
| Formatted Wayback false alarms | 2/410 | 1/410 |
| RAID test false alarms | 24/2342 | 7/2342 |
| External human false alarms | 13/1351 | 6/1351 |
| Held-back polished-light false alarms | 0/80 | 0/80 |
| Strong-model good AI, panel none | 0/77 | 0/77 |
| Strong-model panel obvious caught | 20/68 | 18/68 |
| Strong-model panel some flagged | 10/65 | 5/65 |

**Why it fails.** Each habit family has a cap of 1.5 evidence units; the calibrated threshold is 3.637338348115496. Two saturated habit families can provide at most 3 units, so ordinary habit-only posts effectively need at least three families. Length adjustment, bundling and strongly shrunk dictionary habits leave far fewer obvious slop posts over the boundary. The dictionaries add no target/fresh flags in this frozen model; their zero-human-hit gun promotion generalizes poorly to the LinkedIn holdout. Removing dictionary guns drops LinkedIn holdout FP from 38 to 5. These observations are audit findings, not permission to retune on the holdout.

**Threshold and uncertainty.** The post-level one-sided 95% Clopper–Pearson requirement on the 8,189-row LinkedIn veto half permits at most **3 hits**. V2 has 3, with upper bound **0.0946563%**, below 0.1%. The 9,743-row independent LinkedIn holdout has 38 flags; its upper bound is 0.5109%. Thus the threshold does not establish the proposed 0.1% bound on new LinkedIn posts.

Polished-light was split by original id, keeping both model variants together: 80 fitting rows/40 originals and 80 audit rows/40 originals. Both halves have zero v2 flags. Even zero out of 80 gives an upper bound of **3.6754%**, so the requested ≤2% statistical bound cannot be established without more independent controls. Good-AI none is 0/77; its corresponding upper bound is 3.8159%. Multiple posts/variants share authors or prompts, so the post-level CP calculation assumes more independence than these corpora fully provide. Cluster bootstrap intervals and group counts are retained in audit.json.

**Data boundaries and one-shot evidence.** Round 2 was snapshotted before any changes in `data/eval/raw/v2/engine-r2`. Its measured target/fresh/human counts reproduce the owner’s shipped baseline. Hash: `e33028e19032921ae7c4e3b7b4714ed010b7f86a8b70658e68d311f90535b6db`. Frozen v2 hash: `83be54ab0db0bd46f287537ef037aeba42f49f9582639b13487856109fe38316`. Baseline/final input receipts are identical. Each ran once, protected by ignored lock receipts. Final sets, fresh prompts and all 210 effortful-prompt posts were first accessed for this final comparison; none fitted weights, base rates or the threshold.

Only target tune (290 rows, obvious=1, some=.5), RAID human train (7,166 windows), permissive humans (267 windows) and polished fitting half supplied the objective. Entire polished original groups were excluded from RAID fitting. Human base rates use RAID train and permissive humans only; exact Google Books 2000–2019 unigram rates supersede pooled rates for 2,777 dictionary entries. Gamma smoothing uses .5 pseudo-count; post predicates use three length buckets. Negative objective mass is 8× target mass; polished fitting examples receive 5× their corresponding negative weight. Length reweighting uses target-tune lengths only.

LinkedIn veto and the initial 300 formatted Wayback controls supplied entry-level gun checks and threshold validation only. They never estimated base rates or logistic coefficients. Wayback grew to **410** before the locked evaluations; the additional 110 rows were final-only, and both engines scored exactly the same 410. Synthetic human/mixed/context controls (56) demoted individual false guns, including AI-engineering prose, ordinary Markdown headings and a human booking offer.

**Architecture and learning.** Counts survive example protection, lexical overlap, list/CTA/cadence bundling, and length expectation before `phi=max(0,log1p(c)-log1p(m))`. Family evidence is `C*(1-exp(-sum(w*phi)/C))`. Vocabulary cannot supply a gate witness. Eligible posts require one validated gun or at least two habit families; style alone cannot permit Shame. The public synchronous `analyzePost` and `SlopReport` shapes and signal labels remain intact. Labels can move to the winning dictionary rule when duplicate wording is bundled.

The false-positive-weighted capped logistic MAP fit is nonnegative and shrinks first-party coefficients toward round-2 priors. Dictionary habits/vocabulary have a family/source multiplier times their curated prior plus a heavily penalized entry deviation. Guns keep individual coefficients. Two predeclared shrinkage settings (1 and 4) used five prompt/original-group folds; 4 was selected in the final fit. L-BFGS-B converged. The fitted intercept is an offline optimization parameter, not an AI probability in the badge. Individual validated-gun lower bounds were projected after threshold selection so a gun reaches 40 alone through 600 words; these guns have zero calibration-negative hits, so the projection cannot change veto FP. Explicit historical fingerprints keep the 80 floor and eight-word action guard.

**Families and weights.** Every habit family below uses cap **1.5** (0.4124× threshold); each validated gun uses its own cap **12** and coefficient. Exact per-entry coefficients, priors, base rates, tiers, corpus hit counts and shipping decisions are in entry-table.json; optimized family/source multipliers are in fit.json; projected lower bounds are in gun-constraint.json.

| Family/source multiplier | Learned value |
|---|---:|
| ai-vocabulary / kobak | 0.025000 |
| ai-vocabulary / mined | 0.694758 |
| ai-vocabulary / paech-sampler | 0.945384 |
| ai-vocabulary / slop-radar | 0.667620 |
| ai-vocabulary / vale-ai-tells | 0.953715 |
| ai-vocabulary / zeroslop | 0.977589 |
| chatbot-leak / zeroslop | 0.916952 |
| engagement / mined | 0.748230 |
| engagement / vale-ai-tells | 0.949749 |
| engagement / zeroslop | 1.000707 |
| engagement-bait / slop-radar | 1.000707 |
| engagement-bait / vale-ai-tells | 0.999966 |
| engagement-bait / zeroslop | 0.999998 |
| hedging / mined | 0.549266 |
| hedging / slop-radar | 0.484024 |
| hedging / vale-ai-tells | 0.901555 |
| hedging / zeroslop | 0.956150 |
| inflation / mined | 0.835396 |
| inflation / slop-radar | 0.680827 |
| inflation / vale-ai-tells | 0.982061 |
| inflation / zeroslop | 0.993683 |
| list-structure / kobak | 0.990805 |
| list-structure / paech-essays | 0.999999 |
| list-structure / paech-sampler | 0.997328 |
| list-structure / slop-radar | 0.998925 |
| list-structure / zeroslop | 0.999932 |
| negation-pivot / mined | 0.029087 |
| negation-pivot / vale-ai-tells | 0.948348 |
| negation-pivot / zeroslop | 0.997166 |
| presentation / zeroslop | 0.320835 |
| template-phrases / mined | 0.969793 |
| template-phrases / paech-sampler | 0.984277 |
| template-phrases / slop-radar | 0.974739 |
| template-phrases / zeroslop | 0.992558 |

| First-party rule | Tier | Final coefficient |
|---|---|---:|
| ai-vocabulary.explainer-idioms | habit | 0.17400149 |
| ai-vocabulary.tier1 | vocabulary | 0.45001496 |
| ai-vocabulary.tier1-common | vocabulary | 0.17997295 |
| ai-vocabulary.collocations | habit | 2.7999839 |
| ai-vocabulary.tier2 | vocabulary | 0.15 |
| ai-vocabulary.tier3 | vocabulary | 0.22484153 |
| template-phrases.explainer-scaffold | habit | 2.1 |
| template-phrases.labeled-fields | habit | 0.7 |
| template-phrases.transition | habit | 1.0494841 |
| template-phrases.clarity | habit | 0.69967538 |
| template-phrases.filler | habit | 2.0990007 |
| template-phrases.lets-construction | habit | 1.4 |
| template-phrases.template | habit | 2.1 |
| template-phrases.boilerplate | habit | 1.3999774 |
| chatbot-leak.greeting | habit | 1.4 |
| chatbot-leak.assistant-preamble | gun | 9.8 |
| chatbot-leak.sycophantic | habit | 3.5 |
| chatbot-leak.assistant-closer | habit | 5.6 |
| chatbot-leak.cutoff | gun | 9.8 |
| chatbot-leak.model-identity | gun | 9.8 |
| chatbot-leak.update | habit | 2.1 |
| chatbot-leak.reasoning | habit | 5.6 |
| chatbot-leak.reasoning-block | gun | 9.8 |
| chatbot-leak.reasoning-channel | gun | 9.8 |
| chatbot-leak.instruction-template | gun | 9.8 |
| chatbot-leak.chat-protocol | gun | 9.8 |
| chatbot-leak.role-transcript | gun | 9.8 |
| chatbot-leak.tool-transcript | gun | 9.8 |
| chatbot-leak.generated-boundary | gun | 9.8 |
| chatbot-leak.acknowledgment | habit | 2.1000079 |
| chatbot-leak.placeholder | habit | 3.5000857 |
| chatbot-leak.editor-note | habit | 2.8 |
| chatbot-leak.tracking | habit | 2.8 |
| chatbot-leak.citation | gun | 9.8 |
| negation-pivot.not-x-but-y | habit | 2.8004176 |
| negation-pivot.one-size-fits-all | habit | 1.4 |
| negation-pivot.audience-contrast | habit | 2.8 |
| negation-pivot.not-only | habit | 2.0976257 |
| negation-pivot.countdown | habit | 3.5 |
| negation-pivot.false-concession | habit | 1.4 |
| inflation.significance | habit | 2.8 |
| inflation.novelty | habit | 2.1 |
| inflation.hollow | habit | 0.69767021 |
| inflation.emotional-flatline | habit | 1.4000215 |
| inflation.lingering-attention | habit | 1.4 |
| inflation.real-actual | habit | 1.4 |
| inflation.future-narrative | habit | 2.8 |
| inflation.promotional | habit | 1.3997714 |
| hedging.stack | habit | 2.7998613 |
| hedging.parenthetical | habit | 0.17496144 |
| hedging.vague-attribution | habit | 1.3999965 |
| hedging.confidence | habit | 0.69562847 |
| engagement-bait.repost-follow | habit | 0.7 |
| engagement-bait.reader-question | habit | 0.7 |
| engagement-bait.social-closer | habit | 0.7 |
| engagement-bait.keyword-closer | habit | 0.7 |
| engagement-bait.rhetorical-question | habit | 1.3999408 |
| engagement-bait.formulaic-opener | habit | 0.17499123 |
| engagement-bait.speculative-opener | habit | 2.8 |
| engagement-bait.generic-conclusion | habit | 2.1 |
| formatting.em-dash | habit | 0.7 |
| formatting.unicode-bold | habit | 0.7 |
| formatting.section-outline | habit | 0.7 |
| formatting.arrow-chain | habit | 1.4 |
| formatting.emoji-bullets | habit | 0.7 |
| formatting.emoji-density | habit | 0.7 |
| formatting.hashtag-stuff | habit | 0.7 |
| formatting.bullet-np-list | habit | 0.7 |
| formatting.title-case-header | habit | 0.7 |
| formatting.smart-punct-signature | habit | 1.0499787 |
| robotic-rhythm.parallel-pair | habit | 2.8 |
| robotic-rhythm.uniformity | habit | 2.8038702 |
| robotic-rhythm.rule-of-three | habit | 1.0206475 |
| robotic-rhythm.cross-para-burstiness | habit | 2.1006176 |
| robotic-rhythm.punct-distribution | habit | 1.4 |
| bypass-tricks.homoglyphs | habit | 2.1 |
| bypass-tricks.zero-width | habit | 2.1 |
| pasted-output.template-labels | gun | 8.4000079 |
| pasted-output.unfilled-slot | gun | 6.2759253 |
| pasted-output.markdown-bold | habit | 3.1501105 |
| pasted-output.markdown-heading | habit | 3.15 |
| pasted-output.asterisk-list | habit | 0.7 |
| pasted-output.labeled-list | habit | 0.7 |
| pasted-output.closing-question | habit | 0.7 |
| pasted-output.audience-callout | habit | 0.7 |
| pasted-output.aphorism-tail | habit | 0.7 |
| pasted-output.imperative-triplet | habit | 1.5751205 |
| pasted-output.fragment-triplet | habit | 0.17210527 |
| pasted-output.repeated-openings | habit | 0.70074534 |
| pasted-output.listicle-hook | habit | 0.7 |
| pasted-output.story-turn | habit | 0.7 |
| pasted-output.lesson-formula | habit | 0.7 |
| pasted-output.motivational-stock | habit | 0.7 |
| pasted-output.takeaway-label | habit | 0.7 |
| pasted-output.save-cta | habit | 0.7 |
| pasted-output.keyword-request | habit | 0.7 |
| pasted-output.stat-hook | habit | 0.7 |
| pasted-output.possible-draft | gun | 8.4 |
| pasted-output.assistant-offer | habit | 2.8 |
| pasted-output.live-search-disclaimer | gun | 8.4 |
| pasted-output.writing-advice | habit | 5.6000933 |
| pasted-output.sure-opener | habit | 1.3998302 |
| pasted-output.title-label | habit | 0.7 |

**Dictionary inventory and pruning.** All 9,107 canonical candidates participated: 8,865 literals and 242 bounded regexes, including restored editorial drops and all 227 mined lexical candidates. Some matcher origins overlap sources; the following counts use the canonical owner source, so they sum without double-counting. All 9,107 fitted weights remain positive. **Zero entries were pruned**: unseen entries retain a shrunken positive source prior as requested. No whole source or category was removed. Full origin mappings are in dictionary-entries.json.

| Canonical owner | Candidates / shipped | Guns | Habits | Vocabulary |
|---|---:|---:|---:|---:|
| zeroslop | 2957 / 2957 | 16 | 2853 | 88 |
| paech-essays | 3638 / 3638 | 0 | 2197 | 1441 |
| vale-ai-tells | 829 / 829 | 6 | 741 | 82 |
| kobak | 735 / 735 | 0 | 0 | 735 |
| mined | 227 / 227 | 1 | 155 | 71 |
| paech-sampler | 485 / 485 | 0 | 83 | 402 |
| slop-radar | 236 / 236 | 9 | 191 | 36 |

**Gun validation, entry by entry.** This includes first-party and dictionary guns. All listed counts are raw direct hits after protected-example handling, before competition with other rules. Each count column identifies a distinct check/fitting corpus; zero observations are not proof that a phrase cannot be written by a human. Curator gun candidates demoted on actual human hits remain habits/vocabulary in entry-table.json.

| Rule | Final weight | RAID train | Permissive | Polished fit | RAID dev | LI veto | Wayback 300 | Context |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| chatbot-leak.assistant-preamble | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.cutoff | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.model-identity | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.reasoning-block | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.reasoning-channel | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.instruction-template | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.chat-protocol | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.role-transcript | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.tool-transcript | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.generated-boundary | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chatbot-leak.citation | 9.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pasted-output.template-labels | 8.4000079 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pasted-output.unfilled-slot | 6.2759253 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pasted-output.possible-draft | 8.4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pasted-output.live-search-disclaimer | 8.4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-002db2f36507ce7f | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-1872777bd6fa9310 | 6.2759253 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-1875f1dad74e0950 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-1c981a333a1be3a6 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-286f16a928627671 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-2a2b8fc9aefd5d3c | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-2b60c57bf8123dea | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-2c84fc7592c8f689 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-485ec8cca2f85cb8 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-679aa5130ae46319 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-883ac5aab898a8ae | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-8d0b8b9cfc10e292 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-908aff7a77f39600 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-930d4c0ce3a3302e | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-969f7581b2d8edc2 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-9c06686e0719b6ff | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-a7e5c92ca47c6731 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-b10f8cffbdbd1425 | 7.000291 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-b15eade32f5647a6 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-bb9d44422e558cbb | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-c3af87d79d2e1335 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-c44317e46c77ea33 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-d68639325cdfce0a | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-d8fab524872d849e | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-dbd3c236dd7a5000 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-e0202b0185dce320 | 6.2759253 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-e0b4a09b3b9c5058 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-e0c7c126bdc629a3 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-e8d0de5334677686 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-e8eae66866fe11ce | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-f8866fbca2846b61 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dictionaries.entry-f925587d61925333 | 6.2534951 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Frozen dictionary ablations, no retraining or threshold changes.** Values below are target catches or human false alarms; external uses humans only. Removing rules also recomputes span competition and the gate. Detailed family ablations are in ablations.json.

| Set | Full v2 | Without all dictionaries | Without dictionary guns | Without dictionary habits | Without dictionary vocabulary |
|---|---:|---:|---:|---:|---:|
| targetHoldout | 18 | 18 | 18 | 18 | 18 |
| fresh | 7 | 7 | 7 | 7 | 7 |
| linkedinHoldout | 38 | 0 | 5 | 33 | 35 |
| wayback | 1 | 0 | 1 | 0 | 1 |
| raidTest | 7 | 0 | 6 | 1 | 6 |
| external | 6 | 0 | 3 | 3 | 4 |
| polishedAudit | 0 | 0 | 0 | 0 | 0 |

**Top 50 dictionary contributions on locked target holdout plus fresh.** These are dictionary phrases/patterns, not quoted human posts. Contributions are summed displayed index points. Full records are in dictionary-top50.json.

| Rule | Source | Tier | Target hits | Total target points | Matcher |
|---|---|---|---:|---:|---|
| dictionaries.entry-a838fde5676e794c | slop-radar | habit | 111 | 490.261 | the takeaway |
| dictionaries.entry-b10f8cffbdbd1425 | zeroslop | gun | 11 | 465.458 | \[(?:first name\|your name\|company(?: name)?\|name\|date\|recipient\|sender\|topic\|subject\|salutation\|closing\|position\|department\|project name\|insert[^\]]{0,80}\|fill in[^\]]{0,80}\|add[^\]]{0,80}\|todo[^\]]{0,80}\|tbd[^\]]{0,80})\] |
| dictionaries.entry-bd78b132900a9ae5 | mined | vocabulary | 113 | 90.410 | 3. |
| dictionaries.entry-31c839a63fbe575d | zeroslop | habit | 17 | 89.511 | \b(?:is\|are\|was\|were)(?:n(?:'\|')t\| not) (?:just \|really \|only )?about [\w ''-]{2,40}[.,;:\u2014\u2013-]{1,80}[ \t]{0,8}(?:it\|this\|that\|they)(?:(?:(?:'\|'))s\|(?:(?:'\|'))re\| is\| are\| was\| were)(?: about)?\b |
| dictionaries.entry-f833b4e4991eaf67 | mined | vocabulary | 115 | 86.904 | 2. |
| dictionaries.entry-1899e226c4f9c0d1 | zeroslop | habit | 17 | 77.465 | \b(?:agree\?\|thoughts\?\|what(?:(?:'\|')s\| is) your (?:take\|experience)\|drop a comment\|let me know in the comments\|share this with\|share if you\|tag someone\|repost if\|follow (?:me\|for more)\|sound off in\|save this post\|bookmark this\|link in (?:bio\|the )?(?:first )?comments?\|dm me\b\|comment ["“']?\w{1,15}["”']? (?:below )?and i(?:'\|')ll\|my dms are (?:always )?open\|what about you\?)\b |
| dictionaries.entry-c4a7625be9af4343 | zeroslop | habit | 7 | 61.146 | \b(?:game.?chang(?:er\|ing)\|paradigm shift\|cutting.?edge\|state-of-the-art\|best-in-class\|world-class\|next-level\|seamless(?:ly)?\|frictionless\|turnkey\|synergy\|supercharge\|revolutioniz\w{1,32}\|transformative\|disruptive innovation)\b |
| dictionaries.entry-d1dbf1ea8bb732ba | zeroslop | habit | 6 | 52.134 | \b(?:make no mistake\|make it count\|and (?:honestly\|frankly)\?\|the result\?\|the outcome\?\|spoiler(?: alert)?:)\|(?:^\|\. \|\n)Honestly\?  |
| dictionaries.entry-82f535074b94a745 | vale-ai-tells | habit | 12 | 51.092 | \b[Aa]n? [^,.;:!?\n]{2,80}, [Nn]ot [Aa]n? [^.!?;:,\n]{1,80} |
| dictionaries.entry-ddf0b8e027b39cf6 | mined | vocabulary | 62 | 50.809 | 4. |
| dictionaries.entry-f34584576a40178d | zeroslop | habit | 12 | 50.779 | \b(?:this journey\|the journey (?:so far\|ahead)\|grateful (?:for\|to)\|could(?:n(?:'\|')t\| not) have done it without\|huge (?:thanks\|shout.?out)\|humbled and)\b |
| dictionaries.entry-fba9a562a6deeaa9 | slop-radar | habit | 62 | 43.088 | \b(is\|are\|was\|were\|been\|being)[ \t]{1,8}\w{1,32}ed\b |
| dictionaries.entry-a35e9ba2dec8491a | zeroslop | habit | 5 | 39.036 | \b(?:is\|are\|was\|were)(?:n(?:'\|')t\| not) just (?:about )?\w[\w ''-]{0,40}[.,;:\u2014\u2013-]{1,80}[ \t]{0,8}(?:it\|they\|he\|she\|we)(?:(?:'\|')s\|(?:'\|')re\| is\| are\| was\| were)\b\|\bnot (?:just\|only\|merely) [\w ''-]{2,40}[,;:\u2014\u2013-]{1,80}[ \t]{0,8}but\b |
| dictionaries.entry-a735c16de6f7c517 | zeroslop | habit | 11 | 36.243 | \bfrom [\w ''-]{3,30} to [\w ''-]{3,30}(?:,\| and) [\w ''-]{3,30}\b |
| dictionaries.entry-04e4cb8bf53aa82b | vale-ai-tells | habit | 17 | 32.355 | [^.!?]{1,80} isn'?t [^.!?]{1,80}\. [Ii]t'?s [^.!?]{1,80} |
| dictionaries.entry-77a634edffbe087d | vale-ai-tells | habit | 17 | 32.355 | [A-Z][a-z]{1,80} isn'?t [^.!?]{1,80}\. [Ii]t'?s [^.!?]{1,80} |
| dictionaries.entry-1c981a333a1be3a6 | vale-ai-tells | gun | 1 | 28.433 | a real difference |
| dictionaries.entry-78e88cf88c419539 | zeroslop | habit | 4 | 26.522 | \bthought.leader(?:s\|ship)?\b |
| dictionaries.entry-946bcaeabe5dc353 | zeroslop | habit | 6 | 25.636 | \b(?:truly\|genuinely\|incredibly\|remarkably\|undoubtedly\|undeniably\|absolutely essential\|significantly enhanc\w{1,32})\b |
| dictionaries.entry-9a59f7396b5bb3de | zeroslop | habit | 3 | 24.250 | (?:^\|\n)[ \t]{0,8}(?:👉\|✅\|🔹\|➡️\|✨\|🚀\|💡\|🔥\|→)\s |
| dictionaries.entry-59dc56d8d2d76e39 | zeroslop | habit | 5 | 22.785 | \b(?:there are (?:several\|a few\|many\|numerous) (?:key \|important )?(?:factors\|things\|ways\|reasons\|considerations\|lessons\|takeaways)\|here are (?:a few\|some\|three\|five\|\d{1,12}))\b |
| dictionaries.entry-e11bc36debc3c350 | paech-sampler | vocabulary | 13 | 21.725 | curiosity |
| dictionaries.entry-1d3d3322c72a28f4 | paech-sampler | habit | 2 | 20.804 | on the other hand |
| dictionaries.entry-06ca075699875eef | paech-sampler | habit | 2 | 20.489 | testament to |
| dictionaries.entry-78ca742f04ff9bda | mined | habit | 4 | 20.380 | that keeps |
| dictionaries.entry-d7191ba1f0d5a157 | zeroslop | habit | 5 | 20.273 | i'm excited to |
| dictionaries.entry-d606c0a2eacc50c3 | slop-radar | habit | 2 | 19.926 | (?:^\|\n)[ \t]{0,8}\d{1,12}\.[ \t]{1,8}\*\*[^.!?\n]{1,80}\*\* |
| dictionaries.entry-0b3d977ad595a42a | paech-sampler | vocabulary | 9 | 19.390 | understanding |
| dictionaries.entry-f2dc82eb80c341b0 | zeroslop | habit | 2 | 18.261 | the problem wasn't |
| dictionaries.entry-7721125aff9311fd | zeroslop | habit | 2 | 18.219 | \b\w{1,32} is(?:n(?:'\|')t\| not) the opposite of \w{1,32}\b\|\bis(?:n(?:'\|')t\| not) (?:a\|the) (?:destination\|sprint)[,.;] (?:it\|but)\b\|\bit(?:(?:'\|')s\| is\| has) a marathon\b |
| dictionaries.entry-9d483ea504957f98 | slop-radar | habit | 2 | 17.988 | here's what |
| dictionaries.entry-34bb73890b28e80b | paech-sampler | vocabulary | 7 | 14.800 | journey |
| dictionaries.entry-db5ad8d159b9c156 | vale-ai-tells | habit | 3 | 13.904 | [A-Z][a-z]{1,80} are [^,]{1,80}, not [^.]{1,80} |
| dictionaries.entry-12fe03674612d1a9 | zeroslop | habit | 12 | 12.834 | \b\w{1,32}(?:ic\|ive\|ble\|ant\|ent\|ful\|ous\|ed\|al\|ing)?, \w{1,32}(?:ic\|ive\|ble\|ant\|ent\|ful\|ous\|ed\|al\|ing)?, and \w{1,32}(?:ic\|ive\|ble\|ant\|ent\|ful\|ous\|ed\|al\|ing)\b |
| dictionaries.entry-4926efddfca29c47 | vale-ai-tells | habit | 3 | 12.522 | moved the needle |
| dictionaries.entry-7d386815dc89d67e | slop-radar | habit | 2 | 12.395 | \b(?:it\|this\|that)(?:'s not\| is not\| was not\| isn't\| wasn't) (?:just \|only \|merely \|simply \|about )?[^.!?\n]{2,60}?(?:[,;:\u2014\u2013]\|\.[ \t]{1,8})[ \t]{0,8}(?:it\|this\|that)(?:'s\| is\| was)\b |
| dictionaries.entry-f90cdd59646a230e | vale-ai-tells | habit | 7 | 12.327 | [Tt]he [a-z]{1,80} isn'?t [^.!?]{1,80}\. [Ii]t'?s [^.!?]{1,80} |
| dictionaries.entry-5198982b09dd0287 | paech-essays | vocabulary | 14 | 12.043 | onboarding |
| dictionaries.entry-bc134a51ed5378f2 | mined | habit | 2 | 11.841 | moments that |
| dictionaries.entry-30bc1a98d45fc2de | paech-sampler | habit | 1 | 11.068 | remember that |
| dictionaries.entry-591a1759034cdea7 | paech-sampler | habit | 1 | 11.042 | to summarize |
| dictionaries.entry-aa0590debcc0a18e | paech-sampler | habit | 1 | 10.983 | not only |
| dictionaries.entry-95d9a7ce9f81820e | mined | habit | 2 | 10.973 | to question |
| dictionaries.entry-6f516f59d0f13b0d | paech-essays | vocabulary | 13 | 10.102 | workflows |
| dictionaries.entry-42a150af40d5b05a | paech-sampler | vocabulary | 8 | 9.764 | unexpected |
| dictionaries.entry-321ee2e54e9837a0 | zeroslop | habit | 1 | 9.131 | \bless about [\w ''-]{2,40}(?:[.,;:\u2014\u2013-]{1,80}\|[ \t]{1,8}and)[ \t]{0,8}more about\b |
| dictionaries.entry-39b2767702269fa7 | zeroslop | habit | 1 | 9.131 | the hard part wasn't |
| dictionaries.entry-5fe52c081a61631d | zeroslop | habit | 1 | 9.131 | the difference was not |
| dictionaries.entry-b0ef4d40268aaa31 | zeroslop | habit | 1 | 9.130 | (?:^\|[.!?][ \t]{1,8}\|\n)Stop [\w '',-]{2,40}\. Start [a-z] |
| dictionaries.entry-50e156cde1011c93 | zeroslop | habit | 1 | 9.130 | do this instead |

**Layout, explanations and other audits.** Formatted RAID humans and 300 formatted Wayback posts validated the layout matchers; no layout rule was disabled wholesale. The 170 exclusion records in dictionary-exclusions.json are conditional riders/trigger metadata or unsafe/unsupported regex expansions; eligible literals were retained. The flatten check is:

| Set | Original flags | Flattened flags | Lost | Gained |
|---|---:|---:|---:|---:|
| targetHoldout | 18 | 18 | 0 | 0 |
| fresh | 7 | 7 | 0 | 0 |
| effortful | 23 | 20 | 3 | 0 |

Points are pro-rata allocations within smooth family saturation and final index compression; they sum to the unrounded index. Removing a tell recomputes expectation, the full gate and compression, so a saturated/overlapping tell’s allocation is not universally equal to its counterfactual deletion effect. The new unit regression checks independent tell removal within one point and verifies recomputed eligibility.

| LinkedIn holdout length | Round-2 FP / rows | V2 FP / rows | V2 CP95 upper |
|---|---:|---:|---:|
| <30 | 0/61 | 0/61 | 4.7924% |
| 30–99 | 3/7183 | 16/7183 | 0.3381% |
| 100–249 | 40/2498 | 22/2498 | 1.2552% |
| 250–600 | 0/1 | 0/1 | 95.0000% |

All source/length cells, FP rates at 25/40/60, cluster bootstrap intervals and per-smell results are in audit.json. Partial ROC area through FPR=1% (panel-obvious holdout vs LinkedIn humans) falls from 0.004233 to 0.001853. Per-rule hit rates/ratios/mean points are in per-rule.json. No non-native authorship claim or leave-one-generator-out experiment is available from the supplied target split. No live-feed check was performed in this task; the parent owns browser validation.

**Top 50 highest-scoring slop-negative controls: ids/counts only.** Rows from the `effortful` set are generated posts the panel rated none/some smell (slop-negative by definition, not human text); every other set's rows are human-written. The export intentionally contains no quoted text. No semantic release review is claimed for this rejected candidate.

| Set | Id | Index | Counted tells |
|---|---|---:|---:|
| effortful | linkedin-ai/claude-opus-5-5.jsonl#p14 | 89 | 4 |
| effortful | linkedin-ai/claude-opus-5-5.jsonl#p26 | 82 | 6 |
| linkedinHoldout | li-influencers:32222 | 67 | 8 |
| effortful | linkedin-ai/claude-opus-5-5.jsonl#p06 | 62 | 5 |
| linkedinHoldout | li-influencers:25409 | 62 | 10 |
| external | wi:1-164820 | 61 | 15 |
| linkedinHoldout | li-influencers:31984 | 60 | 7 |
| raidTest | 114aa0d6-8db7-4613-a284-8f89a5715abd | 57 | 8 |
| effortful | linkedin-ai/claude-opus-5-5.jsonl#p01 | 56 | 8 |
| linkedinHoldout | li-influencers:28642 | 55 | 14 |
| linkedinHoldout | li-influencers:32023 | 55 | 4 |
| linkedinHoldout | li-influencers:25480 | 54 | 9 |
| effortful | linkedin-ai/claude-opus-5-5.jsonl#p11 | 53 | 10 |
| linkedinHoldout | li-influencers:29638 | 53 | 14 |
| linkedinHoldout | li-influencers:32100 | 53 | 7 |
| linkedinHoldout | li-influencers:32127 | 53 | 7 |
| external | wi:1-231049 | 52 | 6 |
| linkedinHoldout | li-influencers:29652 | 52 | 8 |
| linkedinHoldout | li-influencers:30327 | 52 | 10 |
| external | wi:1-302728 | 51 | 5 |
| linkedinHoldout | li-influencers:17490 | 50 | 4 |
| raidTest | 6ee11d77-0a5f-49a8-8b76-df91ad37d6a8 | 49 | 22 |
| linkedinHoldout | li-influencers:31255 | 48 | 7 |
| linkedinHoldout | li-influencers:14336 | 46 | 8 |
| linkedinHoldout | li-influencers:31249 | 46 | 16 |
| linkedinHoldout | li-influencers:32253 | 46 | 3 |
| external | raid:e41fdf62-c408-419a-b4d7-dcaab1d28493 | 45 | 30 |
| linkedinHoldout | li-influencers:15260 | 45 | 5 |
| linkedinHoldout | li-influencers:17682 | 45 | 4 |
| linkedinHoldout | li-influencers:18628 | 45 | 3 |
| linkedinHoldout | li-influencers:4286 | 45 | 5 |
| raidTest | 08aa4615-5e5d-499f-a731-c4ad68065b93 | 45 | 16 |
| raidTest | 79632f7c-1511-43d6-968e-806f924674a2 | 45 | 22 |
| raidTest | ff5083ad-660b-4237-ba1a-d34b4794657e | 44 | 16 |
| linkedinHoldout | li-influencers:17960 | 43 | 4 |
| linkedinHoldout | li-influencers:29703 | 43 | 4 |
| raidTest | 1a23e0d6-ff7e-491c-8601-382f429f817f | 43 | 20 |
| linkedinHoldout | li-influencers:18711 | 42 | 3 |
| linkedinHoldout | li-influencers:18799 | 42 | 9 |
| linkedinHoldout | li-influencers:24634 | 42 | 5 |
| linkedinHoldout | li-influencers:28315 | 42 | 4 |
| raidTest | 753a5181-81bb-48b1-91c7-107d12621049 | 42 | 15 |
| external | aeslc:arnold-j_inbox_68.subject | 41 | 8 |
| linkedinHoldout | li-influencers:14919 | 41 | 15 |
| linkedinHoldout | li-influencers:17578 | 41 | 4 |
| wayback | linkedin-wayback-aa2e22383b7c428ae1ea4ebb | 41 | 19 |
| external | wi:1-91123 | 40 | 22 |
| linkedinHoldout | li-influencers:14976 | 40 | 3 |
| linkedinHoldout | li-influencers:16949 | 40 | 9 |
| linkedinHoldout | li-influencers:17996 | 40 | 3 |

**Verification and timing.** Final `pnpm test --maxWorkers=1`: **695 passed, 1 optional skipped**. Final `pnpm check`: **0 errors, 0 warnings**. All twelve frozen artifacts remain exactly 80 and shameable. No fingerprint, privacy or performance assertion was relaxed. Optimized matcher scores/actions match all 10,513 cached development rows. Packed/unpacked coefficients, matchers and ids are identical. Independent zlib-generated stored/fixed/dynamic streams and corrupt-table failures exercise the local decoder.

| Metric | Round 2 | V2 |
|---|---:|---:|
| 300-word mean ms | 0.352 | 0.360 |
| p95 ms | 0.500 | 0.648 |
| Worst of 1,000 warmed calls ms | 0.686 | 1.062 |
| Worst creation ms | 8.446 | 44.159 |
| Cold import + first call mean ms | 81.596 | 184.338 |

200 distinct 300-word development excerpts, 100 human/100 chat, five timed calls each after warmup; five fresh native-TypeScript Node processes for cold measurements. The latest MVP mean-time budget (<1 ms) passes. The original strict worst-call <1 ms and creation <30 ms targets remain **unmet** (1.062 and 44.159 ms). Engine creation after the immutable singleton is prepared is near zero; the table/guard/regex initialization cost belongs to the first call and is included above. Native Node module loading includes TypeScript resolution/stripping, so it is not a browser claim.

The withdrawn byte-size gate is informational only. An earlier isolated plain `pnpm build` measured linkedin.js at **940,820 bytes**, before the final score-preserving guard/type fixes; it was not rebuilt after the parent instructed no more builds. No release was installed. Cold module evaluation plus the first score is ~184 ms in Node, so startup still needs parent-owned integration work. A dedicated worker can load and warm the pure engine once, receive post ids/text, and return reports while the adapter/UI remain on the main thread. That changes the content-script scheduling boundary; worker wiring was explicitly left outside this task and is not implemented here.

**Test updates and their reasons.**

| Tests | Reason |
|---|---|
| score.test.ts | Replace old exponential/editorial point sums and hard category caps with exposure, smooth caps, actual displayed-point sums and gate assertions; retain contributor validation. |
| evidence.test.ts | Length can reduce sparse tell points and protected examples can increase exposure; preserve exact protected spans and duplicate-occurrence assertions. |
| artifacts.test.ts | Placeholder signal weights now use displayed index points rather than old 4–6 editorial points; all ≥80 fingerprint and human nondecisive guards remain. |
| packs.test.ts | Add the dictionary pack; ordinary habits may have small visible scores; accept the winning bundled dictionary span and test the same no-accusation boundary. |
| pasted-output.test.ts | Accept the winning slot span, remove the obsolete family bonus, check displayed-point arithmetic. |
| calibration.test.ts | Generic AI authorship is report-only under the owner’s definition; explicit artifacts still must reach ≥80; human negatives remain below 40. |
| recall.test.ts | Bundle duplicate list descriptions and accept calibrated scores; the synthetic cache explainer now correctly records the measured below-threshold result instead of demanding its historical 60/40 band. Other actionable examples/frozen artifacts remain required. |
| regex-regressions.test.ts | The raw matcher must retain the later construction, while extreme-length exposure may hide its φ=0 signal. |
| scorecard.test.ts | Add boundary continuity, exposure, vocabulary/gate isolation, bundles and tell-removal regressions. |
| inflate.test.ts | Decode independent stored/fixed/dynamic zlib streams and reject damaged payloads. |

**Risks and handoff.** Keep round 2 as the installed scorer. V2 fails target recall and does not confirm the desired held-out 0.1% human tail. Rare in these auxiliary corpora is not equivalent to a visible low-quality artifact; dictionary gun false alarms show this failure. High caps are not the only issue: template/domain coverage, correlated prompts/authors and all-positive prior retention limit the fit. Good-AI none stays protected on this one audit, but 77 examples cannot establish a 2% confidence bound. Startup/first-call blocking and the strict tail-latency/creation targets need separate engineering. This audit is closed: any future accuracy revision requires a new confirmatory split; do not hill-climb against these final results.

All text-bearing inputs, spans, predictions, raw features and snapshots stay under ignored data/eval/raw/v2. Source changes are limited to the engine; test changes are limited to engine tests. No UI, adapter, entrypoint, public asset, INTENTIONS or HANDOFF changes, no network, browsers, commits, or installation. The owner-authorized isolated build directory was removed. No task process remains after final checks.
