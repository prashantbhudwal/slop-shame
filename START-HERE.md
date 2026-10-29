# Start here

For collaborators joining Slop Shame. This page says where the project stands
and what you can ignore, since most of the history happened on Prashant's
machine. Last updated 2026-10-29.

## Read in this order

1. **This page.**
2. [`INTENTIONS.md`](INTENTIONS.md): what Prashant (the owner) asked for, in
   order. Later items override earlier ones. Items 31–36 matter most for
   scoring work.
3. [`FINDINGS.md`](FINDINGS.md): what the experiments measured, and why the
   current engine looks the way it does.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md): setup,
   code map and rules. `AGENTS.md` is also what Claude Code, Codex and other
   coding agents read.

[`HANDOFF.md`](HANDOFF.md) is a raw log written by agents for other agents.
It's full of local paths and agent accounts you don't have. Read it only to
trace the history of a specific change.

## What "slop" means

Slop is not AI writing. It's **zero-effort output pasted from a cheap model**,
with obvious, nameable tells: leaked prompt labels, `[placeholders]`,
"It's not X. It's Y.", "Here are 5 ways…", engagement-bait closers. Human
writing and careful, edited AI writing are both negatives. The index means
"how much obvious low-effort slop", never "probability this is AI". Only posts
at 40+ get a badge. Low scores show nothing; we never call a post human.

## Setup

Node.js 22+ and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium   # once, for e2e
pnpm check        # types
pnpm test         # unit tests
pnpm test:e2e     # build + browser tests on saved feed fixtures
pnpm build        # → .output/chrome-mv3, then "Load unpacked" in chrome://extensions
```

All of these pass on a fresh clone with no extra data (checked 2026-10-29):
0 type errors, 714 unit tests on `master` and 656 on `round2-engine`, and 25 e2e
tests (1 skipped) on both. The round-2 engine is a little slower, so its timing
tests can fail when the machine is busy; `pnpm test --maxWorkers=1` passes. The e2e suite uses synthetic fixtures and never
logs in to LinkedIn.

## Where things stand

- **Use the `round2-engine` branch to build what Prashant runs.** It is
  `master` with the shipped round-2 engine in `src/lib/engine/`,
  byte-identical to the engine in his installed build. Everything outside the
  engine matches `master`, so it also carries the 9 review fixes below.
  Results for round 2 are in `eval/round2/REPORT.md`.

  ```bash
  git switch round2-engine
  pnpm build
  ```
- **The engine on `master` is the rejected v2 experiment.** Classifier v2
  (`src/lib/engine/scorecard.ts`, `compiled-literals.ts`, the tiered
  dictionaries) failed its final comparison: it caught 7 of 351 fresh slop
  posts, against 61 for round 2. Builds from `master` badge far fewer posts.
  It stays on `master` as a record of the experiment until Prashant decides
  which engine `master` should carry.
- **Feed UI works:** action-bar chip, avatar ring and monster, Drip Edge along
  the top of the card, Destroy, Shame cards, and a slop summary on author
  activity pages.
- **The 9 validated fixes from the adversarial review are in `master`**
  (`research/adversarial-review-validation-2026-10-21.md`). They pass the unit
  tests but haven't been checked on live LinkedIn.
- **The Hall of Slop full page isn't built.** The store and ranking exist; the
  page doesn't. Any new UI or design needs Prashant's sign-off first.
- **Chrome Web Store:** registration is blocked on a Google payment error on
  Prashant's account. Listing and privacy drafts are in `publishing/`.

## What you don't have, and what to do about it

| Thing | Status | What to do |
|---|---|---|
| Curated slop dictionaries (`data/dictionaries/`) | In git | Nothing. |
| Small public eval samples and generated LinkedIn-style AI sets (`data/eval/samples/`, `data/eval/generated/`) | In git | `pnpm eval --committed-only` runs on these. |
| Big research corpora: RAID, Write & Improve, AESLC, Human Detectors, DetectRL-X | Gitignored (`data/eval/raw/`, ~1 GB) | Fetch them yourself: see [`eval/README.md`](eval/README.md) and `scripts/eval/`. Read each licence in [`data/eval/MANIFEST.md`](data/eval/MANIFEST.md) first; several are non-commercial research only. |
| Human LinkedIn posts (Kaggle 2021 scrape, Wayback posts) | Gitignored, not shareable | Kaggle needs your own account. Wayback: `scripts/eval/wayback.py`. Use them only for false-alarm checks, never for weights. Never commit them. |
| Frozen engine snapshots, reader-panel labels, prompt collection, hill-climb intermediates | Only on Prashant's machine | Ask him if you need one. |
| Real LinkedIn feed captures (`tests/fixtures/feed/captured/`) | Gitignored | Not needed for the tests. |
| Real-LinkedIn browser check | Opt-in | `pnpm linkedin:login` with your own account, then `SLOP_REAL=1 pnpm test:e2e --project=real-linkedin`. Keep it to a few gentle page loads; no automation. |

Some committed experiment scripts under `eval/` import files from
`data/eval/raw/`. They won't run without that data, and they're excluded from
`pnpm check`.

## Things you can safely ignore

- **Agent names and accounts** in the docs: Sol, Astra, Luna, Grok, Gemini,
  "Codex Primary/Secondary/Tertiary/Quaternary", "Claude Primary", T3 task IDs,
  "the orchestrator". That's how Prashant ran his own agents. You don't need
  any of it; use whatever tools you like.
- **Model-routing sections** in `INTENTIONS.md` and `FINDINGS.md`.
- **`~/slop-shame-extension` and `~/slop-shame-builds/`**: Prashant's
  installed copy and release folders.
- **The "second monitor" rule** in `AGENTS.md`: it applies only to Prashant's
  Mac.
- **Chrome Web Store account and payment notes**: Prashant's to handle.

## Known stale docs

- `README.md` still lists a "No Slop Found" tier, describes density scoring,
  and mentions a **Clear all** button. None of that matches the current
  product: low scores show nothing, scoring adds up evidence, and there is no
  Clear all yet.
- Section 8 ("In flight") of `FINDINGS.md` is a snapshot from 2026-10-21.

## Ground rules

- No network calls from the extension. Everything is local.
- LinkedIn selectors live only in `src/lib/linkedin/`.
- Never commit anything from `data/eval/raw/`, or any scraped or licensed text.
- Keep the curated dictionaries in the scorer. Let the data set each entry's
  weight; don't drop a whole source because one aggregate number looked bad.
- `INTENTIONS.md` holds the owner's own words and decisions only. Put status
  notes in `HANDOFF.md` or your PR.

## Good next steps

1. Decide with Prashant whether `round2-engine` should replace the engine on
   `master`.
2. Check the adversarial-review fixes on the live feed.
3. Fix the stale parts of `README.md`.
4. Scoring: FINDINGS §5 lists the giveaways human readers spot that our rules
   still miss.
