# Contributing to Slop Shame

Thanks for helping fight the slop. The most useful contribution is a new rule
that catches AI-written posts without catching humans. That's usually a few
lines of data plus two tests.

## Dev setup

You need Node.js 22+ and [pnpm](https://pnpm.io/installation).

```bash
pnpm install     # also runs `wxt prepare`
pnpm dev         # opens Chromium with the extension loaded and hot reload
pnpm check       # svelte-check + TypeScript
pnpm test        # Vitest unit tests (engine, adapter, store)
pnpm test:e2e    # production build + Playwright against saved feed fixtures
pnpm build       # production build in .output/chrome-mv3
```

For the first e2e run, install Playwright's Chromium with
`pnpm exec playwright install chromium`. The e2e suite uses synthetic feed
fixtures and never needs a LinkedIn login. See
[tests/e2e/README.md](tests/e2e/README.md).

## Where things live

[AGENTS.md](AGENTS.md) has the full map and per-directory rules. The short
version:

| Path | What |
|---|---|
| `src/lib/engine/` | The scoring engine. Pure TypeScript, no DOM, no dependencies. |
| `src/lib/engine/packs/` | Rule packs. **This is where most contributions go.** |
| `src/lib/linkedin/` | The LinkedIn DOM adapter. The only place LinkedIn selectors are allowed. |
| `src/lib/ui/`, `src/lib/fx/` | Svelte components (in Shadow DOM) and the eruption effects. |
| `src/lib/shame/` | Shame card formats and the generator. |
| `src/lib/store/` | The Hall of Slop (IndexedDB, written only by the background worker). |
| `tests/` | Unit tests, e2e tests, and fixtures, including the calibration corpus. |

## Add a slop phrase in 2 minutes

Read the **[rule pack guide](src/lib/engine/packs/README.md)**. It has the
rule format, matching behaviour and regex rules. In short:

1. Pick the pack in `src/lib/engine/packs/` that fits, and a category from
   `SlopCategory` in `src/lib/engine/types.ts`.
2. Add a data-only `PhraseRule` with a namespaced id (`<pack-id>.<rule-id>`).
3. Add a positive test (AI-ish text that fires it) and a negative test (a
   plausible human sentence that doesn't).
4. Run `pnpm test`. The calibration test checks that nothing in the human
   corpus got slopped.

The engine validates ids, weights, categories and regexes when it starts, so
mistakes fail loudly in tests. Don't change the contracts (`types.ts`,
`rule-types.ts`) just to add a rule.

### Weight scale

| Weight | Meaning | Example |
|---|---|---|
| **2** | Faint tell. Ordinary humans say this too. | "leverage", "navigate" |
| **5** | Clear tell. A recognisable formula. | "It's not X, it's Y." |
| **10** | Smoking gun. Basically only a model writes this. | "Certainly! Here's a LinkedIn post…" |

Leaked artifacts like `[Your Name]` or `utm_source=chatgpt` can go up to 14.
When in doubt, go lower. Prefer `repeat: 'sqrt'` or a cluster threshold to
punishing every use of a normal word.

### False positives: precision beats recall

This extension shames real people on a public feed. Calling a human's post
slop is far worse than missing some AI slop. So:

- A single weak word must never push an otherwise human post out of
  **Artisanal Human**. Slop should need several independent tells.
- Ask "would a tired human write this at 11pm?" If yes, weight it 2 or skip it.
- Slop means AI-written text. "Posts I find annoying" isn't a category; a
  genuine humblebrag written by a human is not slop.
- If you can't write a convincing negative test, the rule is probably too
  broad.

Run the corpus against real posts you know were human-written before opening
the PR. If you add calibration posts, remove names and identifying details.

## LinkedIn selectors

LinkedIn changes its markup often, and lately it ships hashed class names.
To keep breakage in one place, **all LinkedIn selectors and DOM knowledge
live in `src/lib/linkedin/`**. UI, engine and store code get plain data
(`PostInput`, `PostAuthor`) through `watchFeed` and never query LinkedIn's
DOM directly. Prefer stable hooks (`data-view-name`, `componentkey`, URNs)
over class names, and add a fixture to `tests/fixtures/feed/` when you
support new markup.

## Other rules

- **No network calls.** No telemetry, no remote config, no AI APIs. If a
  feature needs a server, it doesn't belong here.
- **Performance.** The feed is infinite and we run on the main thread. The
  engine budget is under 1 ms per 300-word post; rules never re-split text or
  build regexes inside `detect()`.
- **No new permissions** without a good reason in the PR, and an update to
  [PRIVACY.md](PRIVACY.md).
- **Credit borrowed patterns** in the pack's `attribution` and in
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- **Privacy in issues.** Don't paste private posts or people's names into
  issues, fixtures or tests.

## Pull requests

Keep PRs small and focused. Fill in the PR template checklist; CI runs
`pnpm check`, `pnpm test` and `pnpm build` on every PR.

By contributing you agree your work is released under the [MIT License](LICENSE).
