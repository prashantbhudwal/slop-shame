import type { SlopCategory, SlopTierId } from '../engine/types';
import type { AuthorRecord } from './types';
import type { RankingRecord } from './ranking';

export interface PostRecord {
  postId: string;
  authorId: string;
  score: number;
  tierId: SlopTierId;
  topCategory: SlopCategory | null;
  snippet: string;
  firstSeen: number;
  lastSeen: number;
  destroyed?: boolean;
  shamed?: boolean;
}

/** Internal fields are deliberately excluded from the shared AuthorRecord API. */
export interface StoredAuthor extends AuthorRecord, RankingRecord {
  archivedWorstPost?: AuthorRecord['worstPost'];
}

export interface StoreStats {
  authorsTracked: number;
  postsScanned: number;
  slopPostsSeen: number;
  destroyed: number;
  shamed: number;
  avgScore: number;
}

export interface StoreExport {
  format: 'slop-shame';
  version: 1;
  exportedAt: number;
  authors: StoredAuthor[];
  posts: PostRecord[];
}

/** Page-only RPCs: imports and clearing still execute in the background. */
export type PageMessage =
  | { type: 'store/import'; json: string }
  | { type: 'store/clear' };

export function publicAuthor(author: StoredAuthor): AuthorRecord {
  return {
    id: author.id, name: author.name, kind: author.kind,
    ...(author.headline !== undefined ? { headline: author.headline } : {}),
    ...(author.profileUrl !== undefined ? { profileUrl: author.profileUrl } : {}),
    ...(author.avatarUrl !== undefined ? { avatarUrl: author.avatarUrl } : {}),
    postsSeen: author.postsSeen, slopPosts: author.slopPosts, totalScore: author.totalScore,
    maxScore: author.maxScore, slopPoints: author.slopPoints,
    worstPost: author.worstPost ? {
      postId: author.worstPost.postId, score: author.worstPost.score, snippet: author.worstPost.snippet,
    } : undefined,
    categoryCounts: author.categoryCounts, destroyedCount: author.destroyedCount, shamedCount: author.shamedCount,
    firstSeen: author.firstSeen, lastSeen: author.lastSeen,
  };
}
