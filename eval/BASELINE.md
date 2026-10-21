# Offline calibration results

Run: 2026-10-19T10:05:42.072Z. Engine SHA-256: `37719399d48d1d3c4670e6e067927ac3c20dd34e89937090556ae3e0276c9a2a`.

Items: 2245; human 1351, AI 834, mixed 60. Exact-text duplicates removed: 2.

**This is a calibration sample, not an authorship verdict or an independent validation set.** Mixed rows are LLM-authored plainer rewrites, excluded from FP and recall denominators. Historical labels are provenance evidence, not proof that every pre-2022 social post was human: bots and older generators already existed.

FP means human score ≥ 40. Strict gate: **PASS** (pooled formal + non-native FP ≤ 5.00% and both subsets present).

## False positives and recall

| subset | human n | FP n | FP % | Shame FP % | AI n | recall ≥40 | recall ≥60 | mixed n |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overall | 1351 | 0 | 0.00% | 0.00% | 834 | 3.00% | 3.00% | 60 |
| non-native + formal | 723 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| casual | 270 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| creative | 80 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| dataset-ai | 0 | 0 | n/a | n/a | 681 | 3.67% | 3.67% | 0 |
| formal | 425 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| instructions | 80 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| narrative | 80 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| non-native | 298 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| professional | 118 | 0 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| social-ai | 0 | 0 | n/a | n/a | 93 | 0.00% | 0.00% | 0 |
| synthetic-ai | 0 | 0 | n/a | n/a | 60 | 0.00% | 0.00% | 0 |
| synthetic-mixed | 0 | 0 | n/a | n/a | 0 | n/a | n/a | 60 |

## Genre FP and recall

| genre | human n | FP % | Shame FP % | AI n | recall ≥40 | recall ≥60 | mixed n |
| --- | --- | --- | --- | --- | --- | --- | --- |
| academic-abstract | 240 | 0.00% | 0.00% | 85 | 0.00% | 0.00% | 5 |
| email | 118 | 0.00% | 0.00% | 5 | 0.00% | 0.00% | 5 |
| essay | 255 | 0.00% | 0.00% | 5 | 0.00% | 0.00% | 5 |
| forum | 80 | 0.00% | 0.00% | 85 | 3.53% | 3.53% | 5 |
| instructions | 80 | 0.00% | 0.00% | 85 | 20.00% | 20.00% | 5 |
| letter | 43 | 0.00% | 0.00% | 5 | 0.00% | 0.00% | 5 |
| narrative | 80 | 0.00% | 0.00% | 85 | 0.00% | 0.00% | 5 |
| news | 80 | 0.00% | 0.00% | 126 | 0.00% | 0.00% | 5 |
| poetry | 80 | 0.00% | 0.00% | 80 | 5.00% | 5.00% | 0 |
| product-review | 2 | 0.00% | 0.00% | 5 | 0.00% | 0.00% | 5 |
| professional-release | 25 | 0.00% | 0.00% | 5 | 0.00% | 0.00% | 5 |
| reference | 80 | 0.00% | 0.00% | 85 | 0.00% | 0.00% | 5 |
| review | 160 | 0.00% | 0.00% | 80 | 1.25% | 1.25% | 0 |
| service-review | 4 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| social-post | 24 | 0.00% | 0.00% | 98 | 0.00% | 0.00% | 5 |

## Register FP and recall

| register | human n | FP % | Shame FP % | AI n | recall ≥40 | recall ≥60 | mixed n |
| --- | --- | --- | --- | --- | --- | --- | --- |
| casual | 270 | 0.00% | 0.00% | 268 | 1.49% | 1.49% | 15 |
| formal | 425 | 0.00% | 0.00% | 306 | 0.00% | 0.00% | 25 |
| instructional | 80 | 0.00% | 0.00% | 85 | 20.00% | 20.00% | 5 |
| learner | 298 | 0.00% | 0.00% | 0 | n/a | n/a | 0 |
| literary | 160 | 0.00% | 0.00% | 165 | 2.42% | 2.42% | 5 |
| personal | 0 | n/a | n/a | 5 | 0.00% | 0.00% | 5 |
| professional | 118 | 0.00% | 0.00% | 5 | 0.00% | 0.00% | 5 |

## Source counts

| source | human | AI | mixed |
| --- | --- | --- | --- |
| aeslc-2019 | 118 | 0 | 0 |
| federal-reserve | 25 | 0 | 0 |
| human-detectors-2025 | 0 | 41 | 0 |
| plos-2020 | 160 | 0 | 0 |
| raid-2024 | 640 | 640 | 0 |
| synthetic-general-v1 | 0 | 60 | 60 |
| uci-sentiment-2015 | 86 | 0 | 0 |
| unmasking | 24 | 93 | 0 |
| write-improve-2.1 | 298 | 0 | 0 |

## Threshold sweep

| threshold | all-human FP % | hard-human FP % | AI TPR % |
| --- | --- | --- | --- |
| 20 | 0.15% | 0.00% | 3.24% |
| 25 | 0.00% | 0.00% | 3.12% |
| 30 | 0.00% | 0.00% | 3.00% |
| 35 | 0.00% | 0.00% | 3.00% |
| 40 | 0.00% | 0.00% | 3.00% |
| 45 | 0.00% | 0.00% | 3.00% |
| 50 | 0.00% | 0.00% | 3.00% |
| 55 | 0.00% | 0.00% | 3.00% |
| 60 | 0.00% | 0.00% | 3.00% |
| 65 | 0.00% | 0.00% | 3.00% |
| 70 | 0.00% | 0.00% | 3.00% |
| 75 | 0.00% | 0.00% | 3.00% |
| 80 | 0.00% | 0.00% | 3.00% |
| 85 | 0.00% | 0.00% | 0.00% |
| 90 | 0.00% | 0.00% | 0.00% |

