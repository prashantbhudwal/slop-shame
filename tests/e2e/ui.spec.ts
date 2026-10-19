// UI workstream e2e: badges, Destroy (+ undo), Shame modal, popup, Hall of
// Slop, and a leak check. Runs on the synthetic SDUI fixture with the corpus's
// sample posts swapped in so every tier appears. Screenshots: test-results/ui/.

import { mkdir, readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect, waitForContentScript } from './helpers';

const SHOTS = 'test-results/ui';

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

/** Order of sample texts placed into the fixture's posts 1..N. */
const LINEUP = ['ai-leaked-model', 'ai-swamp-culture', 'mixed-technical', 'ai-cert-pivot', 'ai-bypassed', null, 'ai-cert-hedging', 'ai-leaked-template'];

async function showcaseHtml(dark: boolean): Promise<string> {
  const texts = await samples();
  let html = await readFile('tests/fixtures/feed/sdui.html', 'utf8');
  let i = 0;
  html = html.replace(/(data-testid="expandable-text-box">)([\s\S]*?)(<\/span>)/g, (whole, open: string, _body: string, close: string) => {
    const id = LINEUP[i++];
    const text = id ? texts[id] : undefined;
    return text ? `${open}${escape(text)}${close}` : whole;
  });
  let n = 0;
  html = html.replace(/(<figure data-view-name="feed-actor-image"><img src=")data:image\/svg\+xml,[^"]*(")/g, (_w, a: string, b: string) => `${a}${avatar(['AP', 'DS', 'MK', 'RJ', 'LT', 'SN', 'OC', 'HB'][n % 8]!, (n++ * 47) % 360)}${b}`);
  // Test-only cosmetics so screenshots read like a LinkedIn feed.
  const extra = `body{font-family:-apple-system,system-ui,sans-serif;font-size:14px}main{max-width:580px}[role=listitem]{padding:0 0 8px;overflow:hidden}`
    + `.k8z0{display:none}.sdui-actor-row{padding:12px 16px 0;align-items:flex-start}.sdui-actor-row img{border-radius:50%;width:48px;height:48px;object-fit:cover}`
    + `.u72a p{margin:0;font-size:12px;color:#666}.u72a span{font-size:14px;font-weight:600;color:#191919}.u72a a{text-decoration:none}`
    + `[data-view-name=feed-actor-sub-description-cta],[data-view-name=edge-creation-follow-action]{display:none}`
    + `.sdui-commentary{margin:8px 16px;font-size:14px}.r7ya{display:flex;gap:4px;padding:4px 12px;border-top:1px solid #e8e8e8;margin:0 4px}.r7ya img{display:none}`
    + `.r7ya button{border:0;background:none;padding:10px 12px;font-weight:600;color:#666;font-size:14px}.r7ya a{margin-left:auto;align-self:center;font-size:12px;color:#666}`
    + `[componentkey^="0-replaceableCommentTools"]{display:none}figure{margin:0}`
    + (dark ? 'body{background:#000;color:#e8e8e8}[role=listitem]{background:#1b1f23;border-color:#38434f}.u72a span{color:#fff}.u72a p,.r7ya a,.r7ya button{color:#aaa}.r7ya{border-color:#38434f}' : '');
  return html.replace('</style>', `${extra}</style>`);
}

async function openShowcase(page: Page, extensionId: string, dark = false): Promise<void> {
  const html = await showcaseHtml(dark);
  await page.route('https://www.linkedin.com/**', async (route) => {
    if (route.request().isNavigationRequest()) await route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
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
  await page.screenshot({ path: `${SHOTS}/feed-light.png` });
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
  await page.screenshot({ path: `${SHOTS}/feed-dark.png` });
  await page.locator('[role=listitem]').first().screenshot({ path: `${SHOTS}/badge-dark.png` });
});

/** The first post with a Destroy button, pinned by index (the button disappears when destroyed). */
async function firstSlopPost(page: Page) {
  const items = page.locator('[role=listitem]');
  await expect(items.locator('.act.destroy').first()).toBeVisible();
  const n = await items.count();
  for (let i = 0; i < n; i++) if (await items.nth(i).locator('.act.destroy').count()) return items.nth(i);
  throw new Error('No destroyable post');
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

  await post.locator('.act.destroy').click();
  await page.waitForTimeout(240);
  await page.screenshot({ path: `${SHOTS}/explosion-mid.png` });
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${SHOTS}/explosion-late.png` });
  // The layer exists only while effects run.
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(1);

  const tomb = post.locator('.tomb');
  await expect(tomb).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/tombstone.png` });
  expect(await rootHeight()).toBeLessThan(80);

  await tomb.locator('.undo').click();
  await expect(post.locator('.bar')).toBeVisible();
  await expect.poll(rootHeight).toBeGreaterThan(before - 2);
  // Undo leaves no trace of our styles on LinkedIn's DOM.
  expect(await post.evaluate((el) => { const r = el.closest('[data-slop-shame-processed]') ?? el; return [r, ...r.querySelectorAll('*')].filter((n) => (n as HTMLElement).style?.length && !n.hasAttribute('data-slop-shame-mount')).length; })).toBe(0);

  // Destroy for real: after the undo window the post is hidden.
  await post.locator('.act.destroy').click();
  await expect(tomb).toBeVisible();
  await expect(post).toBeHidden({ timeout: 8000 });
  // Every FX resource is released when idle.
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(0, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('reduced motion: fade + poof, still undoable', async ({ page, extensionId }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  await post.locator('.act.destroy').click();
  await expect(post.locator('.tomb')).toBeVisible();
  await post.locator('.tomb .undo').click();
  await expect(post.locator('.bar')).toBeVisible();
});

test('Shame opens the modal in every layout, with no leftover slots', async ({ page, context, extensionId }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.linkedin.com' });
  await openShowcase(page, extensionId);
  const post = await firstSlopPost(page);
  await post.locator('.act.shame').click();
  const modal = page.locator('.ss-modal');
  await expect(modal).toBeVisible();

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
  // …and named only after an explicit opt-in.
  await page.locator('.share').click();
  await page.getByRole('button', { name: 'Copy text' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe(anon);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  await (await download).saveAs(`${SHOTS}/download-named.png`);

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(page.locator('[data-slop-shame-layer]')).toHaveCount(0, { timeout: 5000 });
});
