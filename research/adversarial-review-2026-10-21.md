# Slop Shame — adversarial code review

> Initial claim set. Independent [Sol validation](adversarial-review-validation-2026-10-21.md)
> supersedes the classifications, priorities and impact claims below: 11 findings
> retained, 12 excluded. Use the validation report as the current actionable list.

Date: 2026-10-21  
Reviewers: seven independent Grok 4.7 agents on Cursor, high reasoning effort; parent verification by GPT-6.1-Sol.  
Scope: security/privacy, persistence, asynchronous delivery, DOM-adapter lifecycle/identity, pure-engine logic/performance, and release/evaluation tooling. Frontend design, components, styling and visual effects were excluded. Controller data flow and bootstrap were reviewed where they affect persistence or reliability.

## Findings at a glance

**23 distinct entries: 20 newly verified issues or hazards, two already documented risks, and one narrower race without an end-to-end reproduction.** Priorities below are the parent's adjudication. P1 means address before the affected distribution step; P2 means a substantive correctness, reliability or performance issue; P3 means lower impact or a narrower condition. No P0 or privilege-escalation exploit was established.

Fifteen entries concern logic present in the installed extension, including the documented retention tradeoff and the narrower startup race. Eight concern the experimental engine or local development/release tooling.

The installed Chrome extension does **not** contain v2, private research corpora, open test shadow roots, or the test debug event. The runtime privacy issue that does affect it is the WXT extension-ID broadcast, TRUST-1.

| ID | Priority | Finding | Affected baseline |
|---|---|---|---|
| REL-1 | P1 | Source ZIPs include private corpora and captured feeds | Local packaging tooling |
| TRUST-1 | P2 | WXT broadcasts the extension ID to LinkedIn pages | Installed + root |
| DELIV-1 | P2 | Document unload loses pending destroys and buffered counts | Installed + root |
| DELIV-2 | P2 | Shutdown clears actions waiting behind a flush/backoff | Installed + root |
| DELIV-3 | P2 | A failed rank lookup is cached as a permanent empty result | Installed + root |
| DELIV-4 | P2 | Remembered destroyed IDs do not follow setting or cross-tab changes | Installed + root |
| DELIV-5 | P2 | Failed daily/hide-list writes are discarded | Installed + root |
| DELIV-6 | P2 | One failed settings read prevents startup until reload | Installed + root |
| PERSIST-1 | P2 | Equivalent author IDs split history and reject updates/actions | Installed + root |
| PERSIST-2 | P2, known | Retention removes dedupe markers while lifetime totals survive | Installed + root |
| PERSIST-3 | P2 | Hall queries scan higher-point authors who cannot qualify | Installed + root |
| ADAPTER-1 | P2 | Activity-page flat reposts can become duplicate Hall samples | Installed + root |
| ADAPTER-2 | P2 | A second connected card with the same ID evicts the first | Installed + root |
| ADAPTER-3 | P2 | A retained old feed root prevents watching a new feed | Installed + root |
| EL-1 | P2 | V2 bundle ties discard stronger evidence using hashed rule IDs | Rejected v2 only |
| EP-1 | P2 | V2 performs substantial synchronous startup work | Rejected v2 only |
| REL-2 | P2, known | Default release commands compile the rejected working-tree engine | Local build/CI |
| REL-3 | P2 | V2 audit calls generated non-slop AI “human controls” | V2 research artifacts |
| REL-4 | P2 | Excerpt-bearing eval outputs rely on an untracked ignore file | Local evaluation tooling |
| REL-5 | P2 | E2E builds overwrite the production-named output directory | Local build tooling |
| DELIV-7 | P3, narrower race | A settings update can fall between snapshot load and subscription | Installed + root |
| ADAPTER-4 | P3 | One malformed profile URL aborts the whole card extraction | Installed + root |
| REL-6 | P3 | Fixture e2e failure does not gate CI artifacts | CI |

## Baselines and verification limits

The checkout was already substantially dirty. The reviewed commit anchor is `50ab90ba84e20912b6c8aa21b3ed7b091e887479`; findings describe the working tree, not just that commit.

