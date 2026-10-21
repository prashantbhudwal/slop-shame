// User settings, today's counters and remembered destroyed posts, all in
// browser.storage.local (shared by the content script, popup and Hall of Slop).

import { storage } from 'wxt/utils/storage';
import { readable, type Readable } from 'svelte/store';
import type { SlopTierId } from '../engine/types';
import { requestStore } from '../store/transport';

export interface Settings {
  /** Master switch. Off = no badges, no scoring. */
  enabled: boolean;
  /**
   * Posts at or above this tier get a badge; anything below gets nothing.
   * Absence of evidence is not evidence of absence: we only ever call slop.
   */
  minTier: SlopTierId;
  /** Synthesized explosion sound on Destroy. */
  sound: boolean;
  /** Force the reduced-motion eruption (the OS setting is always honored too). */
  reduceMotion: boolean;
  /** Keep destroyed posts hidden across browser sessions, not just this tab. */
  rememberDestroyed: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  enabled: true,
  minTier: 'certified',
  sound: false,
  reduceMotion: false,
  rememberDestroyed: false,
};

// Readers must never run WXT's eager per-context migrations. The background
// owns both the value and its settings$ version metadata.
const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: { ...DEFAULT_SETTINGS },
});

export async function loadSettings(): Promise<Settings> {
  return requestStore<Settings>({ type: 'settings/get' });
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return requestStore<Settings>({ type: 'settings/save', patch });
}

/** Fires on every change from any context. Returns an unwatch function. */
export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch((value) => cb({ ...DEFAULT_SETTINGS, ...value }));
}

/** Reactive store for Svelte pages: `$settings.enabled`. Write with saveSettings(). */
export const settings: Readable<Settings> = readable<Settings>({ ...DEFAULT_SETTINGS }, (set) => {
  let live = true;
  void loadSettings().then((s) => live && set(s));
  const unwatch = watchSettings(set);
  return () => {
    live = false;
    unwatch();
  };
});

// ---------------------------------------------------------------------------
// Today's counters (the popup's "today" row). The store keeps all-time totals;
// this is a tiny per-day tally the content script bumps in batches.

export interface DailyStats {
  /** Local date, YYYY-MM-DD. */
  day: string;
  scanned: number;
  slop: number;
  destroyed: number;
  shamed: number;
}

export type DailyDelta = Partial<Omit<DailyStats, 'day'>>;

export function today(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

const emptyDay = (day: string): DailyStats => ({ day, scanned: 0, slop: 0, destroyed: 0, shamed: 0 });
const dailyItem = storage.defineItem<DailyStats>('local:dailyStats', { fallback: emptyDay('') });

// The stored day also lists the ids of retried deltas it has applied: readers get counters only.
const counters = ({ day, scanned, slop, destroyed, shamed }: DailyStats): DailyStats => ({ day, scanned, slop, destroyed, shamed });

export async function getDailyStats(): Promise<DailyStats> {
  const stats = await dailyItem.getValue();
  const day = today();
  return stats.day === day ? counters(stats) : emptyDay(day);
}

/** With `op`, the worker applies the delta once per id, and only on `op.day`. */
export async function addDailyStats(delta: DailyDelta, op?: { id: string; day: string }): Promise<void> {
  await requestStore({ type: 'settings/daily', delta, ...op });
}

export function watchDailyStats(cb: (s: DailyStats) => void): () => void {
  return dailyItem.watch((s) => cb(s.day === today() ? counters(s) : emptyDay(today())));
}

// ---------------------------------------------------------------------------
// Remembered destroyed posts (only written when `rememberDestroyed` is on).

const destroyedItem = storage.defineItem<string[]>('local:destroyedPosts', { fallback: [] });

export async function getDestroyedPosts(): Promise<Set<string>> {
  return new Set(await destroyedItem.getValue());
}

/** `at`, when the user destroyed it, lets a late retry lose to a later forgetDestroyedPosts(). */
export async function rememberDestroyed(postId: string, destroyed: boolean, at?: number): Promise<void> {
  await requestStore({ type: 'settings/destroyed', postId, destroyed, ...(at === undefined ? {} : { at }) });
}

export async function forgetDestroyedPosts(): Promise<void> {
  await requestStore({ type: 'settings/forget-destroyed' });
}
