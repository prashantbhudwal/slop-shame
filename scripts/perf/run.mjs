import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { budgets, workload } from './budgets.mjs';
import { attributeProfile, countDetachedTrees, frameStats, heapGrowthPer1000, mib, verdict } from './metrics.mjs';
import { BrowserProcessGuard, installProcessCleanup, memoryLimitedArgs } from './processes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const extensionPath = resolve(root, '.output/chrome-mv3');
const fixturePath = resolve(root, 'tests/perf/feed-sim');
const resultsRoot = resolve(root, 'test-results/perf');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = resolve(resultsRoot, runId);
process.chdir(root);
installProcessCleanup();

async function loadCorpus() {
  const directory = resolve(root, 'tests/fixtures/posts');
  const files = existsSync(directory) ? (await readdir(directory)).filter(file => file.endsWith('.json')).sort() : [];
  const posts = [];
  const usedFiles = [];
  for (const file of files) {
    const json = JSON.parse(await readFile(resolve(directory, file), 'utf8'));
    const entries = Array.isArray(json) ? json : Array.isArray(json.posts) ? json.posts : [json];
    let used = false;
    for (const entry of entries) {
      if (typeof entry.text !== 'string' || !entry.text.trim()) continue;
      const tiers = Array.isArray(entry.expectTier) ? entry.expectTier : [entry.expectTier];
      posts.push({
        text: entry.text, authorHeadline: entry.authorHeadline || '',
        sloppy: tiers.some(tier => ['certified', 'swamp', 'slopocalypse'].includes(tier)) || /slop|swamp|certified|apocalypse/i.test(file),
      });
      used = true;
    }
    if (used) usedFiles.push(`tests/fixtures/posts/${file}`);
  }
  if (!posts.some(post => !post.sloppy)) posts.push({ text: 'We fixed a retry bug in the payments worker this week. A failed request used to occupy a thread until it timed out. The change adds backoff and a separate queue. We checked it against last month’s incidents and the release is now running on all workers.', sloppy: false });
  if (!posts.some(post => post.sloppy)) posts.push({ text: '🚀 In today’s fast-paced world, let’s delve into the transformative tapestry of innovation. It’s not just about synergy, it’s about unlocking your full potential. Here are five game-changing lessons to supercharge your journey. Embrace the ecosystem. Leverage your mindset. Read that again. Agree? Comment YES below! #Leadership #Growth #Innovation #AI', sloppy: true });
  return { posts, usedFiles };
}

async function startServer(corpus) {
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/feed.js', ['feed.js', 'text/javascript; charset=utf-8']],
  ]);
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/corpus.json') {
        response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        response.end(JSON.stringify(corpus));
        return;
      }
      const file = files.get(pathname);
      if (!file) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'content-type': file[1], 'cache-control': 'no-store' });
      response.end(await readFile(resolve(fixturePath, file[0])));
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function launch(extension, profileDir) {
  // The shared fixture helper has no launch-args option. This scoped launcher is
  // required to apply the owner's heap/process limits without editing its files.
  return {
    context: await chromium.launchPersistentContext(profileDir, {
      channel: 'chromium', headless: workload.headless,
      args: [...memoryLimitedArgs, ...(extension ? [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] : ['--disable-extensions'])],
    }),
    launcher: 'local temporary-profile launcher',
  };
}

async function routeFixture(context, origin) {
  await context.route(/^https?:\/\//, async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://www.linkedin.com') { await route.fulfill({ status: 204, body: '' }); return; }
    const path = route.request().isNavigationRequest() ? '/'
      : url.pathname.startsWith('/__perf__/') ? url.pathname.slice('/__perf__'.length) : null;
    if (!path) { await route.fulfill({ status: 204, body: '' }); return; }
    const response = await context.request.get(`${origin}${path}`);
    if (!response.ok()) throw new Error(`Fixture HTTP ${response.status()}: ${path}`);
    await route.fulfill({ response });
  });
}

