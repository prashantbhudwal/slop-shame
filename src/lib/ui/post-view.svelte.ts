// Reactive per-post view state. The content script owns it; PostUI renders it.

import type { SlopReport } from '../engine/types';

export type PostMode = 'none' | 'chip' | 'badge' | 'tomb';

export interface RankInfo {
  /** 1-based position in the Hall of Slop, null when outside the top page. */
  rank: number | null;
  title: string;
  slopPosts: number;
  points: number;
}

export interface PostView {
  report: SlopReport | null;
  mode: PostMode;
  isAd: boolean;
  shameable: boolean;
  /** undefined: not loaded yet; null: author unknown / not in the Hall. */
  rank: RankInfo | null | undefined;
  reduceMotion: boolean;
  expanded: boolean;
  /** Undo window length for the tombstone timer. */
  undoMs: number;
}

export interface PostActions {
  destroy(ev: MouseEvent): void;
  shame(ev: MouseEvent): void;
  undo(): void;
  /** Panel opened: a good moment to load rank and warm the FX sprites. */
  expand(open: boolean): void;
  /** Pointer is near the Destroy button: preload FX sprites. */
  arm(): void;
}

export function createPostView(init: Partial<PostView> = {}): PostView {
  const view = $state<PostView>({
    report: null,
    mode: 'none',
    isAd: false,
    shameable: false,
    rank: undefined,
    reduceMotion: false,
    expanded: false,
    undoMs: 5000,
    ...init,
  });
  return view;
}
