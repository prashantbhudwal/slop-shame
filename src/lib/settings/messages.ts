import type { DailyDelta, Settings } from './index';

/** All local-storage mutations share the service worker's serialized queue. */
export type SettingsMessage =
  | { type: 'settings/get' }
  | { type: 'settings/save'; patch: Partial<Settings> }
  // id + day make a retried delta count once, and only on the day it happened.
  | { type: 'settings/daily'; delta: DailyDelta; id?: string; day?: string }
  // at: when the user destroyed it; a retry from before the last forget is dropped.
  | { type: 'settings/destroyed'; postId: string; destroyed: boolean; at?: number }
  | { type: 'settings/forget-destroyed' };
