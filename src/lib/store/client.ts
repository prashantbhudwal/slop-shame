import type { AuthorRecord, PostAction, PostSighting, StoreBatchReply, StoreMessage, UserAction } from './types';
import { requestStore, StoreRequestError } from './transport';

const BATCH_SIZE = 25;
const FLUSH_MS = 2_000;
const REFRESH_MS = 5 * 60_000;
const DEDUPE_SIZE = 2_000;
const pending = new Map<string, PostSighting>();
// Bounded metadata cache lets an action re-report a visible post after clearing
// the database. Unlike DOM elements these plain snapshots cannot detach a tree.
const recentSightings = new Map<string, PostSighting>();
// LRU entries contain only data. IDB still dedupes posts evicted from this cache.
const lastReported = new Map<string, { signature: string; reportedAt: number }>();
interface PendingAction { value: PostAction; sighting?: PostSighting }
// Keep actions until an explicit durable acknowledgement, including across retries.
const pendingActions = new Map<string, PendingAction>();
let timer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | undefined;
let stopped = false;
let listening = false;
let generation = 0;

function handleInvalidation(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  if (!/extension context invalidated/i.test(detail)) return false;
  stopped = true;
  pending.clear();
  pendingActions.clear();
  lastReported.clear();
  recentSightings.clear();
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  return true;
}

function listenForReset(): void {
  if (listening) return;
  listening = true;
  try {
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message && message.type === 'store/reset') {
        lastReported.clear();
        pending.clear();
        generation++;
        schedule();
      }
    });
  } catch (error) {
    if (!handleInvalidation(error)) throw error;
  }
}

function schedule(): void {
  if (!stopped && (pending.size || pendingActions.size) && timer === undefined) {
    timer = setTimeout(() => {
      timer = undefined;
      void flushSightings().catch(() => { /* Pending sightings retry next tick. */ });
    }, FLUSH_MS);
  }
}

async function send<T>(message: StoreMessage): Promise<T | undefined> {
  if (stopped) return undefined;
  try {
    return await requestStore<T>(message);
  } catch (error) {
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
  if (!stopped) listenForReset();
  if (stopped) return;
  // Snapshot mutable adapter data so later caller edits cannot alter an in-flight batch.
  const snapshot = { ...sighting, author: { ...sighting.author }, snippet: sighting.snippet.slice(0, 200) };
  recentSightings.delete(snapshot.postId);
  recentSightings.set(snapshot.postId, snapshot);
  if (recentSightings.size > 500) recentSightings.delete(recentSightings.keys().next().value!);
  let actionWaiting = false;
  if (pendingActions.size) {
    for (const action of ['destroyed', 'shamed'] as const) {
      const waiting = pendingActions.get(actionKey({ postId: snapshot.postId, authorId: snapshot.author.id, action }));
      if (waiting) { waiting.sighting = snapshot; actionWaiting = true; }
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
  pending.set(snapshot.postId, snapshot);
  if (pending.size >= BATCH_SIZE) void flushSightings().catch(() => {});
  else schedule();
}

function restoreActionSightings(): void {
  for (const { sighting } of pendingActions.values()) {
    if (sighting && !pending.has(sighting.postId)) {
      pending.set(sighting.postId, { ...sighting, seenAt: Math.max(sighting.seenAt, Date.now()) });
    }
  }
}

/** Also useful before a content-script action or an explicit lifecycle flush. */
export function flushSightings(): Promise<void> {
  if (flushing) return flushing;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  flushing = (async () => {
    restoreActionSightings();
    const attempted = new Set<PendingAction>();
    while (!stopped && (pending.size || pendingActions.size)) {
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
        });
        if (batchGeneration !== generation) {
          attempted.clear();
          restoreActionSightings();
          continue;
        }
        if (reply?.ok && Array.isArray(reply.pendingActions)) {
          const unresolved = new Set(reply.pendingActions.map(actionKey));
          for (const entry of actions) {
            const key = actionKey(entry.value);
            if (!unresolved.has(key) && pendingActions.get(key) === entry) pendingActions.delete(key);
          }
        }
      } catch (error) {
        if (batchGeneration !== generation) {
          attempted.clear();
          restoreActionSightings();
          continue;
        }
        if (error instanceof StoreRequestError && !error.retryable) {
          for (const item of batch) {
            if (lastReported.get(item.postId)?.signature === signature(item)) lastReported.delete(item.postId);
          }
          if (!actions.length) continue;
        } else {
          for (const item of batch) if (!pending.has(item.postId)) pending.set(item.postId, item);
        }
        // Actions remain pending even for permanent storage errors; surface the
        // error to the caller and retain their target snapshots for a later retry.
        throw error;
      }
    }
  })().finally(() => { flushing = undefined; schedule(); });
  return flushing;
}

export async function reportAction(postId: string, authorId: string, action: UserAction): Promise<void> {
  if (!stopped) listenForReset();
  if (stopped) return;
  const value = { postId, authorId, action };
  const key = actionKey(value);
  const entry: PendingAction = pendingActions.get(key) ?? { value };
  const recent = recentSightings.get(postId);
  if (recent?.author.id === authorId) entry.sighting = recent;
  pendingActions.set(key, entry);
  await flushSightings();
}

export async function getAuthor(authorId: string): Promise<AuthorRecord | null> {
  await flushSightings().catch(() => {});
  return (await send<AuthorRecord | null>({ type: 'store/author', authorId })) ?? null;
}
