// Activity pages: the profile owner's slop summary at the top of their
// profile card, above the photo. Runs on the synthetic activity fixture with
// corpus samples swapped into the posts. Screenshots: test-results/ui-profile-summary/.

import { mkdir, readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect, waitForContentScript } from './helpers';

const SHOTS = 'test-results/ui-profile-summary';
const JANE = 'https://www.linkedin.com/in/jane-doe/recent-activity/all/';
const CSP = "trusted-types default jSecure 'allow-duplicates' dompurify highcharts goog#html ProseMirrorClipboard";

/**
 * Texts for posts 1..9. Post 4 is Jane's bare repost of Rowan's post (Rowan's
 * text, never Jane's); post 6 is too short to judge. Jane's own, judged
 * posts: 7, of which 4 are clear slop (scores ~80-97), 3 score 0.
 */
const LINEUP = ['ai-swamp-culture', 'normal-technical', 'ai-cert-pivot', 'ai-leaked-model', 'normal-event', 'normal-short', 'ai-leaked-template', 'human-casual-dashes', 'ai-swamp-sales'];

async function fixtureHtml(dark: boolean): Promise<string> {
  const texts: Record<string, string> = {};
  for (const f of ['ai-fingerprints', 'ai-swamp', 'ai-certified', 'human']) {
    for (const s of JSON.parse(await readFile(`tests/fixtures/posts/${f}.json`, 'utf8')) as { id: string; text: string }[]) texts[s.id] = s.text;
  }
  const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  let i = 0;
  let html = (await readFile('tests/fixtures/feed/activity.html', 'utf8'))
    .replace(/(data-testid="expandable-text-box">)[\s\S]*?(<\/span>)/g, (_w, open: string, close: string) => `${open}${escape(texts[LINEUP[i++]!]!)}${close}`);
  if (dark) html = html.replace('data-color-scheme="light"', 'data-color-scheme="dark"');
  return html;
}

async function openActivity(page: Page, extensionId: string, { dark = false, width = 1280, height = 900 } = {}): Promise<void> {
  const html = await fixtureHtml(dark);
  await page.route('https://www.linkedin.com/**', async (route) => {
    if (route.request().isNavigationRequest()) await route.fulfill({ body: html, contentType: 'text/html; charset=utf-8', headers: { 'content-security-policy': CSP } });
    else await route.fulfill({ status: 204, body: '' });
  });
  await page.setViewportSize({ width, height });
  await page.goto(JANE);
  await waitForContentScript(page, extensionId);
}

async function debugCounts(page: Page) {
  return page.evaluate(() => {
    document.dispatchEvent(new Event('slop-shame:debug'));
    return JSON.parse(document.documentElement.getAttribute('data-slop-shame-debug') ?? '{}') as Record<string, number>;
  });
}

/** Scroll the fixture's <main> (LinkedIn scrolls an inner element, not the window) slowly. */
async function scrollFeed(page: Page, steps: number, dy = 300) {
  await page.mouse.move(640, 600);
  for (let k = 0; k < steps; k++) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(150);
  }
}

const go = (page: Page, path: string) => page.evaluate((p) => {
  history.pushState(null, '', p);
  window.dispatchEvent(new PopStateEvent('popstate'));
}, path);

/** Every value fits on its line at the card's width: nothing is cut off with an ellipsis. */
const truncated = (summary: ReturnType<Page['locator']>) =>
  summary.evaluate((el) => [...el.querySelectorAll('.big, .verdict, dd, dt')].filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent));

/** The left rail (profile card) plus a slice of the posts beside it. */
const railShot = async (page: Page, name: string) => {
  const rail = (await page.locator('aside[aria-label="Sidebar"] .profile-card').boundingBox())!;
  await page.screenshot({ path: `${SHOTS}/${name}`, clip: { x: rail.x - 16, y: Math.max(0, rail.y - 16), width: 800, height: Math.min(640, rail.height + 32) } });
};

test.beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true });
});

