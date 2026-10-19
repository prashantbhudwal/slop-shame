import type { PostSighting } from '../../../src/lib/store/types';

export function sighting(postId = 'post-1', score = 80, authorId = 'in/alice', seenAt = Date.now()): PostSighting {
  return {
    postId, author: { id: authorId, name: authorId, kind: 'person' }, score,
    tierId: score >= 80 ? 'slopocalypse' : score >= 60 ? 'swamp' : score >= 40 ? 'certified' : 'artisanal',
    topCategory: score ? 'ai-vocabulary' : null, snippet: `Post ${postId}`, seenAt,
  };
}
