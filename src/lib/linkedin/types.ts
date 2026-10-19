// Contract between the LinkedIn DOM adapter and the UI layer.
// LinkedIn's markup changes often: ALL LinkedIn selectors live in
// src/lib/linkedin/, nowhere else.

import type { PostInput } from '../engine/types';

export interface PostAuthor {
  /**
   * Stable identity: the profile/company URL path, e.g. "in/jane-doe" or
   * "company/acme". Never the display name (names collide and change).
   */
  id: string;
  name: string;
  headline?: string;
  profileUrl?: string;
  avatarUrl?: string;
  kind: 'person' | 'company' | 'unknown';
}

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
  /** Null when the adapter can't identify the author (e.g. some ads). */
  author: PostAuthor | null;
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
