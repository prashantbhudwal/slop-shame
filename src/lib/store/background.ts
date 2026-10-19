import { clearStore, importSnapshot, recordBatch } from './repository';
import { getAuthor, getLeaderboard } from './query';
import type { PageMessage } from './model';
import type { StoreMessage } from './types';
import type { StoreErrorReply } from './transport';
import { validateAction } from './validation';

/** One listener per service-worker lifetime. All durable state lives in IDB. */
export function registerStoreHandlers(): void {
  let changedTimer: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    if (changedTimer !== undefined) return;
    changedTimer = setTimeout(() => {
      changedTimer = undefined;
      void browser.runtime.sendMessage({ type: 'store/changed' }).catch(() => {
        // No extension page may be open to receive the broadcast.
      });
    }, 1_000);
  };
  const resetClients = async () => {
    // Existing host_permissions allow URL-filtered tab queries; no tabs
    // permission or new manifest entry is necessary.
    const tabs = await browser.tabs.query({ url: 'https://www.linkedin.com/*' });
    await Promise.all(tabs.map((tab) => tab.id === undefined ? undefined
      : browser.tabs.sendMessage(tab.id, { type: 'store/reset' }).catch(() => {})));
  };
  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message)) return;
    if (sender.id !== browser.runtime.id) return;
    const msg = message as StoreMessage | PageMessage;
    const respond = (operation: Promise<unknown>, retryable = true): true => {
      void operation.then(
        (value) => sendResponse(value === undefined ? { ok: true } : value),
        (error: unknown) => {
          const reply: StoreErrorReply = {
            type: 'store/error', error: error instanceof Error ? error.message : String(error),
            retryable: retryable && !(error instanceof Error && [
              'QuotaExceededError', 'ConstraintError', 'DataError', 'VersionError', 'SecurityError', 'NotSupportedError',
            ].includes(error.name)),
          };
          sendResponse(reply);
        },
      );
      return true; // Keep the message channel open on every Chromium version.
    };
    const rejected = (detail: string) => respond(Promise.reject(new Error(detail)), false);
    switch (msg.type) {
      case 'store/sightings':
        if (!Array.isArray(msg.sightings)) return rejected('Invalid sightings batch');
        if (msg.actions !== undefined && !Array.isArray(msg.actions)) return rejected('Invalid actions batch');
        try { msg.actions?.forEach(validateAction); } catch { return rejected('Invalid store action'); }
        return respond(recordBatch(msg.sightings, msg.actions).then(({ wrote, pendingActions }) => {
          if (wrote) changed();
          return { ok: true, pendingActions };
        }));
      case 'store/action':
        try { validateAction(msg); } catch { return rejected('Invalid action'); }
        return respond(recordBatch([], [{ postId: msg.postId, authorId: msg.authorId, action: msg.action }])
          .then(({ wrote, pendingActions }) => {
            if (wrote) changed();
            return { ok: true, pendingActions };
          }));
      case 'store/author':
        if (typeof msg.authorId !== 'string') return rejected('Invalid author identity');
        return respond(getAuthor(msg.authorId));
      case 'store/leaderboard':
        if (typeof msg.limit !== 'number') return rejected('Invalid leaderboard limit');
        return respond(getLeaderboard(msg.limit));
      case 'store/import':
      case 'store/clear': {
        // A content script may send normal store messages, but only an extension
        // page may replace or clear the complete snapshot.
        if (!sender.url?.startsWith(browser.runtime.getURL('/'))) return rejected('Store management requires an extension page');
        if (msg.type === 'store/import' && typeof msg.json !== 'string') return rejected('Invalid import JSON');
        return respond((msg.type === 'store/import' ? importSnapshot(msg.json) : clearStore()).then(() => {
          changed();
          void resetClients().catch(() => {});
        }), false);
      }
    }
  });
}