- **Installed:** `mvp-20261021T103441Z`, at `~/slop-shame-extension`. Its 41 files match the archived `BUILD-INFO.json`. Content script: 286,398 bytes; SHA-256 `3f0a52bdd8bd93cd4f5df2f928da9b8704b388677e10853ccab32303865ecf83`.
- **Shipped round-2 engine snapshot:** `data/eval/raw/v2/engine-r2`, engine digest `e33028e19032921ae7c4e3b7b4714ed010b7f86a8b70658e68d311f90535b6db`.
- **Current root:** rejected v2 in `src/lib/engine`, digest `83be54ab0db0bd46f287537ef037aeba42f49f9582639b13487856109fe38316`, matching `eval/v2/frozen.json` and its `engine-final` snapshot. The known recall regression is already in [the v2 report](../eval/v2/REPORT.md); it is not counted as a new finding here.
- The parent captured hashes for 78 runtime/tooling files before review and found no changes to them after review. No production fixes, builds, installs, network requests or live LinkedIn sessions were performed in this review.
- Reproductions used synthetic identities, saved fixtures, fake-indexeddb and local Node/Vitest probes. Browser-specific timing and live frequency are stated as unmeasured where applicable.

## Distribution and privacy

### REL-1 — P1: source archives include private research and captured feeds

**Location:** [wxt.config.ts](../wxt.config.ts), missing source-archive exclusions; installed WXT `dist/core/resolve-config.mjs:191–209` and `dist/core/zip.mjs:44–80`.

**Trigger:** `pnpm exec wxt zip --sources`, or a Firefox/Opera ZIP using WXT's source-ZIP default, followed by distributing the source archive. Ordinary Chrome `pnpm zip` does not enable source archives by default.

**Evidence:** WXT uses the repository root, `includeSources: ["**/*"]`, and tinyglobby without consulting `.gitignore`. The parent's exact-default-glob enumeration found **798 files under `data/eval/raw/`, totaling 1,890,605,459 bytes**, plus **nine files under `tests/fixtures/feed/captured/`**. These include private LinkedIn corpora and research downloads. Hidden `.playwright/` was excluded by the default `dotSources: false`. No archive was created or uploaded.

**Impact:** A source distribution can disclose research text and captured feeds that the project expressly keeps private. It can also produce an unexpectedly enormous archive. The installed Chrome directory and its release ZIP are unaffected.

**Recommendation:** Configure `zip.excludeSources` for all private/generated directories, or use a reviewed source allowlist. `zip.zipSources: false` alone does not protect an explicit `--sources` invocation. Add a file-list assertion before producing source distributions.

**Confidence:** High, reproduced by enumerating WXT's actual glob configuration; distribution has not occurred.

### TRUST-1 — P2: WXT broadcasts the extension ID to the page

**Location:** [content entrypoint](../src/entrypoints/linkedin.content/index.ts):14–16; WXT `content-script-context.mjs:43–49,167–176`, `internal/custom-events.mjs:15–16`.

**Trigger:** Injection on any matching `https://www.linkedin.com/*` document, even with scoring disabled.

**Evidence:** WXT's context constructor calls `stopOldScripts()` before application `main()`. Unless `noScriptStartedPostMessage` is true, it posts this shared-window payload:

```js
{ type: "<runtime.id>:linkedin:wxt:content-script-started",
  contentScriptName: "linkedin", messageId: "<random>" }
```

The source omits the opt-out, and the installed bundle contains the `window.postMessage(..., "*")` path with the same options. WXT's installed type declaration supports `noScriptStartedPostMessage?: boolean`.

**Impact:** A page message listener can identify the extension despite the intended resistance to extension probing. No Hall data or settings are in the payload. Learning the ID does not grant external messaging or bypass dynamic asset URLs; no such exploit was found.

**Recommendation:** Set `noScriptStartedPostMessage: true` and verify the built entrypoint opts out. Preserve the separate WXT lifecycle handshake.

**Confidence:** High on source and shipped send path. Shared-window delivery was not executed in Chrome during this review.

### REL-4 — P2: evaluation excerpts depend on an untracked ignore file

**Location:** [scripts/eval/run.mjs](../scripts/eval/run.mjs):46–49,75–94; [eval/lib/metrics.mjs](../eval/lib/metrics.mjs):49–65; [root .gitignore](../.gitignore).

**Trigger:** Commit or move the evaluation tooling without its local nested ignore file, run `pnpm eval` with private optional datasets present, then broadly stage or share generated results.

**Evidence:** JSON results retain `signals`, including matched excerpts, and metrics retain snippets up to 180 characters. The tracked root ignore does not exclude `eval/results/`. This checkout is currently protected by `eval/results/.gitignore`, but that file is untracked; the script only creates the directory and does not create its ignore rule. `eval/README.md` nevertheless describes results as ignored.

**Impact:** Moving or committing the tooling can silently drop its privacy guard. This is a development-data risk, not a leak from the installed extension. `--baseline` currently suppresses snippets; the aggregate baseline is not itself evidence of text leakage.

