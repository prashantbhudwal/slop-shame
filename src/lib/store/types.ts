// Local-only persistence: the Hall of Slop leaderboard.
//
// Storage: IndexedDB in the *extension* origin (chrome-extension://<id>), not
// linkedin.com's. Content scripts never open the DB; they send batched
// messages to the background service worker, which owns writes. Extension
// pages (popup, leaderboard) may read the DB directly.
//
// Nothing here ever leaves the user's machine.

import type { SlopCategory, SlopTierId } from '../engine/types';
import type { PostAuthor } from '../linkedin/types';

/** What the content script reports for each scored post. */
export interface PostSighting {
  postId: string;
  author: PostAuthor;
  score: number;
  tierId: SlopTierId;
  topCategory: SlopCategory | null;
  /** First ~200 chars of the post, for "worst post" display. */
  snippet: string;
  seenAt: number;
}

export interface AuthorRecord {
  /** PostAuthor.id */
  id: string;
  name: string;
  headline?: string;
  profileUrl?: string;
  avatarUrl?: string;
  kind: PostAuthor['kind'];
  /** Unique posts seen (deduped by post id). */
  postsSeen: number;
  /** Unique posts with score >= SLOP_THRESHOLD. */
  slopPosts: number;
  totalScore: number;
  maxScore: number;
  /** Ranking key. See slopPoints() — monotonic: more slop never lowers it. */
  slopPoints: number;
  worstPost?: { postId: string; score: number; snippet: string };
  /** Running totals per category across this author's posts. */
  categoryCounts: Partial<Record<SlopCategory, number>>;
  destroyedCount: number;
  shamedCount: number;
  firstSeen: number;
  lastSeen: number;
}

/** A post scoring at or above this counts as a "slop post". */
export const SLOP_THRESHOLD = 40;

export type UserAction = 'destroyed' | 'shamed';

/** Messages content script → background. */
export type StoreMessage =
  | { type: 'store/sightings'; sightings: PostSighting[] }
  | { type: 'store/action'; postId: string; authorId: string; action: UserAction }
  | { type: 'store/author'; authorId: string } // reply: AuthorRecord | null
  | { type: 'store/leaderboard'; limit: number }; // reply: AuthorRecord[]
