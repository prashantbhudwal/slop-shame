// Content script for the LinkedIn feed. Wires: feed adapter → engine → UI.
// Owned by the UI workstream; see AGENTS.md.
//
// Never clicks, types or automates anything on LinkedIn and never calls its
// APIs: it only reads the feed DOM and draws on top of it.

// First: Svelte creates a Trusted Types policy at load, which linkedin.com's CSP blocks.
import './trusted-types';
import { getDestroyedPosts, loadSettings, watchSettings } from '../../lib/settings';
import { FeedController } from './controller';

export default defineContentScript({
  matches: ['https://www.linkedin.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const settings = await loadSettings();
    const remembered = settings.rememberDestroyed ? await getDestroyedPosts() : new Set<string>();
    if (ctx.isInvalid) return;
    const controller = new FeedController(settings, remembered);
    if (settings.enabled) controller.start();
    const unwatch = watchSettings((next) => controller.updateSettings(next));

    // Test hook: e2e asks for live object counts to prove nothing leaks.
    const onDebug = () => document.documentElement.setAttribute('data-slop-shame-debug', JSON.stringify(controller.debugCounts()));
    document.addEventListener('slop-shame:debug', onDebug);

    ctx.onInvalidated(() => {
      unwatch();
      document.removeEventListener('slop-shame:debug', onDebug);
      controller.stop();
    });
  },
});