**Recommendation:** Put the generated-results exclusion in the root ignore, preserve aggregate-only exports, and make any text-bearing export explicit.

**Confidence:** High on current file tracking, output construction and the missing durable guard.

## Delivery and settings reliability

### DELIV-1 — P2: document unload loses delayed actions and buffered data

**Location:** [controller.ts](../src/entrypoints/linkedin.content/controller.ts):662–725,801–814; [content entrypoint](../src/entrypoints/linkedin.content/index.ts):17–36; [store/client.ts](../src/lib/store/client.ts):6–7.

**Trigger:** Destroy a post and discard the document before its 5.25/5.5-second finalization timer. Refreshing, closing the tab or leaving the origin also discards pending sighting/daily buffers.

**Evidence:** The controller has no `pagehide` handler. A synthetic `pagehide` did not call `reportAction` or flush the daily delta; destroy was sent only at 5,250 ms in the reduced-motion probe. Sightings batch after two seconds; daily counts batch after three. WXT invalidation cleanup is not an ordinary document-unload flush.

**Impact:** A pending destroy can fail to enter Hall action history or the remembered hide list, and recent counts can disappear. The loss is limited to unsent data; no committed database rollback was shown.

**Recommendation:** Persist pending action intent promptly in the background with explicit undo/cancel semantics. A `pagehide` finalize/flush is a useful best-effort improvement, but asynchronous unload completion cannot provide durability by itself. Visibility-hidden may flush counts without ending the undo window.

**Confidence:** High on timers and absent lifecycle dispatch; real tab unload was not run. Grok's P1 was reduced to P2 for the demonstrated data-loss scope.

### DELIV-2 — P2: stopping the controller clears unsent action queues

**Location:** [store/client.ts](../src/lib/store/client.ts):40–52,179–182,265–275; [controller.ts](../src/entrypoints/linkedin.content/controller.ts):172–191,720–725.

**Trigger:** Destroy/Shame queues while transport is in backoff or another batch is in flight, then the extension is disabled or the client is disposed.

**Evidence:** `reportAction` calls `flush(false)`; during backoff that resolves without sending. `stop()` initiates action recording and then immediately calls `disposeStoreClient()`, which clears pending actions and increments the lifetime. Parent probes reproduced loss both during backoff and when an action joined an in-flight flush. With an idle transport, the action is dispatched before disposal; that negative case passed.

**Impact:** Hall actions can disappear while the separate daily or hide-list path records them, leaving inconsistent local histories.

**Recommendation:** Force and await durable action delivery before disposing a live client, with generation-safe handling of re-enable. Persist earlier when context loss would prevent a final send.

**Confidence:** High; separate client and controller probes passed.

### DELIV-3 — P2: a transient rank error is cached as a successful empty result

**Location:** [controller.ts](../src/entrypoints/linkedin.content/controller.ts):774–796.

**Trigger:** `flushSightings()` or the author read fails once when rank data is requested.

**Evidence:** The catch assigns `rank = null`. Subsequent calls return when `rank !== undefined`, so a recovered transport is never queried for that mounted entry. The parent reproduced a failed first call followed by a healthy stubbed author response that was never requested.

**Impact:** The post's rank data stays absent for that entry's lifetime. A new entry can recover.

**Recommendation:** Keep a retryable error state or leave `undefined` after failure. Reserve `null` for a successful empty read.

**Confidence:** High; data-fetch logic was tested without frontend rendering.

### DELIV-4 — P2: remembered destroy state is loaded once and becomes stale

**Location:** [content entrypoint](../src/entrypoints/linkedin.content/index.ts):18–23; [controller.ts](../src/entrypoints/linkedin.content/controller.ts):155–158,194–214; [settings/index.ts](../src/lib/settings/index.ts):104–116.

**Trigger:** Toggle “Keep destroyed posts hidden” in an existing tab, or add a remembered ID from another open tab.

**Evidence:** Persisted IDs are copied at startup only if the flag is initially enabled. Setting updates neither reload nor clear that persisted portion. There is no destroyed-list subscription. Parent probes showed an old persisted ID still being applied after disabling the flag, and no old IDs loaded after enabling it.

**Impact:** The setting and existing tabs can disagree until reload. Cross-tab additions do not propagate through this code path.

**Recommendation:** Track session destroys separately from persisted IDs. Watch the persisted list and reconcile it when the setting changes, while preserving intentional current-session hiding.

**Confidence:** High for toggles and the absent subscription; two real tabs were not exercised.

