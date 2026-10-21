# Slop Index: scoring architecture (research proposal)

## 1. What analogous systems teach

- **SpamAssassin** keeps hand-written rules but *learns* their scores. A perceptron with a `HAM_PREFERENCE` knob and an FP/FN cost of λ = 50 is validated on a held-out 1/10, and the defaults target about 1 FP per 2,500 ham. Correlated sub-rules become **meta rules** (`__` sub-rules score 0).
- **Weight of evidence / naive Bayes** (Turing–Good, Mosteller–Wallace, Graham and Robinson) sums log likelihood ratios. It is simple and length-aware through Poisson/NB rates, but correlated tells double-count and its probabilities run to the extremes. Rennie et al. and Kołcz–Yih (*high-precision* text classification) show that log-saturated counts and length normalization matter most at low FPR. Repeats are bursty (Madsen et al.).
- **Credit scorecards** use additive points: logistic regression scaled linearly by points-to-double-odds. **RiskSLIM** learns sparse integer scorecards under constraints.
- **Neyman–Pearson classification** fixes FPR ≤ α first and takes the threshold from held-out negatives. Minimizing empirical FPR alone does not bound the true FPR. Zero errors in n gives a 95% upper bound of about 3/n.
- **AI-text detection.** Binoculars: only FPR ≈ 0.01% matters, and AUC hides it. Liang et al.: detectors flagged about 61% of non-native essays. Plain, formulaic human prose is the danger zone, and pre-2022 LinkedIn ("Excited to share…", "Agree?") is full of it. Stylometric features work on short social text (Kumarage et al.). Kobak et al. find tells by frequency ratio against a human baseline.
- **Covariate shift:** importance-weight the negatives (Shimodaira), flattened by an exponent to control variance.

## 2. Recommended design: a constrained evidence scorecard

### 2.1 Features: surprise over human expectation at this length

```
m_j(n) = λ_j · n              per-word rules (vocab, pivots, triads)
m_j(n) = p_j[bucket(n)]       once-per-post rules (closing question, hashtag wall)
φ_j    = max(0, ln(1+c_j) − ln(1+m_j(n)))
```

`λ_j` and `p_j` are Gamma-smoothed **human base rates**: `λ_j = (C_j+0.5)/(W+0.5/λ0_j)`. What this gives:
- **Length.** The human expectation scales with length (the Poisson-offset idea). One triad in 600 words gives φ = 0; three in 60 words give φ = 1.27.
- **Burstiness.** ln(1+c) saturates.
- **Common habits are weak by construction.** A habit humans show 60% of the time is worth 0.22; a smoking gun (m ≈ 0) is worth 0.69.
- **Absence is not evidence.** I drop the Poisson absence term, so only visible tells score and long posts aren't penalized.

Rules are tiered by *measured* human rate. **Guns** fire in fewer than 1/2,000 human posts (placeholders, chatbot leaks, literal `**`). Every other rule is a **habit**.

### 2.2 Combination: families with learned caps

```
e_g = Σ_{j∈g} w_j φ_j                    w_j ≥ 0
E_g = C_g (1 − exp(−e_g / C_g))          smooth cap
z   = b + Σ_g E_g  (+ Σ_k v_k·meta_k)    log-odds of "obvious slop"
```

Correlation is handled three ways:
1. Within a family ("pivot", "list-structure", "engagement-bait", "AI-vocab"…), the cap saturates.
2. Across families, **joint discriminative fitting** discounts redundancy, which NB can't do.
3. Where a *combination* is itself the tell (emoji bullets plus a hook plus a closing question), add a meta-rule and shrink its parts.

**Two-witness rule (hard constraint):** every habit family has `C_g ≤ 0.6(τ−b)`, which is at most 24 index points. No single human habit can accuse anyone. A flag needs **one gun or at least two independent habit families**.

### 2.3 Learning the weights

MAP-fitted, FP-weighted, constrained logistic regression:

```
L = Σ_{Slop}  a_i·CE(σ(z_i), y_i)            y=1 "obvious", 0.5 "some"
  + K·Σ_{Hum} r_i·CE(σ(z_i), 0)              K chosen so Σneg = 8·Σpos
  + 5K·Σ_{Pol} CE(σ(z_i), 0)
  + μ·Σ_{Hum∪Pol} max(0, z_i − τ + 0.5)²     hinge below the line
  + Σ_j (w_j − w0_j)² / 2σ²                  shrink to prior
s.t. w ≥ 0;  0 < C_g ≤ 0.6(τ−b) for habits
```

