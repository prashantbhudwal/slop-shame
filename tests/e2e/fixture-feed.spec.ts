import { test, expect, openFixtureFeed, waitForContentScript } from './helpers';

for (const fixture of ['sdui', 'classic', 'hashed']) {
  test(`extension loads on the ${fixture} feed without console errors`, async ({ page, context, extensionId }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await openFixtureFeed(page, fixture);
    await waitForContentScript(page, extensionId);
    await expect(page).toHaveURL('https://www.linkedin.com/feed/');
    await expect(page.getByRole('main')).toBeVisible();
    const worker = context.serviceWorkers()[0]!;
    const manifest = await worker.evaluate('chrome.runtime.getManifest()') as {
      name: string; content_scripts: { matches: string[] }[];
    };
    expect(manifest.name).toBe('Slop Shame');
    expect(manifest.content_scripts.some((entry: { matches: string[] }) => entry.matches.includes('https://www.linkedin.com/*'))).toBe(true);
    // UI workstream can add badge/Destroy/Shame assertions here, reusing these helpers.
    expect(errors).toEqual([]);
  });
}