### DELIV-5 — P2: failed daily and hide-list writes are discarded

**Location:** [controller.ts](../src/entrypoints/linkedin.content/controller.ts):720–725,801–814; [settings/background.ts](../src/lib/settings/background.ts):85–87.

**Trigger:** A daily-stats or remembered-destroy write rejects once.

**Evidence:** `flushDaily` empties its buffer before acknowledgement and swallows rejection. `rememberDestroyed` rejection is also ignored without retry. The settings handler labels every error non-retryable, including storage failures. Parent probes observed only one send attempt and no retained delta or ID after rejection.

**Impact:** A count batch is permanently missing, or a destroyed post returns on the next visit because the hide write never persisted.

**Recommendation:** Retain pending writes until acknowledgement. Retry idempotent hide-list writes. Give daily increments operation IDs and worker-side dedupe before retrying ambiguous failures, so a committed write with a lost acknowledgement cannot be counted twice. Distinguish invalid requests from transient storage/channel failures.

**Confidence:** High on rejected-write behavior; no claim that every rejected acknowledgement means the background failed to commit.

### DELIV-6 — P2: one failed settings read leaves the tab inactive

**Location:** [content entrypoint](../src/entrypoints/linkedin.content/index.ts):17–23.

**Trigger:** The initial settings request rejects, including a background storage-read error.

**Evidence:** The rejection leaves `main()` before controller startup, settings subscription and invalidation registration. No retry is scheduled. A parent probe reproduced the propagated error and zero startup calls.

**Impact:** The tab remains unprocessed after the underlying service recovers, until a reload.

**Recommendation:** Register cancellation early and retry bootstrap with bounded backoff. Avoid applying permissive defaults that could override the owner's disabled setting.

**Confidence:** High on deterministic failure behavior; initial Chrome worker-wake failure frequency was not measured.

### DELIV-7 — P3: settings can change before the startup watcher is attached

**Location:** [content entrypoint](../src/entrypoints/linkedin.content/index.ts):18–23.

**Condition:** Settings are read, the code awaits destroyed IDs, and a settings save occurs before `watchSettings` is registered.

**Evidence and limit:** The source has this gap. Grok's deferred-read probe established that the watcher was absent while the await was pending. It did **not** inject a real storage change and demonstrate its delivery being missed. This entry is the one narrower race, rather than a fully reproduced end-to-end defect.

**Potential impact:** The tab starts with a stale snapshot until another settings change or reload.

**Recommendation:** Subscribe with generation/version reconciliation before awaiting dependent state, or re-read after subscribing.

**Confidence:** Medium; the window is one asynchronous read.

## Persistence and aggregate correctness

### PERSIST-1 — P2: equivalent author IDs create different database identities

**Location:** [repository.ts](../src/lib/store/repository.ts):93–95,124; [query.ts](../src/lib/store/query.ts):23–26; [LinkedIn adapter](../src/lib/linkedin/index.ts):142–148,215–217.

**Trigger:** The same profile slug appears with different case or percent-encoding case.

**Evidence:** The adapter's `sameAuthorId` deliberately decodes and lowercases for equality, but emitted IDs and store keys remain raw. Parent assertions reproduced separate `in/jane-doe` and `in/Jane-Doe` rows, each with three slop posts and 70 points. The alternative spelling's correction of an existing post was ignored and its Destroy action was terminally rejected. A percent-encoding-case correction similarly returned `wrote: false` and left score 80 unchanged.

**Impact:** One person can have split or duplicate Hall history; author lookups, corrections and actions can miss the stored identity.

**Recommendation:** Share canonical author IDs across adapter, store, messages, imports, queries and caches. Migrate existing author rows and post references atomically; merely normalizing new writes would strand existing history.

**Confidence:** High on store behavior and the repository's supported equivalence cases; live occurrence frequency unmeasured. Grok's P1 was reduced to P2.

### PERSIST-2 — P2, already documented: detail retention also ends deduplication

**Location:** [repository.ts](../src/lib/store/repository.ts):39–69,93–130; [store README](../src/lib/store/README.md):102–107.

**Trigger:** A post detail row is pruned after 90 days or the 20,000-row cap, then the same ID is seen again.

**Evidence:** Detail rows contain dedupe/action flags; lifetime author totals survive deletion. A score-100 post, destroyed once, expired and re-seen produced posts 1 → 2, points 28 → 56, destroys 1 → 2. Re-seeing three pruned clean posts changed an author from 3/6 slop posts to 3/9 and removed Hall eligibility. Parent assertions reproduced both outcomes.

