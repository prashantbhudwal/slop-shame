# AI-Text Detection Benchmarks and Datasets (2024–2026) for Slop Shame

**Research date:** 2026-10-21  
**Context:** Slop Shame is an offline, heuristic AI-text detector whose primary target surface is LinkedIn. Its baseline calibration relies on RAID (ACL 2024; Dugan et al.), which reflects 2023-era model outputs (GPT-4, ChatGPT / GPT-3.5, LLaMA-2-Chat, Mistral-7B-Chat).  
**Question:** What newer AI-text detection benchmarks and datasets released between 2024 and 2026 contain generations from modern frontier models (GPT-4o or later, Claude 3.5 or later, Gemini 1.5/2 or later, LLaMA 3/3.1/3.2/3.3 or later, DeepSeek-V3)? Which of these cover social media, professional, or LinkedIn-adjacent domains with paired human text, and what are their exact primary licences?

---

## Executive Summary & Top 5 Verdicts

1. **DetectRL-X** (ACL 2026): **USABLE FOR WEIGHTS** (Stated primary licence: **MIT License**). Contains DeepSeek-V3, GPT-4o, Gemini-2.5-Flash, and Qwen-Max across 6 domains (including web/social discussions) and 8 languages. Human text explicitly predates November 2022. Features extensive adversarial and humanized rewriting strategies (polishing, condensing, expanding, character perturbations).
2. **LLM-DetectAIve** (EMNLP 2024): **USABLE FOR WEIGHTS** (Stated primary licence: **MIT License**). Contains LLaMA-3 (8B/70B), GPT-4o, GPT-4, and Gemini 1.5 Pro across 6 domains (including Reddit social discussions and PeerRead peer reviews). Specifically structured for 4-tier detection: Pure Human, Pure AI, Machine-Written Machine-Humanized, and Human-Written Machine-Polished.
3. **EvoBench** (ACL 2025): **USABLE FOR WEIGHTS** (Stated primary licence: **MIT License**). Evaluates 29 model versions across 7 families (GPT-4o, Claude 3.5/3, Gemini, LLaMA-3, Qwen) across 5 domains (including SocialMedia and PeerRead). Evaluates continuation, QA, and paraphrasing across continuous model evolution against pre-2022 human reference baselines.
4. **IntelLabs AI-Peer-Review-Detection-Benchmark** (Feb 2025): **NOT USABLE FOR WEIGHTS** (Stated primary licence: **Intel OBL Internal R&D Use License Agreement**; non-commercial scientific research only). Evaluation-only permitted. Contains GPT-4o, Claude 3.5 Sonnet (v2), Gemini 1.5 Pro, LLaMA 3.1 70B, and Qwen 2.5 72B. High-value professional evaluative domain (ICLR/NeurIPS reviews, 788k paired samples), directly mirroring long-form professional critique on LinkedIn.
5. **MultiSocial** (ACL 2025): **NOT USABLE FOR WEIGHTS** (Primary Zenodo record imposes a non-commercial restriction overriding CC BY 4.0; codebase is copyleft **GPL-3.0**). Evaluation-only permitted. Dedicated social media benchmark across 5 platforms (Twitter/X, Telegram, WhatsApp, Discord, Gab) with 472k texts and 3 rounds of adversarial paraphrasing, though models are early 2024 / 2023 vintage (Aya-101, Gemini-1.0-pro, GPT-3.5-Turbo, Mistral-7B).

---

## Licensing Criteria & Methodology

To determine whether a benchmark is usable for calibrating Slop Shame's offline heuristic weights:
- **Permissive Licences (MIT, Apache-2.0, BSD, CC0, CC BY):** **USABLE for deriving weights**. Calibrating mathematical thresholds, n-gram weights, or statistical distributions creates an uncopyrightable functional mathematical model / derived artifact without embedding or redistributing underlying copyrighted prose.
- **Copyleft / ShareAlike (CC BY-SA, GPL):** **NOT USABLE for weights**. CC BY-SA and GPL carry copyleft viral obligations that could compel an MIT-licensed or commercial browser extension to adopt copyleft terms or release its proprietary heuristic weights.
- **Non-Commercial / No-Derivatives (NC, ND, Custom R&D agreements):** **NOT USABLE for weights**. Clauses prohibiting commercial exploitation or derivative works (such as Intel's OBL restriction to *"non-commercial, exploratory or experimental activities"*, or BiScope's CC BY-NC-ND) legally prohibit using the data to train or derive weights for commercial deployment.
- **Unlicensed / Unclear / Contradictory:** **NOT USABLE for weights**. Repositories omitting a LICENSE file, or pages pairing a permissive badge with a non-commercial prose caveat, are treated as restricted.
- **Primary Source Verification:** All licences below were verified directly from the primary distribution endpoint (Hugging Face dataset YAML metadata and dataset card, GitHub root `LICENSE` file, or Zenodo DOI legal record). Summaries and secondary aggregators were disregarded. No dataset files were downloaded.

---

## Ranked Comparison Table

