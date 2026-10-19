import type { SlopCategory, SlopTierId } from '../engine/types';
import type { PostAction, PostSighting } from './types';
import { SLOP_THRESHOLD } from './types';
import type { StoreExport } from './model';
import { slopPoints } from './ranking';
import { publicAuthor } from './model';

// Exhaustive maps make additions and removals in the engine contract a type
// error here, rather than silently rejecting a newly introduced category.
const categoryFlags: Record<SlopCategory, true> = {
  'ai-vocabulary': true, 'template-phrases': true, 'chatbot-leak': true,
  'negation-pivot': true, inflation: true, hedging: true, 'engagement-bait': true,
  formatting: true, 'robotic-rhythm': true, 'bypass-tricks': true,
};
const tierFlags: Record<SlopTierId, true> = {
  artisanal: true, whiff: true, certified: true, swamp: true, slopocalypse: true,
};
const categories = new Set(Object.keys(categoryFlags));
const tiers = new Set(Object.keys(tierFlags));
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const id = (value: unknown): value is string => text(value) && value.length > 0;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const score = (value: unknown): value is number => count(value) && value <= 100;
const category = (value: unknown) => value === null || (text(value) && categories.has(value));
const optionalText = (value: unknown) => value === undefined || text(value);
const identity = (value: Record<string, unknown>) => id(value.id) && text(value.name)
  && ['person', 'company', 'unknown'].includes(String(value.kind))
  && optionalText(value.headline) && optionalText(value.profileUrl) && optionalText(value.avatarUrl);

export function validateSighting(value: unknown): asserts value is PostSighting {
  if (!record(value) || !id(value.postId) || !record(value.author) || !identity(value.author)
    || !score(value.score) || !tiers.has(String(value.tierId)) || !category(value.topCategory)
    || !text(value.snippet) || !count(value.seenAt)) throw new Error('Invalid post sighting');
}

export function validateAction(value: unknown): asserts value is PostAction {
  if (!record(value) || !id(value.postId) || !id(value.authorId)
    || (value.action !== 'destroyed' && value.action !== 'shamed')) throw new Error('Invalid store action');
}

/** Validate completely before opening a replacement transaction. */
export function parseExport(json: string): StoreExport {
  const value: unknown = JSON.parse(json);
  if (!record(value) || value.format !== 'slop-shame' || value.version !== 1 || !count(value.exportedAt)
    || !Array.isArray(value.authors) || !Array.isArray(value.posts)) throw new Error('Unsupported Hall of Slop export');
  const authorIds = new Set<string>();
  for (const author of value.authors) {
    if (!record(author) || !identity(author) || !count(author.postsSeen) || !count(author.slopPosts)
      || !count(author.totalScore) || !score(author.maxScore) || !count(author.slopPoints)
      || !count(author.destroyedCount) || !count(author.shamedCount) || !count(author.slopocalypsePosts)
      || !count(author.firstSeen) || !count(author.lastSeen) || author.firstSeen > author.lastSeen
      || !record(author.scoreCounts) || !record(author.categoryCounts)
      || authorIds.has(author.id as string)) throw new Error('Invalid author in Hall of Slop export');
    let posts = 0, total = 0, slop = 0, max = 0;
    for (const [key, n] of Object.entries(author.scoreCounts)) {
      const s = Number(key);
      if (!score(s) || String(s) !== key || !count(n)) throw new Error('Invalid score histogram');
      posts += n;
      total += s * n;
      if (s >= SLOP_THRESHOLD) slop += n;
      if (n) max = Math.max(max, s);
    }
    const counts = Object.entries(author.categoryCounts);
    if (counts.some(([key, n]) => !categories.has(key) || !count(n))
      || counts.reduce((sum, [, n]) => sum + (n as number), 0) > posts
      || posts !== author.postsSeen || total !== author.totalScore || slop !== author.slopPosts
      || max !== author.maxScore || author.slopocalypsePosts > slop
      || author.destroyedCount > posts || author.shamedCount > posts
      || slopPoints(author as unknown as StoreExport['authors'][number]) !== author.slopPoints) {
      throw new Error('Inconsistent author aggregates');
    }
    for (const worst of [author.worstPost, author.archivedWorstPost]) {
      if (worst !== undefined && (!record(worst) || !id(worst.postId) || !score(worst.score)
        || !text(worst.snippet) || worst.score > max)) throw new Error('Invalid worst post');
    }
    authorIds.add(author.id as string);
  }
  const postIds = new Set<string>();
  const retained = new Map<string, { scores: Record<number, number>; categories: Record<string, number>; destroyed: number; shamed: number; apocalypses: number }>();
  for (const post of value.posts) {
    if (!record(post) || !id(post.postId) || !id(post.authorId) || !authorIds.has(post.authorId)
      || postIds.has(post.postId) || !score(post.score) || !tiers.has(String(post.tierId))
      || !category(post.topCategory) || !text(post.snippet) || !count(post.firstSeen)
      || !count(post.lastSeen) || post.firstSeen > post.lastSeen
      || (post.destroyed !== undefined && typeof post.destroyed !== 'boolean')
      || (post.shamed !== undefined && typeof post.shamed !== 'boolean')) throw new Error('Invalid post in Hall of Slop export');
    postIds.add(post.postId);
    const totals = retained.get(post.authorId) ?? { scores: {}, categories: {}, destroyed: 0, shamed: 0, apocalypses: 0 };
    totals.scores[post.score] = (totals.scores[post.score] ?? 0) + 1;
    if (post.topCategory) totals.categories[post.topCategory as string] = (totals.categories[post.topCategory as string] ?? 0) + 1;
    totals.destroyed += post.destroyed ? 1 : 0;
    totals.shamed += post.shamed ? 1 : 0;
    totals.apocalypses += post.score >= SLOP_THRESHOLD && post.tierId === 'slopocalypse' ? 1 : 0;
    retained.set(post.authorId, totals);
  }
  for (const author of value.authors as StoreExport['authors']) {
    const totals = retained.get(author.id);
    if (totals && (Object.entries(totals.scores).some(([s, n]) => n > (author.scoreCounts[Number(s)] ?? 0))
      || Object.entries(totals.categories).some(([c, n]) => n > (author.categoryCounts[c as SlopCategory] ?? 0))
      || totals.destroyed > author.destroyedCount || totals.shamed > author.shamedCount
      || totals.apocalypses > author.slopocalypsePosts)) throw new Error('Posts exceed author aggregates');
  }
  const snapshot = value as unknown as StoreExport;
  return {
    format: 'slop-shame', version: 1, exportedAt: snapshot.exportedAt,
    authors: snapshot.authors.map((author) => ({
      ...publicAuthor(author),
      scoreCounts: Object.fromEntries(Object.entries(author.scoreCounts).filter(([, n]) => (n ?? 0) > 0)),
      slopocalypsePosts: author.slopocalypsePosts,
      ...(author.archivedWorstPost ? { archivedWorstPost: {
        postId: author.archivedWorstPost.postId, score: author.archivedWorstPost.score, snippet: author.archivedWorstPost.snippet,
      } } : {}),
    })),
    posts: snapshot.posts.map((post) => ({
      postId: post.postId, authorId: post.authorId, score: post.score, tierId: post.tierId,
      topCategory: post.topCategory, snippet: post.snippet, firstSeen: post.firstSeen, lastSeen: post.lastSeen,
      ...(post.destroyed !== undefined ? { destroyed: post.destroyed } : {}),
      ...(post.shamed !== undefined ? { shamed: post.shamed } : {}),
    })),
  };
}