**Impact:** Lifetime totals are not lifetime-unique-post totals. Old slop can increase points again; old clean posts can dilute the Hall share.

**Recommendation:** Make the bounded-history semantics explicit in product counts, or design compact dedupe/action tombstones with a deliberate retention/cap policy. A permanent unbounded ID set is not a free fix: the README already documents rejecting that tradeoff. This is a known design limitation, not a newly introduced implementation regression.

**Confidence:** High; expiry was simulated through the supported clock argument. The cap reaches the same missing-row path.

### PERSIST-3 — P2: small Hall queries can scan a growing set of ineligible authors

**Location:** [query.ts](../src/lib/store/query.ts):12–18; [db.ts](../src/lib/store/db.ts):98–118; [ranking.ts](../src/lib/store/ranking.ts):11–12.

**Trigger:** Many authors have two high-scoring posts: enough points to sort first, but fewer than the three required to enter the Hall.

**Evidence:** The index orders points/max score, then `inHall` filters records in JavaScript. With 2,000 ineligible authors ahead of three eligible ones, `getLeaderboard(3)` needed at least **2,002 cursor-continue calls**, confirmed by the parent's instrumented probe. Grok measured 931.4 ms in fake-indexeddb; Chrome IndexedDB was not timed. The returned ranking was correct.

**Impact:** Read work grows with nonqualifying history despite a tiny page size. The read transaction scopes both stores, so conflicting writes can wait for it. This is not a claim of a synchronous one-second worker lock.

**Recommendation:** Store Hall eligibility and include it in the leaderboard index/range, updating it atomically with author counters and migrating the schema.

**Confidence:** High on algorithmic work; browser latency unmeasured.

## Feed-adapter identity and lifecycle

### ADAPTER-1 — P2: flat activity-page reposts use reshare IDs as new samples

**Location:** [adapter](../src/lib/linkedin/index.ts):311–321; [controller store key](../src/entrypoints/linkedin.content/controller.ts):123–125.

**Trigger:** An activity-page flat “reposted this” card has an original author/body but no nested original node.

**Evidence:** The existing activity fixture's Rowan repost is attributed to Rowan but marked `isBareRepost: false`, with no source ID. Cloning that reshare with header activity IDs 7004 and 7005 produced two Hall keys for the same original text. The controller consequently uses each reshare ID as an independent sample.

**Impact:** Repeated reshares can inflate the original author's sample and points.

**Recommendation:** Recognize flat repost ownership consistently across feed/activity. Recover an original URN when available; otherwise preserve the existing policy of excluding unidentified bare reposts from Hall samples. Do not introduce a text hash as durable identity without edit/collision semantics.

**Adjudication:** The home SDUI case that drops a bare repost without an original ID is deliberate conservative behavior, not a second bug. Grok's P1 was reduced to P2. Its synthetic flat-own-commentary case is a related boundary; live markup for that case was not established.

**Confidence:** High on fixtures and the store-key trace.

### ADAPTER-2 — P2: duplicate connected roots evict one another

**Location:** [adapter](../src/lib/linkedin/index.ts):574–577,483–490.

**Trigger:** Two connected cards resolve to the same URN, or two hookless copies produce the same author/text fallback ID.

**Evidence:** The second root causes `forget(id)`, which calls `onRemove` and removes the first root's adapter hosts while that root is still connected. Parent probes reproduced both URN and fallback cases.

**Impact:** A live card is incorrectly treated as removed. Controller teardown can also restore a previously hidden root; that secondary consequence was traced, not executed.

**Recommendation:** Separate per-root instance identity from durable content identity, allowing multiple live representations while storage dedupes the post. A per-element salt should not become the durable Hall key.

**Confidence:** High for eviction; live same-URN duplication frequency unmeasured.

### ADAPTER-3 — P2: a connected old feed root blocks retargeting

**Location:** [adapter](../src/lib/linkedin/index.ts):824–826.

**Trigger:** An old `main` remains connected but hidden while SPA navigation inserts a new `main` containing the active feed.

**Evidence:** `checkLocation` returns early for any connected previous non-body root. In a parent synthetic-DOM probe, the new post was still unprocessed after popstate plus 700 ms. Replacing/removing the old root normally is already handled.

**Impact:** The adapter watches stale content and misses the active feed until reload or removal of the old root.

**Recommendation:** Re-evaluate the active boundary on navigation and hidden/root changes, then retarget and clean up the old boundary.

**Confidence:** High on the synthetic condition; the condition was not demonstrated on live LinkedIn.

### ADAPTER-4 — P3: one malformed profile link aborts card extraction

