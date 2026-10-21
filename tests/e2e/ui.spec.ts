// UI workstream e2e: badges, Drip Edge, Destroy (+ undo), Shame modal,
// popup, Hall of Slop, and a leak check. Runs on the synthetic SDUI fixture
// with the corpus's sample posts swapped in so every tier appears.
// Screenshots: test-results/ui/; Drip Edge screens for the owner:
// design/drip-edge-screens/ (Playwright never wipes it).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { BrowserContext, Page } from '@playwright/test';
import { test, expect, waitForContentScript } from './helpers';
import { DRIP_SHAPES, TEXT_DEPTH } from '../../src/lib/ui/drip';
import { analyzePost } from '../../src/lib/engine';
import { TIERS } from '../../src/lib/engine/tiers';
import type { SlopTierId } from '../../src/lib/engine/types';

const SHOTS = 'test-results/ui';
const DRIP_SHOTS = 'design/drip-edge-screens';

interface Sample { id: string; text: string }

async function samples(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const f of ['ai-fingerprints', 'ai-swamp', 'ai-certified', 'mixed', 'human']) {
    const list = JSON.parse(await readFile(`tests/fixtures/posts/${f}.json`, 'utf8')) as Sample[];
    for (const s of list) out[s.id] = s.text;
  }
  return out;
}

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

function avatar(initials: string, hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},70%,62%)'/><stop offset='1' stop-color='hsl(${(hue + 40) % 360},70%,42%)'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><circle cx='48' cy='38' r='17' fill='rgba(255,255,255,.85)'/><ellipse cx='48' cy='86' rx='30' ry='22' fill='rgba(255,255,255,.85)'/><text x='48' y='44' font-family='Arial' font-weight='700' font-size='14' text-anchor='middle' fill='hsl(${hue},60%,30%)'>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * The corpus's samples by tier, the most central in their band first. The
 * engine is retuned often, so posts are cast by their current score, never
 * by sample name: a post meant to be Certified Slop stays Certified Slop.
 */
let cast: Promise<Record<SlopTierId, string[]>> | undefined;
function samplesByTier(): Promise<Record<SlopTierId, string[]>> {
  cast ??= samples().then((texts) => {
    const out = Object.fromEntries(TIERS.map((t) => [t.id, [] as { id: string; margin: number }[]])) as Record<SlopTierId, { id: string; margin: number }[]>;
    for (const [id, text] of Object.entries(texts)) {
      const { score, tier } = analyzePost({ text });
      const i = TIERS.findIndex((t) => t.id === tier.id);
      const top = (TIERS[i + 1]?.min ?? 101) - 1;
      // Clean posts: the lower the better. Slop tiers: furthest from both edges of the band.
      out[tier.id].push({ id, margin: i === 0 ? top - score : Math.min(score - TIERS[i]!.min, top - score) });
    }
    return Object.fromEntries(Object.entries(out).map(([tier, list]) => [tier, list.sort((a, b) => b.margin - a.margin).map((s) => s.id)])) as Record<SlopTierId, string[]>;
  });
  return cast;
}

async function pick(tier: SlopTierId, n = 0): Promise<string> {
  const id = (await samplesByTier())[tier][n];
  if (!id) throw new Error(`No corpus sample scores ${tier} (#${n + 1}) with the current engine`);
  return id;
}

/**
 * Sample texts placed into the fixture's posts 1..N (null keeps the fixture's
 * own text). `default`: Ada SLOPOCALYPSE, Ben Faint Whiff, Cara Certified,
 * Dev Swamp, Elliot SLOPOCALYPSE, Acme as is, Farah Faint Whiff, Grace
 * SLOPOCALYPSE. `tiers`: one post per tier (Ada, Ben, Cara, Dev), Elliot clean.
 */
async function lineup(kind: 'default' | 'tiers'): Promise<(string | null)[]> {
  if (kind === 'tiers') return Promise.all([pick('slopocalypse'), pick('whiff'), pick('certified'), pick('swamp'), pick('artisanal')]);
  return Promise.all([pick('slopocalypse'), pick('whiff'), pick('certified'), pick('swamp'), pick('slopocalypse', 1), null, pick('whiff', 1), pick('slopocalypse', 2)]);
}

interface ShowcaseOptions { serialSlopper?: boolean; unhooked?: boolean; innerScroll?: boolean; lineup?: 'default' | 'tiers' }

