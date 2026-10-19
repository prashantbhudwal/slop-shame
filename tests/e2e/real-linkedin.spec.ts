import { selectors } from '../../src/lib/linkedin/selectors';
import { test, expect, realLinkedInEnabled, waitForContentScript } from './helpers';

test.skip(!realLinkedInEnabled, 'Opt in with SLOP_REAL=1 after running pnpm linkedin:login once.');

test('the extension loads on the authenticated real feed', async ({ page, extensionId }) => {
  const extensionErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.location().url.startsWith(`chrome-extension://${extensionId}/`)) {
      extensionErrors.push(message.text());
    }
  });
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/linkedin\.com\/feed\//);
  await expect(page.locator(selectors.feed.join(',')).first()).toBeVisible();
  await waitForContentScript(page, extensionId);
  expect(extensionErrors).toEqual([]);
});
