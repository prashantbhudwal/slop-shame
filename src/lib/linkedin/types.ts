// Contract between the LinkedIn DOM adapter and the UI layer.
// LinkedIn's markup changes often: ALL LinkedIn selectors live in
// src/lib/linkedin/, nowhere else.

import type { PostInput } from '../engine/types';

export interface FeedPost {
  /** Stable id for the post (urn:li:activity:… when available). */
  id: string;
  /** Outermost element of the post card — the thing that explodes. */
  root: HTMLElement;
  /**
   * Element we inject our Shadow-DOM host into. The adapter creates it (a
   * plain div placed in the post header area) so the UI never touches
   * LinkedIn markup.
   */
  mount: HTMLElement;
  input: PostInput;
}

export interface FeedWatcher {
  /** Stop observing and release every reference. */
  disconnect(): void;
}

export interface WatchFeedOptions {
  /** Called once per post when it enters the DOM (and again if its text changes). */
  onPost(post: FeedPost): void;
  /** Called when a post leaves the DOM (LinkedIn virtualizes the feed). */
  onRemove(id: string): void;
}