async function showcaseHtml(dark: boolean, opts: ShowcaseOptions = {}): Promise<string> {
  const texts = await samples();
  let html = await readFile('tests/fixtures/feed/sdui.html', 'utf8');
  // Three slop posts by one author: enough of a sample for the Hall of Slop.
  if (opts.serialSlopper) html = html.replace(/\/in\/(?:cara-silva|dev-shah|elliot-reed)\//g, '/in/serial-slopper/');
  let i = 0;
  const cast = await lineup(opts.lineup ?? 'default');
  html = html.replace(/(data-testid="expandable-text-box">)([\s\S]*?)(<\/span>)/g, (whole, open: string, _body: string, close: string) => {
    const id = cast[i++];
    const text = id ? texts[id] : undefined;
    return text ? `${open}${escape(text)}${close}` : whole;
  });
  let n = 0;
  html = html.replace(/(<figure data-view-name="feed-actor-image"><img src=")data:image\/svg\+xml,[^"]*(")/g, (_w, a: string, b: string) => `${a}${avatar(['AP', 'DS', 'MK', 'RJ', 'LT', 'SN', 'OC', 'HB'][n % 8]!, (n++ * 47) % 360)}${b}`);
  // Test-only cosmetics so screenshots read like a LinkedIn feed.
  const extra = `body{font-family:-apple-system,system-ui,sans-serif;font-size:14px}main{max-width:580px}[role=listitem]{padding:0 0 8px;overflow:hidden}`
    + `.k8z0{display:none}.sdui-actor-row{padding:12px 16px 0;align-items:flex-start}.sdui-actor-row img{border-radius:50%;width:48px;height:48px;object-fit:cover}`
    + `.u72a p{margin:0;font-size:12px;color:#666}.u72a span{font-size:14px;font-weight:600;color:#191919}.u72a a{text-decoration:none}`
    + `.u72a{flex:1;min-width:0}[data-view-name=feed-actor]>div[aria-label]{display:flex;align-items:center;gap:4px}`
    + `[data-view-name=feed-actor-sub-description-cta],[data-view-name=edge-creation-follow-action]{display:none}`
    + `.sdui-commentary{margin:8px 16px;font-size:14px}.r7ya{display:flex;align-items:center;gap:2px;height:44px;padding:0 12px;border-top:1px solid #e8e8e8;margin:0 4px;color:rgba(0,0,0,.75)}.r7ya img{display:none}`
    + `.r7ya button,.r7ya a{border:0;background:none;padding:10px 8px;font-weight:600;color:inherit;font-size:14px;text-decoration:none}.r7ya>div:empty{flex:1}.r7ya a[data-view-name=view-likers]{font-size:12px;font-weight:400}`
    + `[componentkey^="0-replaceableCommentTools"]{display:none}figure{margin:0}`
    // Like LinkedIn: the page doesn't scroll, <main> does, under a nav that sits outside it.
    + (opts.innerScroll ? 'html,body{height:100%;overflow:hidden}body::before{content:"";position:fixed;inset:0 0 auto;height:52px;background:#fff;border-bottom:1px solid #ddd}main{position:fixed;top:53px;bottom:0;left:0;right:0;overflow-y:auto;margin:0 auto;padding-top:400px}' : '')
    + (dark ? 'body{background:#000;color:#e8e8e8}[role=listitem]{background:#1b1f23;border-color:#38434f}.u72a span{color:#fff}.u72a p{color:#aaa}.r7ya{border-color:#38434f;color:rgba(255,255,255,.75)}' : '');
  if (opts.unhooked) {
    let header = 0;
    html = html.replace(/(<a[^>]*data-view-name="feed-header-text"[^>]*>)([\s\S]*?)(<\/a>)/g,
      (_whole, open: string, text: string, close: string) => `${open}<span data-sdui-anchor-id="feed-header-synthetic-${header++}">${text}</span>${close}`)
      .replace(/ data-view-name="[^"]*"/g, '')
      .replace(/ data-testid="[^"]*"/g, '');
  }
  return html.replace('</style>', `${extra}</style>`);
}

/**
 * linkedin.com allowlists Trusted Types policy names. Svelte creates its own
 * policy at load, which used to kill the content script on the real site.
 */
const LINKEDIN_CSP = "trusted-types default jSecure 'allow-duplicates' dompurify highcharts goog#html ProseMirrorClipboard";

async function openShowcase(page: Page, extensionId: string, dark = false, opts: ShowcaseOptions = {}): Promise<void> {
  const html = await showcaseHtml(dark, opts);
  await page.route('https://www.linkedin.com/**', async (route) => {
    if (route.request().isNavigationRequest()) await route.fulfill({ body: html, contentType: 'text/html; charset=utf-8', headers: { 'content-security-policy': LINKEDIN_CSP } });
    else await route.fulfill({ status: 204, body: '' });
  });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto('https://www.linkedin.com/feed/');
  await waitForContentScript(page, extensionId);
}

async function debugCounts(page: Page) {
  return page.evaluate(() => {
    document.dispatchEvent(new Event('slop-shame:debug'));
    return JSON.parse(document.documentElement.getAttribute('data-slop-shame-debug') ?? '{}') as Record<string, number>;
  });
}

test.beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true });
});

test('badges render on the light feed', async ({ page, extensionId }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openShowcase(page, extensionId);
  await expect(page.locator('[data-slop-shame-mount] .bar').first()).toBeVisible();
  await expect.poll(() => page.locator('[data-slop-shame-mount] .bar').count()).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(1100); // let the meters fill
  await page.screenshot({ path: `${SHOTS}/feed-light.png`, fullPage: true });
  const first = page.locator('[role=listitem]').first();
  await first.screenshot({ path: `${SHOTS}/badge-light.png` });
  await page.locator('[data-slop-shame-mount] .toggle').first().click();
  await expect(page.locator('[data-slop-shame-mount] .panel').first()).toBeVisible();
  await page.waitForTimeout(400);
  await first.screenshot({ path: `${SHOTS}/badge-expanded.png` });
  expect(errors).toEqual([]);
});

