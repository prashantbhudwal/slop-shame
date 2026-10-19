import type { PageMessage, StoreStats, PostRecord } from './model';
import { requestStore } from './transport';

export { getLeaderboard, getAuthor, getAuthorPosts, getStats, exportData } from './query';
export type { StoreStats, PostRecord };

/** Replace local data using a JSON export. The background owns the write. */
export async function importData(json: string): Promise<void> {
  const message: PageMessage = { type: 'store/import', json };
  await requestStore(message);
}

export async function clearAll(): Promise<void> {
  const message: PageMessage = { type: 'store/clear' };
  await requestStore(message);
}

/** Returns an unsubscribe function; call it when the Svelte component unmounts. */
export function subscribe(cb: () => void): () => void {
  const listener = (message: unknown) => {
    if (typeof message === 'object' && message !== null && 'type' in message && message.type === 'store/changed') cb();
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
