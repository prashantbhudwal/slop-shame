// Background-only mutations. Page readers import query.ts instead.
import { MAX_POSTS, POST_RETENTION_MS, requestResult, transaction } from './db';
import type { PostRecord, StoredAuthor } from './model';
import { slopPoints } from './ranking';
import type { PostAction, PostSighting, UserAction } from './types';
import { SLOP_THRESHOLD } from './types';
import { parseExport, validateAction, validateSighting } from './validation';

function newAuthor(s: PostSighting): StoredAuthor {
  return {
    ...s.author, postsSeen: 0, slopPosts: 0, totalScore: 0, maxScore: 0, slopPoints: 0,
    categoryCounts: {}, destroyedCount: 0, shamedCount: 0,
    firstSeen: s.seenAt, lastSeen: s.seenAt, scoreCounts: {}, slopocalypsePosts: 0,
  };
}

function applyScore(author: StoredAuthor, post: PostRecord, delta: 1 | -1): void {
  author.totalScore += post.score * delta;
  author.slopPosts += post.score >= SLOP_THRESHOLD ? delta : 0;
  author.scoreCounts[post.score] = (author.scoreCounts[post.score] ?? 0) + delta;
  if (!author.scoreCounts[post.score]) delete author.scoreCounts[post.score];
  if (post.score >= SLOP_THRESHOLD && post.tierId === 'slopocalypse') author.slopocalypsePosts += delta;
  if (post.topCategory) {
    author.categoryCounts[post.topCategory] = (author.categoryCounts[post.topCategory] ?? 0) + delta;
    if (!author.categoryCounts[post.topCategory]) delete author.categoryCounts[post.topCategory];
  }
}

function rememberArchived(author: StoredAuthor, post: PostRecord): void {
  if (!author.archivedWorstPost || post.score > author.archivedWorstPost.score) {
    author.archivedWorstPost = { postId: post.postId, score: post.score, snippet: post.snippet };
  }
}

/** Retention removes detail only; all author counters and points are lifetime totals. */
async function prunePosts(tx: IDBTransaction, now: number, cache: Map<string, StoredAuthor>): Promise<boolean> {
  const posts = tx.objectStore('posts');
  const authors = tx.objectStore('authors');
  const remove = (range: IDBKeyRange | undefined, limit: number) => new Promise<number>((resolve, reject) => {
    let removed = 0;
    const request = posts.index('lastSeen').openCursor(range, 'next');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || removed >= limit) { resolve(removed); return; }
      const post = cursor.value as PostRecord;
      // Queue the next cursor movement only after persisting the archive marker.
      void (async () => {
        let author = cache.get(post.authorId);
        if (!author) author = await requestResult<StoredAuthor | undefined>(authors.get(post.authorId));
        if (author) {
          rememberArchived(author, post);
          cache.set(author.id, author);
          await requestResult(authors.put(author));
        }
        await requestResult(cursor.delete());
        removed++;
        cursor.continue();
      })().catch(reject);
    };
  });
  const expired = now > POST_RETENTION_MS
    ? await remove(IDBKeyRange.upperBound(now - POST_RETENTION_MS, true), Infinity) : 0;
  const overflow = (await requestResult(posts.count())) - MAX_POSTS;
  const excess = overflow > 0 ? await remove(undefined, overflow) : 0;
  return expired + excess > 0;
}

export async function recordSightings(sightings: PostSighting[], now = Date.now()): Promise<boolean> {
  return (await recordBatch(sightings, [], now)).wrote;
}

