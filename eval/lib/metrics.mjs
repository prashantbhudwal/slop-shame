export const LABELS = ['human', 'ai', 'mixed'];
export const wordCount = text => text.trim().split(/\s+/u).filter(Boolean).length;
export const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
export const percent = value => value === null ? 'n/a' : `${(value * 100).toFixed(2)}%`;

export function summarize(rows, threshold = 40) {
  const human = rows.filter(row => row.label === 'human');
  const ai = rows.filter(row => row.label === 'ai');
  const shameable = human.filter(row => typeof row.shameable === 'boolean');
  const fp = human.filter(row => row.score >= threshold).length;
  const tp = ai.filter(row => row.score >= threshold).length;
  return {
    count: rows.length, human: human.length, ai: ai.length,
    mixed: rows.length - human.length - ai.length,
    falsePositives: fp, falsePositiveRate: ratio(fp, human.length),
    shameableHumanCount: shameable.length,
    shameableFalsePositives: shameable.filter(row => row.shameable).length,
    shameableFalsePositiveRate: ratio(shameable.filter(row => row.shameable).length, shameable.length),
    truePositives: tp, recall: ratio(tp, ai.length),
    recallAt60: ratio(ai.filter(row => row.score >= 60).length, ai.length),
  };
}

function grouped(rows, field, threshold) {
  return Object.fromEntries([...new Set(rows.map(row => row[field]))].sort()
    .map(key => [key, summarize(rows.filter(row => row[field] === key), threshold)]));
}

export function evaluate(rows, config) {
  const threshold = config.falsePositiveThreshold;
  const hardRows = rows.filter(row => row.label === 'human' && config.hardHumanSubsets.includes(row.subset));
  const missingHardSubsets = config.hardHumanSubsets.filter(subset => !hardRows.some(row => row.subset === subset));
  const sweep = Array.from({ length: 15 }, (_, i) => 20 + i * 5).map(t => {
    const all = summarize(rows, t);
    const hard = summarize(hardRows, t);
    const hardBySubset = grouped(hardRows, 'subset', t);
    return { threshold: t, falsePositiveRate: all.falsePositiveRate, recall: all.recall,
      hardFalsePositiveRate: hard.falsePositiveRate,
      hardBySubset: Object.fromEntries(Object.entries(hardBySubset).map(([k, v]) => [k, v.falsePositiveRate])),
    };
  });
  const validSweep = missingHardSubsets.length ? [] : sweep.filter(row => row.hardFalsePositiveRate <= config.falsePositiveTarget);
  const perSubsetSweep = validSweep.filter(row => Object.values(row.hardBySubset).every(rate => rate <= config.falsePositiveTarget));
  const tiers = [...new Set(rows.map(row => row.tier))];
  const confusion = Object.fromEntries(LABELS.map(label => [label,
    Object.fromEntries(tiers.map(tier => [tier, rows.filter(row => row.label === label && row.tier === tier).length]))]));
  const histograms = Object.fromEntries(LABELS.map(label => [label, Array.from({length: 10}, (_, bin) =>
    rows.filter(row => row.label === label && Math.min(9, Math.floor(row.score / 10)) === bin).length)]));
  const rules = new Map();
  for (const row of rows.filter(row => row.label === 'human')) {
    // A rule is counted once per post, regardless of the number of quoted matches.
    const seen = new Set();
    for (const signal of row.signals) {
      if (seen.has(signal.ruleId)) continue;
      seen.add(signal.ruleId);
      const stat = rules.get(signal.ruleId) ?? { ruleId: signal.ruleId, humanPosts: 0, falsePositivePosts: 0,
        humanWeight: 0, falsePositiveWeight: 0, examples: [] };
      const isFP = row.score >= threshold;
      stat.humanPosts++;
      stat.humanWeight += signal.weight;
      if (isFP) { stat.falsePositivePosts++; stat.falsePositiveWeight += signal.weight; }
      if (stat.examples.length < 2 || (isFP && !stat.examples.some(example => example.falsePositive))) {
        if (stat.examples.length === 2) stat.examples.pop();
        stat.examples.push({ id: row.id, source: row.source, subset: row.subset, score: row.score,
          falsePositive: isFP, snippet: (signal.matches?.[0] || row.text).replace(/\s+/gu, ' ').slice(0, 180) });
      }
      rules.set(signal.ruleId, stat);
    }
  }
  const sorted = [...rules.values()].sort((a, b) => b.falsePositivePosts - a.falsePositivePosts ||
    b.humanPosts - a.humanPosts || b.falsePositiveWeight - a.falsePositiveWeight || a.ruleId.localeCompare(b.ruleId));
  const times = rows.map(row => row.ms).sort((a, b) => a - b);
  const hard = summarize(hardRows, threshold);
  return {
    overall: summarize(rows, threshold), bySubset: grouped(rows, 'subset', threshold),
    byGenre: grouped(rows, 'genre', threshold), byRegister: grouped(rows, 'register', threshold),
    bySource: grouped(rows, 'source', threshold), hardHuman: hard, missingHardSubsets, sweep,
    minimumHardThreshold: validSweep[0]?.threshold ?? null,
    minimumEachHardSubsetThreshold: perSubsetSweep[0]?.threshold ?? null,
    recallAtMinimumHardThreshold: validSweep[0]?.recall ?? null,
    confusion, histograms, topHumanRules: sorted.slice(0, 20),
    timing: { meanMs: ratio(times.reduce((sum, n) => sum + n, 0), times.length),
      p95Ms: times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] ?? null },
    strictPass: missingHardSubsets.length === 0 && hard.falsePositiveRate !== null && hard.falsePositiveRate <= config.falsePositiveTarget,
  };
}
