# Hall of Slop store

Implementation status: complete, with unit tests for persistence, ranking,
retention, messaging, batching and the storage review regressions. Existing
public signatures are unchanged; the client adds `disposeStoreClient()`.

Extension pages (popup and leaderboard) import:

```ts
import {
  getLeaderboard, getAuthor, getAuthorPosts, getStats,
  exportData, importData, clearAll, subscribe,
} from '@/lib/store/read';
import { rankTitle, RANK_TITLES } from '@/lib/store/ranking';
```

- `getLeaderboard(limit: number, offset = 0): Promise<AuthorRecord[]>`
  returns authors passing `inHall` (at least 3 slop posts, at least half of all
  their seen posts), sorted by points descending, then max score descending.
  All authors still contribute to stats and author lookups.
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
disposeStoreClient(); // Call on disable/unmount; drops queued work and timers.
```

`flushSightings(): Promise<void>` is also available. Actions travel in sighting
batches and commit in the same transaction, after the upserts. Replies contain
`{ ok: true, pendingActions, rejectedActions }`: missing targets can await a
matching sighting; author conflicts are terminal rejections. Missing targets
are dropped after 5 unresolved acknowledgements. Permanent error envelopes
drop the rejected batch/actions; transport errors retain them within the caps.
Retries are idempotent. Legacy `store/action` messages remain supported and
return the same acknowledgement shape (`rejectedActions` is optional for
compatibility with older workers). Author queries flush buffered work when
the retry window permits so first-use shame cards see current totals.
Extension-context invalidation stops the client without rejecting. Imports and
clears notify open LinkedIn tabs to reset session dedupe; recent action targets
can then be reported again. Malformed sightings or conflicting author identities
are skipped individually without blocking a valid batch.

Session dedupe uses a 2,000-entry LRU of score, tier, category, snippet and author
metadata signatures. Pending sightings are capped at 2,000 and pending actions
at 500; overflow drops the oldest entries. Automatic retries back off from
2 seconds exponentially to a 60-second ceiling, including while fresh reports
arrive. Explicit `flushSightings()` bypasses the retry delay for a caller-driven
retry. Unchanged posts can refresh `lastSeen` once every five
minutes when reported again. A separate 500-entry snapshot cache supports
actions after a database reset; pending actions retain their own target snapshot
until acknowledged or dropped, independently of those bounded caches.
`disposeStoreClient()` clears all of these caches/queues, removes its reset
listener, cancels timers and ignores late in-flight replies. A new report starts
a fresh session on re-enable; extension-context invalidation stops permanently.

Settings keep the existing `@/lib/settings` APIs. All settings patches, daily
deltas (including negative corrections, clamped at zero), remembered destroys
and clears go through one background queue, using messages `settings/get`,
`settings/save`, `settings/daily`, `settings/destroyed` and
`settings/forget-destroyed`. Only that worker migrates settings to v2, writing
the value and `settings$` metadata together. Readers have no WXT migrations;
worker restarts recheck the persisted version before migrating again. Watches
and daily/destroyed reads still use WXT's storage items.

Import validation runs before the replacement transaction: JSON is limited to
16,777,216 JavaScript string units before parsing, with at most 50,000 authors
and 20,000 posts. Messages accept at most 100 sightings and 100 actions per batch.
IDs/names are limited to 512 string units, headlines to 1,024, URLs to 4,096 and
incoming snippets to 16,384. All persisted snippets, including imported worst
and archived worst posts, are truncated to 200. Enum values must be literal
strings. Unknown identity fields are discarded rather than persisted.

DB `slop-shame`, version 2: `authors` keyed by `id` (indices `slopPoints`,
`lastSeen`, `[slopPoints,maxScore]`); `posts` keyed by `postId` (indices
`lastSeen`, `authorId`, `[authorId,score]`, `[authorId,lastSeen]`). Only
`background.ts` imports the mutation repository in production. Opening the DB
on a non-extension origin fails. Migration code lives in `db.ts`.

Author ids are canonical (`canonicalAuthorId`: percent-decoded, lowercased),
so `in/Jane-Doe` and `in/jane-doe` are one record. Writes, actions and reads
canonicalize whatever spelling they get; action replies echo the caller's
spelling. Version 2's upgrade, and imports of older exports, merge records
split across spellings (counters and histograms add up, newest profile details
win).

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