/** Upserts and actions commit together, so a retry can never observe half a batch. */
export async function recordBatch(
  sightings: PostSighting[], actions: PostAction[] = [], now = Date.now(),
): Promise<{ wrote: boolean; pendingActions: PostAction[] }> {
  // One malformed adapter result must not poison a whole batch and retry forever.
  const valid = sightings.filter((sighting) => {
    try { validateSighting(sighting); return true; } catch { return false; }
  });
  actions.forEach(validateAction);
  return transaction('readwrite', async (tx) => {
    const authors = tx.objectStore('authors');
    const posts = tx.objectStore('posts');
    const cache = new Map<string, StoredAuthor>();
    const pendingActions: PostAction[] = [];
    for (const s of valid) {
      const old = await requestResult<PostRecord | undefined>(posts.get(s.postId));
      if (old && old.authorId !== s.author.id) continue;
      let author = cache.get(s.author.id) ?? await requestResult<StoredAuthor | undefined>(authors.get(s.author.id));
      author ??= newAuthor(s);
      if (s.seenAt >= author.lastSeen) {
        author.name = s.author.name;
        author.kind = s.author.kind;
        for (const key of ['headline', 'profileUrl', 'avatarUrl'] as const) {
          if (s.author[key] !== undefined) author[key] = s.author[key];
        }
      }
      author.firstSeen = Math.min(author.firstSeen, s.seenAt);
      author.lastSeen = Math.max(author.lastSeen, s.seenAt);
      const post: PostRecord = old && s.seenAt < old.lastSeen
        ? { ...old, firstSeen: Math.min(old.firstSeen, s.seenAt) }
        : {
          postId: s.postId, authorId: s.author.id, score: s.score, tierId: s.tierId,
          topCategory: s.topCategory, snippet: s.snippet.slice(0, 200),
          firstSeen: old ? Math.min(old.firstSeen, s.seenAt) : s.seenAt,
          lastSeen: old ? Math.max(old.lastSeen, s.seenAt) : s.seenAt,
          ...(old?.destroyed ? { destroyed: true } : {}), ...(old?.shamed ? { shamed: true } : {}),
        };
      if (old) applyScore(author, old, -1);
      else author.postsSeen++;
      applyScore(author, post, 1);
      cache.set(author.id, author);
      await requestResult(posts.put(post));
    }
    for (const action of actions) {
      const post = await requestResult<PostRecord | undefined>(posts.get(action.postId));
      if (!post || post.authorId !== action.authorId) { pendingActions.push(action); continue; }
      if (post[action.action]) continue; // Already committed, including lost-ack retries.
      const author = cache.get(action.authorId)
        ?? await requestResult<StoredAuthor | undefined>(authors.get(action.authorId));
      if (!author) { pendingActions.push(action); continue; }
      post[action.action] = true;
      author[action.action === 'destroyed' ? 'destroyedCount' : 'shamedCount']++;
      cache.set(author.id, author);
      await requestResult(posts.put(post));
    }
    for (const author of cache.values()) {
      author.slopPoints = slopPoints(author);
      author.maxScore = Math.max(0, ...Object.entries(author.scoreCounts)
        .filter(([, n]) => (n ?? 0) > 0).map(([score]) => Number(score)));
      const range = IDBKeyRange.bound([author.id, 0], [author.id, 100]);
      const best = (await requestResult(posts.index('authorScore').openCursor(range, 'prev')))?.value as PostRecord | undefined;
      const archived = author.archivedWorstPost;
      author.worstPost = best && (!archived || best.score >= archived.score)
        ? { postId: best.postId, score: best.score, snippet: best.snippet } : archived;
      await requestResult(authors.put(author));
    }
    const pruned = await prunePosts(tx, now, cache);
    return { wrote: cache.size > 0 || pruned, pendingActions };
  });
}

export async function recordAction(postId: string, authorId: string, action: UserAction): Promise<boolean> {
  if (action !== 'destroyed' && action !== 'shamed') throw new Error('Invalid store action');
  return transaction('readwrite', async (tx) => {
    const posts = tx.objectStore('posts');
    const authors = tx.objectStore('authors');
    const post = await requestResult<PostRecord | undefined>(posts.get(postId));
    if (!post || post.authorId !== authorId || post[action]) return false;
    const author = await requestResult<StoredAuthor | undefined>(authors.get(authorId));
    if (!author) return false;
    post[action] = true;
    author[action === 'destroyed' ? 'destroyedCount' : 'shamedCount']++;
    await requestResult(posts.put(post));
    await requestResult(authors.put(author));
    return true;
  });
}

/** Import replaces the local snapshot atomically; merging would double-count history. */
export async function importSnapshot(json: string): Promise<void> {
  const snapshot = parseExport(json);
  await transaction('readwrite', async (tx) => {
    const authors = tx.objectStore('authors');
    const posts = tx.objectStore('posts');
    await requestResult(authors.clear());
    await requestResult(posts.clear());
    await Promise.all(snapshot.authors.map((author) => requestResult(authors.put(author))));
    await Promise.all(snapshot.posts.map((post) => requestResult(posts.put(post))));
    await prunePosts(tx, Date.now(), new Map());
  });
}

export async function clearStore(): Promise<void> {
  await transaction('readwrite', async (tx) => {
    await requestResult(tx.objectStore('authors').clear());
    await requestResult(tx.objectStore('posts').clear());
  });
}