test('badges render on the dark feed', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId, true);
  await expect.poll(() => page.locator('[data-slop-shame-mount] .bar').count()).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${SHOTS}/feed-dark.png`, fullPage: true });
  await page.locator('[role=listitem]').first().screenshot({ path: `${SHOTS}/badge-dark.png` });
});

/** The first non-ad post with a slop badge, pinned by index. */
async function firstSlopPost(page: Page) {
  const items = page.locator('[role=listitem]');
  await expect(items.locator('[data-slop-shame-mount] .bar').first()).toBeVisible();
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const item = items.nth(i);
    if (await item.locator('.bar').count() && !(await item.locator('.ad-chip').count())) return item;
  }
  throw new Error('No destroyable post');
}

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

/** What a post's Drip Edge looks like, measured in the page (viewport px; depths from the card's top edge). */
interface DripInfo {
  tier: string | null;
  measured: boolean;
  /** The clip sits on the card's padding box: same left, top and width. */
  aligned: boolean;
  /** Goo reach along the top edge, % of the card's width. */
  reach: number;
  /** Visible drips (the photo drip included). */
  drips: number;
  /** Deepest bead below the edge, px, not counting the photo drip. */
  depth: number;
  photo: string | null;
  /** The photo drip's bead, when it runs onto the photo. */
  photoBead: Rect | null;
  /** Text in the card that any bead (or the falling drop's whole path) overlaps. Must stay empty. */
  covers: string[];
  /** The tallest element we draw: a frame around the card would be as tall as the card. */
  tallest: number;
  fall: { shown: boolean; playing: boolean; opacity: string } | null;
  colors: { goo: string; outline: string };
}

async function dripInfo(post: ReturnType<Page['locator']>): Promise<DripInfo> {
  return post.locator('[data-slop-shame-mount="decoration"]').evaluate((host) => {
    const sr = host.shadowRoot!;
    const root = sr.querySelector<HTMLElement>('.ss-drip')!;
    const box = root.parentElement!;
    const card = host.parentElement!;
    const c = card.getBoundingClientRect();
    const top = c.top + card.clientTop;
    const left = c.left + card.clientLeft;
    const shown = (el: Element) => el.checkVisibility({ visibilityProperty: true });
    const clip = sr.querySelector('.ss-drip-clip')!.getBoundingClientRect();
    const beads = [...sr.querySelectorAll<SVGCircleElement>('.ol circle')].filter(shown);
    const strip = sr.querySelector<SVGLineElement>('.ol .strip')!;
    const fall = sr.querySelector<HTMLElement>('.ss-drip-fall');
    // The drop's whole path: from 14 px above its resting place to 10 px below.
    const fallPath = fall && getComputedStyle(fall).display !== 'none'
      ? (() => { const r = fall.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top - 14, bottom: r.bottom + 10 }; })()
      : null;
    const texts: { t: string; r: DOMRect }[] = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent?.trim() || !el || el.closest('[data-slop-shame-mount], .sr-only') || !el.checkVisibility()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width && r.height && r.top < top + 80) texts.push({ t: n.textContent.trim().slice(0, 24), r });
    }
    const overlap = (a: { left: number; right: number; top: number; bottom: number }, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const shapes = [...beads.map((b) => b.getBoundingClientRect()), ...(fallPath ? [fallPath] : [])];
    const covers = [...new Set(shapes.flatMap((s) => texts.filter(({ r }) => overlap(s, r)).map(({ t }) => t)))];
    const long = beads.find((b) => b.classList.contains('ph-long'));
    const rect = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
    const style = (sel: string, prop: 'stroke' | 'fill') => getComputedStyle(sr.querySelector(sel)!)[prop];
    return {
      tier: root.getAttribute('data-tier'),
      measured: box.getAttribute('data-measured') === '1',
      aligned: Math.abs(clip.left - left) <= 0.5 && Math.abs(clip.top - top) <= 0.5 && Math.abs(clip.width - card.clientWidth) <= 0.5,
      reach: Math.round((strip.x2.baseVal.value / card.clientWidth) * 1000) / 10,
      drips: [...sr.querySelectorAll('.fill line.d')].filter(shown).length,
      depth: Math.max(0, ...beads.filter((b) => b !== long).map((b) => b.getBoundingClientRect().bottom - top)),
      photo: box.getAttribute('data-photo'),
      photoBead: long ? rect(long.getBoundingClientRect()) : null,
      covers,
      tallest: Math.max(...[...root.querySelectorAll('*')].map((el) => el.getBoundingClientRect().height)),
      fall: fall ? { shown: getComputedStyle(fall).display !== 'none', playing: fall.getAnimations().some((a) => a.playState === 'running'), opacity: getComputedStyle(fall).opacity } : null,
      colors: { goo: style('.fill .strip', 'stroke'), outline: style('.ol .strip', 'stroke') },
    };
  });
}

/** The post whose chip shows `tier` (the chip carries the tier the drip draws). */
async function postWithTier(page: Page, tier: SlopTierId) {
  const post = page.locator('[role=listitem]').filter({ has: page.locator(`[data-slop-shame-mount="chip"] .bar[data-tier="${tier}"]`) }).first();
  await post.scrollIntoViewIfNeeded();
  await expect(post.locator('[data-slop-shame-mount="decoration"]')).toHaveCount(1);
  await expect.poll(async () => (await dripInfo(post)).measured).toBe(true);
  return post;
}

/** An element at 2x pixels, so the goo's detail reads (Playwright's own screenshots use the context's 1x). */
async function shot2x(page: Page, el: ReturnType<Page['locator']>, path: string): Promise<void> {
  const box = (await el.boundingBox())!;
  // The clip is in document coordinates; boundingBox is in the viewport's.
  const [sx, sy] = await page.evaluate(() => [scrollX, scrollY]);
  const cdp = await page.context().newCDPSession(page);
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...box, x: box.x + sx!, y: box.y + sy!, scale: 2 } });
    await writeFile(path, Buffer.from(data, 'base64'));
  } finally {
    await cdp.detach();
  }
}

/** Badges (and drips) from `tier` up. settings$ v2, so the background keeps a Faint Whiff choice. */
async function setSettings(context: BrowserContext, patch: Record<string, unknown>): Promise<void> {
  const worker = context.serviceWorkers()[0]!;
  await worker.evaluate(`(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, ...${JSON.stringify(patch)} }, 'settings$': { v: 2 } });
  })()`);
}

/** The drip reads its tier's shape from drip.ts: drip count (photo drip included) and reach. */
function expectShape(info: DripInfo, tier: SlopTierId): void {
  const shape = DRIP_SHAPES[tier]!;
  expect(info.tier).toBe(tier);
  expect(info.drips).toBe(shape.drips.length + (shape.photo ? 1 : 0));
  expect(Math.abs(info.reach - shape.reach)).toBeLessThanOrEqual(0.5);
  expect(info.depth).toBeLessThanOrEqual(TEXT_DEPTH + 0.5);
  expect(info.covers).toEqual([]);
  expect(info.aligned).toBe(true);
}

/** Destroy and Shame live in the badge's popover. */
async function act(post: ReturnType<Page['locator']>, name: 'destroy' | 'shame') {
  if (!(await post.locator('.panel').count())) await post.locator('.toggle').click();
  await post.locator(`.act.${name}`).click();
}

test('Destroy erupts the post, undo restores it, then it is gone for good', async ({ page, extensionId }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  await expect(post).toBeVisible();
  await page.waitForTimeout(900);
  const rootHeight = () => post.evaluate((el) => (el.closest('[data-slop-shame-processed]') ?? el).getBoundingClientRect().height);
  const before = await rootHeight();

  await act(post, 'destroy');
  await page.waitForTimeout(240);
  await page.screenshot({ path: `${SHOTS}/explosion-mid.png` });
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${SHOTS}/explosion-late.png` });
  // The layer exists only while effects run.
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(1);

  // The chip lives in the action bar, so the post collapses away and Undo
  // is offered in a toast.
  const toast = page.locator('.toast');
  await expect(toast).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/destroy-toast.png` });
  await expect.poll(rootHeight).toBeLessThan(2);

  await toast.locator('.undo').click();
  await expect(post.locator('.bar')).toBeVisible();
  await expect.poll(rootHeight).toBeGreaterThan(before - 2);
  // Undo leaves no trace of our styles on LinkedIn's DOM (the drip is drawn in our own host).
  expect(await post.evaluate((el) => {
    const r = el.closest('[data-slop-shame-processed]') ?? el;
    return [r, ...r.querySelectorAll('*')].filter((n) => (n as HTMLElement).style?.length && !n.hasAttribute('data-slop-shame-mount')).length;
  })).toBe(0);

  // Destroy for real: after the undo window the post is hidden.
  await act(post, 'destroy');
  await expect(toast).toBeVisible();
  await expect(post).toBeHidden({ timeout: 8000 });
  await expect(toast).toHaveCount(0, { timeout: 8000 });
  // Every FX resource is released when idle.
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(0, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('reduced motion: fade + poof, still undoable', async ({ page, extensionId }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  await act(post, 'destroy');
  await expect(page.locator('.toast')).toBeVisible();
  await page.locator('.toast .undo').click();
  await expect(post.locator('.bar')).toBeVisible();
});

test('Shame opens the modal in every layout, with no leftover slots', async ({ page, context, extensionId }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.linkedin.com' });
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  await act(post, 'shame');
  const modal = page.locator('.ss-modal');
  await expect(modal).toBeVisible();
  // The panel lives in the top layer: it must close, or it would sit on top of the modal.
  await expect(page.locator('[data-slop-shame-mount] .panel')).toHaveCount(0);

  const seen = new Set<string>();
  for (let i = 0; i < 40 && seen.size < 6; i++) {
    const layout = await page.locator('.card-wrap').getAttribute('data-layout');
    const text = await page.locator('.card-wrap').innerText();
    expect(text).not.toMatch(/\{\w+\}/);
    expect(text).not.toMatch(/undefined|NaN/);
    if (layout && !seen.has(layout)) {
      seen.add(layout);
      await page.waitForTimeout(1000); // slam + stamp
      await page.locator('.dialog').screenshot({ path: `${SHOTS}/shame-${layout}.png` });
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download image' }).click();
      await (await download).saveAs(`${SHOTS}/download-${layout}.png`);
    }
    await page.getByRole('button', { name: 'Shame again' }).click();
  }
  expect([...seen].sort()).toEqual(['certificate', 'citation', 'eulogy', 'report-card', 'tabloid', 'wanted-poster']);

  // Sharing is anonymized by default…
  await page.getByRole('button', { name: 'Copy text' }).click();
  const anon = await page.evaluate(() => navigator.clipboard.readText());
  expect(anon).not.toMatch(/Ada|Patel/);
  // …and named only after an explicit opt-in. Some formats never mention the
  // author, so reroll until one does.
  let named = '';
  for (let i = 0; i < 30 && !/Ada|Patel/.test(named); i++) {
    if (i) {
      await page.getByRole('button', { name: 'Shame again' }).click();
      await expect(page.locator('.share input')).not.toBeChecked();
    }
    await page.locator('.share').click();
    await expect(page.locator('.share input')).toBeChecked();
    await page.getByRole('button', { name: 'Copy text' }).click();
    named = await page.evaluate(() => navigator.clipboard.readText());
  }
  expect(named).toMatch(/Ada|Patel/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  await (await download).saveAs(`${SHOTS}/download-named.png`);

  await page.getByRole('button', { name: 'Shame again' }).click();
  await expect(page.locator('.share input')).not.toBeChecked();
  await page.getByRole('button', { name: 'Copy text' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).not.toMatch(/Ada|Patel/);

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(0, { timeout: 5000 });
});

test('page scripts cannot open the chip or invoke Destroy/Shame with untrusted clicks', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  const toggle = post.locator('.toggle');
  await toggle.evaluate((button: HTMLButtonElement) => button.click());
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(post.locator('.panel')).toHaveCount(0);
  // Genuine browser input still opens the panel in the e2e-only open root.
  await toggle.click();
  await expect(post.locator('.panel')).toBeVisible();
  await post.locator('.act.shame').evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('.ss-modal')).toHaveCount(0);
  await post.locator('.act.destroy').evaluate((button: HTMLButtonElement) => button.click());
  await expect(post.locator('.bar')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(0);
});

test('the chip sits in the action bar, the card drips along its top edge, clean posts get nothing', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  // Right after Send, inside the action bar: no row of its own.
  expect(await post.locator('[data-slop-shame-mount="chip"]').evaluate((host) => [
    host.getAttribute('data-slot'),
    host.previousElementSibling?.getAttribute('data-view-name'),
  ])).toEqual(['bar', 'feed-send-as-message-button']);
  // The drip is ours, drawn from inside the card along its top edge; LinkedIn's card and avatar are never restyled.
  await expect(post.locator('.ss-drip-goo')).toBeVisible();
  const info = await dripInfo(post);
  expect(info.aligned).toBe(true);
  expect(info.covers).toEqual([]);
  expect(await post.locator('a[data-view-name="feed-actor-image"]').evaluate((a) => [a, ...a.querySelectorAll('*')].some((n) => n.hasAttribute('style')))).toBe(false);
  expect(await post.evaluate((card) => card.hasAttribute('style'))).toBe(false);
  // Below the threshold: no chip content and no drip. We never vouch for a post.
  const clean = page.locator('[role=listitem]', { hasText: 'Isha Das' });
  await clean.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await expect(clean.locator('.bar')).toHaveCount(0);
  await expect(clean.locator('[data-slop-shame-mount="decoration"]')).toHaveCount(0);
  expect((await debugCounts(page)).decorations).toBeGreaterThan(0);
});

test('the avatar monster and ring stay with the drip and chip, and either control opens its own panel', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId, false, { innerScroll: true });
  const post = await firstSlopPost(page);
  const monster = post.locator('.ss-avatar-monster');
  const ring = post.locator('.ss-avatar-scribble');
  const chip = post.locator('.toggle');
  await expect(monster).toBeVisible();
  await expect(ring).toBeVisible();
  await expect(post.locator('.ss-drip-goo')).toBeVisible();
  await expect(chip).toBeVisible();
  await expect(post.locator('.ss-post-outline')).toHaveCount(0);
  const image = post.locator('figure[data-view-name="feed-actor-image"] img');
  const offset = async () => {
    const a = (await image.boundingBox())!;
    const r = (await ring.boundingBox())!;
    return Math.max(Math.abs(r.x + r.width / 2 - a.x - a.width / 2), Math.abs(r.y + r.height / 2 - a.y - a.height / 2));
  };
  await expect.poll(offset).toBeLessThanOrEqual(1);
  await monster.click();
  await page.mouse.move(900, 600);
  const avatarPanel = post.locator('[data-slop-shame-mount="decoration"] .panel');
  await expect(avatarPanel).toBeVisible();
  await expect(post.locator('[data-slop-shame-mount="chip"] .panel')).toHaveCount(0);
  const a = (await monster.boundingBox())!;
  const p = (await avatarPanel.boundingBox())!;
  expect(Math.abs(p.y - a.y - a.height - 6) <= 2 || Math.abs(p.y + p.height + 6 - a.y) <= 2).toBe(true);
  await mkdir('design/avatar-restored-screens', { recursive: true });
  await page.screenshot({ path: 'design/avatar-restored-screens/monster-panel.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await chip.click();
  await expect(post.locator('[data-slop-shame-mount="chip"] .panel')).toBeVisible();
  await expect(avatarPanel).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.move(550, 700);
  await page.mouse.wheel(0, 180);
  await expect.poll(offset).toBeLessThanOrEqual(1);
  await page.mouse.wheel(0, -180);
  for (const width of [700, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(offset).toBeLessThanOrEqual(1);
    await expect(monster).toBeVisible();
  }
});

test('hookless SDUI keeps liked posts attributed and places chips after Send', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId, false, { unhooked: true });
  const posts = page.locator('[role=listitem]');
  for (const index of [0, 4]) {
    const post = posts.nth(index);
    await post.scrollIntoViewIfNeeded();
    const chip = post.locator('[data-slop-shame-mount="chip"]');
    await expect(chip.locator('.toggle')).toBeVisible();
    await expect(post.locator('.ss-avatar-monster')).toBeVisible();
    await expect(post.locator('.ss-avatar-scribble')).toBeVisible();
    expect(await chip.evaluate(host => [host.getAttribute('data-slot'), host.previousElementSibling?.getAttribute('aria-label')])).toEqual(['bar', 'Send']);
    // The social header stays untouched; the drip hangs from the actual card's top edge.
    const info = await dripInfo(post);
    expect(info.aligned).toBe(true);
    expect(info.covers).toEqual([]);
    await chip.locator('.toggle').click();
    await expect(post.locator('.panel')).toBeVisible();
    await expect(post.locator('.act.destroy')).toBeVisible();
    await expect(post.locator('.act.shame')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.screenshot({ path: `${SHOTS}/feed-unhooked.png`, fullPage: true });
});

test('the Drip Edge scales by shape with the tier, never covers text or frames the card, and clicks go through it', async ({ page, context, extensionId }) => {
  await setSettings(context, { minTier: 'whiff' });
  await openShowcase(page, extensionId, false, { lineup: 'tiers' });
  const tiers: SlopTierId[] = ['whiff', 'certified', 'swamp', 'slopocalypse'];
  const seen: DripInfo[] = [];
  for (const tier of tiers) {
    const info = await dripInfo(await postWithTier(page, tier));
    expectShape(info, tier);
    // The owner: "I don't want it to encircle the whole postcard." One edge, never a frame.
    expect(info.tallest).toBeLessThanOrEqual(40);
    seen.push(info);
  }
  // Louder tiers drip further along the edge, with more drips: shape, not only colour.
  for (let i = 1; i < seen.length; i++) {
    expect(seen[i]!.reach).toBeGreaterThan(seen[i - 1]!.reach);
    expect(seen[i]!.drips).toBeGreaterThan(seen[i - 1]!.drips);
  }
  // Faint Whiff is one small bead; SLOPOCALYPSE has one drip running onto the photo.
  expect(seen[0]!.drips).toBe(1);
  const top = await postWithTier(page, 'slopocalypse');
  const photo = (await top.locator('a[data-view-name="feed-actor-image"] img').boundingBox())!;
  const bead = (await dripInfo(top)).photoBead!;
  expect(Math.abs((bead.left + bead.right) / 2 - (photo.x + photo.width / 2))).toBeLessThanOrEqual(1);
  expect(bead.bottom).toBeGreaterThan(photo.y + 4);
  expect(bead.bottom - (await top.boundingBox())!.y).toBeGreaterThan(TEXT_DEPTH + 10);
  // Posts without slop evidence get nothing.
  const clean = page.locator('[role=listitem]', { hasText: 'Elliot Reed' });
  await clean.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await expect(clean.locator('.bar')).toHaveCount(0);
  await expect(clean.locator('[data-slop-shame-mount="decoration"]')).toHaveCount(0);
  // Click-through: what's under the goo is LinkedIn's, and the chip still opens the panel.
  const hit = await top.evaluate((card) => {
    card.scrollIntoView({ block: 'center' });
    const r = card.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width * 0.5, r.top + 2);
    return !!el && card.contains(el) && !el.closest('[data-slop-shame-mount]');
  });
  expect(hit).toBe(true);
  const href = page.url();
  await top.locator('.toggle').click();
  await expect(top.locator('.panel')).toBeVisible();
  await expect(top.locator('.act.destroy')).toBeVisible();
  await expect(top.locator('[data-slop-shame-mount="decoration"] .panel')).toHaveCount(0);
  expect(page.url()).toBe(href);
  await page.keyboard.press('Escape');
});

test('SLOPOCALYPSE drops fall only while on screen, and reduced motion keeps the drips static', async ({ page, context, extensionId }) => {
  await openShowcase(page, extensionId, false, { lineup: 'tiers', innerScroll: true });
  const post = await postWithTier(page, 'slopocalypse');
  const feed = page.locator('main');
  await feed.evaluate((main) => main.scrollTo(0, 0));
  await expect.poll(async () => (await dripInfo(post)).fall).toEqual({ shown: true, playing: true, opacity: expect.any(String) });
  expect((await dripInfo(post)).photo).toBe('top');
  // Scrolled out of view: the animation stops (the drop is invisible when not falling).
  await feed.evaluate((main, y) => main.scrollBy(0, y), (await post.boundingBox())!.y + (await post.boundingBox())!.height + 400);
  await expect.poll(async () => (await dripInfo(post)).fall?.playing).toBe(false);
  expect((await dripInfo(post)).fall!.opacity).toBe('0');
  await feed.evaluate((main) => main.scrollTo(0, 0));
  await expect.poll(async () => (await dripInfo(post)).fall?.playing).toBe(true);
  // The Reduce motion setting: no falling drop, static drips (all seven still there).
  await setSettings(context, { reduceMotion: true });
  await expect.poll(async () => (await dripInfo(post)).fall?.playing).toBe(false);
  expect((await dripInfo(post)).fall!.opacity).toBe('0');
  expectShape(await dripInfo(post), 'slopocalypse');
  // And the OS setting, from a fresh page.
  await setSettings(context, { reduceMotion: false });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await waitForContentScript(page, extensionId);
  const again = await postWithTier(page, 'slopocalypse');
  await page.waitForTimeout(1600);
  const info = await dripInfo(again);
  expect(info.fall!.playing).toBe(false);
  expect(info.fall!.opacity).toBe('0');
  expect(info.drips).toBe(7);
});

test('the Drip Edge uses the light and dark goo, and the owner gets screenshots of every tier', async ({ page, context, extensionId }) => {
  await mkdir(DRIP_SHOTS, { recursive: true });
  await setSettings(context, { minTier: 'whiff' });
  const goo = { light: ['rgb(155, 226, 45)', 'rgb(27, 31, 59)'], dark: ['rgb(163, 230, 53)', 'rgb(11, 13, 16)'] };
  for (const theme of ['light', 'dark'] as const) {
    await openShowcase(page, extensionId, theme === 'dark', { lineup: 'tiers' });
    for (const tier of ['whiff', 'certified', 'swamp', 'slopocalypse'] as const) {
      const post = await postWithTier(page, tier);
      const info = await dripInfo(post);
      expectShape(info, tier);
      expect([info.colors.goo, info.colors.outline]).toEqual(goo[theme]);
      // Freeze the top tier's drop mid-fall, just off the photo drip (delay 1.2 s + 78% of 2.6 s).
      await post.locator('[data-slop-shame-mount="decoration"]').evaluate((host) => {
        const fall = host.shadowRoot!.querySelector('.ss-drip-fall')?.getAnimations()[0];
        if (fall) { fall.pause(); fall.currentTime = 1200 + 2600 * 0.78; }
      });
      await page.waitForTimeout(200);
      await shot2x(page, post, `${DRIP_SHOTS}/${theme}-${tier}.png`);
    }
    const clean = page.locator('[role=listitem]', { hasText: 'Elliot Reed' });
    await clean.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(clean.locator('[data-slop-shame-mount="decoration"]')).toHaveCount(0);
    await shot2x(page, clean, `${DRIP_SHOTS}/${theme}-clean.png`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${DRIP_SHOTS}/${theme}-feed.png`, fullPage: true });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('a repeat slopper gets a Certified Slopper tag by their name, nobody else does', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId, false, { serialSlopper: true });
  const items = page.locator('[role=listitem]');
  // Let every post be seen (and sighted) once.
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
  }
  await page.mouse.wheel(0, -10000);
  // Opening any chip re-reads the Hall of Slop.
  await page.locator('[data-slop-shame-mount] .toggle').first().click();
  const tags = page.locator('[data-slop-shame-mount="tag"] .tag');
  await expect.poll(() => tags.count(), { timeout: 8000 }).toBe(3);
  await page.keyboard.press('Escape');
  const tagged = items.filter({ has: tags });
  await expect(tagged.first()).toContainText('Cara Silva');
  await tagged.first().scrollIntoViewIfNeeded();
  await tagged.first().screenshot({ path: `${SHOTS}/slopper-tag.png` });
  // The tag sits on the name line, after the name.
  expect(await tagged.first().locator('[data-slop-shame-mount="tag"]').evaluate((h) => h.getAttribute('data-slot'))).toBe('name');
});