async function heap(session) {
  const [usage, performance] = await Promise.all([
    session.send('Runtime.getHeapUsage'), session.send('Performance.getMetrics'),
  ]);
  const metrics = Object.fromEntries(performance.metrics.map(metric => [metric.name, metric.value]));
  return {
    ...usage, jsHeapUsedSize: metrics.JSHeapUsedSize, jsHeapTotalSize: metrics.JSHeapTotalSize,
    domNodes: metrics.Nodes, documents: metrics.Documents, eventListeners: metrics.JSEventListeners,
    navigationStartSeconds: metrics.NavigationStart,
  };
}

async function detached(session, page) {
  const proxy = await page.evaluate(() => window.__perfMetrics.detachedProxy());
  try {
    await session.send('DOM.enable');
    const result = await session.send('DOM.getDetachedDomNodes');
    const native = countDetachedTrees(result.detachedNodes);
    return { ...native, weakRefProxy: proxy, method: 'CDP DOM.getDetachedDomNodes (native DOM, all worlds)' };
  } catch (error) {
    return {
      retainedMounts: proxy.retained, retainedMountShadowRoots: null, detachedNodes: null, detachedTrees: null,
      weakRefProxy: proxy, method: 'WeakRef removed-mount proxy (lower bound; cross-world retention may be missed)',
      nativeUnavailable: String(error),
    };
  } finally {
    // Native detached queries bind backend nodes in DevTools. Release that map
    // so the measurement cannot retain nodes across later GC checkpoints.
    await session.send('DOM.disable').catch(() => {});
  }
}

async function checkpoint(session, page, phase) {
  await page.evaluate(() => window.__perfMetrics.recordFrames(false));
  await delay(workload.settleMs);
  // Separate protocol turns let WeakRef keep-alive jobs and idle cleanup finish.
  await session.send('HeapProfiler.collectGarbage');
  await delay(50);
  await session.send('HeapProfiler.collectGarbage');
  const [memory, state] = await Promise.all([
    heap(session),
    page.evaluate(() => ({ ui: window.__perfMetrics.uiStats(), feed: window.__perfFeed.stats() })),
  ]);
  return { phase, posts: state.feed.visited, heap: memory, ...state, detached: await detached(session, page) };
}

