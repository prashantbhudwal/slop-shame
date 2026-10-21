# DetectRL-X English evaluation receipt

Verified and ingested 2026-10-21. **Evaluation-only; never commit, bundle, or use this corpus to derive product weights.** No dataset prose is quoted here. Existing RAID data/splits were not changed; no DetectRL-X test text was passed to an engine.

## Verification and rights

Dataset: [WUJUNCHAO/DetectRL-X](https://huggingface.co/datasets/WUJUNCHAO/DetectRL-X/blob/ccc9a0a74793dd3448e0da1650b430f5df1b0402/README.md), revision `ccc9a0a74793dd3448e0da1650b430f5df1b0402`. HF API reports public, non-gated access. The exact card statement (Markdown emphasis removed) is: “This dataset is released under the MIT License.” YAML: `license: mit`. The file tree has no standalone LICENSE text.

The [paper-linked repository README](https://github.com/ATH-MaaS/Marco-LLM/blob/f291775fc1f78d00e52ebbf390d5a1445e05f0af/DetectRL-X/README.md), commit `f291775fc1f78d00e52ebbf390d5a1445e05f0af`, conflicts with HF: “This dataset is licensed under the Apache License 2.0. Usage is strictly restricted to non-commercial academic research purposes.” This is **not** clean permission to fit distributable weights. All text is conservatively `LicenseRef-DetectRLX-Underlying-Sources`, private evaluation only. Source rights remain unresolved regardless of the card. One excluded academic source even carries a CC BY-NC notice.

Paper: Wu et al., [DetectRL-X: Towards Reliable Multilingual and Real-World LLM-Generated Text Detection](https://aclanthology.org/2026.acl-long.1773/), ACL 2026, DOI `10.18653/v1/2026.acl-long.1773`. This verification supersedes the permissive-rights and source/date claims in `research/ai-detection-benchmarks-2026.md`; that existing file was left untouched as instructed.

## Human provenance and date check

The paper (§3.1.3, Appendix B.2) asserts pre-2022 publication, which would precede November 2022. It names DOAJ PDFs (Academic), BBC/other news (News), Common Crawl fiction (Novel), public/proprietary corporate materials (SEO), Wikipedia (Wiki), and Common Crawl web pages (Webtext). It does **not** identify XSum, Yelp or WritingPrompts as its sources. No row-level publication dates, URLs, original document IDs, or archive revisions are released.

**The universal date claim fails the released English data.** Manual date-context checks distinguish completed events/publication metadata from future plans, fictional dates, phone numbers and numeric product codes. Four whole domains and their AI descendants are excluded because clean source snapshots cannot be separated reliably:

| Excluded domain | Observed counterexample, paraphrased | Canonical human-text SHA-256 |
| --- | --- | --- |
| Academic | November 2023 journal issue / 2023 DOI; 2025 PDF download metadata. | `d762752b08b7cc0b8f13102ff8e15fcacec6b8a3f312874db2d5c065d21cec72` |
| News | Reports photos already having gone viral on 2024-03-31. | `17c7204c1611a5517a0be1a15e174d3d332359525369eabe06ddec4da231e23b` |
| SEO | Reports a business award already received in 2024. | `ba78e800ef154e9ba6bb1c18680cdd8dedf0592624f463984365b2ff9f9e08de` |
| Wiki | Reports a completed leadership appointment on 2023-01-13. | `903b4714cd66ec920171a63368c308a7937cf699917d5f9fbc312060c1030b42` |

Novel and Webtext are retained on the authors’ pre-2022 attestation, **not independently verified publication dates**. Their inspected later-year references were fiction, forecasts, contract endpoints, targets, or a phone number; a year mention alone is not a publication date. The release cannot prove every remaining sample predates ChatGPT, nor exclude older automated writing. Each strategy has 15,600 English pair rows; 10,400 belong to the excluded domains and 5,200 to the retained domains, before length filtering/deduplication.

## Lineage and the owner’s slop target

`label` preserves authorship for compatibility with `eval/lib/corpus.mjs`: originals are `human`; model output is `ai`. **Use `slopLabel`/`slopClass`, not authorship alone, for the owner’s target.** `slopLabel` is negative for human originals and any verified human-draft AI revisions; positive for raw or subsequently transformed AI generations.

| Released field / workflow | slopClass | slopLabel | Decision |
| --- | --- | --- | --- |
| Binary `human_written_text` | human | negative | Original human field. |
| Binary/general `llm_generated_text`, including repeated train rows | ai-raw | positive | Paper describes automated summarize-then-generate from human source text; no manual draft revision is established. |
| Binary strategy test `llm_generated_text` | ai-transformed | positive | Card explicitly says strategies transform LLM-generated text; polishing/condensing/expanding apply to LGT in Binary. |
| Ternary `llm_refined_text` | unresolved | excluded | Paper defines HLT as human-origin refinement, but both card and repo field table describe this field as refinement of LGT. Neither publishes parent-field links/export code. Assigning human-ai-polished would be a guess. |

**There are zero verified `human-ai-polished` negatives in this ingest.** That baseline cell is unavailable, not a measured zero false-positive rate. Ternary bundles are not downloaded in full or used. Four 64 KiB schema probes (including two Ternary files) were receipted and removed. The paper says Qwen-Max performs refinement; it does not justify assigning every transformed output to its original generator as refiner. Original `model` is retained and `refiner_model` is supplied only for the documented refinement operations.

All insertion/deletion/substitution/zero-width perturbation and truncated length bundles are omitted. Keep `attack_variant` to distinguish the three paraphrasers even though `attack` groups them as `paraphrasing`. A text unchanged by a transformation keeps its first/raw provenance after deduplication.

## Normalization and counts

Full texts only, 30–600 ECMAScript whitespace words; no truncation, spelling repair or tell removal. Exact deduplication uses NFKC plus ECMAScript whitespace collapse, matching the corpus loader. It checks all pre-existing `raw/normalized/*.jsonl` and committed `samples/*.jsonl`; input hashes are pinned in the split manifest. If an existing corpus contains a human source, the entire related DetectRL-X group is excluded. Shared output hashes union source groups before splitting to prevent cross-split duplicate leakage.

### Counts by label

| Value | Human | AI | Total |
| --- | ---: | ---: | ---: |
| ai | 0 | 13,756 | 13,756 |
| human | 3,475 | 0 | 3,475 |

### Counts by slopClass

| Value | Human | AI | Total |
| --- | ---: | ---: | ---: |
| ai-raw | 0 | 3,369 | 3,369 |
| ai-transformed | 0 | 10,387 | 10,387 |
| human | 3,475 | 0 | 3,475 |
| human-ai-polished | 0 | 0 | 0 |

### Counts by domain

| Value | Human | AI | Total |
| --- | ---: | ---: | ---: |
| Novel | 875 | 5,063 | 5,938 |
| Webtext | 2,600 | 8,693 | 11,293 |

### Counts by model

| Value | Human | AI | Total |
| --- | ---: | ---: | ---: |
| deepseek-v3 | 0 | 3,692 | 3,692 |
| gemini-2.5-flash | 0 | 3,428 | 3,428 |
| gpt-4o | 0 | 3,317 | 3,317 |
| human | 3,475 | 0 | 3,475 |
| qwen-max | 0 | 3,319 | 3,319 |

### Counts by attack

| Value | Human | AI | Total |
| --- | ---: | ---: | ---: |
| backtranslation | 0 | 1,768 | 1,768 |
| condensing | 0 | 1,996 | 1,996 |
| expanding | 0 | 907 | 907 |
| none | 3,475 | 3,369 | 6,844 |
| paraphrasing | 0 | 3,944 | 3,944 |
| polishing | 0 | 1,772 | 1,772 |

### Filtering receipt

```json
{
  "outside_length": 30129,
  "internal_duplicate_occurrences": 35834,
  "conflicting_label_occurrences": 1,
  "excluded_group_rows": 6
}
```

### Grouped splits

Salt: `detectrlx-v1`. `group_id` / `source_id` hash the normalized paired human text; `split_group_id` is the smallest hash in any duplicate-connected component. If no upstream group exists, text hashing supplies it. Split is `int(sha256('detectrlx-v1:' + split_group_id)[:16], 16) % 100`: 0–59 train, 60–79 dev, 80–99 test. This is a 60/20/20 group allocation, not an exact row quota. Upstream train/test tags are retained as metadata, not reused as these splits. No stratified sampling or test-guided selection.

| Split | Human | AI | Total | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| train | 2,090 | 8,222 | 10,312 | `aeae5f1c926752c899de8c81f27a3006dfbbc586a9bd4b930e758bb9e2b052f8` |
| dev | 681 | 2,792 | 3,473 | `4d3eb08da0cdfcfdd0d00fb706857eb4c789fd9479d8c4554b68592bcb9e6ecd` |
| test | 704 | 2,742 | 3,446 | `e37c67f8ee1d6b11208280d046a1bfb66d60af417282f2c73fad6889ae1fece4` |

Normalized JSONL SHA-256: `49766d1e92f22c314c131c682822da1ff443abb9e5dcd93663e33bb049a625e6`. Manifest: `data/eval/raw/hillclimb/detectrlx-splits.json`. **The test split has not been scored.**

## Current-engine dev baseline

Threshold: score ≥40. Engine-tree SHA-256 `ccd9404c567dee629264fb1b4f1a48470666f99a3c7bb1535f747231476cde38`; Git HEAD `50ab90ba84e20912b6c8aa21b3ed7b091e887479` (dirty working-tree engine, not merely HEAD); Node `v26.7.0`; run `2026-10-21T08:21:15.656Z`. Vite loads only public `src/lib/engine/index.ts` and calls `analyzePost({text})`. Engine hash must remain identical across evaluation. No weight fitting or tuning is performed.

### Dev by overall

| Group | Human FP ≥40 | Authorship AI recall ≥40 | Slop-negative FP ≥40 | Slop-positive recall ≥40 |
| --- | ---: | ---: | ---: | ---: |
| overall | 31/681 (4.55%) | 746/2,792 (26.72%) | 31/681 (4.55%) | 746/2,792 (26.72%) |

### Dev by slopClass

| Group | Human FP ≥40 | Authorship AI recall ≥40 | Slop-negative FP ≥40 | Slop-positive recall ≥40 |
| --- | ---: | ---: | ---: | ---: |
| ai-raw | n/a | 281/657 (42.77%) | n/a | 281/657 (42.77%) |
| ai-transformed | n/a | 465/2,135 (21.78%) | n/a | 465/2,135 (21.78%) |
| human | 31/681 (4.55%) | n/a | 31/681 (4.55%) | n/a |
| human-ai-polished | n/a | n/a | n/a | n/a |

### Dev by domain

| Group | Human FP ≥40 | Authorship AI recall ≥40 | Slop-negative FP ≥40 | Slop-positive recall ≥40 |
| --- | ---: | ---: | ---: | ---: |
| Novel | 8/189 (4.23%) | 188/1,115 (16.86%) | 8/189 (4.23%) | 188/1,115 (16.86%) |
| Webtext | 23/492 (4.67%) | 558/1,677 (33.27%) | 23/492 (4.67%) | 558/1,677 (33.27%) |

### Dev by model

| Group | Human FP ≥40 | Authorship AI recall ≥40 | Slop-negative FP ≥40 | Slop-positive recall ≥40 |
| --- | ---: | ---: | ---: | ---: |
| deepseek-v3 | n/a | 120/697 (17.22%) | n/a | 120/697 (17.22%) |
| gemini-2.5-flash | n/a | 270/741 (36.44%) | n/a | 270/741 (36.44%) |
| gpt-4o | n/a | 157/749 (20.96%) | n/a | 157/749 (20.96%) |
| human | 31/681 (4.55%) | n/a | 31/681 (4.55%) | n/a |
| qwen-max | n/a | 199/605 (32.89%) | n/a | 199/605 (32.89%) |

### Dev by attack

| Group | Human FP ≥40 | Authorship AI recall ≥40 | Slop-negative FP ≥40 | Slop-positive recall ≥40 |
| --- | ---: | ---: | ---: | ---: |
| backtranslation | n/a | 62/362 (17.13%) | n/a | 62/362 (17.13%) |
| condensing | n/a | 43/418 (10.29%) | n/a | 43/418 (10.29%) |
| expanding | n/a | 169/184 (91.85%) | n/a | 169/184 (91.85%) |
| none | 31/681 (4.55%) | 281/657 (42.77%) | 31/681 (4.55%) | 281/657 (42.77%) |
| paraphrasing | n/a | 110/807 (13.63%) | n/a | 110/807 (13.63%) |
| polishing | n/a | 81/364 (22.25%) | n/a | 81/364 (22.25%) |

Model rows describe original generators. Human originals belong to the `human` model row and `none` attack row, so FP denominators for AI-only cells are n/a. The zero-size polished-negative cell means missing coverage. Reading test metadata for integrity/counts does not involve scoring.

## Downloads, receipts and storage

Full HF API tree: 32,984,288,798 bytes including metadata. Selected eight Binary bundles: **7,208,688,971 bytes (7.209 GB)**. No English-only files are offered. All seven other languages are discarded during streaming. Each complete file is size-checked and SHA-256 checked against HF LFS, parsed one at a time, then deleted. Raw peak is the largest selected file, 1,017,914,092 bytes; normalized/split outputs are additional. This remains below the 10 GB transfer / 5 GB task-storage budget. Small verification probes and metadata are additional (see receipts). No browsers or model calls; Python stdlib, one ingest process, SQLite `threads=1`; baseline worker pools capped at two.

Resolve URL prefix: `https://huggingface.co/datasets/WUJUNCHAO/DetectRL-X/resolve/ccc9a0a74793dd3448e0da1650b430f5df1b0402/` (each full download appends its path and `?download=true`).

| Pinned path | Bytes | SHA-256 |
| --- | ---: | --- |
| `Binary/binary_general_open.json` | 878,631,989 | `815be1667a5e7404d9e513ab339c214c713bd7ac4eb46f375fa0a26bf2dfc15f` |
| `Binary/binary_polishing_open.json` | 878,983,479 | `2df191654f380cf3055dac25df9cfc88d502b6ef0564ba647b9a9f1baea377fc` |
| `Binary/binary_condensing_open.json` | 837,655,318 | `6ebf5640a696e7b47f71a1e932b90320fe85d97aec4a20e6c25c4704580075e4` |
| `Binary/binary_expanding_open.json` | 1,017,914,092 | `e1c1348c607c54f2896a08f29e5176b031139a4dd5b76c1560df8e34231c53f3` |
| `Binary/binary_backtranslation_open.json` | 879,760,299 | `280a5cf3673bcb8d63106f0045b4c62ed2f1b87bc944b532b818651487c13367` |
| `Binary/binary_encoder_paraphrasing_open.json` | 882,761,565 | `bf5d38a8e17f3da25fc604d421553848686f2e884debd0ced2268bc90a9339b5` |
| `Binary/binary_decoder_paraphrasing_open.json` | 859,818,880 | `95ce677961f9cb9de51226f40aa515bcc36f6d036b4181bcd14dc1f35641ca58` |
| `Binary/binary_seq2seq_paraphrasing_open.json` | 973,163,349 | `6777d20a26597d69867b55da5e26a51bcf5e8abb409ae394307af8145aab17a6` |

Per-file URL/size/hash receipts, metadata copies, date audit and the aggregate ingest/baseline reports live in ignored `data/eval/raw/detectrlx/`. No unneeded full downloads remain. Ternary is omitted on documentation evidence; no English Ternary rows or guessed third-field classes enter the corpus.

## Reproduction

From the repo root, with the existing Node/Vite dependencies installed:

```sh
python3 scripts/eval/detectrlx.py verify
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python3 scripts/eval/detectrlx.py ingest
python3 scripts/eval/detectrlx.py validate
python3 scripts/eval/detectrlx.py baseline
python3 scripts/eval/detectrlx.py document
```

Commands refuse to overwrite existing outputs. Reproduce in a fresh checkout with the same pre-existing deduplication inputs, or archive only this task’s `detectrlx*` outputs and its own receipt directory first; never delete/modify another agent’s hillclimb files. `document` creates only this report and does not edit MANIFEST. `baseline` has no test-file option and never loads test. The script’s frozen domain exclusion is based on the date audit above, not any engine result.

## Limits for fitting weights

Do not fit product weights from this evaluation-only ingest: unresolved underlying rights and the upstream non-commercial restriction remain. Four of six domains are absent after the failed date check. Retained human dates are attested, not independently certified. There are no verified effortful AI-polished negatives, and authorship labels alone implement the wrong target. Modern paid/frontier generators do not establish cheap-model quality or prove lack of user effort; the classes are workflow proxies. Near-duplicate documents/authors cannot be grouped without missing original IDs, and a 30–600-word window introduces selection bias. This is a useful limited modern-model stress test, not adequate supervision for the owner’s full slop definition.