**Location:** [adapter](../src/lib/linkedin/index.ts):213–218; outer process catch at line 645.

**Trigger:** A candidate link such as `href="http://[/in/ada"` appears before a valid author link.

**Evidence:** It matches the profile candidate selector, but `new URL` throws before the loop can try the valid author. The whole extraction is swallowed by the outer catch. A parent probe observed no post callback after 400 ms.

**Impact:** One malformed card is skipped until a later mutation causes another attempt. Ordinary LinkedIn output containing this malformed URL was not established.

**Recommendation:** Catch URL parsing per candidate and continue.

**Confidence:** High on the malformed-input behavior, lower on real-world frequency.

## Experimental v2 engine

### EL-1 — P2: bundle ties let a weaker unrelated tell delete stronger evidence

**Location:** [score.ts](../src/lib/engine/score.ts):129–136; [scorecard.ts](../src/lib/engine/scorecard.ts):6; [scorecard schema](../src/lib/engine/scorecard-schema.ts):12–13.

**Trigger:** Two non-overlapping dictionary tells share a bundle and priority.

**Evidence:** The survivor is selected by priority, then lexicographically smaller hashed rule ID. Weight, evidence tier and effective contribution are ignored. Grok found 3,728 dictionary phrases assigned to the `list` bundle at priority 5. Parent public-API assertions reproduced:

| Input change, using neutral padding | Before | After |
|---|---:|---:|
| Add “I'm happy to answer” beside “is a must” | 6 | 4 |
| Add the word “nces” beside “flexible work arrangements” | 4 | 0 |

The stronger signal disappears, so these are not merely changes in length normalization. The `nces` vocabulary row replaces the habit row.

**Impact:** An additional, unrelated match can suppress existing evidence and remove a potential family witness. The general v2 recall failure is already known; this review does not establish how much this defect contributed to it.

**Recommendation:** Restrict bundles to genuinely redundant constructions and use a meaningful representative ordering, including effective evidence contribution and tier. Use rule ID only as the final deterministic tie-break. Validate on development data; do not retune on frozen final sets.

**Confidence:** High, two parent assertion-based tests passed. Grok's P1 was reduced to P2 because this is unshipped v2 and the demonstrated examples remain low scoring. Round 2 has no such bundle selection.

### EP-1 — P2: substantial v2 startup work remains synchronous

**Location:** `runtime-data.ts:3–4`, [compiled-literals.ts](../src/lib/engine/compiled-literals.ts):3–7, [dictionary pack](../src/lib/engine/packs/dictionaries/index.ts):6–7, [scorecard.ts](../src/lib/engine/scorecard.ts):4–6, [compile.ts](../src/lib/engine/compile.ts):17–30,65–132, [controller.ts](../src/entrypoints/linkedin.content/controller.ts):9,331.

**Trigger:** Evaluate the content-script module graph, then analyze the first post.

**Evidence:** Top-level code inflates/parses a 2,001,714-byte runtime table, reconstructs 22,644 literal nodes and creates dictionary/scorecard objects. First engine creation also builds the guard DFA and matchers. The controller imports this graph statically.

| Local Node 26 measurement | V2 | Round 2 |
|---|---:|---:|
| Grok: bundle evaluation | 72.4 ms | 6.5 ms |
| Grok: first empty analyze, after import | 45.5 ms | 11.2 ms |
| Parent: bundle evaluation, separate fresh processes | 112.8 / 150.1 ms | 9.1 / 7.5 ms |
| Parent: first empty analyze | 59.5 ms | 14.4 ms |

Grok's warm average was about 0.35 ms; live heap after GC was about 22 MB. Measurements varied on the shared machine. They are **Node measurements, not Chrome long-task traces**.

**Impact:** The code places substantial decode/allocation/compilation work on the content-script thread before warm scoring. Chrome's exact delay and task boundaries remain unmeasured. This is workload evidence, not a bundle-byte-cap objection.

**Recommendation:** Move initialization/scoring to a worker or split initialization into bounded chunks. Merely dynamic-importing during an idle callback can still leave one long module-evaluation task. Release duplicate decoded tables when they are no longer needed. Preserve useful dictionaries.

**Confidence:** High on synchronous paths and local timings; browser latency unmeasured. The installed round-2 engine lacks these runtime tables.

## Release and evaluation correctness

### REL-2 — P2, already known: ordinary builds select the rejected working tree

**Location:** [package.json](../package.json):15–19; [CI](../.github/workflows/ci.yml):38–48; [pack registration](../src/lib/engine/packs/index.ts):14–18.

