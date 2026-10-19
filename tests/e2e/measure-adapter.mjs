// Opt-in live profiling. Instrument the development bundle, never production code.
// SLOP_REAL=1 node tests/e2e/measure-adapter.mjs --label=before
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { build } from 'vite';
import { selectors } from '../../src/lib/linkedin/selectors.ts';

const fixture = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10);
const revision = process.argv.find(arg => arg.startsWith('--revision='))?.slice(11);
const churn = process.argv.includes('--churn');
if (fixture && !/^[\w-]+$/.test(fixture)) throw new Error('Invalid fixture name.');
if (revision && !/^[a-f0-9]{7,40}$/i.test(revision)) throw new Error('Use a Git commit hash for --revision.');
if (!fixture && process.env.SLOP_REAL !== '1') throw new Error('This uses the private live profile. Opt in with SLOP_REAL=1.');
if (churn && !fixture) throw new Error('Controlled churn is restricted to synthetic fixtures.');
const label = process.argv.find(arg => arg.startsWith('--label='))?.slice(8) ?? 'measurement';
if (!/^[\w-]+$/.test(label)) throw new Error('Invalid measurement label.');
const profile = resolve('.playwright/linkedin-profile');
if (!fixture && !existsSync(profile)) throw new Error('No LinkedIn login profile.');

