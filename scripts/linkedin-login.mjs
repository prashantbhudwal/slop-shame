#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { selectors } from '../src/lib/linkedin/selectors.ts';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extension = resolve(project, '.output/chrome-mv3');
const profile = resolve(project, '.playwright/linkedin-profile');
if (!existsSync(resolve(extension, 'manifest.json'))) {
  console.log('Building Slop Shame before opening the login browser…');
  const build = spawnSync('pnpm', ['build'], { cwd: project, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
mkdirSync(profile, { recursive: true });
console.log(`\nSign in to LinkedIn in the Chromium window, including any verification steps.
Slop Shame is loaded. Once the feed is visible, the browser closes and saves your login.
Your private browser profile stays in ${profile} (gitignored).
Close the window to cancel. Close other browsers using this profile before running this script.\n`);

let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: false, viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const page = context.pages()[0] ?? await context.newPage();
  process.once('SIGINT', () => { void context.close(); });
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
  const result = await Promise.race([
    (async () => {
      await page.waitForURL(url => url.pathname.startsWith('/feed'), { timeout: 0 });
      await page.locator(selectors.feed.join(',')).first().waitFor({ state: 'visible', timeout: 0 });
      return 'logged-in';
    })().catch(error => {
      if (page.isClosed()) return 'closed';
      throw error;
    }),
    context.waitForEvent('close', { timeout: 0 }).then(() => 'closed'),
  ]);
  console.log(result === 'logged-in'
    ? 'Login saved. Run SLOP_REAL=1 pnpm test:e2e --project=real-linkedin when ready.'
    : 'Window closed. Any completed sign-in is retained in the local profile.');
} catch (error) {
  console.error(`Could not finish login: ${error.message}\nIf Chromium is missing, run: pnpm exec playwright install chromium`);
  process.exitCode = 1;
} finally {
  await context?.close();
}
