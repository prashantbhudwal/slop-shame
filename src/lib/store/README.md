# Hall of Slop store

Implementation status: complete, with unit tests for persistence, ranking,
retention, messaging and batching. Public client and page function signatures
are unchanged; sightings messages accept an optional `actions` array.

Extension pages (popup and leaderboard) import:

```ts
import {
  getLeaderboard, getAuthor, getAuthorPosts, getStats,
  exportData, importData, clearAll, subscribe,
} from '@/lib/store/read';
import { rankTitle, RANK_TITLES } from '@/lib/store/ranking';
```

- `getLeaderboard(limit: number, offset = 0): Promise<AuthorRecord[]>`
  returns authors with positive points, sorted by points descending, then max
  score descending. All authors still contribute to stats and author lookups.
- `getAuthor(id: string): Promise<AuthorRecord | null>`
- `getAuthorPosts(id: string, limit: number): Promise<PostRecord[]>`
  returns retained posts, most recently seen first.
- `getStats(): Promise<StoreStats>` returns lifetime author aggregates:
  `{ authorsTracked, postsScanned, slopPostsSeen, destroyed, shamed, avgScore }`.
- `exportData(): Promise<Blob>` produces an `application/json` snapshot,
  including internal aggregates required to preserve pruned history.
- `importData(json: string): Promise<void>` validates and **replaces** the local
  snapshot atomically via the worker. Pass `await file.text()` from a file input.
- `clearAll(): Promise<void>` clears both stores via the worker.
- `subscribe(cb: () => void): () => void` returns cleanup for `onMount`/`$effect`.
  Fetch initial data immediately, then refresh on the debounced notifications.

Content scripts import only `@/lib/store/client`:

```ts
reportSighting(sighting); // void; batches 25 posts or 2 seconds
await reportAction(postId, authorId, 'destroyed'); // or 'shamed'
const author = await getAuthor(authorId);
```

`flushSightings(): Promise<void>` is also available. Actions travel in sighting
batches and commit in the same transaction, after the upserts. Replies contain
`{ ok: true, pendingActions }`: unknown or conflicting targets remain queued
until a matching sighting can be persisted. Failures reject the current flush
without dropping actions; retries are idempotent. Legacy `store/action`
messages remain supported and return the same acknowledgement shape.
Author queries flush too so first-use shame cards see current totals.
Extension-context invalidation stops the client without rejecting. Imports and
clears notify open LinkedIn tabs to reset session dedupe; recent action targets
can then be reported again. Malformed sightings or conflicting author identities
are skipped individually without blocking a valid batch.

Session dedupe uses a 2,000-entry LRU of score, tier, category, snippet and author
metadata signatures. Unchanged posts can refresh `lastSeen` once every five
minutes when reported again. A separate 500-entry snapshot cache supports
actions after a database reset; pending actions retain their own target snapshot
until acknowledged, independently of those bounded caches.

DB `slop-shame`, version 1: `authors` keyed by `id` (indices `slopPoints`,
`lastSeen`, `[slopPoints,maxScore]`); `posts` keyed by `postId` (indices
`lastSeen`, `authorId`, `[authorId,score]`, `[authorId,lastSeen]`). Only
`background.ts` imports the mutation repository in production. Opening the DB
on a non-extension origin fails. Migration code lives in `db.ts`.

Ranking is `round(sum((score-30)^1.3 / 10 for score >= 40) + 3 *
slopocalypsePosts)`. A compact per-author score histogram supports exact
corrections and lifetime ranking after post details expire. Rank thresholds:
0 Slop Intern; 20 Associate Slop Officer; 75 Senior Thoughtfluencer;
200 Director of Unsolicited Wisdom; 500 VP of Slop; 1,200 Chief Slop Officer;
3,000 Slop Emperor. Additional slop posts always increase points; corrections
can reduce points when the original score was too high.

Post details and their dedupe/action markers are retained for 90 days since
last sighting, at most 20,000 rows, oldest first. Pruning runs with sighting
batches and imports. Author totals and an archived worst-post snippet survive
pruning. A post encountered again after its retained row was pruned is treated
as a new sighting; exact dedupe beyond retention would require an unbounded
additional post-id history. No hidden unbounded history is retained.