test('cached chip widths preserve the original fitter choices across viewport resizes', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  const host = post.locator('[data-slop-shame-mount="chip"]');
  for (const width of [1100, 700, 460, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => host.evaluate((h) => {
      // Reference the old fitHost algorithm against the actual layout.
      const actual = h.getAttribute('data-fit');
      const wrap = h.shadowRoot!.querySelector<HTMLElement>('.wrap')!;
      const line = h.parentElement!;
      const prev = h.previousElementSibling!;
      let next = h.nextElementSibling;
      let items = 1;
      while (next && !next.childElementCount && !next.textContent?.trim()) { next = next.nextElementSibling; items++; }
      h.setAttribute('data-fit', 'icon');
      const style = getComputedStyle(line);
      const gap = parseFloat(style.columnGap) || 0;
      const right = next ? next.getBoundingClientRect().left : line.getBoundingClientRect().right - (parseFloat(style.paddingRight) || 0);
      const room = Math.max(0, Math.floor(right - prev.getBoundingClientRect().right - gap * (items + (next ? 1 : 0))));
      let expected = 'icon';
      for (const fit of ['full', 'score', 'icon']) {
        h.setAttribute('data-fit', fit);
        const s = getComputedStyle(wrap);
        const w = wrap.getBoundingClientRect().width + parseFloat(s.marginLeft) + parseFloat(s.marginRight);
        if (w <= room) { expected = fit; break; }
      }
      if (actual) h.setAttribute('data-fit', actual); else h.removeAttribute('data-fit');
      return { actual, expected };
    }).then(({ actual, expected }) => actual === expected)).toBe(true);
  }
});

