// One author, one record. Author ids are stored in canonicalAuthorId form;
// databases and exports from before that may hold one person under several
// spellings. Merging is exact: counters and histograms add up, the newest
// profile details win, and ranking fields are recomputed.
import { canonicalAuthorId } from '../linkedin/author-id';
import type { PostRecord, StoredAuthor } from './model';
import { slopPoints } from './ranking';

type Worst = StoredAuthor['worstPost'];

const worse = (a: Worst, b: Worst): Worst => (!a || (b && b.score > a.score) ? b : a);

function sum<K extends PropertyKey>(a: Partial<Record<K, number>>, b: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const total: Partial<Record<K, number>> = { ...a };
  for (const [key, n] of Object.entries(b) as [K, number][]) total[key] = (total[key] ?? 0) + n;
  return total;
}

function merge(a: StoredAuthor, b: StoredAuthor): StoredAuthor {
  const [newer, older] = b.lastSeen > a.lastSeen ? [b, a] : [a, b];
  const worstPost = worse(a.worstPost, b.worstPost);
  const archivedWorstPost = worse(a.archivedWorstPost, b.archivedWorstPost);
  const merged: StoredAuthor = {
    ...newer,
    headline: newer.headline ?? older.headline,
    profileUrl: newer.profileUrl ?? older.profileUrl,
    avatarUrl: newer.avatarUrl ?? older.avatarUrl,
    postsSeen: a.postsSeen + b.postsSeen,
    slopPosts: a.slopPosts + b.slopPosts,
    totalScore: a.totalScore + b.totalScore,
    maxScore: Math.max(a.maxScore, b.maxScore),
    destroyedCount: a.destroyedCount + b.destroyedCount,
    shamedCount: a.shamedCount + b.shamedCount,
    slopocalypsePosts: a.slopocalypsePosts + b.slopocalypsePosts,
    scoreCounts: sum(a.scoreCounts, b.scoreCounts),
    categoryCounts: sum(a.categoryCounts, b.categoryCounts),
    firstSeen: Math.min(a.firstSeen, b.firstSeen),
    lastSeen: Math.max(a.lastSeen, b.lastSeen),
  };
  for (const key of ['headline', 'profileUrl', 'avatarUrl'] as const) if (merged[key] === undefined) delete merged[key];
  delete merged.worstPost;
  delete merged.archivedWorstPost;
  if (worstPost) merged.worstPost = worstPost;
  if (archivedWorstPost) merged.archivedWorstPost = archivedWorstPost;
  merged.slopPoints = slopPoints(merged);
  return merged;
}

/** Canonical ids on every author and post; an author's aliases become one record. */
export function canonicalizeAuthors(authors: StoredAuthor[], posts: PostRecord[]): { authors: StoredAuthor[]; posts: PostRecord[] } {
  const byId = new Map<string, StoredAuthor>();
  for (const author of authors) {
    const id = canonicalAuthorId(author.id);
    const same = byId.get(id);
    byId.set(id, same ? merge(same, { ...author, id }) : { ...author, id });
  }
  return {
    authors: [...byId.values()],
    posts: posts.map((post) => {
      const authorId = canonicalAuthorId(post.authorId);
      return authorId === post.authorId ? post : { ...post, authorId };
    }),
  };
}