**Trigger:** Build or ZIP the current checkout and treat that output as the next release.

**Evidence:** Default commands compile current `src/lib/engine`, which matches frozen rejected v2, not the installed round-2 snapshot. No release-engine approval/digest assertion exists. The existing shared `.output` was additionally a stale earlier v2-family build, not the final packed tree. The installed release was built in an isolated staging copy with round 2 and remains correct.

**Impact:** The next unguarded packaging/copy operation can replace the selected classifier with a rejected experiment.

**Recommendation:** Separate experimental and selected release source, record the selected digest, and assert it before packaging/installation. A normal developer build using the working tree is expected; the missing distinction is in the release workflow.

**Confidence:** High on hashes and commands. This is a known handoff hazard, not a newly discovered classifier regression.

### REL-3 — P2: v2 audit conflates negative AI with human provenance

**Location:** [v2/evaluate.mjs](../eval/v2/evaluate.mjs):10; [v2/audit.py](../eval/v2/audit.py):26–27; [v2 report](../eval/v2/REPORT.md):331–347.

**Trigger:** Read the highest-scoring “human controls” audit.

**Evidence:** Generated effortful AI is relabeled `human` when panel smell is `none` or `some`. Thus the human bucket contains 142 generated rows: 77 none, 65 some. Five some rows score at least 40 and enter the human top list at 89, 82, 62, 56 and 53. Parent metadata-only checks confirmed these groups. Smell-based metrics and the rejection decision are consistent.

**Impact:** The report attributes generated negative controls to humans, confusing false-alarm/provenance analysis. Good AI intentionally belongs among non-slop negatives under the owner's definition; that classification should remain.

**Recommendation:** Separate authorship/provenance labels from slop-target labels and report human versus effortful-AI negatives separately.

**Confidence:** High; no private row text was needed.

### REL-5 — P2: fixture builds overwrite release-named output

**Location:** [package.json](../package.json):19; [wxt.config.ts](../wxt.config.ts):7; [content debug hook](../src/entrypoints/linkedin.content/index.ts):25–29. The security-relevant shadow-mode flag was traced without reviewing frontend design.

**Trigger:** Run e2e, then copy `.output/chrome-mv3` as a release without rebuilding, or run a release command with inherited `SLOP_E2E=1`.

**Evidence:** `pnpm test:e2e` sets the flag and builds into the ordinary output directory. The flag enables open roots and the page-visible debug-count event. A later normal `pnpm zip` rebuilds cleanly unless the flag remains set. The installed bundle has closed roots and no debug hook.

**Impact:** A test artifact can be mistaken for the privacy-hardened release artifact. No privileged-data exploit through the count event itself was demonstrated.

**Recommendation:** Give fixture builds a separate output directory; make an explicit release command refuse/clear the flag and verify debug code absent. Forcing the flag false on every production-mode build without adapting fixture tests would break the current test workflow.

**Confidence:** High on build configuration and installed negative checks.

### REL-6 — P3: fixture e2e failures do not gate artifacts

**Location:** [CI](../.github/workflows/ci.yml):44–57.

**Trigger:** Fixture e2e fails while the independent build job succeeds.

**Evidence:** The e2e job has `continue-on-error: true`. The build uploads ZIPs without depending on it.

**Impact:** A successful workflow/artifact does not establish fixture e2e passed. This review does not claim the suite is currently failing.

**Recommendation:** Make the stable fixture suite gating and make release-artifact publication depend on it.

**Confidence:** High, workflow semantics only.

## Validation performed

The parent's baseline command passed **225 existing tests in 17 files**:

```sh
pnpm vitest run tests/unit/store tests/unit/settings tests/unit/linkedin tests/unit/content
```

The parent also ran **31 distinct scratch probe cases** across delivery, adapter, persistence and scoring. The original persistence probes were strengthened with exact result assertions and cursor-call counting before rerunning; their duplicate run is not counted twice.

```sh
pnpm exec vitest run --config .playwright/adversarial-review-20261021/delivery/vitest.config.ts
# 12 passed
pnpm exec vitest run --config .playwright/adversarial-review-20261021/adapter/vitest.config.ts
# 12 passed
pnpm exec vitest run --config .playwright/adversarial-review-20261021/persistence/parent-vitest.config.ts
# 5 passed
pnpm exec vitest run --config .playwright/adversarial-review-20261021/engine_logic/parent-vitest.config.ts --disableConsoleIntercept
# 2 passed; score suppression 6 -> 4 and 4 -> 0
```