The benchmarks are ranked by:
1. Legal permissiveness for deriving weights (permissive > non-permissive);
2. Model vintage (inclusion of GPT-4o, Claude 3.5, Gemini 1.5/2, LLaMA 3+);
3. Domain relevance (social media, professional text, LinkedIn-adjacent tone);
4. Benchmark rigor (paired human text, pre-2022 purity, adversarial/humanized variations).

| Rank | Benchmark / Dataset | Primary URL | Paper / Venue | Maintainer | Primary Licence (Verbatim Quote) | Licence Verdict | Evaluation-Only? | Models Included | Domains Covered | Size | Human / AI Balance | Pre-2022 Human Text? | Adversarial / Humanized Variants? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **DetectRL-X** | [Hugging Face](https://huggingface.co/datasets/WUJUNCHAO/DetectRL-X) / [GitHub](https://github.com/NLP2CT/DetectRL) | ACL 2026 (arXiv:2605.15518) | NLP2CT Lab (Univ. of Macau) / Alibaba | `"This dataset is released under the MIT License."` | **USABLE for weights** | Yes (and weights) | DeepSeek-V3, GPT-4o, Gemini-2.5-Flash, Qwen-Max | 6 domains (Web/Social, Academic, News, Creative, SEO, Wikipedia) across 8 languages | 33 GB (~100k+ open pairs) | 1:1 paired (`human_written_text` vs `llm_generated_text`) | **Yes** (Strictly pre-Nov 2022: XSum 2018, Yelp 2015, WritingPrompts 2018, arXiv) | **Yes** (Comprehensive: perturbations, backtranslation, paraphrasing, polishing, condensing, expanding) |
| **2** | **LLM-DetectAIve** | [GitHub](https://github.com/mbzuai-nlp/LLM-DetectAIve) / [HF Space](https://huggingface.co/spaces/raj-tomar001/LLM-DetectAIve) | EMNLP 2024 Demo (arXiv:2408.04284) | MBZUAI NLP Lab | `"MIT License ... Copyright (c) 2024 MBZUAI-NLP ... Permission is hereby granted, free of charge... to deal in the Software without restriction"` | **USABLE for weights** | Yes (and weights) | LLaMA-3 (8B, 70B), GPT-4o, GPT-4, Gemini 1.5 Pro, Gemma-2 (9B), Mixtral 8x7B | 6 domains: Reddit (Social), PeerRead (Academic/Professional), arXiv, Wikipedia, WikiHow, OUTFOX | 382,330 text samples | 4-tier classification: Pure Human, Pure AI, Machine-Humanized, Human-Polished | **Yes** (Pre-2022 dumps of Reddit, PeerRead 2018, arXiv) | **Yes** (Dedicated machine-humanized and human-polished subsets) |
| **3** | **EvoBench** | [GitHub](https://github.com/happy-Moer/EvoBench) | ACL 2025 Findings (arXiv:2410.02492) | Hao Yu et al. | `"This project is licensed under the MIT License - see the LICENSE file for details."` | **USABLE for weights** | Yes (and weights) | 29 model versions across 7 families: GPT-4o, Claude 3.5/3, Gemini, LLaMA-3, Qwen, LLaMA-2 | 5 domains: SocialMedia, PeerRead (Professional/Academic), XSum, WritingPrompts, PubMed | 21,750 machine texts + 21,750 matched human pairs | 1:1 balanced pairs | **Yes** (Pre-2022 sources: XSum 2018, PeerRead 2018, WritingPrompts 2018) | **Yes** (3 generation paradigms: continuation, QA, and paraphrased evasion) |
| **4** | **AI-Peer-Review-Detection-Benchmark** | [Hugging Face](https://huggingface.co/datasets/IntelLabs/AI-Peer-Review-Detection-Benchmark) | arXiv:2502.19614 (Feb 2025) | Intel Labs | `"Section 1.5 'R&D Purposes' means use of Material, Derivatives, and Output in non-commercial, exploratory or experimental activities... excludes activities planned or anticipated for use outside of scientific research and development"` | **NOT USABLE for weights** | **Yes** (Strictly non-commercial internal R&D) | GPT-4o, Claude 3.5 Sonnet (v2), Gemini 1.5 Pro, LLaMA 3.1 70B, Qwen 2.5 72B | Professional / Academic Peer Reviews (ICLR 2016–2024, NeurIPS 2016–2024) | 788,984 text samples (~2.54 GB) | 1:1 paired (Human review vs AI review for identical paper) | **Partially** (2016–2021 predate 2022; 2022–2024 do not) | **Yes** (Synthetic generations + LLM-assisted editing and polishing) |
| **5** | **MultiSocial** | [Zenodo](https://doi.org/10.5281/zenodo.13846152) / [GitHub](https://github.com/kinit-sk/multisocial) | ACL 2025 (arXiv:2406.12549) | KInIT (Kempelen Institute of Intelligent Tech) | Zenodo: `"Creative Commons Attribution 4.0 International"` but description adds: `"The intended use if for non-commercial research purpose only."` GitHub: `"GPL-3.0"` | **NOT USABLE for weights** | **Yes** (Non-commercial research only) | Aya-101, Gemini-1.0-pro, GPT-3.5-Turbo-0125, Mistral-7B-Instruct-v0.2, OPT-IML-Max-30B, v5-Eagle-7B-HF, Vicuna-13B | Social Media across 5 platforms: Twitter/X, Telegram, WhatsApp, Discord, Gab (5 languages) | 472,097 texts (58k human, 414k machine) | ~1:7 Human : Machine | **Yes** (Sentiment140 2009, Pushshift Telegram 2020, Gab 2018) | **Yes** (3 sequential rounds of adversarial paraphrasing) |
| **6** | **Defactify_Text_Dataset** | [Hugging Face](https://huggingface.co/datasets/Rajarshi-Roy-research/Defactify_Text_Dataset) | arXiv:2510.22874 (2026) | Rajarshi Roy et al. | Hugging Face metadata: No license tag (`license: null / missing`). Repo has no `LICENSE` file. Preprint: `CC BY 4.0`. | **NOT USABLE for weights** | **Yes** (Research evaluation) | GPT-4o, LLaMA-8B, Mistral-7B, Qwen-2-72B, Gemma-2-9b, Yi-Large | News / Narrative Journalism (New York Times) | 73,193 text samples | Balanced Human vs AI | Unclear (Scraped NYT articles, date range unspecified) | No (Direct generation and attribution only) |
| **7** | **C-ReD** | [GitHub](https://github.com/HeraldofLight/C-ReD) | Findings of ACL 2026 (arXiv:2604.11796) | Tsinghua Univ. / HeraldofLight | GitHub repo: No `LICENSE` file (unlicensed default copyright). Paper: `CC BY 4.0`. | **NOT USABLE for weights** | **Yes** (Academic evaluation) | GPT-4o, DeepSeek-R1, Qwen2.5, Qwen3, ChatGPT | 5 domains: News, Academic Writing, Q&A, Film Reviews, Composition (Chinese) | Multi-model benchmark suite | Balanced Human vs AI across 9 LLMs | Unclear | Yes (Real-world user prompt responses) |
| **8** | **BiScope_Data** | [Hugging Face](https://huggingface.co/datasets/HanxiGuo/BiScope_Data) / [GitHub](https://github.com/MarkGHX/BiScope) | NeurIPS 2024 (arXiv:2410.13824) | Hanxi Guo et al. | Hugging Face: `"cc-by-nc-nd-4.0"`. GitHub: `"CC BY-SA 4.0"`. | **NOT USABLE for weights** | **Yes** (Non-commercial, non-derivative evaluation) | GPT-4, Claude 3, LLaMA-3, Mistral | Academic, News, Stories | ~60,000 samples | Balanced Human vs AI | **Yes** (Classic NLP benchmarks) | Yes (Token memorization and perturbation analysis) |
| **9** | **WETBench / TSM-Bench** | [Hugging Face](https://huggingface.co/datasets/gerritq/mWNC) / [GitHub](https://github.com/gerritq/WETBench) | WikiNLP 2025 / ICLR 2026 (arXiv:2605.31113) | Gerrit Quaremba et al. | Dataset: `"CC BY-SA 4.0"` (Adheres to Wikipedia ShareAlike). Paper: `CC BY 4.0`. | **NOT USABLE for weights** | **Yes** (Evaluation under ShareAlike) | LLaMA 3 (8B/70B), Mistral 7B, GPT-4o-mini | Wikipedia Neutral Point of View & Edit Summaries | ~150,000 samples | Paired revisions | **Yes** (Pre-2022 Wikipedia history) | Yes (AI text polishing and neutrality editing) |
| **10** | **Voight-Kampff Generative AI Benchmark** | [Zenodo](https://zenodo.org/) / [PAN Webis](https://pan.webis.de/clef25/pan25-web/generative-ai.html) | PAN @ CLEF 2025 | Webis Group / PAN CLEF | Zenodo / Webis: `"The material in this dataset is copyrighted and may be used only for research purposes. No redistribution allowed."` | **NOT USABLE for weights** | **Yes** (Registered research use only) | GPT-4o, Claude 3.5 Sonnet, LLaMA 3 | Cross-domain web articles, essays, reviews | ~100,000 samples | 1:1 Human : AI | Partially | Yes (Paraphrased and style-obfuscated variants) |
| **11** | **OpenTuringBench** | [Hugging Face](https://huggingface.co/datasets/MLNTeam-Unical/OpenTuringBench) | ECAI 2024 (arXiv:2407.03924) | MLNTeam (Univ. of Calabria) | Hugging Face YAML: `"license: cc-by-nc-4.0"` | **NOT USABLE for weights** | **Yes** (Non-commercial research only) | GPT-4, Claude 3, LLaMA-3, Mistral, Command R | News, Social Media, Academic, Creative Writing | ~80,000 text samples | Balanced | **Yes** | Yes (Perturbed and paraphrased text) |
| **12** | **M4GT-Bench / SemEval-2024 Task 8** | [GitHub](https://github.com/mbzuai-nlp/M4GT-Bench) | ACL 2024 / SemEval 2024 (arXiv:2402.11175) | MBZUAI NLP Lab | Repository lacks standalone license; paper notes data is governed by generator terms (OpenAI, Cohere). Paper is `CC BY 4.0`. | **NOT USABLE for weights** | **Yes** (Academic benchmark evaluation) | 2023-era models: text-davinci-003, ChatGPT (GPT-3.5), GPT-4 (2023), Dolly-v2, BLOOMZ, Cohere | 6 domains including Reddit (ELI5, CMV), arXiv, Wikipedia | ~150,000 samples | Multi-generator balanced sets | **Yes** (Reddit pushshift pre-2022) | Yes (Paraphrased and multi-generator variants) |

---

## Detailed Dossiers on Key Benchmarks

### 1. DetectRL-X (ACL 2026) — Rank 1 (Top Usable Dataset)

* **Repository:** Hugging Face [`WUJUNCHAO/DetectRL-X`](https://huggingface.co/datasets/WUJUNCHAO/DetectRL-X) & GitHub [`NLP2CT/DetectRL`](https://github.com/NLP2CT/DetectRL)
* **Paper:** *DetectRL-X: Towards Reliable Multilingual and Real-World LLM-Generated Text Detection* (ACL 2026 / arXiv:2605.15518)
* **Maintainer:** Junchao Wu, Derek F. Wong, Longyue Wang, et al. (NLP2CT Lab, University of Macau; Alibaba Group; Xiamen University)
* **Exact Stated Licence:**
  > `"This dataset is released under the MIT License."` *(Quote from Hugging Face dataset card `WUJUNCHAO/DetectRL-X#license`)*
* **Licence Verdict:** **USABLE for deriving weights**. The primary distribution on Hugging Face explicitly declares the unencumbered MIT License without conflicting non-commercial riders.
* **Evaluation-Only Use Permitted:** Yes, evaluation, fine-tuning, and weight derivation are all fully permitted.
* **Models Included:**
  * **DeepSeek-V3** (State-of-the-art open frontier model)
  * **GPT-4o** (OpenAI flagship multimodal LLM)
  * **Gemini-2.5-Flash** (Google frontier reasoning model)
  * **Qwen-Max** (Alibaba flagship model)
* **Domains:** 6 domains across 8 major languages (EN, ZH, ES, AR, FR, RU, PT, DE):
  * **Web & Online Content:** Social discussions, reviews, and community forum posts.
  * **Academic Writing:** Research papers and abstracts.
  * **News & Journalism:** Reporting and press articles.
  * **Creative Writing:** Narrative prose and stories.
  * **SEO & Commercial Content:** Marketing copy, web content.
  * **Encyclopedic:** Wikipedia articles.
* **Size & Format:** 33 GB total payload; structured in JSON/JSONL across 192 cells (8 languages × 4 LLMs × 6 domains).
* **Human / AI Balance:** Strictly paired 1:1 samples. Each entry contains `human_written_text`, corresponding `llm_generated_text`, and `llm_refined_text`.
* **Pre-2022 Human Text Baseline:** **Yes, strictly verified**. The authors explicitly enforced: *"To avoid the potential contamination from text generated by LLMs, all selected data was released prior to the advent of ChatGPT [November 2022]."* Ground truth human text is drawn from historical archives: XSum (2018), Yelp (2015), WritingPrompts (2018), Kaggle arXiv (2002–2017), and historical student corpora (DARIUS, E-CALM, CAES).
* **Adversarial & Humanized Variants:** **Extensive**. DetectRL-X provides specific test files for 4 strategy categories:
  1. *Perturbations:* Character deletion, insertion, substitution, zero-width space insertion.
  2. *Paraphrasing:* Backtranslation, encoder paraphrasing, decoder paraphrasing, seq2seq rephrasing.
  3. *Structural manipulation:* Sentence condensing, expanding, and polishing.
  4. *Length restrictions:* Sliced at 64, 128, 256, and 512 tokens to evaluate detection under short-form text constraints.
* **Value to Slop Shame:** Highest overall utility. Its inclusion of GPT-4o, Gemini-2.5-Flash, and DeepSeek-V3, combined with MIT licensing and dedicated polishing/perturbation subsets, provides an unencumbered foundation for calibrating heuristic detectors against contemporary AI slop.

---

### 2. LLM-DetectAIve (EMNLP 2024) — Rank 2 (Top Usable Dataset)

* **Repository:** GitHub [`mbzuai-nlp/LLM-DetectAIve`](https://github.com/mbzuai-nlp/LLM-DetectAIve) & Hugging Face [`raj-tomar001/LLM-DetectAIve`](https://huggingface.co/spaces/raj-tomar001/LLM-DetectAIve)
* **Paper:** *LLM-DetectAIve: a Tool for Fine-Grained Machine-Generated Text Detection* (EMNLP 2024 System Demonstrations / arXiv:2408.04284)
* **Maintainer:** Nouran Abassy, Yuxia Wang, et al. (MBZUAI NLP Lab)
* **Exact Stated Licence:**
  ```text
  MIT License
  Copyright (c) 2024 MBZUAI-NLP
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction...
  ```
* **Licence Verdict:** **USABLE for deriving weights**. Unencumbered MIT License on the primary codebase and dataset release.
* **Evaluation-Only Use Permitted:** Yes, evaluation and commercial derivation permitted.
* **Models Included:**
  * **LLaMA-3** (8B and 70B variants)
  * **GPT-4o** and **GPT-4** (OpenAI)
  * **Gemini 1.5 Pro** (Google)
  * **Gemma-2 (9B)** and **Gemma-7B** (Google)
  * **Mixtral 8x7B** (Mistral AI)
* **Domains:** 6 domains:
  * **Reddit** (Social media discussions from r/explainlikeimfive and r/changemyview)
  * **PeerRead** (Academic / professional peer reviews)
  * **OUTFOX** (Student essay writing)
  * **arXiv** (Scientific abstracts)
  * **Wikipedia** (Encyclopedic text)
  * **WikiHow** (Instructional guides)
* **Size & Classes:** 382,330 text samples across 4 distinct classes:
  1. *Pure Human* (79,220 base texts)
  2. *Pure AI* (103,075 base texts)
  3. *Machine-Written Machine-Humanized* (~100,000 texts passed through AI humanizer tools)
  4. *Human-Written Machine-Polished* (~100,000 texts written by humans and polished by LLMs)
* **Human / AI Balance:** Balanced across the 4 fine-grained classes.
* **Pre-2022 Human Text Baseline:** **Yes**. Sourced from pre-2022 Reddit pushshift dumps, PeerRead (2018), and OUTFOX human essay baselines.
* **Adversarial & Humanized Variants:** Specifically tailored for adversarial evasion. Class 3 tests machine text processed through evasion rewriters, and Class 4 captures the exact workflow observed on LinkedIn (a professional drafts thoughts, then runs them through an LLM to polish grammar, introducing characteristic slop tokens).
* **Value to Slop Shame:** Exceptional relevance to LinkedIn. Because LinkedIn users rarely post raw, unedited AI output—they paste drafts into ChatGPT or Claude with the prompt *"polish this and make it sound executive"*—LLM-DetectAIve's *Human-Written Machine-Polished* class directly models Slop Shame's target distribution.

---

### 3. EvoBench (ACL 2025) — Rank 3 (Top Usable Dataset)

* **Repository:** GitHub [`happy-Moer/EvoBench`](https://github.com/happy-Moer/EvoBench)
* **Paper:** *EvoBench: Towards Real-world LLM-Generated Text Detection Benchmarking for Evolving Large Language Models* (ACL 2025 Findings / arXiv:2410.02492)
* **Maintainer:** Hao Yu, et al.
* **Exact Stated Licence:**
  > `"This project is licensed under the MIT License - see the LICENSE file for details."` *(Quote from GitHub README & root LICENSE)*
* **Licence Verdict:** **USABLE for deriving weights**. MIT License granted on the primary GitHub repository.
* **Evaluation-Only Use Permitted:** Yes, evaluation and weight derivation permitted.
* **Models Included:** 29 model versions across 7 families:
  * **OpenAI:** GPT-4o, GPT-4, GPT-3.5-Turbo
  * **Anthropic:** Claude 3 / 3.5 series
  * **Google:** Gemini series
  * **Meta:** LLaMA-3 (8B, 70B), LLaMA-2 (7B, 13B, 70B)
  * **Alibaba:** Qwen 1.5 / Qwen 2
  * **Fine-tuned / Pruned:** ShareGPT-tuned LLaMA, Sheared-LLaMA
* **Domains:** 5 domains:
  * **SocialMedia** (Paraphrased social media posts)
  * **PeerRead** (Academic / professional critique)
  * **XSum** (News summarization)
  * **WritingPrompts** (Creative storytelling)
  * **PubMed** (Biomedical Q&A)
* **Size & Statistics:** 21,750 machine-generated texts paired with 21,750 human reference texts (43,500 total evaluation instances; extended benchmarks up to ~66k paired checks).
* **Human / AI Balance:** Strictly 1:1 balanced pairs.
* **Pre-2022 Human Text Baseline:** **Yes**. Uses standard pre-2022 reference corpora: XSum (2018), WritingPrompts (2018), and PeerRead (2018).
* **Adversarial & Humanized Variants:** Models three generation modes: prompt continuation, direct answering, and paraphrased evasion. Measures detector vulnerability specifically when model providers push silent checkpoint updates.
* **Value to Slop Shame:** Strong utility. Proves how heuristic weights calibrated on older LLaMA-2 or GPT-4 degrade when evaluated on GPT-4o and Claude 3.5, providing the multi-version calibration data needed to prevent false negatives against updated frontier models.

---

### 4. IntelLabs AI-Peer-Review-Detection-Benchmark (Feb 2025) — Rank 4 (Premier Evaluative Benchmark)

* **Repository:** Hugging Face [`IntelLabs/AI-Peer-Review-Detection-Benchmark`](https://huggingface.co/datasets/IntelLabs/AI-Peer-Review-Detection-Benchmark)
* **Paper:** *Is Your Paper Being Reviewed by an LLM? Benchmarking AI Text Detection in Peer Review* (arXiv:2502.19614, Feb 2025)
* **Maintainer:** Intel Labs (Sungduk Yu, Man Luo, Avinash Madusu, Vasudev Lal, Phillip Howard)
* **Exact Stated Licence:**
  > `"Intel OBL Internal R&D Use License Agreement"`  
  > `"Section 1.5 'R&D Purposes' means use of Material, Derivatives, and Output in non-commercial, exploratory or experimental activities... R&D Purposes excludes activities planned or anticipated for use outside of scientific research and development, including any commercial, production, deployment, distribution, monetization, sale or other revenue-generating use or purpose."`  
  > `"Section 2.1 License Grant: ...non-exclusive, non-transferable, royalty-free, limited copyright license... solely for R&D Purposes."`  
  > `"Section 2.3(b): You must specifically restrict the use of your Derivatives strictly to R&D Activities..."` *(Quotes from `LICENSE.md` on Hugging Face)*
* **Licence Verdict:** **NOT USABLE for deriving weights**. The Intel OBL explicitly excludes commercial use and mandates that any derivative works be restricted strictly to non-commercial internal R&D.
* **Evaluation-Only Use Permitted:** **Yes**. The grant explicitly permits non-commercial experimental benchmarking and evaluation.
* **Models Included:**
  * **GPT-4o** (OpenAI)
  * **Claude 3.5 Sonnet (v2)** (Anthropic)
  * **Gemini 1.5 Pro** (Google)
  * **LLaMA 3.1 70B** (Meta)
  * **Qwen 2.5 72B** (Alibaba)
* **Domains:** Formal academic and professional peer reviews (ICLR 2016–2024, NeurIPS 2016–2024).
* **Size & Splits:** 788,984 samples (~2.54 GB):
  * Calibration split: 75,824 samples
  * Test split: 287,052 samples
  * Extended split: 426,108 samples
* **Human / AI Balance:** Exactly 50% human reviews, 50% synthetic reviews (paired per submission paper).
* **Pre-2022 Human Text Baseline:** **Partially**. Reviews from 2016 through 2021 predate ChatGPT and are uncontaminated. However, reviews from 2022 through 2024 reflect live conference submissions that could contain unflagged reviewer LLM assistance.
* **Adversarial & Humanized Variants:** Includes full synthetic generations, outline-expanded generations, and LLM-assisted review edits.
* **Value to Slop Shame:** Highest qualitative domain proxy for LinkedIn. Academic peer reviews share the exact stylistic signatures of professional LinkedIn content: structured analytical critique, formal evaluative adjectives (*"comprehensive"*, *"pivotal"*, *"delves into"*, *"testament to"*), bulleted summaries, and balanced recommendations. While weights cannot be legally derived for commercial distribution, running offline evaluation on the pre-2022 calibration split offers the most accurate assessment of how Slop Shame handles modern frontier models (Claude 3.5 Sonnet and GPT-4o) in professional prose.

---

### 5. MultiSocial (ACL 2025) — Rank 5 (Dedicated Social Media Benchmark)

* **Repository:** Zenodo [`10.5281/zenodo.13846152`](https://doi.org/10.5281/zenodo.13846152) & GitHub [`kinit-sk/multisocial`](https://github.com/kinit-sk/multisocial)
* **Paper:** *MultiSocial: A Multilingual Benchmark for Machine-Generated Text Detection on Social Media* (ACL 2025 / arXiv:2406.12549)
* **Maintainer:** Dominik Macko, Jakub Kopál, Róbert Móro, Ivan Srba (Kempelen Institute of Intelligent Technologies - KInIT, Slovakia)
* **Exact Stated Licence:**
  * Zenodo record badge: `"Creative Commons Attribution 4.0 International"`
  * Zenodo description text: `"The intended use if for non-commercial research purpose only."`
  * GitHub `LICENSE`: `"GNU General Public License v3.0 (GPL-3.0)"`
* **Licence Verdict:** **NOT USABLE for deriving weights**. The Zenodo record imposes an explicit non-commercial restriction overriding the CC BY badge, and the companion codebase is copyleft GPL-3.0.
* **Evaluation-Only Use Permitted:** **Yes**. Academic, non-commercial evaluation is expressly supported.
* **Models Included:**
  * **Gemini-1.0-pro** (Google)
  * **GPT-3.5-Turbo-0125** (OpenAI)
  * **Mistral-7B-Instruct-v0.2** (Mistral AI)
  * **Aya-101** (Cohere For AI)
  * **OPT-IML-Max-30B** (Meta)
  * **v5-Eagle-7B-HF** and **Vicuna-13B**
  * *(Note: Does not include GPT-4o, Claude 3.5, or LLaMA-3)*
* **Domains:** Social media across 5 platforms: Twitter/X, Telegram, WhatsApp, Discord, and Gab, spanning 5 languages (English, Spanish, German, Slovak, Russian).
* **Size & Distribution:** 472,097 texts (58,358 human texts, 413,739 machine generations).
* **Human / AI Balance:** Unbalanced: ~1 human text for every 7 machine generations.
* **Pre-2022 Human Text Baseline:** **Yes**. Drawn from established pre-2022 social corpora: Sentiment140 (2009), Pushshift Telegram dumps (2020), and Gab dumps (2018).
* **Adversarial & Humanized Variants:** **Yes**. Employs 3 iterative rounds of LLM paraphrasing per text to simulate real-world adversarial evasion on social platforms.
* **Value to Slop Shame:** Useful reference for social media post dynamics (short lengths, informal syntax, conversational jargon), though limited by its lack of frontier 2024–2026 models and non-commercial licensing.

---

### 6. Defactify_Text_Dataset (Roy et al., 2026) — Rank 6

* **Repository:** Hugging Face [`Rajarshi-Roy-research/Defactify_Text_Dataset`](https://huggingface.co/datasets/Rajarshi-Roy-research/Defactify_Text_Dataset)
* **Paper:** *A Comprehensive Dataset for Human vs. AI Generated Text Detection* (arXiv:2510.22874, 2026)
* **Maintainer:** Rajarshi Roy, Gurpreet Singh, Amitava Das, Aman Chadha, et al.
* **Exact Stated Licence:**
  * Hugging Face repository: Completely omits a `license:` tag in YAML metadata; no `LICENSE` file present in the file tree.
  * arXiv preprint: `CC BY 4.0` applied to paper text.
* **Licence Verdict:** **NOT USABLE for weights**. The primary dataset repository on Hugging Face is unlicensed. Furthermore, the human reference text consists of scraped New York Times articles, which carry copyright restrictions preventing commercial weight training.
* **Evaluation-Only Use Permitted:** Yes, standard academic research evaluation.
* **Models Included:**
  * **GPT-4o**
  * **LLaMA-8B** (LLaMA-3)
  * **Mistral-7B**
  * **Qwen-2-72B**
  * **Gemma-2-9b**
  * **Yi-Large**
* **Domains:** Journalism / News narrative prose (New York Times).
* **Size:** 73,193 text samples (51,247 train, 10,983 validation, 10,963 test).
* **Human / AI Balance:** Balanced human articles vs model generations.
* **Pre-2022 Human Text Baseline:** Unspecified. NYT articles are modern and not filtered for pre-November 2022 dates.
* **Adversarial & Humanized Variants:** None. Direct text generation and model attribution.

---

### 7. C-ReD (Findings of ACL 2026) — Rank 7

* **Repository:** GitHub [`HeraldofLight/C-ReD`](https://github.com/HeraldofLight/C-ReD)
* **Paper:** *C-ReD: A Comprehensive Chinese Benchmark for AI-Generated Text Detection Derived from Real-World Prompts* (Findings of ACL 2026 / arXiv:2604.11796)
* **Maintainer:** HeraldofLight / Tsinghua University
* **Exact Stated Licence:**
  * GitHub repository: No `LICENSE` file in root (unlicensed).
  * ACL Anthology publication: `CC BY 4.0`.
* **Licence Verdict:** **NOT USABLE for weights**. Unlicensed repository; restricted to non-commercial research under default copyright.
* **Evaluation-Only Use Permitted:** Yes.
* **Models Included:** 9 LLMs, including GPT-4o, DeepSeek-R1, Qwen2.5, Qwen3, and ChatGPT.
* **Domains:** 5 domains (News, Academic Writing, Q&A, Film Reviews, Composition), in Chinese.
* **Size:** Comprehensive multi-generator Chinese benchmark.
* **Adversarial & Humanized Variants:** Focuses on realistic user prompt variance rather than synthetic noise.

---

### 8. BiScope_Data (NeurIPS 2024) — Rank 8

* **Repository:** Hugging Face [`HanxiGuo/BiScope_Data`](https://huggingface.co/datasets/HanxiGuo/BiScope_Data) & GitHub [`MarkGHX/BiScope`](https://github.com/MarkGHX/BiScope)
* **Paper:** *BiScope: Towards Explainable AI-Generated Text Detection via Bidirectional Spectrum Analysis* (NeurIPS 2024 / arXiv:2410.13824)
* **Maintainer:** Hanxi Guo et al.
* **Exact Stated Licence:**
  * Hugging Face dataset card: `"license: cc-by-nc-nd-4.0"`
  * GitHub repository: `"license: CC BY-SA 4.0"`
* **Licence Verdict:** **NOT USABLE for weights**. Both `CC BY-NC-ND 4.0` (Non-Commercial, No Derivatives) and `CC BY-SA 4.0` (ShareAlike copyleft) prohibit deriving commercial heuristic weights for an MIT tool.
* **Evaluation-Only Use Permitted:** Yes, for non-commercial academic evaluation.
* **Models Included:** GPT-4, Claude 3, LLaMA-3, Mistral.
* **Domains:** Academic, News, Stories (~60,000 samples).

---

### 9. WETBench & TSM-Bench (WikiNLP 2025 / ICLR 2026) — Rank 9

* **Repository:** Hugging Face [`gerritq/mWNC`](https://huggingface.co/datasets/gerritq/mWNC) & GitHub [`gerritq/WETBench`](https://github.com/gerritq/WETBench)
* **Paper:** *WETBench: Benchmarking Machine-Generated Text Detection on Wikipedia* (WikiNLP 2025 / arXiv:2507.03373) and *TSM-Bench* (ICLR 2026 / arXiv:2605.31113)
* **Maintainer:** Gerrit Quaremba et al.
* **Exact Stated Licence:**
  * Datasets: `"CC BY-SA 4.0"` (Inherited from Wikipedia's open content licensing terms).
* **Licence Verdict:** **NOT USABLE for weights**. The ShareAlike provision requires downstream adaptations to be shared under the same license.
* **Evaluation-Only Use Permitted:** Yes.
* **Models Included:** LLaMA-3 (8B/70B), Mistral-7B, GPT-4o-mini.
* **Domains:** Wikipedia Neutral Point of View (NPOV) revisions and task-specific machine-generated text edits (~150,000 samples).

---

### 10. Voight-Kampff Generative AI Benchmark (PAN @ CLEF 2025) — Rank 10

* **Repository:** PAN @ CLEF [`pan-webis-de/pan25-generative-ai`](https://github.com/pan-webis-de/pan25-generative-ai) & Zenodo
* **Paper:** *Overview of the Voight-Kampff Generative AI Detection Task at PAN 2025*
* **Maintainer:** Webis Group / PAN CLEF Organizers
* **Exact Stated Licence:**
  * Zenodo / TIRA distribution: `"The material in this dataset is copyrighted and may be used only for research purposes. No redistribution allowed."`
* **Licence Verdict:** **NOT USABLE for weights**. Strictly restricted to research evaluation under no-redistribution copyright terms.
* **Evaluation-Only Use Permitted:** Yes, via registered competition access.
* **Models Included:** GPT-4o, Claude 3.5 Sonnet, LLaMA-3.
* **Domains:** Mixed web articles, student essays, and book reviews.

---

## Domain Relevance: Bridging to LinkedIn and Professional Prose

Public AI detection datasets face an acute structural gap: **there is virtually no public, permissively licensed, native LinkedIn AI detection dataset**. This absence is driven by:
1. **LinkedIn Terms of Service:** Section 8.2 strictly prohibits scraping, robotic harvesting, or automated data extraction.
2. **Litigation Risk:** High-profile legal battles (e.g., *hiQ Labs v. LinkedIn*) have reinforced corporate reluctance to distribute scraped LinkedIn corpora.
3. **Privacy Regulations:** GDPR and CCPA restrict republishing personally identifiable professional profiles and communications.

### How Benchmarks Proxy LinkedIn Discourse

To calibrate an offline detector for LinkedIn without scraping protected profiles, existing benchmarks provide three robust proxy environments:

| Benchmark | Proxy Feature | Proximity to LinkedIn Slop | Usable for Weights? |
| :--- | :--- | :--- | :--- |
| **IntelLabs AI-Peer-Review** | Formal evaluative peer reviews (ICLR/NeurIPS) | **Very High**: Mirrors long-form LinkedIn "thought leadership", self-important appraisal, structural bullet points, and clichéd academic/corporate transitions (*"testament to"*, *"pivotal milestone"*, *"delves deep"*). | **No** (Intel OBL R&D only; use strictly for local offline validation). |
| **LLM-DetectAIve** | *Human-Written Machine-Polished* & *Reddit discussions* | **High**: Directly reflects the standard LinkedIn user behavior of typing a personal career milestone or hiring update and using ChatGPT/Claude to polish it into corporate vernacular. | **Yes** (MIT License). |
| **DetectRL-X** | *SEO/Marketing Content* & *Structural Polishing/Condensing* | **High**: Directly captures promotional copy, brand announcements, and syntactically smoothed text produced by GPT-4o and DeepSeek-V3. | **Yes** (MIT License). |
| **EvoBench** | *SocialMedia & PeerRead Paraphrasing* | **Medium**: Evaluates short-form social posts across continuous model updates (GPT-4o vs Claude 3.5). | **Yes** (MIT License). |

---

## Strategic Recommendation for Slop Shame

1. **Primary Weight Derivation Pipeline:**
   * Extract the English subsets of **DetectRL-X** (MIT) and **LLM-DetectAIve** (MIT).
   * Specifically isolate the `llm_refined_text` and `polishing` subsets from DetectRL-X, along with the `Human-Written Machine-Polished` subset from LLM-DetectAIve.
   * Calibrate Slop Shame’s n-gram repetition, syntactic predictability, and corporate transition heuristics against these classes. Because both datasets are licensed under MIT with pre-2022 human text baselines, derived weights are legally safe for distribution in the browser extension.

2. **Validation and Stress-Testing Pipeline (Evaluation-Only):**
   * Use **IntelLabs AI-Peer-Review-Detection-Benchmark** (under its Intel OBL R&D license) strictly inside an offline test runner.
   * While its weights must not be incorporated into the extension, evaluating Slop Shame's false-positive and false-negative rates against IntelLabs' 788k samples provides an unmatched stress test for long-form, formal evaluative text generated by GPT-4o and Claude 3.5 Sonnet v2.
