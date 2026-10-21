// Contract between the LinkedIn DOM adapter and the UI layer.
// LinkedIn's markup changes often: ALL LinkedIn selectors live in
// src/lib/linkedin/, nowhere else.

import type { PostInput } from '../engine/types';

export interface PostAuthor {
  /**
   * Stable identity: the profile/company URL path, e.g. "in/jane-doe" or
   * "company/acme", percent-decoded and lowercased (canonicalAuthorId).
   * Never the display name (names collide and change).
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
   * plain div) so the UI never touches LinkedIn markup. `data-slot="bar"`:
   * in the empty space of the post's action bar, right after Send; no
   * data-slot: a row under the header, until the action bar hydrates.
   */
  mount: HTMLElement;
  input: PostInput;
  /** Null when the adapter can't identify the author (e.g. some ads). */
  author: PostAuthor | null;
  /**
   * For a bare repost: the embedded original post's id (urn:li:activity:…).
   * The Hall of Slop counts the original once, however many people reshare
   * it. Undefined for ordinary posts, and for bare reposts whose original
   * can't be identified (those stay out of the Hall's sample).
   */
  sourceId?: string;
  /**
   * A second host at the end of the author's name line (`data-slot="name"`),
   * created on first call. Null when the name line isn't there.
   */
  tagHost(): HTMLElement | null;
  /** The element that draws the author's avatar shape (the image is clipped by it). */
  avatarFrame(): HTMLElement | null;
  /** Visible rounded post card, excluding outer spacing wrappers. The Drip Edge hangs from its top edge. */
  cardFrame?(): HTMLElement;
  /**
   * A third host, the card frame's last child (`data-slop-shame-mount="decoration"`),
   * created on first call: the Drip Edge and the avatar ring and monster are
   * drawn from inside the card, so they scroll with it. Null once the post is gone.
   */
  decorationHost?(): HTMLElement | null;
}

/**
 * A visit to a person's activity pages (/in/<id>/recent-activity/…). The
 * summary of the posts they wrote goes on their profile card, above the cover
 * and photo. Switching between their tabs (Posts, Comments…) keeps the visit;
 * another person or any other page ends it.
 */
export interface ProfilePage {
  /** The profile owner as a PostAuthor.id ("in/<id>"), in its canonical spelling. */
  ownerId: string;
  /** True when the profile owner wrote the post (not a repost, comment or like of someone else's). */
  owns(author: PostAuthor | null): boolean;
  /**
   * Our host (`data-slop-shame-mount="summary"`), one per visit, created up
   * front. The adapter keeps it as the profile card's first child (inside the
   * left rail's sticky block, so it stays in view while the posts scroll),
   * re-attaches it when LinkedIn re-renders the card, and removes it when the
   * page closes. Detached while the card isn't rendered or visible.
   */
  summaryHost: HTMLElement;
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
  /** A person's activity pages opened (their ProfilePage) or closed (null). Once per visit. */
  onProfile?(profile: ProfilePage | null): void;
}