Passing scratch probes assert the observed defect/condition; they do not mean the defect is fixed. They remain under ignored `.playwright/` for local reproduction and are not production regression tests.

Additional parent checks:

- Enumerated WXT source-ZIP defaults with its installed tinyglobby dependency, without building or archiving.
- Compared frozen root/round-2 engine hashes and installed release hashes.
- Checked eval provenance using labels/counts only.
- Re-ran four bounded fresh-process Node startup cases against the review bundles. Each child had a 512 MB heap cap and a 4.5-second kill timer; none timed out.
- Rechecked all 78 captured runtime/tooling files; none changed.
- Found no surviving review probe processes.

Review-local task receipts, source hashes and probe files are in `.playwright/adversarial-review-20261021/`. They are ignored scratch artifacts and may be cleaned later; this document is the consolidated durable report.

## Negative checks and concerns that were not promoted to findings

**Trust/security.** Store/settings listeners check `sender.id`; there is no `externally_connectable` bridge. Import/clear additionally require an extension-page URL. Static ID disclosure did not establish message access. Web-accessible resources are image globs with dynamic URLs; installed matching files are WebP, not executable HTML/JS/SVG. Installed roots are closed and the debug hook is absent. Trusted click checks guard actions. Avatar fetches omit credentials. The page was not shown to reach settings mutations.

**Persistence/delivery.** Existing transaction rollback and concurrent-batch tests passed. Retained rows dedupe actions, including lost-ack retries. Score histograms/aggregates stayed internally consistent through rescore, stale updates, expiry and export/import probes. Queues and dedupe caches are capped; backoff has a 60-second ceiling; missing actions have a bounded attempt count. No retry storm or unbounded client cache was evidenced. Midnight-buffer discard is deliberate and tested.

**Adapter.** Nested originals with URNs still acquire source IDs. Removal and ordinary root replacement work. Forty-card extraction stayed bounded; counter/timestamp-only changes did not cause new post callbacks in the probes. The pending heap kept the expected minimum through 2,000 random operations. A literal “Promoted” headline meeting the existing ad heuristic was treated as known rule behavior. No captured activity-comment markup supported a separate ownership finding.

**Engine.** Grok checked 9,082 current literal phrases and round-2's 217 under case, doubled-space and curly-apostrophe variants; no self-match miss was reported. Guard witnesses and generated regex witnesses produced no prefilter miss. No duplicate IDs, live rule missing its scorecard, or mixed gun/habit family was found. Repeated analyses were deterministic on tested inputs. Seventy-seven bounded regex/input pairs produced no catastrophic backtracking. Large-input cost was roughly linear; 100 repeated analyses did not show retained-heap growth.

**Unproven runtime possibilities.** Resource Timing may expose loaded dynamic asset URLs; not measured. A forged WXT custom event, DOM clobbering of the browser global, a never-settling message port, a lost reset broadcast, and an older settings response arriving after a newer change were not established as reachable failures. Oversized `data-full-text` can make a synchronous scoring turn expensive, but no fixture/live evidence showed LinkedIn emitting hundreds of kilobytes in that field. Browser startup long-task duration and Chrome leaderboard-query latency remain unmeasured.

**Research-tool robustness concerns, not demonstrated bad results.** `eval/v2/common.mjs:26` returns an empty Wayback set when its file is absent; the reviewed run had all 410 rows. `eval/round2/report.mjs` writes literal PASS verdict cells, but this run's metrics agree with its criteria. The v2 one-shot lock is written before corpus loading, so a later exception could consume an attempt; no failed one-shot was induced. These deserve fail-closed harness checks if the tooling is reused, but do not invalidate the reviewed completed evaluations.

**Written engine behavior.** An unclosed code fence protects text through the end; a closed fence does not hide later direct fingerprints. Round-2 signal evidence points need not sum to a fingerprint-floored score. These are existing contracts, not additional bugs.

## Suggested order of work

1. Close REL-1 before any source archive is distributed; add durable private-output ignores and release-artifact checks at the same time.
2. For the installed runtime, address author-ID canonicalization, action/outbox durability, bootstrap retry and stale destroyed-state handling. Remove the WXT ID broadcast.
3. Correct activity-repost sample identity and separate card instances from durable post IDs; add retained-old-root coverage.
4. Index Hall eligibility. Decide whether the documented retention/dedupe tradeoff remains acceptable for the MVP.
5. Keep v2 unshipped. Fix its evidence selection on development data before any new evaluation; measure initialization in Chrome and move/chunk the work if continuing that engine.

No classifier retuning or production fixes were applied during this review.

