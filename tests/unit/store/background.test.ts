import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStoreHandlers } from '../../../src/lib/store/background';
import { closeDatabase } from '../../../src/lib/store/db';
import { getStats } from '../../../src/lib/store/query';
import { clearAll, importData, subscribe } from '../../../src/lib/store/read';
import type { StoreMessage } from '../../../src/lib/store/types';
import type { PageMessage } from '../../../src/lib/store/model';
import { sighting } from './helpers';

type Listener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
let listeners: Set<Listener>;
let sendMessage: ReturnType<typeof vi.fn>;
const pageSender = { id: 'extension-id', url: 'chrome-extension://extension-id/leaderboard.html' };
const feedSender = { id: 'extension-id', url: 'https://www.linkedin.com/feed/' };
let handler: Listener;

function dispatch(message: StoreMessage | PageMessage, sender = feedSender): unknown {
  // Model Chrome's callback channel, not Firefox/polyfill Promise listeners.
  let resolveReply!: (reply: unknown) => void;
  let rejectReply!: (error: Error) => void;
  const response = new Promise((resolve, reject) => {
    resolveReply = resolve;
    rejectReply = reject;
  });
  const keepAlive = handler(message, sender, (reply) => {
    if (reply?.type === 'store/error') rejectReply(new Error(reply.error));
    else resolveReply(reply);
  });
  if (keepAlive === undefined) return undefined;
  expect(keepAlive).toBe(true);
  return response;
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  vi.stubGlobal('location', { protocol: 'chrome-extension:' });
  listeners = new Set();
  sendMessage = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('browser', {
    tabs: { query: vi.fn().mockResolvedValue([{ id: 7 }]), sendMessage: vi.fn().mockResolvedValue(undefined) },
    runtime: {
      id: 'extension-id', getURL: (path: string) => `chrome-extension://extension-id${path}`,
      sendMessage, onMessage: { addListener: (fn: Listener) => listeners.add(fn), removeListener: (fn: Listener) => listeners.delete(fn) },
    },
  });
  registerStoreHandlers();
  handler = [...listeners][0]!;
});

afterEach(async () => {
  await closeDatabase();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('background message handlers and page API', () => {
  it('returns requested authors/leaderboards after durable writes and coalesces broadcasts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await dispatch({ type: 'store/sightings', sightings: [sighting()] });
    await dispatch({ type: 'store/action', postId: 'post-1', authorId: 'in/alice', action: 'shamed' });
    expect(await dispatch({ type: 'store/author', authorId: 'in/alice' })).toMatchObject({ postsSeen: 1, shamedCount: 1 });
    expect(await dispatch({ type: 'store/leaderboard', limit: 10 })).toHaveLength(1);
    expect(await dispatch({ type: 'store/author', authorId: 'missing' })).toBeNull();
    expect(sendMessage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({ type: 'store/changed' });
  });

  it('keeps page imports/clears in the worker, restricts them to extension senders, and validates messages', async () => {
    await dispatch({ type: 'store/sightings', sightings: [sighting()] });
    await expect(dispatch({ type: 'store/clear' })).rejects.toThrow('extension page');
    expect(dispatch({ type: 'store/author', authorId: 'in/alice' }, { ...feedSender, id: 'other-extension' })).toBeUndefined();
    await expect(dispatch({ type: 'store/sightings', sightings: null } as unknown as StoreMessage)).rejects.toThrow('Invalid');
    await dispatch({ type: 'store/clear' }, pageSender);
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'store/reset' });
    expect((await getStats()).authorsTracked).toBe(0);
  });

  it('page import/clear send management messages and subscribe returns a cleanup callback', async () => {
    await importData('{}');
    await clearAll();
    expect(sendMessage.mock.calls.map(([m]) => m)).toEqual([{ type: 'store/import', json: '{}' }, { type: 'store/clear' }]);
    const cb = vi.fn();
    const unsubscribe = subscribe(cb);
    const listener = [...listeners].find((item) => item !== handler)!;
    listener({ type: 'other' }, pageSender, () => {});
    listener({ type: 'store/changed' }, pageSender, () => {});
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(listeners.has(listener)).toBe(false);
  });

  it('page APIs turn error envelopes into rejections', async () => {
    sendMessage.mockResolvedValue({ type: 'store/error', error: 'Import failed', retryable: false });
    await expect(importData('{}')).rejects.toThrow('Import failed');
    await expect(clearAll()).rejects.toThrow('Import failed');
  });

  it('marks quota failures permanent so clients do not retry forever', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => { throw new DOMException('Storage full', 'QuotaExceededError'); });
    const reply = new Promise((resolve) => {
      expect(handler({ type: 'store/sightings', sightings: [sighting()] }, feedSender, resolve)).toBe(true);
    });
    expect(await reply).toEqual({ type: 'store/error', error: 'Storage full', retryable: false });
  });
});