test('production build hides roots and has no debug hook, including while disabled', async ({ page, context, extensionId }) => {
  test.skip(process.env.SLOP_PRODUCTION !== '1', 'Run after a plain pnpm build with SLOP_PRODUCTION=1.');
  await openShowcase(page, extensionId);
  await expect.poll(async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-slop-shame-mount="chip"]')].filter(h => h.getAttribute('data-fit')).length)).toBeGreaterThan(0);
  const probe = () => page.evaluate(() => {
    document.dispatchEvent(new Event('slop-shame:debug'));
    return {
      publicRoots: [...document.querySelectorAll<HTMLElement>('[data-slop-shame-mount]')].filter(h => h.shadowRoot).length,
      debug: document.documentElement.getAttribute('data-slop-shame-debug'),
    };
  });
  expect(await probe()).toEqual({ publicRoots: 0, debug: null });
  const worker = context.serviceWorkers()[0]!;
  await worker.evaluate(`(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, enabled: false } });
  })()`);
  await page.reload();
  await waitForContentScript(page, extensionId);
  expect(await probe()).toEqual({ publicRoots: 0, debug: null });
  await expect(page.locator('[data-slop-shame-mount]')).toHaveCount(0);
});

/** How far the drip's clip sits from the card's top-left corner, in px (0 when it hangs right on the edge). */
async function dripOffset(post: ReturnType<Page['locator']>) {
  return post.locator('[data-slop-shame-mount="decoration"]').evaluate((host) => {
    const clip = host.shadowRoot!.querySelector('.ss-drip-clip')!.getBoundingClientRect();
    const card = host.parentElement!;
    const c = card.getBoundingClientRect();
    return Math.max(Math.abs(clip.top - (c.top + card.clientTop)), Math.abs(clip.left - (c.left + card.clientLeft)), Math.abs(clip.width - card.clientWidth));
  });
}

