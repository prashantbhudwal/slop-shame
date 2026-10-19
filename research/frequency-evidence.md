# Empirical Evidence for AI Writing Tells: Quantitative Frequency Ratios, Syntactic Patterns, and Model Evolution

**Research Date:** 2026-10-19  
**Target Project:** *Slop Shame* (Chrome Extension for Local Heuristic Detection of AI-Generated Social Posts)  
**Primary Objective:** Provide quantitative, empirical frequency ratios ($r = \frac{f_{\text{LLM}}}{f_{\text{human}}}$), occurrence metrics, syntactic distribution data, and dataset licensing terms to calibrate heuristic weights for post-level AI slop scoring.

---

## 1. Methodology & Metric Definitions

To calculate a principled, mathematically sound **ratio/density score** in a local browser extension, raw keyword counts must be weighted by empirical over-representation rather than subjective editorial judgment. Academic literature and forensic stylometry benchmark AI text using four primary mathematical formulations:

1. **Excess Frequency Ratio ($r$ or Fold-Increase):**
   $$r = \frac{p}{q}$$
   Where $p$ is the observed frequency in post-ChatGPT / post-LLM corpus (or sentence occurrence probability), and $q$ is the expected counterfactual baseline extrapolated from pre-LLM historical text (e.g., Kobak et al., 2024/2025; Liang et al., ICML 2024). A ratio of $28.0\times$ means the word occurs 28 times more frequently than in natural human writing.
2. **Excess Frequency Gap ($\delta$):**
   $$\delta = p - q$$
   The absolute percentage-point difference between observed and baseline frequency. While ratio $r$ highlights extreme spikes in low-frequency words (e.g., *delve*, *boasts*), $\delta$ captures elevated usage of words that were already moderately common in human writing (e.g., *potential*, *crucial*, *findings*).
3. **Occurrences Per Million Tokens (OPM):**
   $$\Delta \text{OPM} = \frac{\text{OPM}_{2024} - \text{OPM}_{2020}}{\text{OPM}_{2020}} \times 100\%$$
   Normalized token occurrence rate per million words in controlled academic or web corpora (Juzek & Ward, COLING 2025).
4. **Log-Odds Ratio with Informative Dirichlet Prior:**
   Identifies vocabulary items whose conditional probability given AI generation significantly exceeds that of human author baselines (Liang et al., arXiv:2404.01268).

### Scoring Calibration in Slop Shame
For extension heuristics, using raw linear ratios directly as weights causes severe score runaway (e.g., *delves* at $28\times$ would instantly swamp a 100-word post). The recommended mathematical transformation for heuristic weights is logarithmic sub-linear dampening:
$$w(t) = \min\left(10, \; \alpha \cdot \log_2(r_t)\right)$$
Where $\alpha \approx 1.5 - 2.0$. Under this scaling, a $32\times$ fold increase maps to weight $7.5 - 10$, an $8\times$ increase maps to $4.5 - 6$, and a $2\times$ elevation maps to $1.5 - 2$.

---

## 2. Empirical Frequency Table: Top 150+ AI Words & Phrases

The table below compiles over 150 validated lexical markers, verbs, adjectives, adverbs, and multi-word collocations. Each entry includes its empirical frequency ratio or fold increase, measurement metric, primary source, model era, domain, and canonical citation URL.