Fit with L-BFGS-B (about 120 parameters). Alternate fit → threshold (§2.5) → refit, 2–3 rounds. Tune σ, K and μ by 5-fold CV.

| Data | Role |
|---|---|
| 1k cheap-model slop | The only positives: "obvious" → 1, "some" → 0.5. In-genre, because fitting on essays is what failed before. |
| 10k human, other genres | Negatives, **cut into 30–600-word windows**. Weighted `r_i = (p_LI(len)/p_oth(len))^0.5`, truncated at 5. |
| Polished-by-AI | Half trains at 5× weight; half is locked for audit. |
| 18k pre-2022 LinkedIn | **Never fits weights.** Split in thirds: **A** human base rates `λ_j`, `p_j`; **B** threshold; **C** locked audit. |
| 450k old AI, other genres | Not used for weights. Mine candidate tells by frequency ratio (Kobak-style), then validate them on the slop set. |

Set A is essential. Platform-native tells (hashtags, emoji, "Agree?") never appear in essays, so against other-genre negatives they get near-infinite weight: the genre failure seen so far. If "check-only" must stay absolute, freeze those weights at low expert values instead.

**Prior `w0`:** Alternative B's per-rule log-LR, blended 50/50 with today's hand weights, so rare rules stay sane.

**Lost line breaks:** structural rules can't fire on sets A/B/C, so their FPR is unmeasured. Hand-collect about 500 formatted human posts, cap structural families at 20 points, and run a **flatten test**: score the slop with line breaks stripped and count the flags that depend on structure.

### 2.4 Length

Length enters *only* through `m_j(n)`. There is no hidden "short = suspicious" term. Audit FPR per length bucket (30–80, 80–200, 200–600 words). If one bucket's FPR differs by more than 2×, use per-bucket thresholds, each mapped to 40.

### 2.5 False-positive policy: Neyman–Pearson threshold

```
τ = min t  s.t.  CP_upper95(#{i∈B: z_i ≥ t}, |B|) ≤ α = 0.001
            and  CP_upper95(#{i∈Pol_cal: z_i ≥ t}, |Pol_cal|) ≤ 0.02
```

With |B| = 6,000 this permits at most 1 human hit (4.74/6000 = 0.08%). That is a 95%-confidence claim that at most 1 in 1,000 human posts flags. Claiming 0.01% would need at least 30k clean negatives, so don't. Scores of 25–39 form a SpamBayes-style "unsure" band: show the tells, never the accusation copy.

### 2.6 The 0–100 index: additive points

```
u = Σ_g E_g / (τ − b)
S = 40u                     if u ≤ 1.5
S = 100 − 40·e^{−(u−1.5)}   otherwise            (C¹ compression above 60)
points_j = 40·(E_g/e_g)·w_j φ_j / (τ − b)
```

What the number means:
- **0** = no tells beyond human expectation at this length.
- **40** = evidence that ≤ 0.1% of human LinkedIn posts reach (95% confidence).
- Below 60, points add exactly, as in a credit scorecard, with PDO = 40·ln2/(τ−b).

Separately, keep a Platt-fit `P(panel says "obvious" | u)` for analytics, not the badge. Platt rather than isotonic, because there are only about 1k positives (Niculescu-Mizil and Caruana).

### 2.7 Faithful explanations

The model *is* additive, so the explanation is the computation itself.
- Each tell lists its exact points.
- Habit tells carry their baseline: "3 three-part lists +14 (humans: 0.4 at this length)".
- Family saturation is shared pro rata.
- Tells with φ = 0 are hidden.
- A unit test asserts that deleting a tell's text drops the score by its listed points.

### 2.8 Runtime (well under 1 ms)

```ts
let tot = 0; const parts: [number, number][] = [];
for (const g of FAMILIES) {
  let e = 0; const s = parts.length;
  for (const j of g.rules) {
    if (!counts[j]) continue;
    const m = R[j].perWord ? R[j].lambda * n : R[j].p[bucket(n)];
    const phi = Math.log1p(counts[j]) - Math.log1p(m);
    if (phi > 0) { const v = R[j].w * phi; e += v; parts.push([j, v]); }
  }
  if (e > 0) {
    const E = g.cap * (1 - Math.exp(-e / g.cap)); tot += E;
    for (let k = s; k < parts.length; k++) parts[k][1] *= (E / e) * 40 / SPAN;
  }
}
const u = tot / SPAN;  // SPAN = τ − b
const index = u <= 1.5 ? 40 * u : 100 - 40 * Math.exp(-(u - 1.5));
```

## 3. Evaluation

