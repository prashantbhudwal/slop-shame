export const mib = value => value / 1024 ** 2;

export function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

export function frameStats(values, frameBudgetMs) {
  return {
    samples: values.length,
    p50Ms: percentile(values, 0.50), p95Ms: percentile(values, 0.95), p99Ms: percentile(values, 0.99),
    // A 10% tolerance avoids counting timer rounding as a missed refresh.
    droppedFrames: values.reduce((sum, dt) => sum + (dt > frameBudgetMs * 1.1 ? Math.max(1, Math.round(dt / frameBudgetMs) - 1) : 0), 0),
    frameBudgetMs,
  };
}

/** CPU samples are charged once if ANY ancestor belongs to the extension. */
export function attributeProfile(profile, scriptUrls, navigationStartSeconds, longTasks) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes) for (const child of node.children || []) parents.set(child, node.id);
  const cache = new Map();
  const extensionUrls = new Set();
  function isExtension(id) {
    if (cache.has(id)) return cache.get(id);
    const node = nodes.get(id);
    if (!node) return false;
    const url = node.callFrame.url || scriptUrls.get(node.callFrame.scriptId) || '';
    const own = url.startsWith('chrome-extension://');
    if (own) extensionUrls.add(url);
    const result = own || (parents.has(id) && isExtension(parents.get(id)));
    cache.set(id, result);
    return result;
  }
  const attributedSamples = [];
  let extensionUs = 0;
  let timestamp = profile.startTime;
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  for (let index = 0; index < samples.length; index++) {
    timestamp += deltas[index] || 0;
    if (!isExtension(samples[index])) continue;
    // Charge the interval up to the next sample; cap at profile end.
    const duration = Math.max(0, Math.min(deltas[index + 1] ?? profile.endTime - timestamp, profile.endTime - timestamp));
    extensionUs += duration;
    attributedSamples.push({ timestamp, duration });
  }
  const navUs = navigationStartSeconds * 1e6;
  const attributedTasks = longTasks.filter(task => {
    const begin = navUs + task.startTime * 1000;
    const end = begin + task.duration * 1000;
    // Use the actual sample timestamp, not a speculative overlapping interval.
    return attributedSamples.some(sample => sample.timestamp >= begin && sample.timestamp < end);
  });
  return {
    extensionScriptingMs: extensionUs / 1000,
    extensionSampleCount: attributedSamples.length,
    totalSampleCount: samples.length,
    extensionUrls: [...extensionUrls],
    extensionLongTasks: attributedTasks,
    maxExtensionLongTaskMs: Math.max(0, ...attributedTasks.map(task => task.duration)),
  };
}

/** Walk CDP's native detached trees; this sees DOM retained in isolated worlds too. */
export function countDetachedTrees(detachedNodes) {
  const mountIds = new Set();
  const shadowIds = new Set();
  const ids = new Set();
  function walk(node, insideMount = false) {
    const id = node.backendNodeId ?? node.nodeId;
    if (ids.has(id)) return;
    ids.add(id);
    const attributes = node.attributes || [];
    let mount = false;
    for (let i = 0; i < attributes.length; i += 2) if (attributes[i] === 'data-slop-shame-mount') mount = true;
    if (mount) mountIds.add(id);
    if ((insideMount || mount) && node.shadowRootType) shadowIds.add(id);
    for (const child of [...node.children || [], ...node.shadowRoots || []]) walk(child, insideMount || mount);
  }
  for (const tree of detachedNodes) walk(tree.treeNode);
  return { retainedMounts: mountIds.size, retainedMountShadowRoots: shadowIds.size, detachedNodes: ids.size, detachedTrees: detachedNodes.length };
}