async function measureRun(extension, origin) {
  const name = extension ? 'extension' : 'baseline';
  const profileDir = await mkdtemp(resolve(tmpdir(), 'slop-shame-perf-'));
  const guard = new BrowserProcessGuard(profileDir);
  let context;
  try {
    const launched = await launch(extension, profileDir);
    context = launched.context;
    guard.context = context;
    const initialRss = await guard.sample();
    await context.addInitScript({ path: resolve(fixturePath, 'measure.js') });
    await routeFixture(context, origin);
    const page = context.pages()[0] || await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    const session = await context.newCDPSession(page);
    const scriptUrls = new Map();
    const extensionContexts = new Set();
    session.on('Debugger.scriptParsed', script => scriptUrls.set(script.scriptId, script.url));
    session.on('Runtime.executionContextCreated', ({ context: world }) => {
      if (world.origin?.startsWith('chrome-extension://') || /^[a-p]{32}$/.test(world.name)) extensionContexts.add(world.origin || world.name);
    });
    await session.send('Runtime.enable');
    await session.send('Debugger.enable');
    await session.send('Performance.enable');
    await session.send('Profiler.enable');
    await session.send('Profiler.setSamplingInterval', { interval: workload.profilerIntervalUs });
    await session.send('Profiler.start');
    const query = new URLSearchParams({
      posts: String(workload.posts), seed: String(workload.seed), batch: String(workload.batchSize),
      window: String(workload.windowSize), slot: String(workload.slotHeight),
    });
    const started = Date.now();
    console.log(`\n[${name}] ${workload.posts.toLocaleString()} posts, ${workload.pixelsPerSecond} px/s, 30-card virtual window`);
    await page.goto(`https://www.linkedin.com/feed/?${query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__perfFeed?.ready && window.__perfMetrics, null, { timeout: 15000 });
    const checkpoints = [await checkpoint(session, page, 'scroll')];
    const heapSamples = [{ elapsedMs: Date.now() - started, posts: checkpoints[0].posts, ...checkpoints[0].heap, ...initialRss }];
    const uiSamples = [checkpoints[0].ui];
    let lastLog = Date.now();
    const targets = [];
    for (let index = workload.checkpointEveryPosts; index < workload.posts; index += workload.checkpointEveryPosts) targets.push(index);
    targets.push(workload.posts);
    for (const target of targets) {
      await page.evaluate(() => window.__perfMetrics.recordFrames(true));
      let done = false;
      let scrollError;
      const scrolling = page.evaluate(async ({ index, speed }) => {
        await window.__perfFeed.scrollToPost(index, speed);
        window.__perfMetrics.recordFrames(false);
      }, { index: target - 1, speed: workload.pixelsPerSecond }).then(() => { done = true; }, error => { scrollError = error; done = true; });
      const segmentStarted = Date.now();
      const segmentLimitMs = Math.max(60000, workload.checkpointEveryPosts * workload.slotHeight / workload.pixelsPerSecond * 6000 + 30000);
      while (!done) {
        await delay(workload.sampleEveryMs);
        if (Date.now() - segmentStarted > segmentLimitMs) throw new Error(`${name}: scroll stalled for ${Math.round(segmentLimitMs / 1000)}s`);
        const [memory, state, rss] = await Promise.all([
          heap(session), page.evaluate(() => ({ ui: window.__perfMetrics.uiStats(), feed: window.__perfFeed.stats() })), guard.sample(),
        ]);
        heapSamples.push({ elapsedMs: Date.now() - started, posts: state.feed.visited, ...memory, ...rss });
        uiSamples.push(state.ui);
        if (Date.now() - lastLog > 15000 || done) {
          console.log(`[${name}] ${state.feed.visited}/${workload.posts} seen; ${state.feed.live} cards; ${state.ui.uiInstances} UI; heap ${mib(memory.usedSize).toFixed(2)} MiB; tree RSS ${mib(rss.rssBytes).toFixed(1)} MiB`);
          lastLog = Date.now();
        }
      }
      await scrolling;
      if (scrollError) throw scrollError;
      checkpoints.push(await checkpoint(session, page, 'scroll'));
    }
    await page.evaluate(() => window.__perfMetrics.recordFrames(false));
    // Third phase: revisit the original posts, leave only the initial-sized DOM window, then GC.
    await page.evaluate(() => window.__perfFeed.returnToTop());
    checkpoints.push(await checkpoint(session, page, 'recovery'));
    const measured = await page.evaluate(() => window.__perfMetrics.result());
    const feed = await page.evaluate(() => window.__perfFeed.stats());
    const stopped = await session.send('Profiler.stop');
    const profileFile = `${name}.cpuprofile`;
    await writeFile(resolve(outputDir, profileFile), JSON.stringify(stopped.profile));
    const profile = attributeProfile(stopped.profile, scriptUrls, checkpoints[0].heap.navigationStartSeconds, measured.longTasks);
    const contentScripts = [...new Set([...scriptUrls.values()].filter(url => url.startsWith('chrome-extension://')))];
    await session.detach();
    const result = {
      name, launcher: launched.launcher, browserVersion: context.browser()?.version() || 'unknown', elapsedMs: Date.now() - started,
      contentScriptDetected: contentScripts.length > 0 || extensionContexts.size > 0,
      contentScripts, extensionContexts: [...extensionContexts],
      heap: { startBytes: checkpoints[0].heap.usedSize, peakBytes: Math.max(...heapSamples.map(sample => sample.usedSize), ...checkpoints.map(point => point.heap.usedSize)), afterGcBytes: checkpoints.at(-1).heap.usedSize },
      checkpoints, heapSamples, uiSamples, feed,
      longTasks: { supported: measured.longTasksSupported, count: measured.longTasks.length, maxMs: Math.max(0, ...measured.longTasks.map(task => task.duration)), entries: measured.longTasks },
      frames: frameStats(measured.frames, workload.frameBudgetMs),
      profile: { ...profile, profileFile: `${runId}/${profileFile}`, extensionScriptingMsPerPost: profile.extensionScriptingMs / feed.visited },
      slopMarks: measured.marks, errors,
    };
    console.log(`[${name}] recovery: ${mib(result.heap.afterGcBytes).toFixed(2)} MiB after GC; ${checkpoints.at(-1).detached.retainedMounts} retained detached mounts`);
    if (feed.visited !== workload.posts) throw new Error(`${name}: only ${feed.visited}/${workload.posts} posts entered the viewport`);
    if (feed.live > workload.windowSize) throw new Error(`${name}: simulator exceeded its ${workload.windowSize}-card window`);
    await guard.shutdown(); // Verify the entire browser tree is gone BEFORE the next launch.
    result.browserProcessTree = guard.result();
    console.log(`[${name}] browser tree closed and verified gone; peak RSS ${mib(result.browserProcessTree.peakRssBytes).toFixed(1)} MiB`);
    await writeFile(resolve(outputDir, `${name}.json`), JSON.stringify(result, null, 2));
    return result;
  } finally {
    try { await guard.shutdown(); } finally { await rm(profileDir, { recursive: true, force: true, maxRetries: 3 }); }
  }
}

const format = value => value == null ? 'unavailable' : typeof value === 'number' ? value.toFixed(3) : String(value);
const display = (value, unit) => value == null ? 'unavailable' : unit === 'bytes' ? `${mib(value).toFixed(3)} MiB` : `${format(value)} ${unit}`;

function markdown(report) {
  const { baseline, extension, verdict: outcome } = report;
  const growth = heapGrowthPer1000(extension, baseline);
  const baselineGrowth = heapGrowthPer1000(baseline, baseline);
  const b = baseline.checkpoints.at(-1);
  const e = extension.checkpoints.at(-1);
  const rows = [
    ['Posts visited', baseline.feed.visited, extension.feed.visited],
    ['Peak browser process-tree RSS (MiB)', mib(baseline.browserProcessTree.peakRssBytes), mib(extension.browserProcessTree.peakRssBytes)],
    ['Browser tree gone before next launch', baseline.browserProcessTree.shutdownVerified, extension.browserProcessTree.shutdownVerified],
    ['Heap at start (MiB, after GC)', mib(baseline.heap.startBytes), mib(extension.heap.startBytes)],
    ['Peak sampled heap (MiB)', mib(baseline.heap.peakBytes), mib(extension.heap.peakBytes)],
    ['Recovery heap (MiB, after GC)', mib(baseline.heap.afterGcBytes), mib(extension.heap.afterGcBytes)],
    ['Worst post-GC growth (MiB / 1,000 posts)', mib(baselineGrowth.rawBytes), mib(growth.rawBytes)],
    ['Extension excess growth (MiB / 1,000 posts)', '—', growth.extensionExcessBytes === null ? '—' : mib(growth.extensionExcessBytes)],
    ['Retained detached mounts after GC', b.detached.retainedMounts, e.detached.retainedMounts],
    ['All detached native nodes after GC', b.detached.detachedNodes, e.detached.detachedNodes],
    ['Live posts / mounts / UI after recovery', `${b.ui.posts} / ${b.ui.mounts} / ${b.ui.uiInstances}`, `${e.ui.posts} / ${e.ui.mounts} / ${e.ui.uiInstances}`],
    ['Long tasks: count / max ms', `${baseline.longTasks.count} / ${format(baseline.longTasks.maxMs)}`, `${extension.longTasks.count} / ${format(extension.longTasks.maxMs)}`],
    ['Extension-attributed long tasks: count / max ms', '—', `${extension.profile.extensionLongTasks.length} / ${format(extension.profile.maxExtensionLongTaskMs)}`],
    ['Frame interval p50 / p95 / p99 (ms)', [baseline.frames.p50Ms, baseline.frames.p95Ms, baseline.frames.p99Ms].map(format).join(' / '), [extension.frames.p50Ms, extension.frames.p95Ms, extension.frames.p99Ms].map(format).join(' / ')],
    ['Estimated dropped frames', baseline.frames.droppedFrames, extension.frames.droppedFrames],
    ['Extension scripting total (ms)', baseline.profile.extensionScriptingMs, extension.profile.extensionScriptingMs],
    ['Extension scripting per visited post (ms)', baseline.profile.extensionScriptingMsPerPost, extension.profile.extensionScriptingMsPerPost],
    ['CPU samples attributed to extension', baseline.profile.extensionSampleCount, extension.profile.extensionSampleCount],
    ['Cards removed / shells recycled', `${baseline.feed.removed} / ${baseline.feed.recycled}`, `${extension.feed.removed} / ${extension.feed.recycled}`],
  ];
  return `# Slop Shame performance soak — ${outcome.status}\n\n${outcome.coverage}. ${report.createdAt}.\n\nSeed: ${workload.seed}; ${workload.posts} posts per run; ${workload.pixelsPerSecond} px/s; ${workload.windowSize} live cards; ${workload.batchSize}-post lazy batches. Chromium ${report.browserVersion}.\n\n| Metric | No extension | Extension enabled |\n|---|---:|---:|\n${rows.map(row => `| ${row[0]} | ${format(row[1])} | ${format(row[2])} |`).join('\n')}\n\n## Budgets\n\n| Check | Actual | Limit | Verdict |\n|---|---:|---:|---|\n${outcome.checks.map(check => `| ${check.name} | ${display(check.actual, check.unit)} | ${display(check.limit, check.unit)} | ${check.status.toUpperCase()} |`).join('\n')}\n\n## Method and limits\n\n- Two sequential fresh temporary profiles: baseline without extensions, then the built extension via ${extension.launcher}. Each sees the same deterministic feed, scrolls through every post, returns to the top, waits ${workload.settleMs} ms, and collects garbage twice. Each browser is fully closed and its owned process tree verified gone before launching the next. GC stays in the measured process before it closes. Launch flags: --js-flags=--max-old-space-size=1024 and --renderer-process-limit=2; worker concurrency is 1. No real LinkedIn profile is read. Every HTTP(S) browser request is fulfilled locally or blocked.\n- Heap covers the page renderer, including content-script isolated worlds; extension service-worker heaps are outside this main-thread test. Peak is sampled every ${workload.sampleEveryMs} ms. Post-GC growth uses the worst positive slope between equal-size DOM scroll checkpoints (including the initial warm state). Growth over the no-extension baseline at the same checkpoints gates the run (raw slope only when checkpoints don't align); the raw slope is also shown. Recovery is compared with baseline recovery, not a pre-GC snapshot.\n- Detached-node method: ${e.detached.method}. No V8 heap snapshots are taken. Native trees are searched for the mount attribute and their shadow roots, then the DOM agent is disabled to release inspector bindings. A removed-mount WeakRef proxy is recorded separately and never strongly owns removed nodes.${e.detached.nativeUnavailable ? ` Native query failed: ${e.detached.nativeUnavailable.replaceAll('|', '\\|')}.` : ''}\n- Peak browser process-tree RSS is the sampled sum of ps RSS across the browser root, renderer, GPU, utility, and worker descendants. Shared resident pages may be counted more than once.\n- Mounts, populated UI hosts, shadow hosts, visible-post coverage, duplicates, and orphans are sampled independently. Visible posts must have one UI at settled recovery; offscreen cards may be scored lazily. Empty adapter mounts do not count as UI. Missing UI yields INCOMPLETE rather than a performance pass.\n- Frame intervals are recorded only during continuous rAF-driven scrolling. GC, checkpoint waits, and the return-to-top jump are excluded. Dropped frames are estimates against the configurable ${format(workload.frameBudgetMs)} ms refresh budget.\n- V8 CPU profiling samples at ${workload.profilerIntervalUs} µs in BOTH runs. A sample is charged once when its stack includes a chrome-extension:// script (scriptId resolves omitted URLs). This estimates CPU time, including synchronous native work on that stack, and is not exact function instrumentation. Raw .cpuprofile files are retained.\n- Long tasks use PerformanceObserver; a task is extension-attributed when an actual extension CPU sample falls within it, using CDP NavigationStart to align clocks. Browser long-task attribution alone usually says “self”; raw attribution is preserved. Sampling may miss a short extension contribution to an otherwise long task. Marks/measures named slop:* are optional and summarized when visible in the page world.\n- Build fingerprint: ${report.buildSha256}. Fixture corpus: ${report.corpusFiles.join(', ') || 'embedded human/slop fallbacks'}. Page errors: baseline ${baseline.errors.length}, extension ${extension.errors.length}.\n\nRaw metrics and CPU profiles: ${runId}/. Budgets and workload defaults: scripts/perf/budgets.mjs.\n`;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  if (!existsSync(resolve(extensionPath, 'manifest.json'))) throw new Error('No built extension. Run pnpm perf (or pnpm build first).');
  const corpus = await loadCorpus();
  const buildFiles = [resolve(extensionPath, 'manifest.json')];
  const scriptDir = resolve(extensionPath, 'content-scripts');
  if (existsSync(scriptDir)) for (const file of (await readdir(scriptDir)).sort()) if (file.endsWith('.js')) buildFiles.push(resolve(scriptDir, file));
  const hash = createHash('sha256');
  for (const file of buildFiles) hash.update(await readFile(file));
  const { server, origin } = await startServer(corpus.posts);
  try {
    const baseline = await measureRun(false, origin);
    const extension = await measureRun(true, origin);
    const outcome = verdict(baseline, extension, budgets);
    if (baseline.errors.length || extension.errors.length) {
      outcome.failed = true;
      outcome.status = 'FAIL';
      outcome.checks.push({ name: 'Uncaught fixture/extension page errors', actual: baseline.errors.length + extension.errors.length, limit: 0, unit: 'errors', status: 'fail' });
    }
    const report = {
      createdAt: new Date().toISOString(), runId, browserVersion: extension.browserVersion, browserExecutable: chromium.executablePath(),
      buildSha256: hash.digest('hex'), corpusFiles: corpus.usedFiles,
      workload, budgets, browserLaunchArgs: memoryLimitedArgs, workerConcurrency: 1, baseline, extension, verdict: outcome,
    };
    const json = JSON.stringify(report, null, 2);
    const md = markdown(report);
    for (const directory of [outputDir, resultsRoot]) {
      await writeFile(resolve(directory, 'report.json'), json);
      await writeFile(resolve(directory, 'report.md'), md);
    }
    console.table(outcome.checks.map(check => ({ Metric: check.name, Actual: display(check.actual, check.unit), Budget: display(check.limit, check.unit), Verdict: check.status.toUpperCase() })));
    console.log(`\n${outcome.status}: ${outcome.coverage}\nReport: ${resolve(resultsRoot, 'report.md')}\nJSON: ${resolve(resultsRoot, 'report.json')}`);
    if (outcome.failed) process.exitCode = 1;
  } finally { await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept())); }
}

main().catch(async error => {
  console.error(error);
  await mkdir(outputDir, { recursive: true });
  const failure = { status: 'ERROR', error: error.stack || String(error), createdAt: new Date().toISOString(), workload, budgets };
  await writeFile(resolve(outputDir, 'error.json'), JSON.stringify(failure, null, 2));
  await writeFile(resolve(resultsRoot, 'report.json'), JSON.stringify(failure, null, 2));
  await writeFile(resolve(resultsRoot, 'report.md'), `# Slop Shame performance soak — ERROR\n\n\`\`\`text\n${failure.error}\n\`\`\`\n`);
  process.exitCode = 1;
});
