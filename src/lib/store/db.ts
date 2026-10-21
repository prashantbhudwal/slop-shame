import { canonicalAuthorId } from '../linkedin/author-id';
import { canonicalizeAuthors } from './aliases';
import type { PostRecord, StoredAuthor } from './model';

export const DB_NAME = 'slop-shame';
export const DB_VERSION = 2;
export const POST_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
export const MAX_POSTS = 20_000;

/** All schema changes belong here; future migrations branch on oldVersion. */
export function migrateDatabase(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  if (oldVersion < 1) {
    const authors = db.createObjectStore('authors', { keyPath: 'id' });
    authors.createIndex('slopPoints', 'slopPoints');
    authors.createIndex('lastSeen', 'lastSeen');
    authors.createIndex('leaderboard', ['slopPoints', 'maxScore']);
    const posts = db.createObjectStore('posts', { keyPath: 'postId' });
    posts.createIndex('lastSeen', 'lastSeen');
    posts.createIndex('authorId', 'authorId');
    posts.createIndex('authorScore', ['authorId', 'score']);
    posts.createIndex('authorLastSeen', ['authorId', 'lastSeen']);
  }
  if (oldVersion === 1) canonicalizeStoredAuthors(tx);
}

/**
 * v2: author ids became canonical. Re-key every author stored under another
 * spelling, merging aliases, and point their posts at the canonical id. Runs
 * inside the upgrade transaction: any failure aborts it and keeps v1 intact.
 */
function canonicalizeStoredAuthors(tx: IDBTransaction): void {
  const authors = tx.objectStore('authors');
  const posts = tx.objectStore('posts');
  void (async () => {
    const stored = await requestResult<StoredAuthor[]>(authors.getAll());
    const stale = stored.filter((author) => canonicalAuthorId(author.id) !== author.id);
    if (!stale.length) return;
    const groups = new Set(stale.map((author) => canonicalAuthorId(author.id)));
    const owned: PostRecord[] = [];
    for (const author of stale) owned.push(...await requestResult<PostRecord[]>(posts.index('authorId').getAll(author.id)));
    const merged = canonicalizeAuthors(stored.filter((author) => groups.has(canonicalAuthorId(author.id))), owned);
    for (const author of stale) await requestResult(authors.delete(author.id));
    for (const author of merged.authors) await requestResult(authors.put(author));
    for (const post of merged.posts) await requestResult(posts.put(post));
  })().catch(() => {
    try { tx.abort(); } catch { /* Already finished. */ }
  });
}

let connection: Promise<IDBDatabase> | undefined;

export function openDatabase(): Promise<IDBDatabase> {
  // Content scripts have the host page's location, even with extension APIs.
  if (!['chrome-extension:', 'moz-extension:'].includes(globalThis.location?.protocol)) {
    return Promise.reject(new Error('Hall of Slop storage requires an extension context'));
  }
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;
    request.onupgradeneeded = (event) => migrateDatabase(request.result, request.transaction!, event.oldVersion);
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => {
      blocked = true;
      connection = undefined;
      reject(new Error('Hall of Slop database upgrade is blocked by another extension page'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); connection = undefined; };
      db.onclose = () => { connection = undefined; };
      resolve(db);
    };
  });
  const pending = connection;
  void pending.catch(() => { if (connection === pending) connection = undefined; });
  return connection;
}

export async function closeDatabase(): Promise<void> {
  const pending = connection;
  connection = undefined;
  if (pending) await pending.then((db) => db.close(), () => {});
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function transaction<T>(
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  let db = await openDatabase();
  let tx: IDBTransaction;
  try {
    tx = db.transaction(['authors', 'posts'], mode);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error;
    connection = undefined;
    db = await openDatabase();
    tx = db.transaction(['authors', 'posts'], mode);
  }
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Hall of Slop transaction aborted'));
    tx.onerror = () => { /* onabort reports the final failure */ };
  });
  // Attach a rejection handler before running code that can abort the tx.
  void done.catch(() => {});
  try {
    const result = await run(tx);
    await done;
    return result;
  } catch (error) {
    try { tx.abort(); } catch { /* It may already have finished. */ }
    await done.catch(() => {});
    throw error;
  }
}

/** `keep` filters rows before `offset` and `limit` apply (offset counts kept rows). */
export function collectCursor<T>(request: IDBRequest<IDBCursorWithValue | null>, limit: number, offset = 0, keep?: (row: T) => boolean): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const rows: T[] = [];
    let skipped = false;
    let toSkip = offset;
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || rows.length >= limit) { resolve(rows); return; }
      if (keep) {
        const row = cursor.value as T;
        if (keep(row)) {
          if (toSkip > 0) toSkip--;
          else rows.push(row);
        }
      } else {
        if (offset > 0 && !skipped) { skipped = true; cursor.advance(offset); return; }
        rows.push(cursor.value as T);
      }
      if (rows.length >= limit) resolve(rows);
      else cursor.continue();
    };
  });
}
