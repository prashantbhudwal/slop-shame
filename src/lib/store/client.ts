import type { AuthorRecord, PostAction, PostSighting, StoreBatchReply, StoreMessage, UserAction } from './types';
import { requestStore, StoreRequestError } from './transport';
import { validateAction, validateSighting } from './validation';
import { MAX_PENDING_ACTIONS, MAX_PENDING_SIGHTINGS, SNIPPET_LENGTH } from './limits';

const BATCH_SIZE = 25;
const FLUSH_MS = 2_000;
const REFRESH_MS = 5 * 60_000;
const DEDUPE_SIZE = 2_000;
const MAX_RETRY_MS = 60_000;
const MAX_MISSING_ATTEMPTS = 5;
const pending = new Map<string, PostSighting>();
// Bounded metadata cache lets an action re-report a visible post after clearing
// the database. Unlike DOM elements these plain snapshots cannot detach a tree.
const recentSightings = new Map<string, PostSighting>();
// LRU entries contain only data. IDB still dedupes posts evicted from this cache.
const lastReported = new Map<string, { signature: string; reportedAt: number }>();
interface PendingAction { value: PostAction; sighting?: PostSighting; missingAttempts: number }
// Durable acknowledgements, terminal rejections, retry limits and caps bound retention.
const pendingActions = new Map<string, PendingAction>();
let timer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | undefined;
let stopped = false;
let disposed = false;
let resetListener: ((message: unknown) => void) | undefined;
let lifetime = 0;
let failures = 0;
let retryAt = 0;
let generation = 0;

function handleInvalidation(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  if (!/extension context invalidated/i.test(detail)) return false;
  disposeStoreClient();
  stopped = true;
  return true;
}

/** Disable/unmount cleanup. A later report starts a fresh session on re-enable. */
export function disposeStoreClient(): void {
  disposed = true;
  lifetime++;
  generation++;
  pending.clear();
  pendingActions.clear();
  lastReported.clear();
  recentSightings.clear();
  failures = 0;
  retryAt = 0;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  flushing = undefined;
  if (resetListener) {
    try { browser.runtime.onMessage.removeListener?.(resetListener); } catch { /* Context may already be gone. */ }
    resetListener = undefined;
  }
}

function listenForReset(): void {
  if (resetListener) return;
  resetListener = (message: unknown) => {
    if (!disposed && !stopped && message && typeof message === 'object' && 'type' in message && message.type === 'store/reset') {
      lastReported.clear();
      pending.clear();
      generation++;
      schedule();
    }
  };
  try {
    browser.runtime.onMessage.addListener(resetListener);
  } catch (error) {
    resetListener = undefined;
    if (!handleInvalidation(error)) throw error;
  }
}

function activate(): boolean {
  if (stopped) return false;
  disposed = false;
  listenForReset();
  return !stopped;
}

function backoff(): void {
  failures = Math.min(failures + 1, 6);
  retryAt = Date.now() + Math.min(MAX_RETRY_MS, FLUSH_MS * 2 ** (failures - 1));
}

function queueSighting(sighting: PostSighting): void {
  pending.delete(sighting.postId);
  pending.set(sighting.postId, sighting);
  while (pending.size > MAX_PENDING_SIGHTINGS) {
    const key = pending.keys().next().value!;
    pending.delete(key);
    lastReported.delete(key);
  }
}

function schedule(): void {
  if (!stopped && !disposed && (pending.size || pendingActions.size) && timer === undefined) {
    timer = setTimeout(() => {
      timer = undefined;
      void flush(false).catch(() => { /* Bounded queues retry with backoff. */ });
    }, Math.max(FLUSH_MS, retryAt - Date.now()));
  }
}

async function send<T>(message: StoreMessage, session = lifetime): Promise<T | undefined> {
  if (stopped || disposed) return undefined;
  try {
    const reply = await requestStore<T>(message);
    return session === lifetime && !disposed ? reply : undefined;
  } catch (error) {
    if (session !== lifetime) return undefined;
    if (!handleInvalidation(error)) throw error;
    return undefined;
  }
}

function actionKey(action: PostAction): string {
  return JSON.stringify([action.postId, action.authorId, action.action]);
}

function signature(s: PostSighting): string {
  return JSON.stringify([
    s.score, s.tierId, s.topCategory, s.snippet,
    s.author.id, s.author.name, s.author.kind, s.author.headline, s.author.profileUrl, s.author.avatarUrl,
  ]);
}

export function reportSighting(sighting: PostSighting): void {
  if (!activate()) return;
  // Snapshot mutable adapter data so later caller edits cannot alter an in-flight batch.
  try { validateSighting(sighting); } catch { return; }
  const snapshot: PostSighting = {
    postId: sighting.postId, score: sighting.score, tierId: sighting.tierId,
    topCategory: sighting.topCategory, seenAt: sighting.seenAt, snippet: sighting.snippet.slice(0, SNIPPET_LENGTH),
    author: {
      id: sighting.author.id, name: sighting.author.name, kind: sighting.author.kind,
      headline: sighting.author.headline, profileUrl: sighting.author.profileUrl, avatarUrl: sighting.author.avatarUrl,
    },
  };
  recentSightings.delete(snapshot.postId);
  recentSightings.set(snapshot.postId, snapshot);
  if (recentSightings.size > 500) recentSightings.delete(recentSightings.keys().next().value!);
  let actionWaiting = false;
  if (pendingActions.size) {
    for (const action of ['destroyed', 'shamed'] as const) {
      const waiting = pendingActions.get(actionKey({ postId: snapshot.postId, authorId: snapshot.author.id, action }));
      if (waiting) { waiting.sighting = snapshot; waiting.missingAttempts = 0; actionWaiting = true; }
    }
  }
  const previous = lastReported.get(snapshot.postId);
  const nextSignature = signature(snapshot);
  const now = Date.now();
  const report = actionWaiting || previous?.signature !== nextSignature || now - previous.reportedAt >= REFRESH_MS;
  lastReported.delete(snapshot.postId);
  lastReported.set(snapshot.postId, { signature: nextSignature, reportedAt: report ? now : previous!.reportedAt });
  if (lastReported.size > DEDUPE_SIZE) lastReported.delete(lastReported.keys().next().value!);
  if (!report) return;
  queueSighting(snapshot);
  if (pending.size >= BATCH_SIZE && Date.now() >= retryAt) void flush(false).catch(() => {});
  else schedule();
}

