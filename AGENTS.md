# Slop Shame — agent guide

Read `INTENTIONS.md` first: the owner's intentions, decisions and build status.
Keep it updated when intentions or status change.

Chrome MV3 extension (works in any Chromium browser) that gives every LinkedIn
home-feed post a **Slop Index** (0–100), a tier icon, a **Destroy** button
(the post erupts and is gone) and a **Shame** button (a funny generated shame
card for the post's author).

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
| `src/entrypoints/leaderboard/` | Hall of Slop full page | |
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

## Machine etiquette (several agents share the owner's Mac)

- Headed browsers (real-LinkedIn checks, probes) go on the owner's second
  monitor, a portrait BenQ GW2480 at global x=2560: pass
  `--window-position=2600,0`. Never on the main monitor (macOS clamps
  off-screen positions like -2400,-2400 back onto it). Prefer headless.
- One Chromium/Playwright browser per agent at a time; Playwright `workers: 1`.
  Close contexts and make sure the browser process tree is gone when done.
- One `rembg`/onnxruntime process at a time, model loaded once per batch
  (`rembg p` or a single `new_session()`), `OMP_NUM_THREADS=2`.
- No full V8 heap snapshots of large pages unless essential (one, after GC).
- Kill any long-running process you started before finishing your task.