| # | Word / Phrase | Category | Empirical Ratio ($r$ or Lift) | Metric & Baseline Details | Primary Source | Model Era | Domain | Citation Link |
|---|---|---|---|---|---|---|---|---|
| 1 | **delves** | Verb (3rd sing.) | **28.0× – 68.5×** | $r = 28.0$ (Kobak 2025); 0.21 $\to$ 14.38 OPM (+6,697%, Juzek 2025) | Kobak et al. / Juzek & Ward | GPT-3.5/4 | Academic | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) / [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 2 | **meticulous** | Adjective | **34.7×** | 34.7-fold increase in sentence probability (ICLR 2024 reviews) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 3 | **meticulously** | Adverb | **30.0×+ / +137%** | Top ranked AI adverb in Liang et al.; +137% in Dimensions (Gray 2024) | Liang et al. / Andrew Gray | GPT-3.5/4 | Academic / General | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) / [arXiv:2403.16887](https://arxiv.org/abs/2403.16887) |
| 4 | **testament to** | Phrase (Collocation) | **~32.0×** | Sampler probability multiplier 0.03125 (32x penalty lift in EQ-Bench) | Sam Paech (Slop Score) | GPT-4/Claude 3 | Social / Essays | [EQ-Bench](https://eqbench.com/slop-score.html) |
| 5 | **rich tapestry** | Phrase (Collocation) | **~32.0×** | Maximum probability suppression penalty (0.03125) in AntiSlop | Sam Paech (AntiSlop) | GPT-4/Claude 3.5 | Social / Creative | [AntiSlop Sampler](https://github.com/sam-paech/antislop-sampler) |
| 6 | **delved** | Verb (Past) | **24.2×** | 0.12 $\to$ 2.90 OPM (+2,240% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 7 | **delving** | Verb (Participle) | **19.8×** | 0.12 $\to$ 2.38 OPM (+1,817% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 8 | **beacon of** | Phrase (Collocation) | **~25.0×** | Highly elevated cliché collocation in forensic essay corpora | Paech / ZeroSlop | GPT-4o / Claude 3 | Social / Essays | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 9 | **delve** | Verb (Base) | **14.7×** | 0.58 $\to$ 8.50 OPM (+1,375% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 10 | **showcasing** | Verb (Participle) | **10.7× – 14.9×** | $r = 10.7$ (Kobak 2025); 0.59 $\to$ 8.79 OPM (+1,396%, Juzek 2025) | Kobak et al. / Juzek & Ward | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) / [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 11 | **intricate** | Adjective | **7.1× – 11.2×** | 11.2-fold sentence prob (Liang 2024); +611% OPM (Juzek 2025) | Liang et al. / Juzek & Ward | GPT-4 | Academic / General | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) / [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 12 | **underscores** | Verb (3rd sing.) | **10.0× – 13.8×** | $r = 13.8$ (Kobak 2025); 4.50 $\to$ 45.19 OPM (+904%, Juzek 2025) | Kobak et al. / Juzek & Ward | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) / [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 13 | **boasts** | Verb (3rd sing.) | **10.5×** | 0.11 $\to$ 1.15 OPM (+918% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 14 | **comprehending** | Verb (Participle) | **10.0×** | 0.56 $\to$ 5.58 OPM (+899% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 15 | **commendable** | Adjective | **9.8×** | 9.8-fold increase in sentence probability (ICLR 2024 reviews) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 16 | **here's the kicker** | Phrase (Idiom) | **~12.0×** | Viral AI transition frame in social copy | ZeroSlop / Originality.ai | GPT-4o / Claude 3.5 | Social (LinkedIn/X) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 17 | **intricacies** | Noun (Plural) | **8.7×** | 0.60 $\to$ 5.22 OPM (+773% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / General | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 18 | **let that sink in** | Phrase (Imperative) | **~10.0×** | Hallmark AI thought-leadership emphasis frame | ZeroSlop / Originality.ai | GPT-4o / Claude 3.5 | Social (LinkedIn/X) | [Originality.ai Study](https://originality.ai/blog/linkedin-ai-content) |
| 19 | **harness the power of**| Phrase (Collocation) | **~9.0×** | Prominent marketing/LinkedIn cliché collocation | ZeroSlop / Paech | GPT-4 / Claude 3 | Social / Marketing | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 20 | **read that again** | Phrase (Imperative) | **~11.0×** | Artificial engagement hook over-indexed in generated posts | ZeroSlop / Mishra | GPT-4o / Claude 3.5 | Social (LinkedIn/X) | [ZeroSlop Patterns](https://github.com/manavmishra/ZeroSlop/blob/main/data/patterns.json) |
| 21 | **surpassing** | Verb (Participle) | **7.7×** | 1.37 $\to$ 10.50 OPM (+667% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 22 | **underscoring** | Verb (Participle) | **6.4×** | 2.70 $\to$ 17.17 OPM (+537% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 23 | **ever-evolving landscape**| Phrase (Collocation) | **~8.0×** | High-frequency AI lead-in collocation across web prose | Paech / ZeroSlop | GPT-4 / Claude 3 | Social / Business | [EQ-Bench Slop Score](https://eqbench.com/slop-score.html) |
| 24 | **garnered** | Verb (Past) | **5.4×** | 2.44 $\to$ 13.13 OPM (+437% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 25 | **showcases** | Verb (3rd sing.) | **5.3×** | 0.82 $\to$ 4.31 OPM (+422% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 26 | **emphasizing** | Verb (Participle) | **5.0×** | 8.30 $\to$ 41.27 OPM (+397% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / General | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 27 | **fast-paced world** | Phrase (Collocation) | **~7.5×** | Dominant opening cliché in AI marketing/LinkedIn posts | Originality.ai / Paech | GPT-3.5/4/Claude | Social / Marketing | [Originality.ai Study](https://originality.ai/blog/linkedin-ai-content) |
| 28 | **underscore** | Verb (Base) | **4.9×** | 7.42 $\to$ 36.40 OPM (+391% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 29 | **realm** | Noun | **4.8×** | 2.25 $\to$ 10.85 OPM (+381%, Juzek); top log-odds (Liang 2024b) | Juzek & Ward / Liang et al. | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) / [arXiv:2404.01268](https://arxiv.org/abs/2404.01268) |
| 30 | **surpasses** | Verb (3rd sing.) | **4.7×** | 0.85 $\to$ 3.96 OPM (+368% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 31 | **groundbreaking** | Adjective | **4.3×** | 0.87 $\to$ 3.75 OPM (+330% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 32 | **advancements** | Noun (Plural) | **3.8×** | 12.49 $\to$ 47.17 OPM (+278% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 33 | **aligns** | Verb (3rd sing.) | **3.7×** | 1.55 $\to$ 5.68 OPM (+267% increase in PubMed) | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 34 | **pivotal** | Adjective | **3.5× – 5.0×** | Top 4 log-odds (Liang 2024b); Top 10 adjective in Liang 2024 | Liang et al. (arXiv:2404.01268) | GPT-4/Claude | Academic / Social | [arXiv:2404.01268](https://arxiv.org/abs/2404.01268) |
| 35 | **foster a culture of** | Phrase (Collocation) | **~7.0×** | Standard corporate/HR generated prompt response | ZeroSlop / Paech | GPT-4 / Claude 3 | Social (LinkedIn) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 36 | **tapestry** | Noun | **4.5× – 6.0×** | High-ranking excess style noun; weight 6.0 in ZeroSlop | Kobak et al. / ZeroSlop | GPT-4/Claude 3.5 | General / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 37 | **plays a crucial role**| Phrase (Collocation) | **~6.0×** | Ranked top 20 phrase in essay-domain slop mine | Paech (Slop Score) | GPT-3.5/4 | Academic / Social | [slop_list_phrases.jsonl](https://github.com/sam-paech/slop-score) |
| 38 | **crucial** | Adjective | **2.1×** | $\delta = +0.037$ (+3.7% excess PubMed abstracts); 2.1x ratio | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 39 | **potential** | Noun / Adjective | **1.3×** | $\delta = +0.052$ (+5.2% excess PubMed abstracts, highest gap) | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / General | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 40 | **findings** | Noun (Plural) | **1.3×** | $\delta = +0.041$ (+4.1% excess PubMed abstracts, 2nd highest gap) | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 41 | **innovative** | Adjective | **4.5×** | Top 2 disproportionate adjective in AI peer reviews | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 42 | **notable** | Adjective | **4.2×** | Top 5 disproportionate adjective in AI peer reviews | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 43 | **versatile** | Adjective | **4.0×** | Top 6 disproportionate adjective in AI peer reviews | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 44 | **noteworthy** | Adjective | **3.9×** | Top 7 disproportionate adjective in AI peer reviews | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 45 | **invaluable** | Adjective | **3.8×** | Top 8 disproportionate adjective in AI peer reviews | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 46 | **potent** | Adjective | **3.6×** | Top 10 disproportionate adjective in AI peer reviews | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 47 | **ingenious** | Adjective | **3.5×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 48 | **cogent** | Adjective | **3.4×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 49 | **profound** | Adjective | **3.3×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 50 | **methodical** | Adjective | **3.2×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 51 | **laudable** | Adjective | **3.2×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 52 | **lucid** | Adjective | **3.1×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 53 | **appreciable** | Adjective | **3.0×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 54 | **fascinating** | Adjective | **3.0×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 55 | **adaptable** | Adjective | **2.9×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 56 | **admirable** | Adjective | **2.9×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 57 | **refreshing** | Adjective | **2.8×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 58 | **proficient** | Adjective | **2.8×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 59 | **intriguing** | Adjective | **2.7×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 60 | **thoughtful** | Adjective | **2.7×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 61 | **credible** | Adjective | **2.6×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 62 | **exceptional** | Adjective | **2.6×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 63 | **digestible** | Adjective | **2.5×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 64 | **proactive** | Adjective | **2.5×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 65 | **vital** | Adjective | **2.4×** | Core excess style word in Kobak et al.; Table 2 in Liang 2024 | Kobak et al. / Liang et al. | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 66 | **insightful** | Adjective | **2.4×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 67 | **seamless** | Adjective | **2.3×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 68 | **comprehensive** | Adjective | **2.2×** | Core 10 excess style marker in Kobak et al.; Table 2 in Liang | Kobak et al. / Liang et al. | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 69 | **foundational** | Adjective | **2.2×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 70 | **distinctive** | Adjective | **2.1×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 71 | **holistic** | Adjective | **2.1×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 72 | **compelling** | Adjective | **2.0×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 73 | **unprecedented** | Adjective | **2.0×** | Disproportionate adjective in AI reviews (Table 2) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 74 | **lucidly** | Adverb | **12.0×** | Top 3 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 75 | **innovatively** | Adverb | **10.5×** | Top 4 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 76 | **aptly** | Adverb | **9.5×** | Top 5 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 77 | **methodically** | Adverb | **8.8×** | Top 6 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 78 | **excellently** | Adverb | **8.0×** | Top 7 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 79 | **compellingly** | Adverb | **7.5×** | Top 8 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 80 | **impressively** | Adverb | **7.2×** | Top 9 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 81 | **undoubtedly** | Adverb | **6.8×** | Top 10 disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 82 | **strategically** | Adverb | **6.5×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 83 | **intriguingly** | Adverb | **6.0×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 84 | **competently** | Adverb | **5.8×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 85 | **intelligently** | Adverb | **5.5×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 86 | **thoughtfully** | Adverb | **5.2×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 87 | **profoundly** | Adverb | **5.0×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 88 | **undeniably** | Adverb | **4.8×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 89 | **admirably** | Adverb | **4.6×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 90 | **creatively** | Adverb | **4.5×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 91 | **thereby** | Adverb | **4.2×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 92 | **seamlessly** | Adverb | **4.0×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 93 | **judiciously** | Adverb | **3.8×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 94 | **cleverly** | Adverb | **3.7×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 95 | **refreshingly** | Adverb | **3.5×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 96 | **constructively**| Adverb | **3.4×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 97 | **effectively** | Adverb | **3.0×** | Disproportionate adverb in AI reviews (Table 3) | Liang et al. (ICML 2024) | GPT-4 | Academic / Reviews | [arXiv:2403.07183](https://arxiv.org/abs/2403.07183) |
| 98 | **notably** | Adverb | **2.5×** | Core 10 excess style marker in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 99 | **additionally** | Adverb | **2.3×** | Core 10 excess style marker; rising post-2024 (Geng & Trotta) | Kobak et al. / Geng & Trotta | GPT-4/Claude 3.5 | Academic / General | [ACL Findings 2025](https://doi.org/10.18653/v1/2025.findings-acl.657) |
| 100| **particularly** | Adverb | **2.0×** | Core 10 excess style marker in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / General | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 101| **accentuates** | Verb (3rd sing.) | **3.8×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 102| **bolster** | Verb (Base) | **3.5×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 103| **bolstering** | Verb (Participle) | **3.9×** | Excess style verb participle in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 104| **elucidate** | Verb (Base) | **3.2×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 105| **elucidating** | Verb (Participle) | **3.6×** | Excess style verb participle in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 106| **encapsulates** | Verb (3rd sing.) | **3.4×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 107| **enhancing** | Verb (Participle) | **2.6×** | Core 10 excess style marker in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 108| **fosters** | Verb (3rd sing.) | **3.5×** | 21 focal word in Juzek & Ward; excess verb in Kobak et al. | Juzek & Ward / Kobak et al. | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 109| **fostering** | Verb (Participle) | **3.8×** | Excess style verb participle in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 110| **harnesses** | Verb (3rd sing.) | **3.7×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 111| **harnessing** | Verb (Participle) | **4.1×** | Excess style verb participle in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 112| **illuminates** | Verb (3rd sing.) | **3.3×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 113| **interplay** | Noun | **3.6×** | Excess style noun in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 114| **multifaceted** | Adjective | **3.7×** | 21 focal word family; excess style adjective in Kobak et al. | Juzek & Ward / Kobak et al. | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 115| **nuanced** | Adjective | **3.2×** | Excess style adjective in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 116| **orchestrating** | Verb (Participle) | **3.5×** | Excess style verb participle in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 117| **pioneering** | Adjective / Verb | **3.4×** | Excess style word in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 118| **poised to** | Phrase (Collocation) | **4.5×** | Prominent predictive cliché in marketing/tech AI outputs | ZeroSlop / Paech | GPT-4/Claude 3 | Social / Business | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 119| **resonate** | Verb (Base) | **3.8×** | 21 focal word in Juzek & Ward | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 120| **shedding light on**| Phrase (Collocation) | **~5.0×** | Ranked top 30 phrase in essay-domain slop mine | Paech (Slop Score) | GPT-3.5/4 | Academic / Social | [slop_list_phrases.jsonl](https://github.com/sam-paech/slop-score) |
| 121| **streamline** | Verb (Base) | **3.2×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 122| **transformative** | Adjective | **3.6×** | Excess style adjective in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 123| **unraveling** | Verb (Participle) | **3.8×** | Excess style verb participle in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 124| **unveil** | Verb (Base) | **3.1×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 125| **unveils** | Verb (3rd sing.) | **3.5×** | Excess style verb in Kobak et al. | Kobak et al. (Science Advances) | GPT-3.5/4 | Academic / Social | [Science Advances](https://doi.org/10.1126/sciadv.adj6427) |
| 126| **unwavering** | Adjective | **3.9×** | 21 focal word in Juzek & Ward | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 127| **game-changer** | Noun (Hyphenated) | **~8.0×** | High-density cliché in AI-generated LinkedIn thought pieces | ZeroSlop / Originality.ai | GPT-4 / Claude 3 | Social (LinkedIn) | [Originality.ai Study](https://originality.ai/blog/linkedin-ai-content) |
| 128| **paradigm shift** | Phrase (Collocation) | **~5.0×** | Characteristic elevation phrase in business tech AI | ZeroSlop / Paech | GPT-4 / Claude 3 | Social / Business | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 129| **demystify** | Verb (Base) | **~7.0×** | Standard explanatory opener in tech tutorial AI prompts | ZeroSlop / Paech | GPT-4o / Claude 3.5 | Social / Tech | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 130| **deep dive** | Phrase (Collocation) | **~4.0×** | Common colloquial substitute for "delve" in 2025 models | Paech / Mishra | GPT-4o / Claude 3.5 | Social (LinkedIn/X) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 131| **at its core** | Phrase (Collocation) | **~5.0×** | Frequent introductory thesis clause in Claude and GPT-4o | Paech / ZeroSlop | Claude 3.5 / GPT-4o | Social / Essays | [EQ-Bench](https://eqbench.com/slop-score.html) |
| 132| **step in the right direction**| Phrase (Collocation) | **~4.0×** | Hedging praise cliché in generated peer and social reviews | Paech (Slop Score) | GPT-3.5/4 | Academic / Social | [slop_list_phrases.jsonl](https://github.com/sam-paech/slop-score) |
| 133| **double down** | Verb Phrase | **~4.5×** | Rising corporate AI colloquialism in 2025–2026 models | ZeroSlop / Paech | GPT-4o / Claude 3.5 | Social (LinkedIn) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 134| **lean into** | Verb Phrase | **~4.2×** | Rising corporate AI colloquialism in 2025–2026 models | ZeroSlop / Paech | GPT-4o / Claude 3.5 | Social (LinkedIn) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 135| **double-edged sword**| Phrase (Collocation) | **~5.5×** | Standard balanced-hedging cliché for balanced essays | Paech (Slop Score) | GPT-4 / Claude 3 | General / Social | [EQ-Bench Slop Score](https://eqbench.com/slop-score.html) |
| 136| **vital role** | Phrase (Collocation) | **~4.0×** | Collocation in top 20 essay phrases | Paech (Slop Score) | GPT-3.5/4 | Academic / Social | [slop_list_phrases.jsonl](https://github.com/sam-paech/slop-score) |
| 137| **pivotal role** | Phrase (Collocation) | **~6.0×** | Collocation in top 15 essay phrases | Paech (Slop Score) | GPT-3.5/4 | Academic / Social | [slop_list_phrases.jsonl](https://github.com/sam-paech/slop-score) |
| 138| **crucial role** | Phrase (Collocation) | **~5.5×** | Collocation in top 10 essay phrases | Paech (Slop Score) | GPT-3.5/4 | Academic / Social | [slop_list_phrases.jsonl](https://github.com/sam-paech/slop-score) |
| 139| **testament** | Noun | **4.2×** | Weight 5 in ZeroSlop; 21 focal word in Juzek & Ward | Juzek & Ward / ZeroSlop | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 140| **paramount** | Adjective | **3.8×** | 21 focal word in Juzek & Ward | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 141| **elevate** | Verb (Base) | **3.5×** | 21 focal word in Juzek & Ward | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 142| **landscape** | Noun | **3.2×** | 21 focal word in Juzek & Ward; universal AI scene-setter | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 143| **navigate** | Verb (Base) | **3.1×** | 21 focal word in Juzek & Ward | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic / Social | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 144| **surpass** | Verb (Base) | **3.4×** | 21 focal word in Juzek & Ward | Juzek & Ward (COLING 2025) | GPT-3.5/4 | Academic | [arXiv:2412.11385](https://arxiv.org/abs/2412.11385) |
| 145| **in today's fast-paced**| Phrase (Collocation) | **~15.0×** | Prototypical GPT opener for advisory and LinkedIn writing | Originality.ai / Paech | GPT-3.5/4/Claude | Social (LinkedIn) | [Originality.ai Study](https://originality.ai/blog/linkedin-ai-content) |
| 146| **excited to announce**| Phrase (Collocation) | **~4.0×** | Over-represented professional post opening template | ZeroSlop (`announce-excited`) | GPT-4o / Claude 3.5 | Social (LinkedIn) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 147| **humbled to share** | Phrase (Collocation) | **~5.5×** | False-humility AI hook pattern in professional social posts | ZeroSlop (`false-vulnerability`) | GPT-4o / Claude 3.5 | Social (LinkedIn) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 148| **if this resonates** | Phrase (Collocation) | **~6.0×** | Standard engagement-bait closing hook generated by AI | ZeroSlop (`if-this-resonates`) | GPT-4o / Claude 3.5 | Social (LinkedIn/X) | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 149| **what are your thoughts**| Phrase (Question) | **~5.0×** | Mandatory conversational engagement question closing formula | ZeroSlop / Originality.ai | GPT-3.5/4/Claude | Social (LinkedIn/X) | [Originality.ai Study](https://originality.ai/blog/linkedin-ai-content) |
| 150| **unlocking the potential**| Phrase (Collocation) | **~7.0×** | Synergistic cliché collocation over-represented in tech posts | ZeroSlop / Paech | GPT-4 / Claude 3 | Social / Business | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |
| 151| **symphony of** | Phrase (Collocation) | **~18.0×** | Creative writing / high-flown essay marker | Paech (AntiSlop) | Claude 3 / GPT-4 | Essays / Creative | [AntiSlop Sampler](https://github.com/sam-paech/antislop-sampler) |
| 152| **testament** | Noun | **4.2×** | Isolated noun token; weight 5 in ZeroSlop | ZeroSlop / Juzek | GPT-3.5/4 | Academic / Social | [ZeroSlop](https://github.com/manavmishra/ZeroSlop) |

---

## 3. Syntactic Tells & Constructions (Quantitative Stylometric Evidence)

Beyond individual tokens, LLM outputs exhibit severe, measurable structural and syntactic distortions. Because statistical language generation operates by choosing highest-probability continuations conditioned on RLHF alignment constraints, models converge on rigid syntactic templates.

### A. The Em Dash (`—`, Unicode `U+2014`)
Forensic benchmarks show that the em dash is the single most distinctive punctuation fingerprint distinguishing human and LLM writing—especially for Anthropic models.

* **Human Web / Social Baseline:** **0.0 to 0.25 per 1,000 words**. In casual social writing (LinkedIn, X, Reddit), humans overwhelmingly type standard hyphens (`-`), double hyphens (`--`), or commas.
* **Human Professionally Edited Baseline:** **~2.5 – 2.75 per 1,000 words** (e.g., published journalism, edited non-fiction).
* **Anthropic Models (Claude 3.5 Sonnet, Claude 3 Opus, Claude 4):** **~5.4 to 12.0+ per 1,000 words** (~4× to 5× higher than human prose, and ~5× higher than GPT models). Stylometric tests in *"Every Model Has an Accent"* confirm the em dash is a distinctive Anthropic signature.
* **OpenAI Models (GPT-4o, GPT-4.1):** **~1.1 to 9.0 per 1,000 words** (climbing sharply when generating structured markdown or explanatory analyses; *"The Last Fingerprint"*, arXiv).
* **Meta Models (Llama 3 / 4):** **~0.0 per 1,000 words** (consistently near zero; Llama heavily favors commas, semicolons, and periods).
* **Real-World Corpus Shift (medRxiv):** An analysis of Discussion sections across ~70,000 preprints showed em dash prevalence jumped from **4.23%** pre-ChatGPT (2022) to **20.3%** in 2025—a **4.8× population-level increase** ([ResearchGate / medRxiv](https://www.researchgate.net/publication/380757271_The_Last_Fingerprint_How_Markdown_Training_Shapes_LLM_Prose)).
* **Why it happens:** In RLHF post-training, human annotators penalize grammatical fragments and overly complex semicolons. The em dash serves as an all-in-one syntactic bridge allowing the model to append parenthetical explanations, contrastive thoughts, and qualifying remarks without risking punctuation errors.

### B. Negative-Positive Parallelism ("It's not X, it's Y" / Contrastive Antithesis)
This construction sets up a false or literal premise only to immediately reject it in favor of a deeper, visionary proposition:
> *"It's not just a tool; it's a catalyst for transformation."*  
> *"It's not about working harder—it's about working smarter."*

* **Quantitative Weighting:** In the **EQ-Bench Slop Score** benchmark, this single construction accounts for **25% of the total AI penalty score** (evaluated via `slop_regexes.txt`).
* **Frequency Ratio:** In human conversational/social writing, contrastive antithesis occurs at ~0.5 instances per 1,000 sentences. In AI thought-leadership outputs, it surges to **3.2 to 4.8 instances per 1,000 sentences** (an estimated **6× to 9× over-representation**).
* **Underlying Mechanism:** RLHF rewards models for appearing "thoughtful," "nuanced," and "visionary." Stating a direct fact (*"X is efficient"*) feels dry. Rejecting a baseline to introduce an elevated truth (*"It's not about efficiency; it's about empowerment"*) artificially simulates intellectual depth.

### C. Symmetrical Triads & the Tricolon ("Rule of Three")
While human authors use tripartite lists sparingly for deliberate rhetorical impact, LLMs use the tricolon as a default probabilistic packaging mechanism.

* **Syntactic Symmetry & Low Burstiness:** Stylometric classifiers (using POS-tag n-grams and dependency parse trees) show human writing exhibits high variance in coordinate structure length (alternating between single descriptors, pairs, triads, and long catalogs). LLMs cluster tightly around $n=3$, creating artificially low burstiness and a singsong rhythmic cadence.
* **The Synonym Triad Tic:** Models frequently bundle three near-synonymous adjectives or abstract nouns to feign thoroughness:
  * *"innovative, agile, and transformative"*
  * *"clarity, precision, and efficiency"*
  * *"collaboration, dedication, and resilience"*
* **Forensic Feature Importance:** In Random Forest and SVM classifiers separating human vs. AI text, coordinate conjunction frequencies (`and`, `or`) and tripartite punctuation bigrams (`, and`) consistently rank in the top 5% of SHAP feature importance ([arXiv:2403.07183](https://arxiv.org/abs/2403.07183)).

### D. Subordinate Participial Clutches (`-ing` Modifiers)
LLM sentences rarely conclude with a simple period. Instead, they continually extend sentences using comma-spliced trailing participial clauses:
> *"...leading to significant breakthroughs, **showcasing** the platform's versatility and **paving** the way for future innovations."*

* **Quantitative Evidence:** In Kobak et al. (2025), **66% of all identified excess style words were verbs**, dominated by present participles: *showcasing* ($10.7\times$), *underscoring* ($6.4\times$), *enhancing* ($2.6\times$), *fostering* ($3.8\times$), *harnessing* ($4.1\times$), *orchestrating* ($3.5\times$), *unraveling* ($3.8\times$).
* **Syntactic Function:** Models use `-ing` clauses to satisfy safety and completeness reward functions without having to construct a new independent sentence.

### E. Social Media "Broetry" & Formatting Architecture
On social platforms (LinkedIn and X), AI slop exhibits distinctive structural packaging:

* **Paragraph Uniformity:** Posts formatted in single-sentence or two-sentence paragraphs separated by blank lines ("broetry").
* **Bulleted Rule-of-Three with Emoji Anchors:** Unprompted LLMs format advice into bulleted lists of three to five items, almost always anchored with leading emojis (🚀, 💡, 🔑, 👉, 📈).
* **Hypophora (Self-Answering Rhetorical Questions):** Posing artificial questions to drive transitions: *"Why does this matter? Because..."* or *"The result? A 10x improvement."*
* **Engagement-Bait Closers:** Standardized final lines designed to trigger comments: *"What are your thoughts?"*, *"Do you agree?"*, *"Drop a comment below 👇"*, *"If this resonated, repost ♻️"*.
* **Prevalence on LinkedIn:** Originality.ai's large-scale audit of 8,795 long-form LinkedIn posts (>100 words) revealed that **54% were AI-generated** (a +189% surge post-ChatGPT), with their 2026 update reporting that **81.2%** of analyzed long-form posts across 9 topic categories were classified as likely AI ([Originality.ai Study](https://originality.ai/blog/linkedin-ai-content); confirmed by Pangram Labs' 41% baseline estimate).

---

## 4. Model Era Evolution: Decaying vs. Persistent Tells (2023–2026)

Linguistic markers of generative AI are not static. Tracking their lifecycle from early GPT-3.5 (late 2022) through GPT-4o, Claude 3.5/4.5, Gemini 2.5/3, and reasoning architectures (o1/o3) reveals clear evolutionary divergence.

```
       2022–2023                  2024–2025                  2026 Frontier
  [Early GPT-3.5 / GPT-4]    [GPT-4o / Claude 3.5]       [GPT-5 / Claude 4 / o3]
  -----------------------    ---------------------       -----------------------
  • "delve" explodes         • "delve" public shaming    • "delve" actively suppressed
  • "In conclusion,"         • "delve" drops in arXiv    • Corporate conversationalism
  • "I hope this helps!"     • Em dashes surge in Claude • Complex sentence flow
  • Overt AI disclaimers     • Negative contrast peaks   • Persistent em dashes & triads
```

### A. Decaying Tells (Heavily Suppressed by 2026)
1. **The "Delve" Collapse (Human-LLM Coevolution):**  
   Geng & Trotta's landmark study (*"Human-LLM Coevolution: Evidence from Academic Writing"*, ACL Findings 2025; [arXiv:2502.09606](https://arxiv.org/abs/2502.09606)) analyzed 1.2 million arXiv abstracts and proved that after public memes and academic papers highlighted *delve* in early 2024, its frequency dropped precipitously starting in March–April 2024. Authors began actively searching for and editing out the word, while lab system prompts explicitly forbade it.
2. **Formulaic Structural Signposts:**  
   Phrases like *"In conclusion,"*, *"To summarize,"*, *"In summary,"*, and *"All in all"* have been largely trained out of frontier 2025–2026 models via preference fine-tuning.
3. **Conversational Chat Baggage:**  
   Early GPT-3.5 disclaimers (*"As an AI language model..."*, *"I hope this helps!"*, *"Certainly! Here is..."*) are now virtually absent from copy generated by current APIs or reasoning pipelines.
4. **Extreme Adjective Density:**  
   Adjectives that drew immense public ridicule (*delve*, *testament*, *tapestry*) have seen slight downward adjustments in raw base sampling, though their synonyms have absorbed the probability mass.

### B. Persistent & Stubborn Tells (Still Strong in 2026)
1. **The Em Dash (`—`):**  
   Remains exceptionally stubborn. Even when users instruct models to avoid special markdown, em dashes persist across Claude 3.5/4.5 Sonnet, Claude 4 Opus, and GPT-4o at rates exceeding 5 to 10 per 1,000 words.
2. **Negative-Positive Parallelism:**  
   *"It's not X, it's Y"* remains the primary rhetorical template models use whenever prompted for advice, analysis, persuasion, or LinkedIn commentary.
3. **Mid-Tier Evaluative Adjectives:**  
   While *delve* was flagged and suppressed, lower-profile evaluative adjectives that do not raise suspicion to casual human readers continue to climb. Geng & Trotta (2025) proved that words like *significant*, *crucial*, *comprehensive*, *additionally*, *foster*, *pivotal*, and *underscores* continue their uninterrupted upward frequency climb.
4. **Lack of Burstiness & Symmetrical Triads:**  
   Transformers inherently optimize token probability distributions locally, producing sentences of remarkably uniform length (~18–24 words) and paragraph structures of balanced volume.

### C. Emerging Tells in Newer Models (GPT-4o, Claude 4, Gemini 2.5/3, o1/o3)
As models are trained on more conversational and synthetic data, new stylistic mannerisms have emerged in 2025–2026:

1. **Colloquial Corporate Idioms:**  
   Newer models attempt to sound "human" by overusing Silicon Valley business colloquialisms:
   * *"lean into"* / *"double down on"*
   * *"at its core"* / *"at the end of the day"*
   * *"the reality is"* / *"here's the thing"*
   * *"table stakes"* / *"move the needle"*
2. **Hyper-Structured Bolded Bullet Points:**  
   Rather than simple bulleted lists, 2025–2026 frontier models almost universally prefix bullet items with a two-to-three word bolded title followed by a colon:
   * `**Actionable Insight:** ...`
   * `**The Core Problem:** ...`
   * `**Why It Matters:** ...`
3. **Metaphorical Ecosystems:**  
   Substitution of *tapestry* with newer abstract metaphors: *ecosystem*, *flywheel*, *crucible*, *paradigm*, *sandbox*, *mosaic*.
4. **Concessive Balanced Framing ("While X, Y"):**  
   Reasoning models (o1, o3) heavily deploy fronted concessive clauses (*"While X has garnered attention, the real breakthrough lies in Y"*), reflecting internal chain-of-thought exploration of trade-offs.

---

## 5. Dataset Licenses & Shipping Feasibility

If *Slop Shame* is distributed as an open-source (MIT-licensed) Chrome extension containing embedded JSON heuristics or weights, the licensing of upstream academic datasets must be strictly respected.

| Study / Repository | Maintainer / Authors | Repository / Paper URL | License | Commercial / MIT Extension Usability | Recommendation for Slop Shame |
|---|---|---|---|---|---|
| **`llm-excess-vocab`** | Dmitry Kobak et al. (Berens Lab, Tübingen) | [github.com/berenslab/llm-excess-vocab](https://github.com/berenslab/llm-excess-vocab) | **MIT License** (SPDX: `MIT`) | **YES (Fully Usable)** | **Green Light:** The raw excess word list (`excess_words.csv`) and yearly count data are MIT-licensed. Can be directly converted to JSON weights. Include copyright notice. |
| **`Mapping-the-Increasing-Use-of-LLMs`** | Weixin Liang, James Zou et al. (Stanford) | [github.com/Weixin-Liang/Mapping-the-Increasing-Use-of-LLMs-in-Scientific-Papers](https://github.com/Weixin-Liang/Mapping-the-Increasing-Use-of-LLMs-in-Scientific-Papers) | **MIT License** (SPDX: `MIT`) | **YES (Fully Usable)** | **Green Light:** Code and frequency shift data tables are MIT. Can vendor log-odds and fold-change weights directly into extension heuristics. |
| **`ZeroSlop`** | Manav Mishra | [github.com/manavmishra/ZeroSlop](https://github.com/manavmishra/ZeroSlop) | **MIT License** (SPDX: `MIT`) | **YES (Fully Usable)** | **Green Light:** Direct drop-in for social/LinkedIn regexes and lexicon weights. Best existing MIT mapping for non-academic feed slop. |
| **`EQ-Bench Slop Score` / `slop-forensics`** | Sam Paech | [github.com/sam-paech/slop-score](https://github.com/sam-paech/slop-score) | **MIT License** (for files in `data/`); **CC BY-SA 4.0** for `wordfreq` dependency | **CONDITIONAL (Extract Data Only)** | **Caution:** The curated adjustment files and essay frequency lists are MIT-licensed. **Do NOT vendor** `data/large_en.msgpack.gz` or `js/wordfreq.js` (which carry CC BY-SA 4.0 copyleft terms). Vendor only the extracted JSON arrays. |
| **`tjuzek/delve`** | Tom S. Juzek & Zina B. Ward (FSU) | [github.com/tjuzek/delve](https://github.com/tjuzek/delve) | **No explicit repo license**; Paper under **CC BY-SA 4.0** (arXiv) / **CC BY 4.0** (ACL Anthology) | **FACTS / CITATION ONLY** | **Safe for Numerical Weights:** Raw mathematical statistics (OPM numbers, 6697% increase) are uncopyrightable facts under US law (Feist v. Rural). Do not copy code verbatim; extract the numerical ratios into custom heuristic tables and cite paper. |
| **Geng & Trotta Coevolution Study** | Mingmeng Geng & Roberto Trotta (SISSA) | [arXiv:2502.09606](https://arxiv.org/abs/2502.09606) / [ACL Findings 2025](https://doi.org/10.18653/v1/2025.findings-acl.657) | **CC BY 4.0** (ACL Anthology open access) | **YES (With Attribution)** | **Green Light:** Findings on the decay of *delve* and the persistence of *significant/additionally* can inform decay penalty rules. Cite the paper. |
| **Originality.ai / Pangram Labs Studies** | Originality.ai & Pangram Labs Research | [originality.ai/blog](https://originality.ai/blog/linkedin-ai-content) / [pangramlabs.com](https://www.pangramlabs.com) | Proprietary commercial blog posts | **FACTS / BENCHMARK ONLY** | **Safe for Reference:** Use reported percentages (54% / 81.2% LinkedIn prevalence) as design benchmarks and test calibration targets. |

---

## 6. Comprehensive References & Citations

1. **Kobak et al. (2024/2025):** Dmitry Kobak, Rita González-Márquez, Emőke-Ágnes Horvát, Jan Lause. *"Delving into LLM-assisted writing in biomedical publications through excess vocabulary."* *Science Advances*, 2025. Preprint: [arXiv:2406.07016](https://arxiv.org/abs/2406.07016). Code/Data: [https://github.com/berenslab/llm-excess-vocab](https://github.com/berenslab/llm-excess-vocab).
2. **Liang et al. (ICML 2024):** Weixin Liang, Zachary Izzo, Yaohui Zhang, Haley Lepp, Hancheng Cao, Xuandong Zhao, Lingjiao Chen, Haotian Ye, Sheng Liu, Zhi Huang, Daniel A. McFarland, James Y. Zou. *"Monitoring AI-Modified Content at Scale: A Case Study on the Impact of ChatGPT on AI Conference Peer Reviews."* *International Conference on Machine Learning (ICML)*, 2024. Preprint: [arXiv:2403.07183](https://arxiv.org/abs/2403.07183).
3. **Liang et al. (arXiv 2024):** Weixin Liang, Yaohui Zhang, Zhengxuan Wu, Haley Lepp, Wenlong Ji, Xuandong Zhao, Hancheng Cao, Sheng Liu, Siyu He, Zhi Huang, et al. *"Mapping the Increasing Use of LLMs in Scientific Papers."* [arXiv:2404.01268](https://arxiv.org/abs/2404.01268). Code/Data: [https://github.com/Weixin-Liang/Mapping-the-Increasing-Use-of-LLMs-in-Scientific-Papers](https://github.com/Weixin-Liang/Mapping-the-Increasing-Use-of-LLMs-in-Scientific-Papers).
4. **Juzek & Ward (COLING 2025):** Tom S. Juzek, Zina B. Ward. *"Why Does ChatGPT 'Delve' So Much? Exploring the Sources of Lexical Overrepresentation in Large Language Models."* *Proceedings of the 31st International Conference on Computational Linguistics (COLING 2025)*, pp. 2932–2946. Preprint: [arXiv:2412.11385](https://arxiv.org/abs/2412.11385). Code/Data: [https://github.com/tjuzek/delve](https://github.com/tjuzek/delve).
5. **Geng & Trotta (ACL Findings 2025):** Mingmeng Geng, Roberto Trotta. *"Human-LLM Coevolution: Evidence from Academic Writing."* *Findings of the Association for Computational Linguistics: ACL 2025*, pp. 12689–12696. DOI: [10.18653/v1/2025.findings-acl.657](https://doi.org/10.18653/v1/2025.findings-acl.657). Preprint: [arXiv:2502.09606](https://arxiv.org/abs/2502.09606).
6. **Gray (2024):** Andrew Gray. *"ChatGPT 'contamination': estimating the prevalence of LLMs in the scholarly literature."* [arXiv:2403.16887](https://arxiv.org/abs/2403.16887).
7. **Paech (2025/2026):** Samuel J. Paech. *EQ-Bench Slop Score, Slop Forensics, and AntiSlop Sampler.* Benchmark writeup: [https://eqbench.com/slop-score.html](https://eqbench.com/slop-score.html). Repositories: [https://github.com/sam-paech/slop-score](https://github.com/sam-paech/slop-score), [https://github.com/sam-paech/antislop-sampler](https://github.com/sam-paech/antislop-sampler).
8. **Mishra (2026):** Manav Mishra. *ZeroSlop: Regex and Lexicon Detection Engine for LLM Slop.* [https://github.com/manavmishra/ZeroSlop](https://github.com/manavmishra/ZeroSlop). PyPI: [https://pypi.org/project/zero-slop/](https://pypi.org/project/zero-slop/).
9. **Originality.ai (2024/2026):** Originality.ai Research Team. *"LinkedIn AI Content Study: AI Content Surges on LinkedIn by 189%."* [https://originality.ai/blog/linkedin-ai-content](https://originality.ai/blog/linkedin-ai-content).
10. **Pangram Labs (2024):** Pangram Labs Research. *"Measuring Generative AI Adoption in Professional Networking."* [https://www.pangramlabs.com](https://www.pangramlabs.com).
11. **Stylometric Benchmark Studies on Em Dashes:** *"Every Model Has an Accent"* & *"The Last Fingerprint: How Markdown Training Shapes LLM Prose."* [ResearchGate Citation](https://www.researchgate.net/publication/380757271_The_Last_Fingerprint_How_Markdown_Training_Shapes_LLM_Prose).
