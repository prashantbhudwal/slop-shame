// Content script for the LinkedIn feed. Wires: feed adapter → engine → UI.
// Owned by the UI workstream; see AGENTS.md.
//
// Never clicks, types or automates anything on LinkedIn and never calls its
// APIs: it only reads the feed DOM and draws on top of it.

// First: Svelte creates a Trusted Types policy at load, which linkedin.com's CSP blocks.
import './trusted-types';
import { getDestroyedPosts, loadSettings, watchSettings, type Settings } from '../../lib/settings';
import { FeedController } from './controller';

declare const __SLOP_E2E__: boolean;

/** Startup retries back off to this, so a worker that can't read storage yet never leaves the tab dead. */
const MAX_RETRY_MS = 30_000;

export default defineContentScript({
  matches: ['https://www.linkedin.com/*'],
  runAt: 'document_idle',
  // WXT's legacy window.postMessage carries the extension id to page scripts,
  // which use_dynamic_url exists to hide. Its CustomEvent still stops old scripts.
  noScriptStartedPostMessage: true,
  async main(ctx) {
    let controller: FeedController | undefined;
    // Subscribe before the first read: a save while startup awaits must win
    // over the older snapshot it read.
    let latest: Settings | undefined;
    let wake: (() => void) | undefined;
    let retry = 0;
    const unwatch = watchSettings((next) => {
      latest = next;
      if (controller) controller.updateSettings(next);
      else wake?.();
    });
    let removeDebug: (() => void) | undefined;
    ctx.onInvalidated(() => {
      unwatch();
      window.clearTimeout(retry);
      wake?.();
      removeDebug?.();
      controller?.stop();
    });

    for (let attempt = 0; !controller; attempt++) {
      try {
        const loaded = latest ?? await loadSettings();
        const remembered = loaded.rememberDestroyed ? await getDestroyedPosts() : new Set<string>();
        if (ctx.isInvalid) return;
        const settings = latest ?? loaded;
        controller = new FeedController(settings, remembered);
        if (settings.enabled) controller.start();
      } catch {
        // Retry later, or as soon as a settings change shows storage is back.
        await new Promise<void>((resolve) => {
          wake = resolve;
          retry = window.setTimeout(resolve, Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt));
        });
        wake = undefined;
        window.clearTimeout(retry);
        if (ctx.isInvalid) return;
      }
    }

    // Test hook: e2e asks for live object counts to prove nothing leaks.
    if (__SLOP_E2E__) {
      const live = controller;
      const onDebug = () => document.documentElement.setAttribute('data-slop-shame-debug', JSON.stringify(live.debugCounts()));
      document.addEventListener('slop-shame:debug', onDebug);
      removeDebug = () => document.removeEventListener('slop-shame:debug', onDebug);
    }
  },
});
