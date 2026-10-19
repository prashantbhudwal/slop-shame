import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreMessage } from '../../../src/lib/store/types';
import { sighting } from './helpers';

type Listener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
let sendMessage: ReturnType<typeof vi.fn>;
let deliver: (message: StoreMessage) => Promise<unknown>;
let resetClient: () => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  vi.stubGlobal('location', { protocol: 'chrome-extension:' });
  const listeners: Listener[] = [];
  sendMessage = vi.fn((message: StoreMessage) => deliver(message));
  vi.stubGlobal('browser', {
    runtime: {
      id: 'extension-id', getURL: (path: string) => `chrome-extension://extension-id${path}`,
      sendMessage, onMessage: { addListener: (fn: Listener) => listeners.push(fn) },
    },
  });
  const { registerStoreHandlers } = await import('../../../src/lib/store/background');
  registerStoreHandlers();
  deliver = (message) => new Promise((resolve) => {
    listeners[0]!(message, { id: 'extension-id', url: 'https://www.linkedin.com/feed/' }, resolve);
  });
  resetClient = () => {
    for (const listener of listeners.slice(1)) {
      listener({ type: 'store/reset' }, { id: 'extension-id' }, () => {});
    }
  };
});

afterEach(async () => {
  const { closeDatabase } = await import('../../../src/lib/store/db');
  await closeDatabase();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('store review regressions', () => {
  it('keeps an atomic sighting/action batch through repeated flush failures', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthor, getAuthorPosts } = await import('../../../src/lib/store/query');
    client.reportSighting(sighting());
    sendMessage.mockRejectedValueOnce(new Error('Worker stopped before commit'));
    await client.reportAction('post-1', 'in/alice', 'destroyed').catch(() => {});
    sendMessage.mockRejectedValueOnce(new Error('Worker still unavailable'));
    await expect(client.flushSightings()).rejects.toThrow('unavailable');
    await client.flushSightings();
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, destroyedCount: 1 });
    expect((await getAuthorPosts('in/alice', 1))[0]).toMatchObject({ destroyed: true });
    expect(sendMessage.mock.calls.every(([m]) => m.type === 'store/sightings')).toBe(true);
  });

  it('keeps unknown actions pending across another failed batch until their sighting arrives', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthor } = await import('../../../src/lib/store/query');
    await client.reportAction('future', 'in/alice', 'shamed');
    client.reportSighting(sighting('unrelated', 50, 'bob'));
    sendMessage.mockRejectedValueOnce(new Error('Later flush failed'));
    await expect(client.flushSightings()).rejects.toThrow('Later flush');
    client.reportSighting(sighting('future'));
    await client.flushSightings();
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, shamedCount: 1 });
    expect(await getAuthor('bob')).toMatchObject({ postsSeen: 1 });
    // An acknowledged action must not remain on the retry timer.
    sendMessage.mockClear();
    await client.flushSightings();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('retries an atomic action after a lost commit acknowledgement without double counting', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthor } = await import('../../../src/lib/store/query');
    client.reportSighting(sighting());
    sendMessage.mockImplementationOnce(async (message: StoreMessage) => {
      await deliver(message);
      throw new Error('Channel closed after commit');
    });
    await client.reportAction('post-1', 'in/alice', 'shamed').catch(() => {});
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, shamedCount: 1 });
    await client.flushSightings();
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, shamedCount: 1 });
  });

  it('retains action target snapshots after a permanent rejection and cache eviction', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthor } = await import('../../../src/lib/store/query');
    client.reportSighting(sighting('target'));
    sendMessage.mockResolvedValueOnce({ type: 'store/error', error: 'Quota full', retryable: false });
    await expect(client.reportAction('target', 'in/alice', 'destroyed')).rejects.toThrow('Quota full');
    // Fill both bounded caches while the action's failed snapshot stays pending.
    sendMessage.mockResolvedValue({ ok: true, pendingActions: [{ postId: 'target', authorId: 'in/alice', action: 'destroyed' }] });
    for (let i = 0; i < 2001; i++) {
      client.reportSighting(sighting(`evict-${i}`, 40, 'other'));
      if (i % 25 === 24) await client.flushSightings();
    }
    await client.flushSightings();
    sendMessage.mockImplementation((message: StoreMessage) => deliver(message));
    await client.flushSightings();
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, destroyedCount: 1 });
  });

  it('drains actions and target sightings arriving during an in-flight batch', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthor } = await import('../../../src/lib/store/query');
    let release!: () => void;
    sendMessage.mockImplementationOnce((message: StoreMessage) => new Promise((resolve) => {
      release = () => { void deliver(message).then(resolve); };
    }));
    const action = client.reportAction('future', 'in/alice', 'shamed');
    client.reportSighting(sighting('future'));
    release();
    await action;
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, shamedCount: 1 });
    expect(sendMessage.mock.calls).toHaveLength(2);
    expect(sendMessage.mock.calls[1]![0]).toMatchObject({
      type: 'store/sightings', sightings: [{ postId: 'future' }],
      actions: [{ postId: 'future', authorId: 'in/alice', action: 'shamed' }],
    });
  });

  it('ignores an old acknowledgement after reset and retries the pending action', async () => {
    const client = await import('../../../src/lib/store/client');
    const { clearStore } = await import('../../../src/lib/store/repository');
    const { getAuthor } = await import('../../../src/lib/store/query');
    sendMessage.mockImplementationOnce(async (message: StoreMessage) => {
      const reply = await deliver(message);
      await clearStore();
      resetClient();
      return reply;
    });
    client.reportSighting(sighting());
    await client.reportAction('post-1', 'in/alice', 'destroyed');
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, destroyedCount: 1 });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed batch actions before writing any sightings', async () => {
    const reply = await deliver({ type: 'store/sightings', sightings: [sighting()], actions: [
      { postId: 'post-1', authorId: 'in/alice', action: 'other' },
    ] } as unknown as StoreMessage);
    expect(reply).toMatchObject({ type: 'store/error', retryable: false });
    const { getStats } = await import('../../../src/lib/store/query');
    expect((await getStats()).postsScanned).toBe(0);
  });

  it('returns unknown actions and applies batch actions after upserts, idempotently', async () => {
    const action = { postId: 'post-1', authorId: 'in/alice', action: 'destroyed' as const };
    expect(await deliver({ type: 'store/sightings', sightings: [], actions: [action] } as StoreMessage))
      .toMatchObject({ ok: true, pendingActions: [action] });
    const batch = { type: 'store/sightings', sightings: [sighting()], actions: [action, action] } as StoreMessage;
    expect(await deliver(batch)).toMatchObject({ ok: true, pendingActions: [] });
    expect(await deliver(batch)).toMatchObject({ ok: true, pendingActions: [] });
    const { getAuthor } = await import('../../../src/lib/store/query');
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, destroyedCount: 1 });
    expect(await deliver({ type: 'store/action', ...action })).toMatchObject({ ok: true, pendingActions: [] });
    expect(await deliver({ type: 'store/action', ...action, postId: 'unknown' }))
      .toMatchObject({ ok: true, pendingActions: [{ ...action, postId: 'unknown' }] });
  });

  it('rolls back both sightings and actions if the batch transaction aborts', async () => {
    const { openDatabase } = await import('../../../src/lib/store/db');
    const { getAuthor } = await import('../../../src/lib/store/query');
    const db = await openDatabase();
    const original = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce((...args: Parameters<typeof db.transaction>) => {
      const tx = original(...args);
      const posts = tx.objectStore('posts');
      const put = posts.put.bind(posts);
      vi.spyOn(posts, 'put').mockImplementation((...putArgs: Parameters<typeof posts.put>) => {
        const request = put(...putArgs);
        if (putArgs[0].destroyed) request.addEventListener('success', () => tx.abort());
        return request;
      });
      return tx;
    });
    expect(await deliver({ type: 'store/sightings', sightings: [sighting()], actions: [
      { postId: 'post-1', authorId: 'in/alice', action: 'destroyed' },
    ] } as StoreMessage)).toMatchObject({ type: 'store/error' });
    expect(await getAuthor('in/alice')).toBeNull();
  });

  it('persists same-score changes to every content and author field', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthor, getAuthorPosts } = await import('../../../src/lib/store/query');
    let current = sighting('metadata', 60);
    client.reportSighting(current);
    await client.flushSightings();
    const changes = [
      { author: { ...current.author, name: 'New name' } },
      { author: { ...current.author, headline: 'New headline' } },
      { author: { ...current.author, profileUrl: 'https://www.linkedin.com/in/alice/' } },
      { author: { ...current.author, avatarUrl: 'https://example.test/avatar.png' } },
      { author: { ...current.author, kind: 'unknown' as const } },
      { topCategory: 'hedging' as const }, { tierId: 'certified' as const }, { snippet: 'New snippet' },
    ];
    for (const change of changes) {
      current = { ...current, ...change, seenAt: current.seenAt + 1 };
      client.reportSighting(current);
      await client.flushSightings();
    }
    expect(sendMessage).toHaveBeenCalledTimes(1 + changes.length);
    expect(await getAuthor('in/alice')).toMatchObject({ postsSeen: 1, categoryCounts: { hedging: 1 } });
    expect((await getAuthorPosts('in/alice', 1))[0]).toMatchObject({ snippet: 'New snippet', tierId: 'certified' });
  });

  it('refreshes lastSeen every five minutes without extending the window on duplicates', async () => {
    const client = await import('../../../src/lib/store/client');
    const { getAuthorPosts } = await import('../../../src/lib/store/query');
    const started = Date.now();
    client.reportSighting(sighting('freshness'));
    await client.flushSightings();
    vi.setSystemTime(started + 5 * 60_000 - 1);
    client.reportSighting(sighting('freshness'));
    await client.flushSightings();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    vi.setSystemTime(started + 5 * 60_000);
    client.reportSighting(sighting('freshness'));
    await client.flushSightings();
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect((await getAuthorPosts('in/alice', 1))[0]!.lastSeen).toBe(Date.now());
  });

  it('bounds dedupe at 2000 entries and refreshes LRU on duplicate sightings', async () => {
    sendMessage.mockResolvedValue({ ok: true, pendingActions: [] });
    const client = await import('../../../src/lib/store/client');
    for (let i = 0; i < 2000; i++) {
      client.reportSighting(sighting(`post-${i}`));
      if (i % 25 === 24) await client.flushSightings();
    }
    client.reportSighting(sighting('post-0')); // Refresh the oldest entry's recency.
    client.reportSighting(sighting('post-2000')); // Evicts post-1, not post-0.
    await client.flushSightings();
    sendMessage.mockClear();
    client.reportSighting(sighting('post-0'));
    await client.flushSightings();
    expect(sendMessage).not.toHaveBeenCalled();
    client.reportSighting(sighting('post-1'));
    await client.flushSightings();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0]![0].sightings).toMatchObject([{ postId: 'post-1' }]);
  });
});
