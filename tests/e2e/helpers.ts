import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, test as base, expect, type BrowserContext, type Page } from '@playwright/test';

export const extensionPath = resolve('.output/chrome-mv3');
export const linkedInProfile = resolve('.playwright/linkedin-profile');
export const realLinkedInEnabled = process.env.SLOP_REAL === '1' && existsSync(linkedInProfile);
const fixtureOrigin = `http://127.0.0.1:${process.env.SLOP_FIXTURE_PORT ?? 4179}`;

/** Empty userDataDir gives each fixture test a fresh, temporary persistent context. */
export async function launchWithExtension(options: { profileDir?: string; headless?: boolean } = {}): Promise<BrowserContext> {
  if (!existsSync(resolve(extensionPath, 'manifest.json'))) throw new Error('Build the extension first: pnpm build');
  const real = options.profileDir === linkedInProfile;
  return chromium.launchPersistentContext(options.profileDir ?? '', {
    channel: 'chromium', // Playwright's full Chromium supports extensions in new headless mode.
    headless: real ? false : options.headless ?? process.env.SLOP_HEADED !== '1',
    ...(real ? { viewport: { width: 1280, height: 900 }, ignoreDefaultArgs: ['--enable-automation'] } : {}),
    args: [
      `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`,
      ...(real ? ['--disable-blink-features=AutomationControlled', '--window-position=2600,0'] : []),
    ],
  });
}

/**
 * Route a locally served snapshot to the real match-pattern URL. Other LinkedIn
 * requests get empty responses, keeping synthetic tests independent of the site.
 * Register before goto so Chrome injects the actual built content script.
 */
export async function openFixtureFeed(page: Page, name: string): Promise<void> {
  const file = name.replace(/\.html$/, '');
  if (!/^[\w-]+$/.test(file)) throw new Error(`Invalid fixture name: ${name}`);
  await page.route('https://www.linkedin.com/**', async route => {
    if (route.request().isNavigationRequest() && route.request().frame() === page.mainFrame()) {
      const response = await page.request.get(`${fixtureOrigin}/${file}.html`);
      if (!response.ok()) throw new Error(`Fixture not found: ${file}.html (${response.status()})`);
      await route.fulfill({ response, contentType: 'text/html; charset=utf-8' });
    } else {
      await route.fulfill({ status: 204, body: '' });
    }
  });
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'load' });
}

/** Prove that the built content script ran in Chrome's extension isolated world. */
export async function waitForContentScript(page: Page, extensionId: string): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const worlds = new Set<string>();
  session.on('Runtime.executionContextCreated', ({ context }) => {
    worlds.add(context.origin);
    worlds.add(context.name);
  });
  try {
    await session.send('Runtime.enable'); // also emits existing execution contexts
    await expect.poll(() => [...worlds].some(name => name.includes(extensionId))).toBe(true);
  } finally {
    await session.detach();
  }
}

export const test = base.extend<{ extensionId: string }>({
  context: async ({ headless }, use, testInfo) => {
    const real = testInfo.project.name === 'real-linkedin';
    const context = await launchWithExtension({ profileDir: real ? linkedInProfile : undefined, headless });
    try { await use(context); } finally { await context.close(); }
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    await use(new URL(worker.url()).hostname);
  },
});

export { expect };