function restoreActionSightings(): void {
  for (const { sighting } of pendingActions.values()) {
    if (sighting && !pending.has(sighting.postId)) {
      queueSighting({ ...sighting, seenAt: Math.max(sighting.seenAt, Date.now()) });
    }
  }
}

/** Also useful before a content-script action or an explicit lifecycle flush. */
export function flushSightings(): Promise<void> {
  return flush(true);
}

function flush(force: boolean): Promise<void> {
  if (stopped || disposed) return Promise.resolve();
  if (!force && Date.now() < retryAt) { schedule(); return Promise.resolve(); }
  if (flushing) return flushing;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  const session = lifetime;
  const operation = (async () => {
    restoreActionSightings();
    const attempted = new Set<PendingAction>();
    let unresolved = false;
    while (!stopped && session === lifetime && (pending.size || pendingActions.size)) {
      const batch: PostSighting[] = [];
      for (const item of pending.values()) { batch.push(item); if (batch.length >= BATCH_SIZE) break; }
      const ids = new Set(batch.map((item) => item.postId));
      const actions: PendingAction[] = [];
      for (const entry of pendingActions.values()) {
        if (attempted.has(entry) && !ids.has(entry.value.postId)) continue;
        // A target still waiting for its first upsert belongs in a later batch.
        if (pending.has(entry.value.postId) && !ids.has(entry.value.postId)) continue;
        actions.push(entry);
        if (actions.length >= BATCH_SIZE) break;
      }
      // Unknown targets are attempted once per flush, then wait for a sighting or timer.
      if (!batch.length && !actions.length) break;
      const batchGeneration = generation;
      for (const item of batch) pending.delete(item.postId);
      for (const entry of actions) attempted.add(entry);
      try {
        const reply = await send<StoreBatchReply>({
          type: 'store/sightings', sightings: batch,
          ...(actions.length ? { actions: actions.map((entry) => entry.value) } : {}),
        }, session);
        if (session !== lifetime) return;
        if (batchGeneration !== generation) {
          attempted.clear();
          restoreActionSightings();
          continue;
        }
        if (!reply?.ok || !Array.isArray(reply.pendingActions)) throw new Error('Missing store acknowledgement');
        const missing = new Set(reply.pendingActions.map(actionKey));
        const rejected = new Set((reply.rejectedActions ?? []).map(actionKey));
        for (const entry of actions) {
          const key = actionKey(entry.value);
          if (pendingActions.get(key) !== entry) { attempted.delete(entry); continue; }
          if (rejected.has(key) || !missing.has(key) || ++entry.missingAttempts >= MAX_MISSING_ATTEMPTS) {
            pendingActions.delete(key);
            attempted.delete(entry);
          } else unresolved = true;
        }
      } catch (error) {
        if (session !== lifetime) return;
        if (batchGeneration !== generation) {
          attempted.clear();
          restoreActionSightings();
          continue;
        }
        if (error instanceof StoreRequestError && !error.retryable) {
          for (const item of batch) {
            if (lastReported.get(item.postId)?.signature === signature(item)) lastReported.delete(item.postId);
          }
          for (const entry of actions) {
            const key = actionKey(entry.value);
            if (pendingActions.get(key) === entry) pendingActions.delete(key);
          }
          if (!actions.length) continue;
        } else {
          // Failed items are older than anything buffered during the request.
          const newer = [...pending.values()];
          pending.clear();
          for (const item of batch) queueSighting(item);
          for (const item of newer) queueSighting(item);
          backoff();
        }
        throw error;
      }
    }
    if (pendingActions.size && unresolved) backoff();
    else { failures = 0; retryAt = 0; }
  })().finally(() => {
    if (flushing === operation) { flushing = undefined; schedule(); }
  });
  flushing = operation;
  return operation;
}

export async function reportAction(postId: string, authorId: string, action: UserAction): Promise<void> {
  if (!activate()) return;
  const value = { postId, authorId, action };
  validateAction(value);
  const key = actionKey(value);
  const entry: PendingAction = pendingActions.get(key) ?? { value, missingAttempts: 0 };
  const recent = recentSightings.get(postId);
  if (recent?.author.id === authorId) entry.sighting = recent;
  pendingActions.set(key, entry);
  while (pendingActions.size > MAX_PENDING_ACTIONS) pendingActions.delete(pendingActions.keys().next().value!);
  await flush(false);
}

export async function getAuthor(authorId: string): Promise<AuthorRecord | null> {
  await flush(false).catch(() => {});
  return (await send<AuthorRecord | null>({ type: 'store/author', authorId })) ?? null;
}
