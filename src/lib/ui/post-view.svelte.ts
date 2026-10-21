// Reactive per-post view state. The content script owns it; PostUI renders it.

import type { SlopReport } from '../engine/types';
import { emptyStats, type TallyStats } from './author-tally';

export type PostMode = 'none' | 'badge' | 'tomb';

/** The control the open panel hangs from: the action-bar chip or the avatar monster. */
export type PanelAnchor = 'chip' | 'avatar';

export interface RankInfo {
  /** 1-based position in the Hall of Slop; null while the sample is too small to name them. */
  rank: number | null;
  title: string;
  slopPosts: number;
  postsSeen: number;
  points: number;
}

/** The "Certified Slopper" tag by an author's name: they're in your Hall of Slop. */
export interface TagView {
  rank: number;
  title: string;
  slopPosts: number;
  postsSeen: number;
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
  /** Each anchor renders its own panel, in its own shadow root, tied to it by CSS anchor positioning. */
  openAt: PanelAnchor;
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
    openAt: 'chip',
    undoMs: 5000,
    ...init,
  });
  return view;
}

export function setPanelOpen(view: PostView, actions: PostActions, open: boolean): void {
  if (view.expanded === open) return;
  view.expanded = open;
  actions.expand(open);
}

/** A trusted click on either anchor: open the panel there, or close it if it's already there. */
export function togglePanel(view: PostView, actions: PostActions, at: PanelAnchor): void {
  if (view.expanded && view.openAt === at) return setPanelOpen(view, actions, false);
  view.openAt = at;
  setPanelOpen(view, actions, true);
}

export function createTagView(init: TagView): TagView {
  const tag = $state<TagView>({ ...init });
  return tag;
}

/** Everything the store knows about the profile owner (every page and feed you've scrolled). */
export interface AllTimeView {
  postsSeen: number;
  slopPosts: number;
  /** Their place in your Hall of Slop; null when not in it. */
  rank: number | null;
}

/** A profile's slop summary on their activity page. The content script owns it; ProfileSummary renders it. */
export interface SummaryView {
  /** This page, live: their own posts scored so far. */
  stats: TallyStats;
  /** undefined: loading; null: nothing stored for them. */
  allTime: AllTimeView | null | undefined;
  /** Their display name, once one of their posts has been read. */
  name: string | null;
  reduceMotion: boolean;
}

export function createSummaryView(init: Partial<SummaryView> = {}): SummaryView {
  const view = $state<SummaryView>({ stats: emptyStats(), allTime: undefined, name: null, reduceMotion: false, ...init });
  return view;
}
