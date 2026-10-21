Design proposal; no project files or datasets were inspected.

Ship a **regularized, monotone rule scorecard with a conservative eligibility gate**. Detect visible, obvious slop patterns; text alone cannot establish the author's workflow when human, polished, and generated texts overlap. The present datasets support a prototype, but do not establish a very low false-positive rate on contemporary LinkedIn.

[SpamAssassin's score-learning documentation](https://apache.googlesource.com/spamassassin/+/refs/tags/sa-update_3.4.0_20110614085106/masses/README.perceptron) describes learning rule weights jointly and emphasizing difficult legitimate messages. [OptBinning's scorecard documentation](https://gnpalencia.org/optbinning/scorecard.html) illustrates the useful separation between fitted coefficients and displayed points. Those are the precedents; the architecture below is my proposal.

**1. Recommended: a constrained additive scorecard.**

Preserve matched spans and structural witnesses. Merge synonymous/overlapping hits before scoring. A list introduction, its numbering, and its emoji markers become one named list bundle, not three independent witnesses. Keep genuinely different evidence separate.

For canonical evidence unit \(j\), let \(c_j\) be its distinct occurrence count, capped at three, and \(e_j\) its opportunities to occur. Define:

\[
u_j=\sum_{r=1}^{3}\theta_{jr,b(e_j)}\,\mathbf1[c_j\ge r],
\qquad E=\sum_j u_j,\qquad p_{\rm fit}=\sigma(b_0+E).
\]

Here \(b(e_j)\) selects a coarse exposure bin. Enforce nonnegative, diminishing increments:
\(\theta_{j1,b}\ge\theta_{j2,b}\ge\theta_{j3,b}\ge0\).
An absent tell contributes zero. Rare, unsupported coefficients shrink toward zero; zero observed human hits never earns an infinite weight.

Fit all coefficients jointly. Unlike naive evidence multiplication, this estimates a rule's contribution conditional on other rules. Collapse near duplicates using meaning and **within-class, within-domain** co-occurrence; marginal correlation can simply mean two useful signals predict the same class. Joint fitting plus regularization addresses remaining dependence, without claiming to eliminate it.

Define an eligibility gate \(G\): either one validated diagnostic artifact, or corroboration from two validated evidence families. Pivots, triples, questions, bullets, and hashtags cannot qualify by themselves or collectively. Markdown and placeholders are not automatically diagnostic: require contextual validation against tutorials, quotations, templates, and ordinary human uses. Uncertain context abstains. Unsupported languages or exposure ranges also keep the gate closed.

One truly diagnostic cue can therefore flag a short post if its learned contribution clears the threshold. Two unrelated strong cues can combine. Repeating one rhetorical habit cannot manufacture corroboration.

**Length is exposure, not a blanket divisor.**

Use word opportunities for phrases, sentence opportunities for sentence patterns, and one opportunity for a closing question. Start with three word bins: 30–99, 100–249, 250–600; choose analogous sentence bins before fitting. Tie coefficients across length for once-per-post cues. For repeated cues, constrain a fixed count's evidence to be nonincreasing with exposure, and strongly shrink bin effects toward their pooled coefficient.

This lets two occurrences in 40 words carry more evidence than two in 500, without multiplying every short-post hit by \(1/N\). Length alone earns no points. Sparse bins use pooled estimates. This is a low-variance approximation to exposure-aware count modeling, not an assertion that all events occur uniformly.

**Learning and dataset boundaries.**

Use the objective

\[
\min_{b_0,\theta}\sum_i a_i\{-w_1y_i\log p_i
-w_0(1-y_i)\log(1-p_i)\}
+\lambda_1\|\theta\|_1+\lambda_2\|\theta\|_2^2
+\lambda_L\sum_{j,r,b}(\theta_{jrb}-\bar\theta_{jr})^2.
\]

Select penalties and \(w_0>w_1\) by grouped development validation; threshold calibration supplies the final error policy. Normalize \(a_i\) by source size so corpus volume cannot determine the objective. These weighted fitted probabilities are **not deployment probabilities**. Drop units whose positive effect is unsupported or unstable across held-out generator/domain folds; avoid an unrestricted interaction search.

- **Generated social posts:** clear panel consensus on “obvious smell” supplies positives. Preserve disagreement; keep “some” as a separate gray evaluation stratum, not forced positives. Split by prompt/template, topic, and generator family, including an unseen-model test.
- **Human and polished posts:** both are negatives regardless of stylistic smoothness. Keep each original and all polished variants in one partition. Reserve polished examples for testing as well as fitting.
- **10,000 other-genre humans:** use as auxiliary hard negatives with, initially, at most 10% of total fitting weight. Tune that allowance only on social development data.
- **450,000 older AI texts:** exclude from target fitting and calibration; use for exploratory detector coverage and out-of-domain stress tests. “Generated” is not the target label, and essays cannot supply LinkedIn prevalence.
- **18,000 check-only LinkedIn posts:** freeze as a final external audit. No rule mining, bin selection, weight fitting, calibration, or threshold adjustment. Inspect once after locking the pipeline. A failure can block release; revisions need a fresh confirmatory audit.

Collect additional, independently sourced human LinkedIn posts with original formatting, including known human drafts and polished variants, for development and calibration. Without them, positive-social versus negative-essay confounding is not statistically identifiable from reweighting alone. The flattened historical corpus audits only the observed representation: it cannot certify line-break-dependent rules. Keep those rules disabled until formatting-preserved negatives validate them.

[RAID, Dugan et al.](https://aclanthology.org/2024.acl-long.674/) documents failures across generators and generation settings. [Stamatatos's stylometry study](https://aclanthology.org/E17-1107/) demonstrates topic interference. These support domain-separated testing, not transferring essay accuracy claims.

**False-positive policy and calibration.**

Predeclare a production target such as \(\alpha=10^{-4}\) FPR, with confidence \(1-\delta=0.95\); prioritize satisfying it over recall. Freeze the exported lookup tables and gate, then use independent calibration negatives and the [Neyman–Pearson umbrella method, Tong, Feng and Li](https://arxiv.org/abs/1608.03109).

Sort their gated scores \(H=GE\). Choose the smallest rank \(k\) satisfying

\[
\sum_{r=k}^{n}{n\choose r}(1-\alpha)^r\alpha^{n-r}\le\delta.
\]

Set \(\tau=\max(\tau_0,\operatorname{nextUp}(H_{(k)}))\), where \(\tau_0>0\) is fixed in development. This leaves boundary ties unflagged and avoids a zero denominator. Calibrate human and polished populations separately, allocate \(\delta/2\) to each, and use the larger threshold. This controls errors only under the calibration sampling assumptions; it does not protect against future distribution shifts. Use independent authors for calibration, not thousands of correlated posts from a few authors.

For perspective, zero errors among \(n\) independent audit negatives gives a one-sided 95% upper bound \(1-0.05^{1/n}\): approximately 1% for 300, and 0.0166% for 18,000. Neither establishes 0.01%. A single-population order-statistic calibration needs at least 29,956 negatives at that target; simultaneous population bounds require more.

With today's data alone, ship evidence display below the flag boundary, not a purportedly validated accusation mode.

**The index and faithful explanations.**

After validation:

\[
I=\left\lfloor\min(100,40E/\tau)\right\rfloor;
\quad G=0\Longrightarrow I=\min(I,39).
\]

Thus 0 means no scored evidence, 40 is the calibrated decision boundary, 80 represents twice that additive evidence, and 100 is saturation. It is an evidence index, not “percent AI,” a human percentile, or a probability of misconduct. The statistical calibration belongs to the boundary; the numeric scale is a declared display convention.

Expose each \(u_j\), its spans/count, exposure adjustment, and gate outcome. Show \(40u_j/\tau\) as contributions before saturation, with the final cap separately. For “removing this tell changes the score,” recompute the complete gate and score; do not substitute the coefficient or pretend overlapping explanations are independent.

~~~text
ctx = parseOnce(text)
hits = runPrecompiledBoundedRules(ctx)
units = deduplicateAndBundle(hits)
u = lookupCountExposureTables(units, ctx)
E = sum(u)
G = validatedEligibility(units, ctx)
I = floor(min(100, 40 * E / threshold))
if !G or !releaseValidated: I = min(I, 39)
return { index: I, flagged: I >= 40, evidence: explain(u, G) }
~~~

No runtime training, neural inference, or network. Shared parsing, bounded matchers, and small lookup tables keep scoring cheap; benchmark extraction plus scoring before claiming the 1 ms budget.

**Evaluation.**

Lock author/template-disjoint fitting, development, calibration, and final-test partitions. Report obvious-slop recall at the fixed FPR policy, false positives with exact bounds, polished-text errors, gray-set flag rate, and coverage lost to abstention. Report each length bin, generator, topic, ordinary marketing style, technical/template content, and available language-background strata. [Liang et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10382961/) found substantial non-native-writer bias in existing detectors; lexical simplicity should not become an accusation.

Measure precision across plausible prevalence \(\pi\):

\[
\mathrm{PPV}=\frac{\pi\,\mathrm{TPR}}
{\pi\,\mathrm{TPR}+(1-\pi)\,\mathrm{FPR}}.
\]

Overall accuracy and AUROC can hide unusable performance near the flag boundary; [Tufts et al.](https://aclanthology.org/2025.findings-naacl.271/) specifically evaluate TPR at low FPR. Compare against the current score and a presence-only baseline. Ablate exposure, deduplication, and the gate. Test neutral padding, duplicated tells, quotations, flattening, and original/polished pairs. Benchmark browser p50/p95/p99 and worst observed latency on specified hardware, including 600-word and adversarial-regex inputs. Require every supported benchmark case below 1 ms, with p99 headroom; report hardware rather than implying a universal latency guarantee.

**2. Runner-up: grouped likelihood-ratio count model.**

Fit smoothed class-conditional counts:
\(C_j\mid y,e_j\sim\mathrm{NB}(\mu=e_j\lambda_{jy},\phi_j)\);
use Bernoulli distributions for once-per-post cues. [Statsmodels documents exposure offsets](https://www.statsmodels.org/stable/generated/statsmodels.genmod.generalized_linear_model.GLM.html) and [negative-binomial overdispersion](https://www.statsmodels.org/dev/generated/statsmodels.genmod.families.family.NegativeBinomial.html). Score

\[
L=b+\sum_g\eta_g\log
\frac{P(C_g\mid y=1,e_g)}{P(C_g\mid y=0,e_g)},\quad 0\le\eta_g\le1.
\]

Shrink rates and temper correlated groups; apply the same gate and threshold audit. This is fast and explicitly models length, but distribution assumptions and residual dependence can exaggerate evidence. [Niculescu-Mizil and Caruana](https://icml.cc/Conferences/2005/proceedings/papers/079_GoodProbabilities_NiculescuMizilCaruana.pdf) demonstrate naive Bayes probability distortions. Absence-based contributions also complicate tell-only explanations.

**3. Conservative fallback: a tiny approved-signature classifier.**

Flag only a short union of validated artifact predicates or cross-family conjunctions:
\(G(x)=A(x)\lor\bigvee_m[B_m(x)\land C_m(x)]\).
Use a small monotone severity scale, and validate the **entire union**, not each signature separately. This is simplest to audit and fastest, but brittle and low-recall.

I would ship option 1 after its calibration requirements pass: it learns conditional rule value, preserves short-post evidence, and produces exact explanations. Option 3 is a useful restricted baseline; option 2 is a research challenger.
