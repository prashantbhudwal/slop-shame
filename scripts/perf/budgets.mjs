/** All thresholds and workload defaults live here. Byte budgets use MiB. */
const number = (name, fallback, min = 0) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < min) throw new Error(`${name} must be a number >= ${min}`);
  return value;
};

export const budgets = Object.freeze({
  heapOverBaselineBytes: number('SLOP_PERF_HEAP_OVER_BASELINE_MB', 5) * 1024 ** 2,
  heapGrowthBytesPer1000Posts: number('SLOP_PERF_HEAP_GROWTH_MB', 1) * 1024 ** 2,
  retainedDetachedMounts: number('SLOP_PERF_DETACHED_MOUNTS', 5),
  extensionLongTaskMs: number('SLOP_PERF_LONG_TASK_MS', 50),
  frameP95RegressionMs: number('SLOP_PERF_FRAME_P95_DELTA_MS', 4),
  extensionScriptingMsPerPost: number('SLOP_PERF_SCRIPTING_MS_PER_POST', 1.5),
  duplicateMounts: 0,
  orphanMounts: 0,
  liveMountDeficit: 0,
  visibleUiDeficit: 0,
});

const full = process.argv.includes('--full');
const posts = Math.floor(number('SLOP_PERF_POSTS', full ? 2000 : 500, 30));
if (posts > 500 && !full) throw new Error('More than 500 posts requires --full (pnpm perf --full)');

export const workload = Object.freeze({
  full,
  posts,
  seed: Math.floor(number('SLOP_PERF_SEED', 20261019)),
  batchSize: 10,
  windowSize: 30,
  slotHeight: 440,
  pixelsPerSecond: number('SLOP_PERF_SCROLL_PX_PER_SECOND', 2200, 100),
  settleMs: number('SLOP_PERF_SETTLE_MS', 1500, 100),
  checkpointEveryPosts: Math.floor(number('SLOP_PERF_CHECKPOINT_POSTS', full ? 1000 : 250, 30)),
  sampleEveryMs: number('SLOP_PERF_SAMPLE_MS', 500, 100),
  profilerIntervalUs: Math.floor(number('SLOP_PERF_PROFILER_INTERVAL_US', 1000, 100)),
  frameBudgetMs: number('SLOP_PERF_FRAME_BUDGET_MS', 1000 / 60, 1),
  headless: process.env.SLOP_HEADED !== '1',
});
