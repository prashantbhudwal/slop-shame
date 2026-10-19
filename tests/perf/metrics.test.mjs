import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributeProfile, countDetachedTrees, frameStats, heapGrowthPer1000, verdict } from '../../scripts/perf/metrics.mjs';
import { budgets } from '../../scripts/perf/budgets.mjs';
import { parseProcesses, ownedTree } from '../../scripts/perf/processes.mjs';

test('process-tree RSS parsing and ownership exclude other profiles and reused PIDs', () => {
  const rows = parseProcesses(`
   10 1 100 Chromium --user-data-dir=/tmp/perf-ABC
   11 10 200 Chromium --type=renderer
   12 11 300 Chromium utility
   20 1 999 Chromium --user-data-dir=/tmp/perf-ABC-other
   21 1 999 unrelated
   30 1 400 reparented-known-child
  `);
  const tree = ownedTree(rows, '/tmp/perf-ABC', new Map([[30, 'reparented-known-child'], [21, 'old-PID-command']]));
  assert.deepEqual(tree.map(row => row.pid), [10, 11, 12, 30]);
  assert.equal(tree.reduce((sum, row) => sum + row.rssBytes, 0), 1000 * 1024);
});

test('CPU attribution includes extension ancestors once and aligns actual samples with long tasks', () => {
  const profile = {
    startTime: 1_000_000, endTime: 1_100_000,
    nodes: [
      { id: 1, callFrame: { url: '', scriptId: '0' }, children: [2, 4] },
      { id: 2, callFrame: { url: '', scriptId: '42' }, children: [3] },
      { id: 3, callFrame: { url: 'native', scriptId: '0' } },
      { id: 4, callFrame: { url: 'https://www.linkedin.com/__perf__/feed.js', scriptId: '5' } },
    ],
    samples: [4, 3, 2, 4], timeDeltas: [1000, 1000, 1000, 1000],
  };
  const result = attributeProfile(profile, new Map([['42', 'chrome-extension://abc/content-scripts/linkedin.js']]), 1, [
    { startTime: 0, duration: 51 }, { startTime: 55, duration: 55 },
  ]);
  assert.equal(result.extensionScriptingMs, 2);
  assert.equal(result.extensionSampleCount, 2);
  assert.equal(result.extensionLongTasks.length, 1);
  assert.equal(result.maxExtensionLongTaskMs, 51);
});

test('detached native trees count marked mounts and shadow roots, deduping backend IDs', () => {
  const mount = { backendNodeId: 2, attributes: ['id', 'x', 'data-slop-shame-mount', ''], shadowRoots: [
    { backendNodeId: 3, shadowRootType: 'open', children: [{ backendNodeId: 4, attributes: [] }] },
  ] };
  const result = countDetachedTrees([
    { treeNode: { backendNodeId: 1, children: [mount] } }, { treeNode: mount },
  ]);
  assert.equal(result.retainedMounts, 1);
  assert.equal(result.retainedMountShadowRoots, 1);
  assert.equal(result.detachedNodes, 4);
});

test('frame percentiles use nearest rank and count a 50ms frame as two dropped refreshes', () => {
  const result = frameStats([16.6, 16.7, 16.7, 50], 1000 / 60);
  assert.equal(result.p50Ms, 16.7);
  assert.equal(result.p95Ms, 50);
  assert.equal(result.droppedFrames, 2);
});

const point = (posts, bytes, phase = 'scroll') => ({
  posts, phase, heap: { usedSize: bytes }, detached: { retainedMounts: 0 },
  ui: { posts: 3, mounts: 3, uiInstances: 3, duplicateMounts: 0, orphanMounts: 0, visiblePosts: 3, visibleWithUi: 3 },
});
const fakeRun = () => ({
  checkpoints: [point(0, 1e6), point(1000, 1.1e6), point(2000, 1.2e6), point(2000, 1e6, 'recovery')],
  contentScriptDetected: true, uiSamples: [{ observedUi: true }], frames: { samples: 100, p95Ms: 16.7 },
  feed: { visited: 2000 }, longTasks: { supported: true },
  profile: { maxExtensionLongTaskMs: 0, extensionScriptingMs: 100 },
});

test('growth uses post-GC slopes, reports baseline-adjusted churn, and excludes return-to-top', () => {
  const baseline = fakeRun();
  const extension = fakeRun();
  extension.checkpoints[2].heap.usedSize += 2 * 1024 ** 2;
  extension.checkpoints[3].heap.usedSize = 50e6;
  const growth = heapGrowthPer1000(extension, baseline);
  assert.equal(growth.rawBytes, 100000 + 2 * 1024 ** 2);
  assert.equal(growth.extensionExcessBytes, 2 * 1024 ** 2);
});

test('every requested budget fails independently, including raw GC growth', () => {
  const edits = [
    run => { run.checkpoints.at(-1).heap.usedSize += budgets.heapOverBaselineBytes + 1; },
    run => { run.checkpoints[2].heap.usedSize += budgets.heapGrowthBytesPer1000Posts + 1; },
    run => { run.checkpoints.at(-1).detached.retainedMounts = 6; },
    run => { run.profile.maxExtensionLongTaskMs = 50.01; },
    run => { run.frames.p95Ms = 20.71; },
    run => { run.profile.extensionScriptingMs = 3001; },
    run => { run.checkpoints.at(-1).ui.mounts = 2; },
  ];
  for (const edit of edits) {
    const baseline = fakeRun();
    const extension = fakeRun();
    edit(extension);
    assert.equal(verdict(baseline, extension, budgets).failed, true);
  }
});

test('missing UI is incomplete instead of a false performance pass or exception', () => {
  const extension = fakeRun();
  extension.uiSamples = [{ observedUi: false }];
  const result = verdict(fakeRun(), extension, budgets);
  assert.equal(result.failed, false);
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.coverage, 'no extension UI detected');
});