const result = await build({
  configFile: false, logLevel: 'silent',
  plugins: [{ name: 'adapter-measurement', enforce: 'pre',
  load(id) {
    const path = ['index.ts', 'selectors.ts'].find(name => id.endsWith(`/src/lib/linkedin/${name}`));
    if (revision && path) {
      return execFileSync('git', ['show', `${revision}:src/lib/linkedin/${path}`], { encoding: 'utf8' });
    }
  }, transform(source, id) {
    if (!id.endsWith('/src/lib/linkedin/index.ts')) return;
    const start = source.match(/function extract\(root: HTMLElement\): [^\n]+ \{/)?.[0];
    const end = '\n}\n\ninterface ElementState';
    if (!start || !source.includes(end)) throw new Error('Update profiling hooks for the extraction implementation.');
    return source.replace(start, `${start}\n  globalThis.__adapterMetrics.extractCalls++; const measuredStart = performance.now(); try {`)
      .replace(end, '\n} finally { globalThis.__adapterMetrics.extractMs += performance.now() - measuredStart; }\n}\n\ninterface ElementState')
      .replace(/function process\(root: HTMLElement[^\n]+ \{/, '$& globalThis.__adapterMetrics.processCalls++;')
      .replace('function rootFor(element: Element): HTMLElement | null {', 'function rootFor(element: Element): HTMLElement | null { globalThis.__adapterMetrics.rootForCalls++;')
      .replace('const observer = new MutationObserver(records => {', 'const observer = new MutationObserver(records => { globalThis.__adapterMetrics.mutationRecords += records.length;');
  } }],
  build: { write: false, minify: false, lib: { entry: 'src/lib/linkedin/index.ts', name: 'MeasuredAdapter', formats: ['iife'] } },
});
const source = (Array.isArray(result) ? result[0] : result).output[0].code;
let context;
try {
  context = await chromium.launchPersistentContext(fixture ? '' : profile, {
    channel: 'chromium', headless: Boolean(fixture), viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: fixture ? [] : ['--disable-blink-features=AutomationControlled', '--window-position=-2400,-2400'],
  });
  const page = context.pages()[0] ?? await context.newPage();
  if (fixture) await page.route('https://www.linkedin.com/**', route => route.fulfill({
    contentType: 'text/html', body: readFileSync(resolve('tests/fixtures/feed', `${fixture}.html`), 'utf8'),
  }));
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
  await page.locator(selectors.sduiContent[0]).first().waitFor({ state: 'attached' });
  // Let the first lazy batch load, then prefer a video viewport when available.
  await page.waitForTimeout(1500);
  const video = page.locator('video').first();
  if (await video.count()) await video.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.evaluate(`globalThis.__adapterMetrics={processCalls:0,rootForCalls:0,extractCalls:0,extractMs:0,mutationRecords:0,onPostCalls:0};${source}
    globalThis.__adapterPosts=new Map();
    globalThis.__adapterWatcher=MeasuredAdapter.watchFeed({onPost:p=>{globalThis.__adapterMetrics.onPostCalls++;globalThis.__adapterPosts.set(p.id,p)},onRemove:id=>globalThis.__adapterPosts.delete(id)});`);
  await page.waitForTimeout(1500);

  const reset = () => page.evaluate(() => {
    for (const key of Object.keys(globalThis.__adapterMetrics)) globalThis.__adapterMetrics[key] = 0;
    globalThis.__adapterMeasuredStart = performance.now();
  });
  const snapshot = () => page.evaluate(hooks => {
    const cards = [...document.querySelectorAll(hooks.sduiContent[0])];
    const visible = cards.filter(card => {
      const rect = card.firstElementChild?.getBoundingClientRect();
      return rect && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    });
    const videos = [...document.querySelectorAll('video')];
    return {
      ...globalThis.__adapterMetrics, extractMs: +globalThis.__adapterMetrics.extractMs.toFixed(3),
      durationMs: Math.round(performance.now() - globalThis.__adapterMeasuredStart),
      renderedCards: cards.length, detectedCards: globalThis.__adapterPosts.size,
      viewportCards: visible.length,
      videoInViewport: videos.some(video => { const r = video.getBoundingClientRect(); return r.height > 0 && r.top < innerHeight && r.bottom > 0; }),
      playingVideos: videos.filter(video => !video.paused && !video.ended).length,
      documentHidden: document.hidden,
      firstCardTop: Math.round(cards[0]?.firstElementChild?.getBoundingClientRect().top ?? 0),
      scrollOffsets: (() => {
        const offsets = [];
        for (let node = document.elementFromPoint(640, 600); node; node = node.parentElement) {
          if (node.scrollHeight > node.clientHeight + 5) offsets.push({ tag: node.tagName, top: node.scrollTop, height: node.scrollHeight, viewport: node.clientHeight });
        }
        return offsets;
      })(),
    };
  }, selectors);
  let report;
  if (churn) {
    await page.evaluate(() => {
      globalThis.__adapterCounters = [...globalThis.__adapterPosts.values()].map(post => {
        const count = document.createElement('span');
        count.textContent = '0 reactions';
        post.root.append(count);
        return { root: post.root, count };
      });
    });
    await page.waitForTimeout(1000);
    await reset();
    for (let frame = 0; frame < 20; frame++) {
      await page.evaluate(value => {
        for (const { root, count } of globalThis.__adapterCounters) {
          root.classList.toggle('measurement-hover');
          count.firstChild.data = `${value} reactions`;
        }
      }, frame);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1000);
    report = { label, fixture, revision, measuredAt: new Date().toISOString(), churn: await snapshot() };
  } else {
    await reset();
    console.log(`${label}: measuring 30 s idle…`);
    await page.waitForTimeout(30_000);
    const idle = await snapshot();
    console.log(JSON.stringify({ label, phase: 'idle', ...idle }));
    await reset();
    await page.mouse.move(640, 600);
    for (let scroll = 0; scroll < 3; scroll++) {
      await page.mouse.wheel(0, 650);
      await page.waitForTimeout(1500);
    }
    report = { label, measuredAt: new Date().toISOString(), idle, scroll: await snapshot() };
  }
  const output = resolve('tests/fixtures/feed/captured');
  mkdirSync(output, { recursive: true });
  const path = resolve(output, `mutation-${label}-${report.measuredAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, report: path }));
  await page.evaluate(() => globalThis.__adapterWatcher.disconnect());
} finally {
  await context?.close();
}
