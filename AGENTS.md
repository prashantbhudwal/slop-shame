# Slop Shame — agent guide

Read first, in order:

1. `START-HERE.md`: where the project stands and what exists only on the
   owner's machine.
2. `INTENTIONS.md`: the owner's intentions and decisions, in order; later
   items override earlier ones.
3. `FINDINGS.md`: what the scoring experiments measured.

`HANDOFF.md` is a raw log of agent status notes. Read it only to trace the
history of a specific change.

`INTENTIONS.md` holds only intentions the owner actually stated, in their
words. Append a new item when the owner states one; never add your own
status, plans or "intentions" there. Status notes go to `HANDOFF.md` or the
PR description.

Chrome MV3 extension (works in any Chromium browser) that gives every LinkedIn
feed post (home feed and author activity pages) a **Slop Index** (0–100), a
tier icon, a **Destroy** button (the post erupts and is gone) and a **Shame**
button (a funny generated shame card for the post's author).

## What slop means

- Slop is **zero-effort output pasted from a cheap model**, with obvious,
  nameable tells (leftovers, templates, chatbot chatter, filler formulas).
  This is not an AI detector: human writing and careful, edited AI writing are
  both negatives. The index means "amount of obvious low-effort slop", never
  "probability of AI". Words that merely correlate with AI (delve, tapestry)
  stay weak and must never flag a post alone.
- It's a general-text problem; LinkedIn is only the first surface. Keep
  LinkedIn specifics in the adapter and UI.
- Badges show at 40+ only. Never label a low-scoring post human or "no slop".
- The curated dictionaries (`data/dictionaries/`, packs in
  `src/lib/engine/packs/`) are core. Tier them entry by entry on evidence;
  the curators' weights are the prior. Never drop a whole dictionary, source
  or category because of one aggregate metric.
- Scraped LinkedIn text (Kaggle 2021, Wayback) is for false-alarm checks and
  threshold setting only: never for weights, never committed or shipped.
- **The engine in `src/lib/engine/` is the v2 experiment, which was rejected**
  (it caught 7/351 fresh slop posts against round 2's 61). The shipped
  round-2 engine isn't in git yet. Don't build a release from the v2 engine,
  and don't tune on the final eval sets.

## Stack

- WXT (Vite) + TypeScript, Svelte 5 for all UI, pnpm.
- Vitest for unit tests (`tests/unit`), Playwright for e2e (`tests/e2e`)
  against saved LinkedIn feed fixtures (`tests/fixtures`).
- No runtime network calls. Everything is local and heuristic.

## Layout and ownership

| Path | What | Rules |
|---|---|---|
| `src/lib/engine/` | Slop scoring engine | Pure TS, no DOM, no deps. Public API in `index.ts`: `analyzePost(input: PostInput): SlopReport`. Contracts: `types.ts`, `rule-types.ts`, `tiers.ts`. |
| `src/lib/engine/packs/` | Rule packs (the pluggable dictionary) | One file per pack; each exports a `RulePack`. Registered in `packs/index.ts`. |
| `src/lib/linkedin/` | LinkedIn DOM adapter | **The only place LinkedIn selectors may exist.** Contract: `types.ts` (`watchFeed`). |
| `src/lib/ui/` | Svelte components injected into posts (and the profile summary) | Rendered inside Shadow DOM, in our own host elements that the adapter inserts (chip in the action bar, tag on the name line, a zero-size decoration host as the card frame's last child, and on activity pages a summary host as the first child of the left rail's profile card); never style LinkedIn's DOM directly. One exception, recording and restoring every write: `fx/collapse.ts` (hiding a destroyed post). Anything drawn over a post (the Drip Edge along the card's top edge, the avatar ring and monster; never a frame around the whole card) lives inside the card so it scrolls with it: no fixed overlays synced to scroll. Popovers hang from their control with CSS anchor positioning (anchor and popover in the same shadow root). |
| `src/lib/fx/` | Explosion/eruption effects | One shared, lazily created canvas overlay for all effects. |
| `src/lib/shame/` | Shame formats + generator | Formats are data (`ShameFormat`). |
| `src/lib/store/` | Hall of Slop leaderboard (IndexedDB, extension origin) | Contract: `types.ts`. Only the background worker writes; content scripts send `StoreMessage`s. |
| `src/lib/settings/` | `browser.storage` backed settings | |
| `src/entrypoints/linkedin.content/` | Content script wiring | |
| `src/entrypoints/popup/` | Toolbar popup | |
| `src/entrypoints/leaderboard/` | Hall of Slop full page | Not built yet; new UI or design needs the owner's approval. |
| `public/assets/` | Final, optimized assets | `tiers/<tierId>.webp`, `ui/`, `fx/`, `shame/`, `mascot/`. Loaded in pages via `browser.runtime.getURL('/assets/…')`; must be listed in `web_accessible_resources` for linkedin.com. Extension icons: `public/icon/<size>.png`. |
| `assets-src/` | Asset pipeline: `prompts/` (committed), `raw/` (gitignored), `processed/` | |

## Performance rules (the feed is infinite; we run on the main thread)

- Engine: < 1 ms per 300-word post. Precompile all matchers once. Shared
  `PostContext`; rules never re-split text.
- Score posts lazily (IntersectionObserver / idle callbacks), cache reports by
  post id.
- One MutationObserver for the feed. When LinkedIn removes a post, unmount its
  Svelte component and drop every reference (no detached-DOM leaks).
- Assets: small WebP, lazy-loaded via `browser.runtime.getURL`.

## Local-only data

Most eval data is gitignored and exists only on the owner's machine
(`data/eval/raw/`, `tests/fixtures/feed/captured/`, `assets-src/raw/`); see
`START-HERE.md`. `pnpm check`, `pnpm test` and `pnpm test:e2e` must pass on a
fresh clone without it. A script that needs local data must say so and fail
with a clear message. Never commit anything from `data/eval/raw/`.

## Commands

```bash
pnpm dev          # WXT dev mode (opens Chromium with the extension)
pnpm build        # production build → .output/chrome-mv3
pnpm test         # vitest unit tests
pnpm test:e2e     # build + playwright against fixtures
pnpm check        # svelte-check / types
```

## Third-party credit

Some AI-tell rules are adapted from
[avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) (MIT, ©
Conor Bronsdon). Keep the attribution in the pack and in `THIRD_PARTY_NOTICES.md`.

## Machine etiquette

- Prefer headless browsers. Real-LinkedIn checks stay minimal and gentle: a
  few page loads on a logged-in profile, no automation.
- On the owner's Mac only: headed windows go on the second monitor with
  `--window-position=2600,0`, never the main one.
- One Chromium/Playwright browser per agent at a time; Playwright `workers: 1`.
  Close contexts and make sure the browser process tree is gone when done.
- One `rembg`/onnxruntime process at a time, model loaded once per batch
  (`rembg p` or a single `new_session()`), `OMP_NUM_THREADS=2`.
- No full V8 heap snapshots of large pages unless essential (one, after GC).
- Kill any long-running process you started before finishing your task.