Minimum tested threshold meeting the pooled hard-human target: **20**. AI recall there: **3.24%**.

Minimum tested threshold meeting the target in each hard-human subset separately: **20**. These are in-sample operating points; freeze and evaluate on an untouched holdout before release.

## Label × predicted tier counts

| label | artisanal | whiff | certified | swamp | slopocalypse |
| --- | --- | --- | --- | --- | --- |
| human | 1349 | 2 | 0 | 0 | 0 |
| ai | 807 | 2 | 0 | 0 | 25 |
| mixed | 60 | 0 | 0 | 0 | 0 |

## Score histograms

```text
human (each bar scaled within this label)
 0–9    1342 ###################################
10–19      7 #
20–29      2 #
30–39      0 
40–49      0 
50–59      0 
60–69      0 
70–79      0 
80–89      0 
90–100     0 
ai (each bar scaled within this label)
 0–9     761 ###################################
10–19     46 ##
20–29      2 #
30–39      0 
40–49      0 
50–59      0 
60–69      0 
70–79      0 
80–89     25 #
90–100     0 
mixed (each bar scaled within this label)
 0–9      60 ###################################
10–19      0 
20–29      0 
30–39      0 
40–49      0 
50–59      0 
60–69      0 
70–79      0 
80–89      0 
90–100     0 
```

## Top rules on human text

Ranked by posts that are false positives, then all human posts where the rule fires. Weights are engine-reported pre-normalization contributions; co-occurrence is not a causal ablation. Counts are per post, not per matched phrase.

| rule id | FP posts | all human posts | weight on FP posts |
| --- | --- | --- | --- |
| robotic-rhythm.rule-of-three | 0 | 107 | 0.00 |
| template-phrases.transition | 0 | 100 | 0.00 |
| template-phrases.clarity | 0 | 58 | 0.00 |
| ai-vocabulary.tier1-common | 0 | 52 | 0.00 |
| robotic-rhythm.uniformity | 0 | 40 | 0.00 |
| hedging.confidence | 0 | 33 | 0.00 |
| template-phrases.template | 0 | 31 | 0.00 |
| inflation.hollow | 0 | 27 | 0.00 |
| negation-pivot.not-only | 0 | 25 | 0.00 |
| template-phrases.filler | 0 | 11 | 0.00 |
| ai-vocabulary.tier1 | 0 | 10 | 0.00 |
| negation-pivot.not-x-but-y | 0 | 5 | 0.00 |
| robotic-rhythm.cross-para-burstiness | 0 | 5 | 0.00 |
| engagement-bait.social-closer | 0 | 2 | 0.00 |
| hedging.parenthetical | 0 | 2 | 0.00 |
| hedging.stack | 0 | 2 | 0.00 |
| inflation.promotional | 0 | 2 | 0.00 |
| template-phrases.boilerplate | 0 | 2 | 0.00 |
| ai-vocabulary.tier3 | 0 | 1 | 0.00 |
| engagement-bait.rhetorical-question | 0 | 1 | 0.00 |

## Timing

Warm mean **0.1812 ms/post**, p95 **0.4118 ms/post**. First call: 10.7302 ms. Engine import/build: 134.52 ms. Timing is Node on this machine, excludes loading and includes only analyzePost calls; it is not a browser performance certification.

## Reproduction

Command: `pnpm eval --strict --baseline`

Node: v26.7.0. Git HEAD: `bc8ed158bbfda8e7ea48c20ee9170e2dc6675e8d`.

Input file digests (including local evaluation-only files):

- `data/eval/samples/unmasking.jsonl`: `1ad9b299b654ddca912b575990b6c7c0699966dfd4e1768aebcc295c2ef5c792`
- `data/eval/samples/plos.jsonl`: `325de3e0bb712cc6f6fc292af8fb44f6aeea8bfc1e30322003d776bbadef170c`
- `data/eval/samples/official-releases.jsonl`: `6258f80ce6e539883bd119bf49346acc8b16a9c1795ccf4e09ff48312c887ea7`
- `data/eval/samples/uci-reviews.jsonl`: `2fb512859a4ca511d7114cba92e0b036a64c2a26286f956c5a1cd990b46c3f39`
- `data/eval/samples/synthetic-general.jsonl`: `80febd273c839e72814e255dd6622a34df7b212c15f5187da5d6b63bd52ef577`
- `data/eval/raw/normalized/wi.jsonl`: `ab97c8aaf12cd8696cebe2092573a8cfd81a7ae21673d16f0fbc7eae7b2de938`
- `data/eval/raw/normalized/raid.jsonl`: `446f21a8aff37937bc970cd0a3c44d11988ab10eac70679b32fac4389049afd2`
- `data/eval/raw/normalized/aeslc.jsonl`: `3f60286490543e60c4742daa2f79c6d0a45c86ac9223aec6205cae536fb4e1df`
- `data/eval/raw/normalized/human-detectors-ai.jsonl`: `662c1bb3e62991bc0b7be10d8f171b350de62b254c50ac7cd4ad92a7fbd8fc86`

Raw research-corpus quotations are intentionally omitted from this committed baseline. Local results include example snippets.
