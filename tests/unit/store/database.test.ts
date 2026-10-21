import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forceCloseDatabase, IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { closeDatabase, DB_NAME, DB_VERSION, MAX_POSTS, migrateDatabase, openDatabase, POST_RETENTION_MS, requestResult, transaction } from '../../../src/lib/store/db';
import { clearStore, importSnapshot, recordAction, recordBatch, recordSightings } from '../../../src/lib/store/repository';
import { exportData, getAuthor, getAuthorPosts, getLeaderboard, getStats } from '../../../src/lib/store/query';
import type { PostRecord, StoredAuthor, StoreExport } from '../../../src/lib/store/model';
import { sighting } from './helpers';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  vi.stubGlobal('location', { protocol: 'chrome-extension:' });
});

afterEach(async () => {
  await closeDatabase();
  vi.unstubAllGlobals();
});

describe('Hall of Slop IndexedDB', () => {
  it('drops zero-count histogram bins on import and preserves a reimportable maximum', async () => {
    const s = sighting('zero-bins', 40);
    await recordSightings([s]);
    const snapshot = JSON.parse(await (await exportData()).text()) as StoreExport;
    snapshot.authors[0]!.scoreCounts = { 0: 0, 40: 1, 100: 0 };
    await importSnapshot(JSON.stringify(snapshot));
    await recordSightings([{ ...s, seenAt: s.seenAt + 1 }]);
    expect(await getAuthor(s.author.id)).toMatchObject({ maxScore: 40, totalScore: 40 });
    const exported = JSON.parse(await (await exportData()).text()) as StoreExport;
    expect(exported.authors[0]!.scoreCounts).toEqual({ 40: 1 });
    await expect(importSnapshot(JSON.stringify(exported))).resolves.toBeUndefined();
  });

  it('ignores legacy zero-count bins when recomputing the maximum', async () => {
    const s = sighting('legacy-zero', 40);
    await recordSightings([s]);
    await transaction('readwrite', async (tx) => {
      const authors = tx.objectStore('authors');
      const author = await requestResult<StoredAuthor>(authors.get(s.author.id));
      author.scoreCounts[100] = 0;
      await requestResult(authors.put(author));
    });
    await recordSightings([{ ...s, seenAt: s.seenAt + 1 }]);
    expect((await getAuthor(s.author.id))!.maxScore).toBe(40);
  });

  it('migrates an empty database and reopens after the worker connection closes', async () => {
    const db = await openDatabase();
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames]).toEqual(['authors', 'posts']);
    const tx = db.transaction(['authors', 'posts']);
    expect(tx.objectStore('authors').keyPath).toBe('id');
    expect([...tx.objectStore('authors').indexNames]).toEqual(['lastSeen', 'leaderboard', 'slopPoints']);
    expect(tx.objectStore('posts').keyPath).toBe('postId');
    expect(await getStats()).toEqual({ authorsTracked: 0, postsScanned: 0, slopPostsSeen: 0, destroyed: 0, shamed: 0, avgScore: 0 });
    await recordSightings([sighting()]);
    await closeDatabase();
    expect((await getAuthor('in/alice'))?.postsSeen).toBe(1);
  });

  it('refuses to open on the host page origin', async () => {
    vi.stubGlobal('location', { protocol: 'https:' });
    await expect(openDatabase()).rejects.toThrow('extension context');
  });

  it('reopens lazily after an unexpected connection close', async () => {
    await recordSightings([sighting()]);
    // fake-indexeddb 6.2.6 declares a constructor here, but takes an instance.
    forceCloseDatabase(await openDatabase() as unknown as Parameters<typeof forceCloseDatabase>[0]);
    expect((await getAuthor('in/alice'))!.postsSeen).toBe(1);
  });

  it('dedupes within and between batches and keeps identity metadata current', async () => {
    const s = sighting();
    await recordSightings([s, s]);
    await recordSightings([{ ...s, seenAt: s.seenAt + 1, author: { ...s.author, name: 'New name', headline: 'Thought leader' } }]);
    expect(await getAuthor(s.author.id)).toMatchObject({ name: 'New name', headline: 'Thought leader', postsSeen: 1, slopPosts: 1, totalScore: 80, maxScore: 80, categoryCounts: { 'ai-vocabulary': 1 } });
    expect(await getAuthorPosts(s.author.id, 10)).toHaveLength(1);
    expect(await getAuthor(s.author.id)).not.toHaveProperty('scoreCounts');
  });

  it('adjusts scores, tiers, categories and worst post by delta in either direction', async () => {
    const now = Date.now();
    await recordSightings([sighting('a', 90, 'alice', now), sighting('b', 70, 'alice', now)]);
    const initial = (await getAuthor('alice'))!;
    await recordSightings([{ ...sighting('a', 20, 'alice', now + 1), topCategory: 'robotic-rhythm' }]);
    expect(await getAuthor('alice')).toMatchObject({ postsSeen: 2, slopPosts: 1, totalScore: 90, maxScore: 70, worstPost: { postId: 'b', score: 70 }, categoryCounts: { 'ai-vocabulary': 1, 'robotic-rhythm': 1 } });
    expect((await getAuthor('alice'))!.slopPoints).toBeLessThan(initial.slopPoints);
    await recordSightings([{ ...sighting('a', 100, 'alice', now + 2), snippet: 'x'.repeat(300), topCategory: null }]);
    expect(await getAuthor('alice')).toMatchObject({ postsSeen: 2, slopPosts: 2, totalScore: 170, maxScore: 100, worstPost: { postId: 'a', score: 100, snippet: 'x'.repeat(200) }, categoryCounts: { 'ai-vocabulary': 1 } });
    // Late stale messages cannot undo a hydrated report.
    await recordSightings([sighting('a', 10, 'alice', now)]);
    expect((await getAuthor('alice'))!.totalScore).toBe(170);
  });

  it('counts actions once per post and preserves flags on re-sighting', async () => {
    const s = sighting();
    await recordSightings([s]);
    expect(await recordAction(s.postId, 'wrong-author', 'destroyed')).toBe(false);
    expect(await recordAction('missing-post', s.author.id, 'shamed')).toBe(false);
    await Promise.all([
      recordAction(s.postId, s.author.id, 'destroyed'), recordAction(s.postId, s.author.id, 'destroyed'),
      recordAction(s.postId, s.author.id, 'shamed'), recordAction(s.postId, s.author.id, 'shamed'),
    ]);
    await recordSightings([s]);
    expect(await getAuthor(s.author.id)).toMatchObject({ destroyedCount: 1, shamedCount: 1 });
    expect((await getAuthorPosts(s.author.id, 1))[0]).toMatchObject({ destroyed: true, shamed: true });
    expect(await getStats()).toMatchObject({ destroyed: 1, shamed: 1 });
  });

  it('serializes concurrent batches and skips bad sightings without blocking good ones', async () => {
    await Promise.all([recordSightings([sighting('a')]), recordSightings([sighting('b')])]);
    expect((await getAuthor('in/alice'))!.postsSeen).toBe(2);
    await recordSightings([sighting('fresh'), sighting('a', 90, 'other-author'), {} as never]);
    expect((await getAuthor('in/alice'))!.postsSeen).toBe(3);
    expect(await getAuthorPosts('in/alice', 10)).toHaveLength(3);
    expect(await getAuthor('other-author')).toBeNull();
    await expect(transaction('readwrite', async (tx) => {
      await requestResult(tx.objectStore('authors').delete('in/alice'));
      throw new Error('Abort after mutation');
    })).rejects.toThrow('Abort after mutation');
    expect((await getAuthor('in/alice'))!.postsSeen).toBe(3);
  });

  it('sorts by points, then max score, and supports pagination and recent posts', async () => {
    const now = Date.now();
    const posts = (author: string, ...scores: number[]) => scores.map((score, i) => sighting(`${author}-${i}`, score, author, now - 10 + i));
    await recordSightings([
      // 48,48,48 and 48,48,49 both round to 13 points; maximum breaks the tie.
      ...posts('alice', 48, 48, 48), ...posts('bob', 48, 48, 49),
      ...posts('charlie', 90, 90, 90), sighting('d', 0, 'charlie', now + 1), sighting('clean', 0, 'human', now),
    ]);
    expect((await getLeaderboard(10)).map((a) => a.id)).toEqual(['charlie', 'bob', 'alice']);
    expect((await getLeaderboard(1, 1)).map((a) => a.id)).toEqual(['bob']);
    expect(await getLeaderboard(0)).toEqual([]);
    expect(await getAuthor('missing')).toBeNull();
    expect((await getAuthorPosts('charlie', 2)).map((p) => p.postId)).toEqual(['d', 'charlie-2']);
    expect(await getStats()).toMatchObject({ authorsTracked: 4, postsScanned: 11, slopPostsSeen: 9, avgScore: 559 / 11 });
  });

  it('names nobody in the Hall without a sample: 3+ slop posts, at least half of what we saw', async () => {
    const now = Date.now();
    const posts = (author: string, ...scores: number[]) => scores.map((score, i) => sighting(`${author}-${i}`, score, author, now + i));
    await recordSightings([
      ...posts('one-bad-day', 100), // the worst post, but only one
      ...posts('two-strikes', 95, 95), // still too small a sample
      ...posts('mostly-fine', 70, 70, 70, 0, 0, 0, 0), // 3 of 7: slop is not their habit
      ...posts('habitual', 45, 45, 45, 0, 0, 0), // 3 of 6: half counts
    ]);
    expect((await getLeaderboard(10)).map((a) => a.id)).toEqual(['habitual']);
    // Points still accrue for everyone, so a later slop post can tip them in.
    expect((await getAuthor('one-bad-day'))!.slopPoints).toBeGreaterThan((await getAuthor('habitual'))!.slopPoints);
    await recordSightings(posts('two-strikes', 95, 95, 95).map((s, i) => ({ ...s, postId: `late-${i}` })).slice(0, 1));
    expect((await getLeaderboard(10)).map((a) => a.id)).toEqual(['two-strikes', 'habitual']);
  });

  it('prunes expired details while retaining all aggregates and the archived worst', async () => {
    const now = Date.now();
    const old = now - POST_RETENTION_MS - 1;
    await recordSightings([sighting('old', 100, 'alice', old)], old);
    await recordAction('old', 'alice', 'destroyed');
    const before = (await getAuthor('alice'))!;
    await recordSightings([], now);
    expect(await getAuthor('alice')).toEqual(before);
    expect(await getAuthorPosts('alice', 10)).toEqual([]);
    await recordSightings([sighting('new', 60, 'alice', now)]);
    expect(await getAuthor('alice')).toMatchObject({ postsSeen: 2, totalScore: 160, maxScore: 100, destroyedCount: 1, worstPost: { postId: 'old', score: 100 } });
    const blob = await exportData();
    await importSnapshot(await blob.text());
    expect((await getAuthor('alice'))!.postsSeen).toBe(2);
  });

  it('bounds post rows at 20,000, oldest first, without losing aggregates', async () => {
    const now = Date.now();
    await recordSightings([sighting('seed', 40, 'alice', now)]);
    // Seed a large valid snapshot efficiently in one transaction.
    await transaction('readwrite', async (tx) => {
      const authors = tx.objectStore('authors');
      const posts = tx.objectStore('posts');
      const author = (await requestResult<StoredAuthor>(authors.get('alice')));
      const post = await requestResult<PostRecord>(posts.get('seed'));
      for (let i = 0; i < MAX_POSTS; i++) posts.put({ ...post, postId: `bulk-${i}`, firstSeen: now + i + 1, lastSeen: now + i + 1 });
      author.postsSeen = MAX_POSTS + 1;
      author.slopPosts = MAX_POSTS + 1;
      author.totalScore = 40 * (MAX_POSTS + 1);
      author.scoreCounts = { 40: MAX_POSTS + 1 };
      author.categoryCounts = { 'ai-vocabulary': MAX_POSTS + 1 };
      authors.put(author);
    });
    const before = await getAuthor('alice');
    await recordSightings([], now);
    expect(await getAuthor('alice')).toEqual(before);
    const exported = JSON.parse(await (await exportData()).text()) as StoreExport;
    expect(exported.posts).toHaveLength(MAX_POSTS);
    expect(exported.posts.some((p) => p.postId === 'seed')).toBe(false);
    expect(exported.posts.some((p) => p.postId === `bulk-${MAX_POSTS - 1}`)).toBe(true);
  }, 15_000);

  it('exports/imports exactly, rejects corrupt imports atomically, then clears', async () => {
    await recordSightings([sighting('a', 80, 'alice'), sighting('a2', 80, 'alice'), sighting('a3', 80, 'alice'), sighting('b', 10, 'bob')]);
    await recordAction('a', 'alice', 'shamed');
    const leaderboard = await getLeaderboard(10);
    expect(leaderboard).toHaveLength(1);
    const stats = await getStats();
    const blob = await exportData();
    expect(blob.type).toBe('application/json');
    const json = await blob.text();
    await clearStore();
    expect((await getStats()).authorsTracked).toBe(0);
    await importSnapshot(json);
    expect(await getLeaderboard(10)).toEqual(leaderboard);
    expect(await getStats()).toEqual(stats);
    const corrupt = JSON.parse(json) as StoreExport;
    corrupt.authors[0]!.totalScore++;
    await expect(importSnapshot(JSON.stringify(corrupt))).rejects.toThrow('aggregates');
    await expect(importSnapshot('{')).rejects.toThrow();
    await expect(importSnapshot('{"version":99}')).rejects.toThrow('Unsupported');
    expect(await getStats()).toEqual(stats);
    await clearStore();
    expect(await getLeaderboard(10)).toEqual([]);
    expect(await getAuthorPosts('alice', 10)).toEqual([]);
  });

  it('normalizes imported fields and rejects retained tier counts exceeding their author totals', async () => {
    await recordSightings([sighting()]);
    const snapshot = JSON.parse(await (await exportData()).text()) as StoreExport;
    Object.assign(snapshot.authors[0]!, { unexpected: 'discard' });
    Object.assign(snapshot.authors[0]!.worstPost!, { unexpected: 'discard' });
    Object.assign(snapshot.posts[0]!, { unexpected: 'discard' });
    await importSnapshot(JSON.stringify(snapshot));
    const normalized = JSON.parse(await (await exportData()).text()) as StoreExport;
    expect(normalized.authors[0]).not.toHaveProperty('unexpected');
    expect(normalized.authors[0]!.worstPost).not.toHaveProperty('unexpected');
    expect(normalized.posts[0]).not.toHaveProperty('unexpected');
    normalized.authors[0]!.slopocalypsePosts = 0;
    normalized.authors[0]!.slopPoints -= 3;
    await expect(importSnapshot(JSON.stringify(normalized))).rejects.toThrow('Posts exceed');
  });
});

