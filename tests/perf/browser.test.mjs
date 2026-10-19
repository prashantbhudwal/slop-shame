import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { attributeProfile, countDetachedTrees } from '../../scripts/perf/metrics.mjs';
import { BrowserProcessGuard, installProcessCleanup, memoryLimitedArgs } from '../../scripts/perf/processes.mjs';

const directory = fileURLToPath(new URL('./feed-sim/', import.meta.url));
installProcessCleanup();

async function launchProbe() {
  const profileDir = await mkdtemp(join(tmpdir(), 'slop-shame-perf-probe-'));
  const guard = new BrowserProcessGuard(profileDir);
  const close = async () => {
    try { await guard.shutdown(); } finally { await rm(profileDir, { recursive: true, force: true }); }
  };
  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chromium', headless: true, args: memoryLimitedArgs, viewport: { width: 1280, height: 900 },
    });
    guard.context = context;
    await guard.sample();
    return { context, page: context.pages()[0] || await context.newPage(), close };
  } catch (error) { await close(); throw error; }
}

test('virtual feed visits all posts, recycles cards, and returns to its initial window', async () => {
  const { page, close } = await launchProbe();
  try {
    await page.addInitScript({ path: `${directory}measure.js` });
    const corpus = [
      { text: 'We fixed a small bug in the worker queue and wrote down what happened. The incident started on Tuesday and affected two customers. Both customers have confirmed their reports are now correct. Our next release will add a separate retry queue and a slower backoff for requests to that endpoint.', sloppy: false },
      { text: '🚀 Let’s delve into the transformative tapestry of innovation and unlock our potential. Leverage the ecosystem. Embrace your journey. The future is here and it is a game-changer. Read that again. Comment YES for my playbook and follow me for more lessons in leadership, growth, synergy, and purpose. #AI #Leadership', sloppy: true },
    ];
    await page.route('https://www.linkedin.com/**', async route => {
      const url = new URL(route.request().url());
      if (route.request().isNavigationRequest()) {
        await route.fulfill({ contentType: 'text/html', body: await readFile(`${directory}index.html`, 'utf8') });
      } else if (url.pathname.endsWith('/feed.js')) {
        await route.fulfill({ contentType: 'text/javascript', body: await readFile(`${directory}feed.js`, 'utf8') });
      } else if (url.pathname.endsWith('/corpus.json')) {
        await route.fulfill({ json: corpus });
      } else await route.fulfill({ status: 204 });
    });
    await page.goto('https://www.linkedin.com/feed/?posts=90&seed=42&batch=10&window=30&slot=440');
    await page.waitForFunction(() => window.__perfFeed?.ready);
    const before = await page.evaluate(() => ({
      stats: window.__perfFeed.stats(), text: document.querySelector('[data-perf-post="0"]').textContent,
    }));
    assert.equal(before.stats.live, 30);
    const words = await page.evaluate(() => [...document.querySelectorAll('.d64ef')].map(post => post.textContent.split(/\s+/u).length));
    assert.ok(words.every(count => count >= 50 && count <= 400));
    await page.evaluate(() => window.__perfFeed.scrollToPost(89, 40000));
    const end = await page.evaluate(() => window.__perfFeed.stats());
    assert.equal(end.visited, 90);
    assert.equal(end.live, 30);
    assert.equal(end.generated, 90);
    assert.ok(end.removed >= 60);
    assert.ok(end.recycled >= 60);
    await page.evaluate(() => window.__perfFeed.returnToTop());
    const after = await page.evaluate(() => ({
      stats: window.__perfFeed.stats(), text: document.querySelector('[data-perf-post="0"]').textContent,
    }));
    assert.equal(after.stats.first, 0);
    assert.equal(after.stats.live, before.stats.live);
    assert.equal(after.text, before.text);
    const empty = await page.evaluate(() => {
      const mount = document.createElement('div');
      mount.setAttribute('data-slop-shame-mount', '');
      mount.attachShadow({ mode: 'open' }).innerHTML = '<style>button { color: red }</style>';
      document.querySelector('[data-perf-post]').append(mount);
      return window.__perfMetrics.uiStats();
    });
    assert.equal(empty.mounts, 1);
    assert.equal(empty.uiInstances, 0, 'an empty styled shadow root is not working UI');
    const populated = await page.evaluate(() => {
      document.querySelector('[data-slop-shame-mount]').shadowRoot.append(document.createElement('button'));
      return window.__perfMetrics.uiStats();
    });
    assert.equal(populated.uiInstances, 1);
    assert.equal(populated.shadowHosts, 1);
  } finally { await close(); }
});

