#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { postSelector, selectors } from '../src/lib/linkedin/selectors.ts';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = resolve(project, '.playwright/linkedin-profile');
const outputDir = resolve(project, 'tests/fixtures/feed/captured');
const scrolls = Number(process.argv.find(arg => arg.startsWith('--scrolls='))?.split('=')[1] ?? process.env.SLOP_SCROLLS ?? 5);
if (!Number.isInteger(scrolls) || scrolls < 0 || scrolls > 100) throw new Error('Use --scrolls=N with an integer from 0 to 100.');
if (!existsSync(profile)) throw new Error('No LinkedIn profile. Run pnpm linkedin:login once first.');
console.warn("WARNING: Captured fixtures contain other people's posts and names. Do NOT commit them by default.\nCaptures are saved in the gitignored tests/fixtures/feed/captured/ directory.");

let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: false, viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled', '--window-position=-2400,-2400'],
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
  if (!new URL(page.url()).pathname.startsWith('/feed')) throw new Error('Login expired. Run pnpm linkedin:login again.');
  await page.locator(selectors.feed.join(',')).first().waitFor({ state: 'visible' });
  await page.locator(postSelector).first().waitFor({ state: 'attached' });
  for (let index = 0; index < scrolls; index++) {
    await page.mouse.wheel(0, 850);
    await page.waitForTimeout(900);
  }
  // Serialize a detached clone; the signed-in page is never modified. This is a
  // structural debugging snapshot, not anonymized data: names/text remain.
  const html = await page.evaluate(({ hooks }) => {
    const feed = hooks.feed.map(selector => document.querySelector(selector)).find(Boolean);
    if (!feed) throw new Error('Feed container was not found.');
    const clone = feed.cloneNode(true);
    clone.querySelectorAll(hooks.unsafeCapture).forEach(node => node.remove());
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23999"/%3E%3C/svg%3E';
    for (const element of [clone, ...clone.querySelectorAll(hooks.all)]) {
      for (const { name, value } of [...element.attributes]) {
        if (name === 'style' || name === 'srcset' || name === 'nonce' || name.startsWith('on') || name.startsWith('data-slop-shame')) {
          element.removeAttribute(name);
        } else if (['href', 'src', 'poster', 'action'].includes(name)) {
          try {
            const url = new URL(value, 'https://www.linkedin.com');
            if (!['http:', 'https:', 'data:'].includes(url.protocol)) element.removeAttribute(name);
            else {
              url.search = ''; // includes LinkedIn trk, trackingId, miniProfileUrn, etc.
              url.hash = '';
              element.setAttribute(name, url.href);
            }
          } catch { element.removeAttribute(name); }
        }
      }
    }
    clone.querySelectorAll(hooks.captureImages).forEach(image => {
      image.setAttribute('src', placeholder);
      image.removeAttribute('srcset');
      image.setAttribute('loading', 'lazy');
    });
    const markup = clone.tagName === 'MAIN' ? clone.outerHTML : `<main>${clone.outerHTML}</main>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Captured LinkedIn feed</title></head><body>${markup}</body></html>\n`;
  }, { hooks: selectors });
  mkdirSync(outputDir, { recursive: true });
  const filename = resolve(outputDir, `captured-${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
  writeFileSync(filename, html);
  console.log(`Saved sanitized structure to ${filename}`);
} catch (error) {
  console.error(`Capture failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await context?.close();
}