test('the drip scrolls with its post in an inner feed scroller, even on a busy main thread', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId, false, { innerScroll: true });
  const post = await firstSlopPost(page);
  await expect(post.locator('.ss-drip-goo')).toBeVisible();
  // Drawn from inside the card, not from a page-level overlay that script has to chase.
  await expect(page.locator('[data-slop-shame-decorations]')).toHaveCount(0);
  await expect(post.locator('[data-slop-shame-mount="decoration"]')).toHaveCount(1);
  expect(await dripOffset(post)).toBeLessThanOrEqual(0.5);
  // A heavy page (LinkedIn) plus a check at scroll-event time, before any of our frame callbacks could run.
  await page.evaluate(() => {
    const w = window as unknown as { stale: number[]; busy: number };
    w.stale = [];
    const busy = () => { const t = performance.now(); while (performance.now() - t < 30); w.busy = requestAnimationFrame(busy); };
    w.busy = requestAnimationFrame(busy);
    document.querySelector('main')!.addEventListener('scroll', () => {
      for (const host of document.querySelectorAll('[data-slop-shame-mount="decoration"]')) {
        const clip = host.shadowRoot!.querySelector('.ss-drip-clip');
        // A just-mounted decoration stays hidden until its first measurement.
        if (!clip?.checkVisibility({ visibilityProperty: true })) continue;
        const card = host.parentElement!.getBoundingClientRect();
        const r = clip.getBoundingClientRect();
        w.stale.push(Math.abs(r.top - (card.top + host.parentElement!.clientTop)), Math.abs(r.left - (card.left + host.parentElement!.clientLeft)));
      }
    }, { passive: true });
  });
  await page.mouse.move(800, 600);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(20); }
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -150); await page.waitForTimeout(20); }
  const stale = await page.evaluate(() => {
    const w = window as unknown as { stale: number[]; busy: number };
    cancelAnimationFrame(w.busy);
    return w.stale;
  });
  expect(stale.length).toBeGreaterThan(0);
  expect(Math.max(...stale)).toBeLessThanOrEqual(0.5);
  // A resize re-measures from the card, nothing per scroll: the drip still spans the card's top edge.
  for (const width of [700, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => dripOffset(post)).toBeLessThanOrEqual(0.5);
    expect((await dripInfo(post)).covers).toEqual([]);
  }
});

