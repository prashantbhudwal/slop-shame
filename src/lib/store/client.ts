import type { AuthorRecord, PostSighting, StoreMessage, UserAction } from './types';
import { requestStore, StoreRequestError } from './transport';

const BATCH_SIZE = 25;
const FLUSH_MS = 2_000;
const pending = new Map<string, PostSighting>();
// Bounded metadata cache lets an action re-report a visible post after clearing
// the database. Unlike DOM elements these plain snapshots cannot detach a tree.
const recentSightings = new Map<string, PostSighting>();
// Track the latest score rather than every historical score: 40 -> 80 -> 40
// must send the final correction too. This cache contains no DOM references.
const lastScore = new Map<string, number>();
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
  lastScore.clear();
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
        lastScore.clear();
        pending.clear();
        generation++;
      }
    });
  } catch (error) {
    if (!handleInvalidation(error)) throw error;
  }
}

function schedule(): void {
  if (!stopped && pending.size && timer === undefined) {
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

export function reportSighting(sighting: PostSighting): void {
  if (!stopped) listenForReset();
  if (stopped) return;
  recentSightings.delete(sighting.postId);
  recentSightings.set(sighting.postId, sighting);
  if (recentSightings.size > 500) recentSightings.delete(recentSightings.keys().next().value!);
  if (stopped || lastScore.get(sighting.postId) === sighting.score) return;
  lastScore.set(sighting.postId, sighting.score);
  pending.set(sighting.postId, sighting);
  if (pending.size >= BATCH_SIZE) void flushSightings().catch(() => {});
  else schedule();
}

/** Also useful before a content-script action or an explicit lifecycle flush. */
export function flushSightings(): Promise<void> {
  if (flushing) return flushing;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  flushing = (async () => {
    while (!stopped && pending.size) {
      const batch = [...pending.values()].slice(0, BATCH_SIZE);
      const batchGeneration = generation;
      for (const item of batch) pending.delete(item.postId);
      try {
        await send({ type: 'store/sightings', sightings: batch });
      } catch (error) {
        if (batchGeneration !== generation) continue;
        if (error instanceof StoreRequestError && !error.retryable) {
          for (const item of batch) if (lastScore.get(item.postId) === item.score) lastScore.delete(item.postId);
          continue;
        }
        for (const item of batch) if (!pending.has(item.postId)) pending.set(item.postId, item);
        throw error;
      }
    }
  })().finally(() => { flushing = undefined; schedule(); });
  return flushing;
}

export async function reportAction(postId: string, authorId: string, action: UserAction): Promise<void> {
  const recent = recentSightings.get(postId);
  if (recent && recent.author.id === authorId) reportSighting(recent);
  // Try to persist first sightings, but an unrelated transient failure should
  // not prevent actions on posts that are already stored.
  await flushSightings().catch(() => {});
  await send({ type: 'store/action', postId, authorId, action });
}

export async function getAuthor(authorId: string): Promise<AuthorRecord | null> {
  await flushSightings().catch(() => {});
  return (await send<AuthorRecord | null>({ type: 'store/author', authorId })) ?? null;
}
