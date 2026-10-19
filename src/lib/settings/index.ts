// User settings, today's counters and remembered destroyed posts, all in
// browser.storage.local (shared by the content script, popup and Hall of Slop).

import { storage } from 'wxt/utils/storage';
import { readable, type Readable } from 'svelte/store';
import type { SlopTierId } from '../engine/types';

export interface Settings {
  /** Master switch. Off = no badges, no scoring. */
  enabled: boolean;
  /** Posts at or above this tier get the full badge. */
  minTier: SlopTierId;
  /** Posts below `minTier` still get a tiny, quiet chip. */
  showClean: boolean;
  /** Synthesized explosion sound on Destroy. */
  sound: boolean;
  /** Force the reduced-motion eruption (the OS setting is always honored too). */
  reduceMotion: boolean;
  /** Keep destroyed posts hidden across browser sessions, not just this tab. */
  rememberDestroyed: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  enabled: true,
  minTier: 'whiff',
  showClean: true,
  sound: false,
  reduceMotion: false,
  rememberDestroyed: false,
};

const settingsItem = storage.defineItem<Settings>('local:settings', { fallback: { ...DEFAULT_SETTINGS } });

export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await settingsItem.getValue()) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await settingsItem.setValue(next);
  return next;
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

export async function getDailyStats(): Promise<DailyStats> {
  const stats = await dailyItem.getValue();
  const day = today();
  return stats.day === day ? stats : emptyDay(day);
}

export async function addDailyStats(delta: DailyDelta): Promise<void> {
  const stats = await getDailyStats();
  stats.scanned += delta.scanned ?? 0;
  stats.slop += delta.slop ?? 0;
  stats.destroyed += delta.destroyed ?? 0;
  stats.shamed += delta.shamed ?? 0;
  await dailyItem.setValue(stats);
}

export function watchDailyStats(cb: (s: DailyStats) => void): () => void {
  return dailyItem.watch((s) => cb(s.day === today() ? s : emptyDay(today())));
}

// ---------------------------------------------------------------------------
// Remembered destroyed posts (only written when `rememberDestroyed` is on).

const DESTROYED_CAP = 2000;
const destroyedItem = storage.defineItem<string[]>('local:destroyedPosts', { fallback: [] });

export async function getDestroyedPosts(): Promise<Set<string>> {
  return new Set(await destroyedItem.getValue());
}

export async function rememberDestroyed(postId: string, destroyed: boolean): Promise<void> {
  const ids = (await destroyedItem.getValue()).filter((id) => id !== postId);
  if (destroyed) ids.push(postId);
  await destroyedItem.setValue(ids.slice(-DESTROYED_CAP));
}

export async function forgetDestroyedPosts(): Promise<void> {
  await destroyedItem.setValue([]);
}
