import { canonicalAuthorId } from '../linkedin/author-id';
import { collectCursor, requestResult, transaction } from './db';
import { publicAuthor } from './model';
import { inHall } from './ranking';
import type { PostRecord, StoredAuthor, StoreExport, StoreStats } from './model';
import type { AuthorRecord } from './types';

function pageSize(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/** The Hall of Slop: authors with a real sample of slop (see inHall), most points first. */
export async function getLeaderboard(limit: number, offset = 0): Promise<AuthorRecord[]> {
  const size = pageSize(limit);
  if (!size) return [];
  return transaction('readonly', async (tx) => {
    const rows = await collectCursor<StoredAuthor>(
      tx.objectStore('authors').index('leaderboard').openCursor(IDBKeyRange.lowerBound([1, 0]), 'prev'), size, pageSize(offset), inHall,
    );
    return rows.map(publicAuthor);
  });
}

export async function getAuthor(id: string): Promise<AuthorRecord | null> {
  return transaction('readonly', async (tx) => {
    const author = await requestResult<StoredAuthor | undefined>(tx.objectStore('authors').get(canonicalAuthorId(id)));
    return author ? publicAuthor(author) : null;
  });
}

/** Most recently seen retained posts first; author aggregates include pruned history. */
export async function getAuthorPosts(id: string, limit: number): Promise<PostRecord[]> {
  const size = pageSize(limit);
  if (!size) return [];
  const key = canonicalAuthorId(id);
  return transaction('readonly', (tx) => collectCursor<PostRecord>(
    tx.objectStore('posts').index('authorLastSeen').openCursor(IDBKeyRange.bound([key, 0], [key, Infinity]), 'prev'), size,
  ));
}

export async function getStats(): Promise<StoreStats> {
  return transaction('readonly', async (tx) => {
    const authors = await requestResult<StoredAuthor[]>(tx.objectStore('authors').getAll());
    const stats: StoreStats = { authorsTracked: authors.length, postsScanned: 0, slopPostsSeen: 0, destroyed: 0, shamed: 0, avgScore: 0 };
    let total = 0;
    for (const author of authors) {
      stats.postsScanned += author.postsSeen;
      stats.slopPostsSeen += author.slopPosts;
      stats.destroyed += author.destroyedCount;
      stats.shamed += author.shamedCount;
      total += author.totalScore;
    }
    stats.avgScore = stats.postsScanned ? total / stats.postsScanned : 0;
    return stats;
  });
}

export async function exportData(): Promise<Blob> {
  return transaction('readonly', async (tx) => {
    const [authors, posts] = await Promise.all([
      requestResult<StoredAuthor[]>(tx.objectStore('authors').getAll()),
      requestResult<PostRecord[]>(tx.objectStore('posts').getAll()),
    ]);
    const snapshot: StoreExport = { format: 'slop-shame', version: 1, exportedAt: Date.now(), authors, posts };
    return new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
  });
}