test('the summary sits on top of the profile card, above the photo, and fills in with only the owner\'s posts as they scroll by', async ({ page, extensionId }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openActivity(page, extensionId);
  const host = page.locator('[data-slop-shame-mount="summary"]');
  const summary = host.locator('.summary');
  await expect(host).toHaveCount(1);
  await expect(summary).toBeVisible();
  // Our own host, first in LinkedIn's profile card (inside its sticky block), above the cover and photo.
  expect(await host.evaluate((h) => [h.parentElement?.className, h.parentElement?.firstElementChild === h])).toEqual(['profile-card', true]);
  const photo = page.locator('aside[aria-label="Sidebar"] .photo');
  const box = (await host.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual((await photo.boundingBox())!.y + 0.5);
  expect(box.width).toBeCloseTo((await page.locator('.profile-card').boundingBox())!.width, 0);

  // The first posts near the viewport: a small sample reads as counts, not a verdict.
  await expect(summary).toContainText('Too early to tell');
  await expect(summary.locator('.big')).toContainText(/\d\/\d posts slop/);
  await expect(summary.locator('.row').first()).toHaveText(/This page\s*need \d more · avg \d+/);
  expect(await truncated(summary)).toEqual([]);
  await railShot(page, 'summary-light-early.png');
  const before = (await host.boundingBox())!;
  const heightBefore = before.height;

  await scrollFeed(page, 14);
  // Seven of Jane's posts judged, four slop. Rowan's post (reposted by Jane) and the 7-word post don't count.
  await expect(summary.locator('.big')).toHaveText(/57%\s*of posts slop/, { timeout: 8000 });
  await expect(summary.locator('.verdict')).toHaveText('Lots of slop');
  await expect(summary.locator('.row').first()).toHaveText(/This page\s*4 of 7 · avg \d+/);
  await expect(summary.locator('.seg')).toHaveCount(7);
  await expect(summary.locator('.seg.slop')).toHaveCount(4);
  // Everything the store has from Jane: all 8 of her sighted posts (the short one too), 4 slop.
  await expect(summary.locator('.all')).toHaveText(/All seen\s*4 of 8 slop/, { timeout: 10_000 });
  expect(await debugCounts(page)).toMatchObject({ profiles: 1, profilePosts: 8 });
  expect(await truncated(summary)).toEqual([]);

  // The card is sticky: the summary stayed put while the posts scrolled, and never changed height.
  const after = (await host.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect(after.height).toBe(heightBefore);
  expect(await page.locator('main').evaluate((m) => m.scrollTop)).toBeGreaterThan(1500);
  await railShot(page, 'summary-light.png');
  await page.screenshot({ path: `${SHOTS}/activity-light.png` });

  // The posts on this page drip along their top edge, but get no frame around the card.
  await expect(page.locator('.ss-post-outline')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('dark theme', async ({ page, extensionId }) => {
  await openActivity(page, extensionId, { dark: true });
  const summary = page.locator('[data-slop-shame-mount="summary"] .summary');
  await scrollFeed(page, 14);
  await expect(summary.locator('.big')).toHaveText(/57%/, { timeout: 8000 });
  await expect(summary.locator('.all')).toHaveText(/4 of 8 slop/, { timeout: 10_000 });
  // The theme sheet follows LinkedIn's page background: light text on a dark card.
  const [text, bg] = await summary.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  const lum = (c: string) => { const [r, g, b] = c.match(/[\d.]+/g)!.map(Number); return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255; };
  expect(lum(text!)).toBeGreaterThan(0.7);
  expect(lum(bg!)).toBeLessThan(0.25);
  await railShot(page, 'summary-dark.png');
  await page.screenshot({ path: `${SHOTS}/activity-dark.png` });
});

test('another person starts over, and leaving their activity pages removes the summary and every reference', async ({ page, extensionId }) => {
  await openActivity(page, extensionId);
  const host = page.locator('[data-slop-shame-mount="summary"]');
  const summary = host.locator('.summary');
  await scrollFeed(page, 14);
  await expect(summary.locator('.big')).toHaveText(/57%/, { timeout: 8000 });
  // Jane's other tab: same visit, same tally.
  const big = await summary.locator('.big').textContent();
  await go(page, '/in/jane-doe/recent-activity/comments/');
  await page.waitForTimeout(700);
  await expect(summary.locator('.big')).toHaveText(big!);
  // Rowan's activity: only Rowan's post (the one Jane reposted) is his.
  await go(page, '/in/rowan-example/recent-activity/all/');
  await expect(summary.locator('.big')).toHaveText(/1\/1\s*posts slop/);
  await expect(summary.locator('.verdict')).toHaveText(/Too early to tell/);
  expect(await debugCounts(page)).toMatchObject({ profiles: 1, profilePosts: 1 });
  // His main profile page: not an activity page.
  await go(page, '/in/rowan-example/');
  await expect(host).toHaveCount(0);
  await expect.poll(async () => (await debugCounts(page)).profiles).toBe(0);
  expect(await debugCounts(page)).toMatchObject({ profilePosts: 0 });
});

test('a re-rendered profile card gets the same summary back; a hidden rail shows none', async ({ page, extensionId }) => {
  await openActivity(page, extensionId);
  const host = page.locator('[data-slop-shame-mount="summary"]');
  await expect(host.locator('.summary')).toContainText(/posts slop/);
  // LinkedIn replaces the card (cloning copies our host element, never its shadow root).
  await page.evaluate(() => {
    const card = document.querySelector('.profile-card')!;
    const fresh = card.cloneNode(true) as HTMLElement;
    fresh.classList.add('fresh');
    card.replaceWith(fresh);
  });
  await expect.poll(() => page.evaluate(() => {
    const hosts = document.querySelectorAll('[data-slop-shame-mount="summary"]');
    const card = document.querySelector('.profile-card.fresh')!;
    return hosts.length === 1 && card.firstElementChild === hosts[0] && !!hosts[0]!.shadowRoot?.querySelector('.summary');
  }), { timeout: 3000 }).toBe(true);
  await expect(host.locator('.summary')).toContainText(/posts slop/);
  // Narrow windows hide the rail: no orphaned summary anywhere else.
  await page.addStyleTag({ content: 'aside[aria-label=Sidebar]{display:none}' });
  await page.locator('aside[aria-label=Sidebar] .profile-card').evaluate((c) => c.replaceWith(c.cloneNode(true)));
  await expect.poll(() => page.locator('[data-slop-shame-mount="summary"]').count(), { timeout: 3000 }).toBe(0);
  expect(await debugCounts(page)).toMatchObject({ profiles: 1 });
});

test('before any post is scored it says so, and never vouches for anyone', async ({ page, extensionId }) => {
  // No commentary at all: nothing to judge.
  const html = (await fixtureHtml(false)).replace(/(data-testid="expandable-text-box">)[\s\S]*?(<\/span>)/g, '$1$2');
  await page.route('https://www.linkedin.com/**', (route) => route.request().isNavigationRequest()
    ? route.fulfill({ body: html, contentType: 'text/html; charset=utf-8', headers: { 'content-security-policy': CSP } })
    : route.fulfill({ status: 204, body: '' }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(JANE);
  await waitForContentScript(page, extensionId);
  const summary = page.locator('[data-slop-shame-mount="summary"] .summary');
  await expect(summary.locator('.big')).toHaveText(/0\s*posts checked/);
  await expect(summary.locator('.row').first()).toHaveText(/This page\s*(\d+ too short to judge|only posts they wrote)/);
  await expect(summary.locator('.verdict')).toHaveText('Scroll to check');
  await expect(summary).not.toContainText(/clean|human|authentic/i);
  expect(await truncated(summary)).toEqual([]);
  expect(await summary.getAttribute('title')).toContain('not proof a human wrote it');
  await railShot(page, 'summary-empty.png');
});
