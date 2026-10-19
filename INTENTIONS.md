# Intentions

The owner's intentions for Slop Shame, in the order they were given, plus the
decisions they led to and where the build stands. Read this first after any
context loss. Append, don't rewrite history.

## Product intentions (from the owner)

1. **Slop Shame** is a Chrome extension that works in Chrome and every
   Chromium browser (Edge, Brave, Arc…). Name is final.
2. Scope for now: the **LinkedIn home feed** only.
3. Every post gets a **Slop Index** (a score) from a heuristic, dictionary-of-
   phrases style detector. It should be **fun**.
4. A **Destroy** button: the post *literally erupts* and is destroyed.
5. A **Slop Shame** button: generates a funny shame using pre-written shame
   formats. Must be genuinely funny.
6. **Different icons for different slop levels** — lots of graphic, funny
   assets. Assets are generated with OpenAI image models (via GPT-6.1-Sol on
   Codex), cleaned up with CLI tools (background removal, etc.).
7. The agent (Claude) builds **and tests everything itself**, using the
   orchestration tools and subagents.
8. **Public GitHub repository**, but **don't push/sync yet**.
9. Base the heuristic on the owner's `~/Code/avoid-ai-writing` detector (and/or
   `~/Code/blader/humanizer`) — but **don't copy it blindly**: improve it where
   useful.
10. The engine must be **pluggable** so other people can contribute rules, and
    **scalable**.
11. It runs in the browser, so it must be **extremely fast**.
12. A **local leaderboard of top slop posters** ("Hall of Slop"). All data is
    **local** — no database server. When the same person posts multiple
    high-slop posts, they **climb the ranking**.
13. Keep this file updated so work can resume after context loss.
14. Opus subagents must run at high or extra-high reasoning effort, never the
    default medium (recorded in the orchestrator's router.md too).
15. Owner is unsure how roasting should work — proposed design below; awaiting
    their reaction.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Build framework | WXT (MV3) | Owner picked; Chromium-wide, typed manifest, HMR, zip. |
| UI | Svelte 5 in Shadow DOM | Owner delegated. Built-in springs/transitions for fun UI; no VDOM; tiny runtime. Leaks are prevented by unmounting on post removal + one shared FX canvas. |
| Package manager | pnpm | Owner picked. |
| Testing | Playwright on saved feed fixtures + a dedicated Chromium profile the owner logs into once | Owner picked. |
| Engine shape | Rule packs (`RulePack`): data-only `PhraseRule`s + `CustomRule`s over a shared, precomputed `PostContext` | Pluggable for contributors, fast (one tokenization, precompiled matchers). |
| AI-tell rules | Adapted from avoid-ai-writing (MIT, credited) — ported as a rule pack, not vendored whole | Speed + improvement freedom. |
| Leaderboard storage | IndexedDB in the extension origin, written only by the background worker via batched messages | Private to the extension (not linkedin.com's origin), indexed queries, scales to thousands of authors. |
| Ranking | `slopPoints` per author, monotonic in slop posts; posts deduped by id | Repeat sloppers climb; re-scrolling never double-counts. |
| Shame target | The post's author, rendered as a shareable card for the user | Interpretation — confirm with owner. |
| Roast mechanics (proposed) | Pre-written templates (40+) with slots filled from the real post (its actual slop quotes, score, tier, author, repeat-offender count), rendered into themed card layouts (wanted poster with author avatar, certificate with gold seal, parking-ticket citation, tabloid front page, report card, eulogy) using the generated art + Sloppy; downloadable as PNG. No AI at runtime — fully local. | Funny, specific, fast, private. |
| Real-LinkedIn testing browser | Playwright Chromium (Chrome for Testing) with persistent profile `.playwright/linkedin-profile` | Branded Chrome no longer supports `--load-extension`. |
| License | MIT | Public repo default. |

## Model routing (subagent-orchestrator)

- Opus 5.5 (orchestrator, Claude Primary): architecture, contracts, review.
- Opus 5.5 subagent (Claude Secondary): all UI, FX, shame copy, leaderboard page.
- GPT-6.1-Sol (Codex accounts): engine + packs + tests; LinkedIn adapter +
  Playwright harness; leaderboard store; image generation pipeline.

## Status

- [x] Stack chosen, project scaffolded, contracts written (`src/lib/*/types.ts`,
      `src/lib/engine/rule-types.ts`, `src/lib/engine/tiers.ts`)
- [ ] Slop engine + rule packs + unit tests — delegated (Sol xhigh, codex_account_3, task slop-shame-engine-r1)
- [ ] LinkedIn feed adapter + fixtures + Playwright harness — delegated (Sol xhigh, codex_quaternary, slop-shame-adapter-r1)
- [ ] Leaderboard store (IndexedDB, background) — delegated (Sol xhigh, codex_nush, slop-shame-store-r1)
- [ ] Assets (tier icons, buttons, shame art, mascot "Sloppy", extension icon) — delegated (Sol high, codex, slop-shame-assets-r1); art direction in the task prompt, prompts saved to assets-src/prompts/
- [ ] UI: badge, Destroy eruption, Shame modal, popup, Hall of Slop page — delegated (Opus xhigh, claudeAgent_cash, slop-shame-ui-r2; r1 cancelled for running at medium)
- [ ] Orchestrator review + integration + commit of each workstream
- [x] Owner logged in to LinkedIn once (profile `.playwright/linkedin-profile`, verified: feed loads)
- [ ] End-to-end test on real LinkedIn
  - Finding: the real feed uses LinkedIn's new SDUI markup (hashed classes, no `data-urn`). Stable hooks: `data-view-name` (`feed-full-update` = post card, `feed-commentary` = text, `feed-actor` = author), `componentkey` (`expanded<id>FeedType_MAIN_FEED_RELEVANCE`), `data-sdui-anchor-id="feed-header-urn:li:activity:<n>-0"`. Sent to the adapter agent as a steer.

## Open questions for the owner

- Shame target: the post's author (current assumption) or something else?