describe('canonical author ids', () => {
  /** A snapshot that splits one author across two spellings, as v1 could store it. */
  async function splitSnapshot(): Promise<StoreExport> {
    const now = Date.now();
    await recordSightings([sighting('a', 80, 'in/jane-doe', now), sighting('b', 60, 'in/jane-doe', now + 1), sighting('c', 45, 'in/alias', now + 2)]);
    await recordAction('a', 'in/jane-doe', 'destroyed');
    await recordAction('c', 'in/alias', 'shamed');
    const snapshot = JSON.parse(await (await exportData()).text()) as StoreExport;
    for (const author of snapshot.authors) if (author.id === 'in/alias') Object.assign(author, { id: 'in/Jane-Doe', name: 'Jane Doe' });
    for (const post of snapshot.posts) if (post.authorId === 'in/alias') post.authorId = 'in/Jane-Doe';
    await clearStore();
    return snapshot;
  }

  function expectMerged(author: Awaited<ReturnType<typeof getAuthor>>) {
    expect(author).toMatchObject({
      id: 'in/jane-doe', name: 'Jane Doe', postsSeen: 3, slopPosts: 3, totalScore: 185, maxScore: 80,
      destroyedCount: 1, shamedCount: 1, worstPost: { postId: 'a', score: 80 },
    });
  }

  it('keeps one record, one Hall entry and working actions across percent-encoding and case', async () => {
    const now = Date.now();
    await recordSightings([sighting('a', 80, 'in/Jane-Doe', now), sighting('b', 60, 'in/%6Aane-doe', now), sighting('c', 45, 'in/jane-doe', now)]);
    expect(await getAuthor('in/JANE-DOE')).toMatchObject({ id: 'in/jane-doe', postsSeen: 3, slopPosts: 3 });
    expect((await getLeaderboard(10)).map((author) => author.id)).toEqual(['in/jane-doe']);
    expect(await recordAction('a', 'in/jane-doe', 'destroyed')).toBe(true);
    // Replies name actions exactly as the caller spelled them.
    const reply = await recordBatch([], [{ postId: 'b', authorId: 'in/JANE-doe', action: 'shamed' }, { postId: 'later', authorId: 'in/Jane-Doe', action: 'shamed' }]);
    expect(reply.pendingActions).toEqual([{ postId: 'later', authorId: 'in/Jane-Doe', action: 'shamed' }]);
    expect(await getAuthor('in/jane-doe')).toMatchObject({ destroyedCount: 1, shamedCount: 1 });
    // A re-score under another spelling updates the same post.
    await recordSightings([sighting('c', 90, 'in/JANE-DOE', now + 1)]);
    expect(await getAuthor('in/jane-doe')).toMatchObject({ postsSeen: 3, maxScore: 90 });
    expect((await getAuthorPosts('in/Jane-Doe', 10)).map((post) => post.postId).sort()).toEqual(['a', 'b', 'c']);
  });

  it('merges a v1 database\'s alias records exactly when it upgrades', async () => {
    const snapshot = await splitSnapshot();
    await closeDatabase();
    vi.stubGlobal('indexedDB', new IDBFactory());
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        migrateDatabase(request.result, request.transaction!, 0);
        for (const author of snapshot.authors) request.transaction!.objectStore('authors').put(author);
        for (const post of snapshot.posts) request.transaction!.objectStore('posts').put(post);
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
    expect((await openDatabase()).version).toBe(2);
    expectMerged(await getAuthor('in/Jane-Doe'));
    expect((await getStats()).authorsTracked).toBe(1);
    expect((await getAuthorPosts('in/jane-doe', 10)).map((post) => post.postId).sort()).toEqual(['a', 'b', 'c']);
    expect((await getLeaderboard(10)).map((author) => author.id)).toEqual(['in/jane-doe']);
    // The merged aggregates are consistent enough to round-trip through import.
    await expect(importSnapshot(await (await exportData()).text())).resolves.toBeUndefined();
    expectMerged(await getAuthor('in/jane-doe'));
  });

  it('merges alias records in an older export on import', async () => {
    const snapshot = await splitSnapshot();
    await importSnapshot(JSON.stringify(snapshot));
    expectMerged(await getAuthor('in/jane-doe'));
    expect((await getStats()).authorsTracked).toBe(1);
    expect((await getAuthorPosts('in/jane-doe', 10)).map((post) => post.postId).sort()).toEqual(['a', 'b', 'c']);
  });
});
