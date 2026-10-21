// Background only. Never enable WXT item migrations in a reader: defineItem
// starts those eagerly in every popup/tab, using independently captured values.
import { DEFAULT_SETTINGS, today, type DailyStats, type Settings } from './index';
import type { SettingsMessage } from './messages';

const COUNTERS = ['scanned', 'slop', 'destroyed', 'shamed'] as const;
const TIERS = ['artisanal', 'whiff', 'certified', 'swamp', 'slopocalypse'];
const DESTROYED_CAP = 2000;
/** Applied delta ids kept per day: enough to cover every retry a content script makes. */
const APPLIED_OPS_CAP = 100;

/** A malformed message fails the same way every time; storage errors are worth retrying. */
class InvalidMessage extends Error {}
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function settingsPatch(value: unknown): Partial<Settings> {
  if (!object(value)) throw new InvalidMessage('Invalid settings patch');
  const patch: Partial<Settings> = {};
  for (const key of ['enabled', 'sound', 'reduceMotion', 'rememberDestroyed'] as const) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'boolean') throw new InvalidMessage('Invalid settings patch');
    patch[key] = value[key];
  }
  if (value.minTier !== undefined) {
    if (typeof value.minTier !== 'string' || !TIERS.includes(value.minTier)) throw new InvalidMessage('Invalid settings tier');
    patch.minTier = value.minTier as Settings['minTier'];
  }
  return patch;
}

async function currentSettings(): Promise<Settings> {
  // Value and version are read and written together, inside the worker queue.
  // Rechecking persisted metadata also makes worker restarts idempotent.
  const saved = await browser.storage.local.get(['settings', 'settings$']);
  const next = { ...DEFAULT_SETTINGS, ...settingsPatch(saved.settings ?? {}) };
  if (saved.settings != null && !(object(saved['settings$']) && Number(saved['settings$'].v) >= 2)) {
    if (next.minTier === 'whiff' || next.minTier === 'artisanal') next.minTier = 'certified';
    await browser.storage.local.set({ settings: next, 'settings$': { v: 2 } });
  }
  return next;
}

async function mutate(msg: SettingsMessage): Promise<unknown> {
  switch (msg.type) {
    case 'settings/get': return currentSettings();
    case 'settings/save': {
      const patch = settingsPatch(msg.patch);
      const next = { ...(await currentSettings()), ...patch };
      await browser.storage.local.set({ settings: next, 'settings$': { v: 2 } });
      return next;
    }
    case 'settings/daily': {
      if (!object(msg.delta) || Object.entries(msg.delta).some(([key, n]) =>
        !COUNTERS.includes(key as typeof COUNTERS[number]) || !Number.isSafeInteger(n))
        || (msg.id !== undefined && (typeof msg.id !== 'string' || !msg.id.length || msg.id.length > 64))
        || (msg.day !== undefined && typeof msg.day !== 'string')) throw new InvalidMessage('Invalid daily delta');
      const saved = (await browser.storage.local.get('dailyStats')).dailyStats;
      const day = today();
      // Yesterday's retried delta never lands on today's counters.
      if (msg.day !== undefined && msg.day !== day) return;
      const sameDay = object(saved) && saved.day === day;
      const applied = sameDay && Array.isArray(saved.ops) ? saved.ops.filter((id): id is string => typeof id === 'string') : [];
      if (msg.id !== undefined && applied.includes(msg.id)) return; // A retry after a lost acknowledgement.
      const next: DailyStats & { ops?: string[] } = { day, scanned: 0, slop: 0, destroyed: 0, shamed: 0 };
      for (const key of COUNTERS) {
        const n = sameDay && Number.isSafeInteger(saved[key]) ? Math.max(0, saved[key] as number) : 0;
        next[key] = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, n + (msg.delta[key] ?? 0)));
      }
      const ops = msg.id === undefined ? applied : [...applied, msg.id].slice(-APPLIED_OPS_CAP);
      if (ops.length) next.ops = ops;
      await browser.storage.local.set({ dailyStats: next });
      return;
    }
    case 'settings/destroyed': {
      if (typeof msg.postId !== 'string' || !msg.postId.length || msg.postId.length > 512
        || typeof msg.destroyed !== 'boolean'
        || (msg.at !== undefined && !Number.isSafeInteger(msg.at))) throw new InvalidMessage('Invalid destroyed post');
      const saved = await browser.storage.local.get(['destroyedPosts', 'destroyedPostsForgottenAt']);
      // Destroyed before the user last forgot them all: stays forgotten.
      if (msg.at !== undefined && msg.at < Number(saved.destroyedPostsForgottenAt ?? 0)) return;
      const ids = Array.isArray(saved.destroyedPosts) ? saved.destroyedPosts.filter((id): id is string =>
        typeof id === 'string' && id.length <= 512 && id !== msg.postId) : [];
      if (msg.destroyed) ids.push(msg.postId);
      await browser.storage.local.set({ destroyedPosts: ids.slice(-DESTROYED_CAP) });
      return;
    }
    case 'settings/forget-destroyed':
      await browser.storage.local.set({ destroyedPosts: [], destroyedPostsForgottenAt: Date.now() });
  }
}

/** Register once per worker lifetime; failures do not poison subsequent work. */
export function registerSettingsHandlers(): void {
  let queue: Promise<unknown> = Promise.resolve();
  browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (sender.id !== browser.runtime.id || !object(message)
      || !['settings/get', 'settings/save', 'settings/daily', 'settings/destroyed', 'settings/forget-destroyed'].includes(message.type as string)) return;
    const operation = queue.then(() => mutate(message as SettingsMessage));
    queue = operation.catch(() => {});
    void operation.then(value => respond(value ?? { ok: true }), (error: unknown) => respond({
      type: 'store/error', error: error instanceof Error ? error.message : String(error),
      // Storage failed before committing anything: the caller may send it again.
      retryable: !(error instanceof InvalidMessage),
    }));
    return true;
  });
}