test('the panel hangs from the chip while the feed scrolls, and closes instead of jumping away', async ({ page, extensionId }) => {
  await openShowcase(page, extensionId, false, { innerScroll: true });
  const post = await firstSlopPost(page);
  const feed = page.locator('main');
  const control = post.locator('.toggle');
  await feed.evaluate((main, y) => main.scrollBy(0, y), (await control.boundingBox())!.y - 300);
  await control.click();
  const panel = post.locator('.panel');
  await expect(panel).toBeVisible();
  await page.mouse.move(800, 900); // off the control (no hover transform) and off the panel, over the feed
  for (let k = 0; k < 4; k++) {
    const a = (await control.boundingBox())!;
    const p = (await panel.boundingBox())!;
    expect(Math.abs(p.y - (a.y + a.height + 6)) <= 2 || Math.abs(p.y + p.height + 6 - a.y) <= 2).toBe(true);
    expect(Math.abs(p.x - Math.max(8, a.x))).toBeLessThanOrEqual(2);
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(200);
  }
  // Its control scrolls out of the feed: the panel closes rather than pin itself somewhere else.
  await feed.evaluate((main, y) => main.scrollBy(0, y), (await control.boundingBox())!.y + 200);
  await expect(panel).toHaveCount(0);
  await expect(control).toHaveAttribute('aria-expanded', 'false');
});

test('a removed post takes its decoration along, and disabling leaves nothing on the page', async ({ page, context, extensionId }) => {
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  await expect(post.locator('[data-slop-shame-mount="decoration"]')).toHaveCount(1);
  const before = (await debugCounts(page)).decorations!;
  await post.evaluate((el) => el.remove());
  await expect.poll(async () => (await debugCounts(page)).decorations).toBe(before - 1);
  const worker = context.serviceWorkers()[0]!;
  await worker.evaluate(`(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, enabled: false } });
  })()`);
  await expect(page.locator('[data-slop-shame-mount]')).toHaveCount(0);
  await expect(page.locator('[data-slop-shame-processed]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelectorAll('main [style]').length)).toBe(0);
  expect((await debugCounts(page)).decorations).toBe(0);
});