/** Worst positive post-GC slope, using comparable checkpoints and subtracting baseline churn. */
export function heapGrowthPer1000(run, baseline) {
  const checkpoints = run.checkpoints.filter(point => point.phase === 'scroll');
  const baselineByPosts = new Map(baseline.checkpoints.filter(point => point.phase === 'scroll').map(point => [point.posts, point]));
  const raw = [];
  const adjusted = [];
  for (let i = 1; i < checkpoints.length; i++) {
    const previous = checkpoints[i - 1];
    const current = checkpoints[i];
    const count = current.posts - previous.posts;
    if (count <= 0) continue;
    const growth = current.heap.usedSize - previous.heap.usedSize;
    raw.push(growth / count * 1000);
    const before = baselineByPosts.get(previous.posts);
    const after = baselineByPosts.get(current.posts);
    if (before && after) adjusted.push((growth - (after.heap.usedSize - before.heap.usedSize)) / count * 1000);
  }
  return {
    rawBytes: Math.max(0, ...raw),
    extensionExcessBytes: adjusted.length ? Math.max(0, ...adjusted) : null,
  };
}

export function verdict(baseline, extension, budgets) {
  const growth = heapGrowthPer1000(extension, baseline);
  const recovery = extension.checkpoints.at(-1);
  const baselineRecovery = baseline.checkpoints.at(-1);
  const uiDetected = extension.uiSamples.some(sample => sample.observedUi);
  const checks = [];
  const add = (name, actual, limit, unit, available = true) => checks.push({
    name, actual: available ? actual : null, limit, unit,
    status: !available ? 'unavailable' : actual <= limit ? 'pass' : 'fail',
  });
  add('Post-GC heap above baseline', recovery.heap.usedSize - baselineRecovery.heap.usedSize, budgets.heapOverBaselineBytes, 'bytes');
  // Gate on growth the extension adds over the same feed without it; the
  // simulated feed alone grows ~0.9 MiB/1,000 posts. Raw only if unaligned.
  add('Extension heap growth over baseline / 1,000 posts', growth.extensionExcessBytes ?? growth.rawBytes, budgets.heapGrowthBytesPer1000Posts, 'bytes');
  add('Retained detached mounts', recovery.detached.retainedMounts, budgets.retainedDetachedMounts, 'mounts');
  add('Extension-attributed long task max', extension.profile.maxExtensionLongTaskMs, budgets.extensionLongTaskMs, 'ms', extension.longTasks.supported);
  add('Scroll frame p95 regression', (extension.frames.p95Ms ?? 0) - (baseline.frames.p95Ms ?? 0), budgets.frameP95RegressionMs, 'ms', Boolean(extension.frames.samples && baseline.frames.samples));
  add('Extension scripting / post', extension.profile.extensionScriptingMs / extension.feed.visited, budgets.extensionScriptingMsPerPost, 'ms/post', extension.contentScriptDetected);
  add('Duplicate mounts at settled checkpoints', Math.max(...extension.checkpoints.map(point => point.ui.duplicateMounts)), budgets.duplicateMounts, 'mounts', uiDetected);
  add('Connected orphan mounts at settled checkpoints', Math.max(...extension.checkpoints.map(point => point.ui.orphanMounts)), budgets.orphanMounts, 'mounts', uiDetected);
  add('Missing mounts on live posts at settled checkpoints', Math.max(0, ...extension.checkpoints.map(point => point.ui.posts - point.ui.mounts)), budgets.liveMountDeficit, 'mounts', uiDetected);
  add('Visible posts missing UI after recovery', recovery.ui.visiblePosts - recovery.ui.visibleWithUi, budgets.visibleUiDeficit, 'posts', uiDetected);
  add('UI instances above initial after recovery', Math.max(0, recovery.ui.uiInstances - extension.checkpoints[0].ui.uiInstances), 0, 'instances', uiDetected);
  const failed = checks.some(check => check.status === 'fail');
  const unavailable = checks.some(check => check.status === 'unavailable' && !check.name.includes('UI') && !check.name.includes('mounts'));
  return {
    status: failed ? 'FAIL' : !uiDetected || !extension.contentScriptDetected || unavailable ? 'INCOMPLETE' : 'PASS',
    failed, uiDetected, growth, checks,
    coverage: uiDetected ? 'Extension UI detected' : 'no extension UI detected',
  };
}
