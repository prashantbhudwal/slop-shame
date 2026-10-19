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
| `src/lib/ui/` | Svelte components injected into posts | Rendered inside Shadow DOM; never style LinkedIn's DOM directly. |
| `src/lib/fx/` | Explosion/eruption effects | One shared, lazily created canvas overlay for all effects. |
| `src/lib/shame/` | Shame formats + generator | Formats are data (`ShameFormat`). |
| `src/lib/store/` | Hall of Slop leaderboard (IndexedDB, extension origin) | Contract: `types.ts`. Only the background worker writes; content scripts send `StoreMessage`s. |
| `src/lib/settings/` | `browser.storage` backed settings | |
| `src/entrypoints/linkedin.content/` | Content script wiring | |
| `src/entrypoints/popup/` | Toolbar popup | |
| `src/entrypoints/leaderboard/` | Hall of Slop full page | |
| `src/assets/` | Final, optimized assets (bundled) | `tiers/<tierId>.png`, `ui/`, `shame/`. |
| `assets-src/` | Asset pipeline: `prompts/` (committed), `raw/` (gitignored), `processed/` | |

## Performance rules (the feed is infinite; we run on the main thread)

- Engine: < 1 ms per 300-word post. Precompile all matchers once. Shared
  `PostContext`; rules never re-split text.
- Score posts lazily (IntersectionObserver / idle callbacks), cache reports by
  post id.
- One MutationObserver for the feed. When LinkedIn removes a post, unmount its
  Svelte component and drop every reference (no detached-DOM leaks).
- Assets: small PNG/WebP, lazy-loaded via `browser.runtime.getURL`.

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
