import { LABELS, percent } from './metrics.mjs';
const cell = value => String(value).replaceAll('|', '\\|').replace(/\s+/gu, ' ');
const table = (head, rows) => [head, head.map(() => '---'), ...rows].map(row => `| ${row.map(cell).join(' | ')} |`).join('\n');
const show = value => value === null ? 'not found in 20–90 sweep' : String(value);

export function markdown(result, { snippets = true } = {}) {
  const m = result.metrics;
  const groups = [['overall', m.overall], ['non-native + formal', m.hardHuman], ...Object.entries(m.bySubset)];
  const lines = [
    '# Offline calibration results', '',
    `Run: ${result.timestamp}. Engine SHA-256: \`${result.engineSha256}\`.`, '',
    `Items: ${m.overall.count}; human ${m.overall.human}, AI ${m.overall.ai}, mixed ${m.overall.mixed}. Exact-text duplicates removed: ${result.duplicates}.`, '',
    '**This is a calibration sample, not an authorship verdict or an independent validation set.** Mixed rows are LLM-authored plainer rewrites, excluded from FP and recall denominators. Historical labels are provenance evidence, not proof that every pre-2022 social post was human: bots and older generators already existed.', '',
    `FP means human score ≥ ${result.config.falsePositiveThreshold}. Strict gate: **${m.strictPass ? 'PASS' : 'FAIL'}** (pooled formal + non-native FP ≤ ${percent(result.config.falsePositiveTarget)} and both subsets present).`, '',
    ...(m.missingHardSubsets.length ? [`Missing required human subsets: **${m.missingHardSubsets.join(', ')}**. Run the research-only fetch first.`, ''] : []),
    '## False positives and recall', '',
    table(['subset', 'human n', 'FP n', 'FP %', 'Shame FP %', 'AI n', 'recall ≥40', 'recall ≥60', 'mixed n'],
      groups.map(([name, g]) => [name, g.human, g.falsePositives, percent(g.falsePositiveRate), percent(g.shameableFalsePositiveRate), g.ai, percent(g.recall), percent(g.recallAt60), g.mixed])), '',
    ...['Genre', 'Register'].flatMap(dimension => [
      `## ${dimension} FP and recall`, '',
      table([dimension.toLowerCase(), 'human n', 'FP %', 'Shame FP %', 'AI n', 'recall ≥40', 'recall ≥60', 'mixed n'],
        Object.entries(m[`by${dimension}`]).map(([name, g]) => [name, g.human, percent(g.falsePositiveRate), percent(g.shameableFalsePositiveRate), g.ai, percent(g.recall), percent(g.recallAt60), g.mixed])), '',
    ]),
    '## Source counts', '',
    table(['source', 'human', 'AI', 'mixed'], Object.entries(m.bySource).map(([name, g]) => [name, g.human, g.ai, g.mixed])), '',
    '## Threshold sweep', '',
    table(['threshold', 'all-human FP %', 'hard-human FP %', 'AI TPR %'], m.sweep.map(row => [row.threshold, percent(row.falsePositiveRate), percent(row.hardFalsePositiveRate), percent(row.recall)])), '',
    `Minimum tested threshold meeting the pooled hard-human target: **${show(m.minimumHardThreshold)}**. AI recall there: **${percent(m.recallAtMinimumHardThreshold)}**.`, '',
    `Minimum tested threshold meeting the target in each hard-human subset separately: **${show(m.minimumEachHardSubsetThreshold)}**. These are in-sample operating points; freeze and evaluate on an untouched holdout before release.`, '',
    '## Label × predicted tier counts', '',
    table(['label', ...result.tiers], LABELS.map(label => [label, ...result.tiers.map(tier => m.confusion[label][tier] ?? 0)])), '',
    '## Score histograms', '', '```text',
  ];
  for (const label of LABELS) {
    lines.push(`${label} (each bar scaled within this label)`);
    const bins = m.histograms[label];
    const max = Math.max(1, ...bins);
    bins.forEach((n, bin) => lines.push(`${String(bin * 10).padStart(2)}–${String(bin === 9 ? 100 : bin * 10 + 9).padEnd(3)} ${String(n).padStart(5)} ${'#'.repeat(n ? Math.max(1, Math.round(n / max * 35)) : 0)}`));
  }
  lines.push('```', '', '## Top rules on human text', '',
    'Ranked by posts that are false positives, then all human posts where the rule fires. Weights are engine-reported pre-normalization contributions; co-occurrence is not a causal ablation. Counts are per post, not per matched phrase.', '',
    table(['rule id', 'FP posts', 'all human posts', 'weight on FP posts', ...(snippets ? ['examples'] : [])], m.topHumanRules.map(rule => [
      rule.ruleId, rule.falsePositivePosts, rule.humanPosts, rule.falsePositiveWeight.toFixed(2),
      ...(snippets ? [rule.examples.map(e => `${e.id} (${e.score}): ${e.snippet}`).join('; ')] : []),
    ])), '', '## Timing', '',
    `Warm mean **${m.timing.meanMs?.toFixed(4)} ms/post**, p95 **${m.timing.p95Ms?.toFixed(4)} ms/post**. First call: ${result.coldMs.toFixed(4)} ms. Engine import/build: ${result.loadMs.toFixed(2)} ms. Timing is Node on this machine, excludes loading and includes only analyzePost calls; it is not a browser performance certification.`, '',
    '## Reproduction', '',
    `Command: \`${result.command}\``, '', `Node: ${result.node}. Git HEAD: \`${result.gitHead}\`.`, '',
    'Input file digests (including local evaluation-only files):', '',
    ...result.inputs.map(input => `- \`${input.file}\`: \`${input.sha256}\``), '',
  );
  if (!snippets) lines.push('Raw research-corpus quotations are intentionally omitted from this committed baseline. Local results include example snippets.', '');
  return lines.join('\n');
}