Run once per release on the locked sets, with bootstrap CIs:
1. **Human FPR at 40** on LinkedIn set C, with the CP upper bound; the gate is ≤ 0.1%. Also report FPR at 25 and 60.
2. **Polished-by-AI FPR** on the locked half; the gate is ≤ 2%.
3. **TPR at 40** on "obvious" slop (target ≥ 80%), using a **leave-one-generator-out** split. Report "some" separately.
4. **Partial AUC for FPR ≤ 1%**, not plain AUC.
5. FPR by length bucket, from the flatten test, and for non-native writers if identifiable (Liang).
6. **Per-rule hit table** (SpamAssassin `hit-frequencies` style): slop%, human%, ratio, mean points.
7. A **manual read of the 50 highest-scoring human posts** every release.
8. **Live-feed sanity check:** the flagged share should be far above pre-2022 and below third-party AI-prevalence estimates (Pangram 30–41%, Originality 54%).
9. **Per-family ablation:** ΔTPR and ΔFPR.

## 4. Alternatives, ranked

**A. Constrained evidence scorecard (above): ship it.** It fixes all four observed problems:
- A short post with one gun reaches 40.
- Habits are weak alone but add up across families.
- Genre mismatch is handled by in-genre positives, LinkedIn base rates and length-matched negatives.
- Correlated tells are handled by joint fitting, caps and meta-rules.

It also gives an FPR guarantee and exact additive explanations.

**B. Pure per-rule likelihood ratios (Mosteller–Wallace/NB).** Compute `w_j = ln(λ_j^slop/λ_j^human)` by counting, max-pool within each family, and use no optimizer. It is transparent and length-aware, but it double-counts across families, ignores the obvious/some labels and gives overconfident probabilities. Use it as A's prior and its fallback.

**C. RiskSLIM integer scorecard.** Integer points per tell from a MINLP with the FPR as a hard constraint. The explanations are excellent ("placeholder +5"), but length and saturation become coarse bins, it needs a MIP solver, and it is fragile at 1k positives. Use it only to round A's points if round numbers are wanted.

Rejected: EBM/GBM shape functions. With 1k positives they would learn genre cues and explain no better than A.

## Sources

- SpamAssassin scoring: https://cwiki.apache.org/confluence/spaces/SPAMASSASSIN/pages/119543481/HowScoresAreAssigned
- SpamAssassin rescoring (HAM_PREFERENCE, λ=50): https://cwiki-test.apache.org/confluence/spaces/SPAMASSASSIN/pages/119544721/MassesOverview
- SpamAssassin meta rules: https://spamassassin.apache.org/full/3.1.x/doc/Mail_SpamAssassin_Conf
- Robinson, spam statistics: https://www.linuxjournal.com/article/6467
- SpamBayes: https://en.wikipedia.org/wiki/SpamBayes
- Kołcz & Yih: https://scottyih.org/files/fpr497-kolcz.pdf
- Rennie et al.: https://web.stanford.edu/class/cs276/handouts/rennie.icml03.pdf
- Madsen et al., burstiness: https://drk04747.sites.pomona.edu/papers/kauchak05modeling.pdf
- Mosteller–Wallace revisited: https://arxiv.org/pdf/2503.01869
- Good on Turing, weight of evidence: https://jhanley.biostat.mcgill.ca/bios601/CandH-ch0102/GoodOnTuring.pdf
- Scorecards, WoE and PDO: https://metricgate.com/blogs/credit-scorecard-weight-of-evidence-r/
- Ustun & Rudin, RiskSLIM: https://jmlr.org/beta/papers/v20/18-615.html
- Tong et al., NP umbrella: https://pmc.ncbi.nlm.nih.gov/articles/PMC5804623
- Rule of three: https://www.degruyterbrill.com/document/doi/10.1515/ijb-2022-0061/html
- Covariate shift, IWERM: https://arxiv.org/abs/2310.16638
- Poisson offset: https://en.wikipedia.org/wiki/Poisson_regression
- Niculescu-Mizil & Caruana: https://mlanthology.org/icml/2005/niculescumizil2005icml-predicting
- InterpretML EBM: https://interpret.ml/docs/ebm
- Binoculars: https://arxiv.org/html/2401.12070v3
- Liang et al.: https://arxiv.org/abs/2304.02819
- Kobak et al.: https://arxiv.org/abs/2406.07016
- Kumarage et al.: https://arxiv.org/abs/2303.03697
- LinkedIn prevalence: https://the-decoder.com/linkedin-is-the-undisputed-king-of-long-form-ai-slop-according-to-a-study-spanning-five-platforms/ · https://www.theregister.com/2024/11/28/linkedin_ai_posts