test('CPU URL attribution correlates a deliberately blocking script with an observed long task', async () => {
  const { page, close } = await launchProbe();
  try {
    await page.addInitScript({ path: `${directory}measure.js` });
    await page.goto('data:text/html,<main>CPU attribution positive control</main>');
    const session = await page.context().newCDPSession(page);
    const urls = new Map();
    session.on('Debugger.scriptParsed', script => urls.set(script.scriptId, script.url));
    await session.send('Debugger.enable');
    await session.send('Performance.enable');
    await session.send('Profiler.enable');
    await session.send('Profiler.setSamplingInterval', { interval: 1000 });
    await session.send('Profiler.start');
    // A controlled sourceURL labels this synthetic script; no extension URL is fetched.
    await page.addScriptTag({ content: `window.perfSyntheticBlock = function () {
      const start = performance.now();
      while (performance.now() - start < 90) { Math.sqrt(Math.random()); }
    };\n//# sourceURL=chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/perf-positive-control.js` });
    await page.evaluate(() => {
      setTimeout(() => { window.perfSyntheticBlock(); window.__probeDone = true; }, 0);
    });
    await page.waitForFunction(() => window.__probeDone);
    await page.waitForFunction(() => window.__perfMetrics.result().longTasks.length > 0);
    const entries = await page.evaluate(() => window.__perfMetrics.result().longTasks);
    const { metrics } = await session.send('Performance.getMetrics');
    const navStart = metrics.find(metric => metric.name === 'NavigationStart').value;
    const { profile } = await session.send('Profiler.stop');
    const attributed = attributeProfile(profile, urls, navStart, entries);
    assert.ok(attributed.extensionScriptingMs > 40, JSON.stringify(attributed));
    assert.ok(attributed.maxExtensionLongTaskMs > 50, JSON.stringify(attributed));
    assert.ok(attributed.extensionSampleCount > 0);
    await session.detach();
  } finally { await close(); }
});

test('native detached query sees retained isolated-world shadow hosts and clears after release', async () => {
  const { page, close } = await launchProbe();
  try {
    await page.addInitScript({ path: `${directory}measure.js` });
    await page.goto('data:text/html,<main>Detached DOM positive control</main>');
    const session = await page.context().newCDPSession(page);
    await session.send('Runtime.enable');
    const { frameTree } = await session.send('Page.getFrameTree');
    const { executionContextId } = await session.send('Page.createIsolatedWorld', {
      frameId: frameTree.frame.id, worldName: 'perf-isolated-world-positive-control',
    });
    await session.send('Runtime.evaluate', {
      contextId: executionContextId,
      expression: `(() => {
        globalThis.__retainedMounts = [];
        for (let i = 0; i < 10; i++) {
          const host = document.createElement('div');
          host.setAttribute('data-slop-shame-mount', '');
          host.attachShadow({ mode: 'open' }).innerHTML = '<button>Retained control</button>';
          const card = document.createElement('article');
          card.innerHTML = '<div><header>Actor</header><section></section></div>';
          card.querySelector('section').append(host);
          document.body.append(card);
          card.remove();
          globalThis.__retainedMounts.push(host);
        }
        return globalThis.__retainedMounts.length;
      })()`,
    });
    await delay(50);
    await session.send('HeapProfiler.collectGarbage');
    await session.send('DOM.enable');
    const retained = countDetachedTrees((await session.send('DOM.getDetachedDomNodes')).detachedNodes);
    assert.equal(retained.retainedMounts, 10);
    assert.equal(retained.retainedMountShadowRoots, 10);
    await session.send('DOM.disable');
    await session.send('Runtime.evaluate', { contextId: executionContextId, expression: 'globalThis.__retainedMounts = null; 0' });
    await delay(50);
    await session.send('HeapProfiler.collectGarbage');
    await delay(50);
    await session.send('HeapProfiler.collectGarbage');
    await session.send('DOM.enable');
    const released = countDetachedTrees((await session.send('DOM.getDetachedDomNodes')).detachedNodes);
    assert.equal(released.retainedMounts, 0);
    await session.send('DOM.disable');
    await session.detach();
  } finally { await close(); }
});
