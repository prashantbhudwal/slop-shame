# Performance and memory soak

Run from the repository root with the existing Playwright Chromium installed:

```sh
pnpm perf
```

This builds the extension and runs a fixture-only baseline followed by an
extension run, each scrolling past **500 posts** by default. Use **`pnpm perf
--full` for 2,000 posts**. The cleanup phase in each profile jumps back to the top,
waits, and forces GC twice before closing that browser. At the default 2,200 px/s,
allow about **4 minutes** for the routine run or **14 minutes** for `--full`.
A fresh temporary profile is created and deleted for each browser. The real
LinkedIn profile is never opened. No new dependencies are required.

Exactly **one owned Chromium instance** is allowed at a time. The runner uses a
minimal persistent-context launcher because the shared e2e helper currently has
no launch-args option. Both profiles launch with
`--js-flags=--max-old-space-size=1024` and `--renderer-process-limit=2`; extension
mode also gets the two extension-loading flags. Work is strictly serial (one
worker, no Playwright worker pool). Each browser is closed and its entire process
tree verified gone before the next is launched. `try/finally`, signal handlers
(SIGINT, SIGTERM, SIGHUP), fatal-error handlers, and an exit hook clean up owned
processes, escalating to SIGKILL when necessary. Ownership is limited to this
run's random temporary profile and its discovered descendants. Other agents'
browsers are never selected. GC must precede closing its measured browser:
launching a new process for GC would discard the retained heap being measured.

The local server binds an ephemeral loopback port. Playwright routes the served
HTML, script, and corpus to `https://www.linkedin.com/feed/` so Chrome's actual
content-script match pattern fires. All other HTTP(S) browser requests are
fulfilled with empty responses. It does not contact LinkedIn.

## Outputs and exit status

- `test-results/perf/report.md`: latest metrics table, budgets, verdict, and methods.
- `test-results/perf/report.json`: latest machine-readable report.
- `test-results/perf/<timestamp>/`: preserved reports, per-profile JSON, and raw
  V8 `.cpuprofile` files (open with DevTools' JavaScript profiler).
- `test-results/` is already gitignored.

`PASS` means all available budgets and the UI coverage checks passed. `FAIL`
exits **1** for any exceeded budget or uncaught page error. `INCOMPLETE` exits
**0** when the build runs but has no UI or a required measurement is unavailable;
it is **not** a performance certification. In particular, an unfinished content
script prints **"no extension UI detected"** and leaves the UI checks unavailable.
Other measurable budget failures still fail even when UI is absent. An
infrastructure error writes an error report and exits **1**.

## Budgets and configuration

`scripts/perf/budgets.mjs` is the single configuration file. Every byte budget is
in MiB (1,048,576 bytes). A value equal to a limit passes; exceeding it fails.

| Metric | Default limit | Environment override |
|---|---:|---|
| Recovery heap above baseline recovery, after GC | 5 MiB | `SLOP_PERF_HEAP_OVER_BASELINE_MB` |
| Worst raw post-GC heap growth per 1,000 posts | 1 MiB | `SLOP_PERF_HEAP_GROWTH_MB` |
| Retained detached extension mounts | 5 | `SLOP_PERF_DETACHED_MOUNTS` |
| Longest task with an extension CPU sample | 50 ms | `SLOP_PERF_LONG_TASK_MS` |
| Extension scroll p95 frame interval minus baseline p95 | 4 ms | `SLOP_PERF_FRAME_P95_DELTA_MS` |
| Average extension scripting per visited post | 1.5 ms | `SLOP_PERF_SCRIPTING_MS_PER_POST` |

Settled UI checks also require one mount per live DOM post, zero duplicate mounts,
zero connected orphan mounts, one populated UI host per visible post after recovery, and no more UI
instances after recovery than at the initial top-of-feed checkpoint. Offscreen
cards may be scored lazily. Physical mounts, open shadow hosts, and populated UI
hosts are counted separately; an empty adapter mount does not imply working UI.

Useful workload overrides:

```sh
# Re-run an existing build at the normal workload.
node scripts/perf/run.mjs

# Opt in to 2,000 posts; the default remains 500.
pnpm perf --full

# Repeatable alternate text/order and a faster continuous scroll (500 posts).
SLOP_PERF_SEED=42 SLOP_PERF_SCROLL_PX_PER_SECOND=6000 pnpm perf

# Short infrastructure smoke; normalized heap slopes on so few posts are noisy.
SLOP_PERF_POSTS=60 SLOP_PERF_CHECKPOINT_POSTS=30 \
  SLOP_PERF_SCROLL_PX_PER_SECOND=12000 pnpm perf

# Show Chromium; keep the window foregrounded for representative frame pacing.
SLOP_HEADED=1 pnpm perf

# Metric math and budget failure-path tests (no browser).
node --test tests/perf/metrics.test.mjs

# Fixture lifecycle, isolated-world retained mounts, and CPU/long-task controls.
# Run separately from a soak so a second Chromium does not distort timings.
node --test tests/perf/browser.test.mjs
```

Other configuration variables are `SLOP_PERF_SETTLE_MS` (1,500),
`SLOP_PERF_SAMPLE_MS` (500), `SLOP_PERF_PROFILER_INTERVAL_US` (1,000),
`SLOP_PERF_FRAME_BUDGET_MS` (16.667), and `SLOP_PERF_CHECKPOINT_POSTS` (250 for
routine runs, 1,000 with `--full`). `SLOP_PERF_POSTS` can shorten a run, but values
above 500 require `--full`.
The minimum workload is 30 posts, matching the retained window. Use a stable
machine load and the same refresh budget when comparing runs. Accelerated runs
are reported with their actual pace, not treated as default-pace measurements.

## Synthetic feed and measurements

`feed-sim/index.html` and `feed.js` imitate the current SDUI shape: hashed classes,
`feed-full-update`, `feed-commentary`, `feed-actor` profile links, opaque expanded
component keys, the lazy-feed container key, and activity anchor URNs on a subset
of posts. Half the posts use plain human text and half use slop-heavy text. The
runner loads nonempty `tests/fixtures/posts/*.json` records when available, with
embedded fallbacks for either missing group. Text is deterministically padded or
trimmed to 50–400 words and retains source emoji and hashtags. Fixed-height card
slots show a clamped preview while keeping the full text available to extraction.

The simulator appends batches of ten as scrolling exposes more cards. It keeps
30 live posts, removes those far above the viewport, and recycles card shells
with new opaque identities and content. It does not keep removed post nodes in
an archive. A page-side rAF driver scrolls continuously, caps catch-up steps
after stalls so cards are not skipped, and records how many distinct posts
actually entered the viewport. Missing posts or an unbounded live window are
infrastructure errors. Returning to the top regenerates the same deterministic
posts in the same initial-sized DOM window.

- **Memory:** CDP `Runtime.getHeapUsage` plus `Performance.getMetrics` records
  start, sampled peak, and recovery after GC. Post-GC checkpoints at 250 and
  500 posts (1,000 and 2,000 with `--full`) establish the worst positive growth slope over equal-sized DOM
  windows. The strict raw slope gates the run; baseline-adjusted growth is also
  reported. This covers the renderer including content-script isolated worlds,
  not the background service worker's separate heap. Peak sampling can miss a
  transient allocation between samples.
- **Browser RSS:** the runner sums `ps` RSS across its browser root and all
  descendants at the normal sample cadence, including renderer, GPU, utility,
  and extension worker processes. Peak RSS and peak process count are reported
  separately for each profile. This is resident memory, not just JS heap; shared
  pages may be counted more than once. It is a sampled peak, not OS high-water RSS.
- **Detached mounts:** after GC, `DOM.getDetachedDomNodes` exposes native detached
  trees across worlds. The runner counts marked mounts and their shadow roots,
  and reports all detached native nodes for context. When the experimental CDP
  method is unavailable it falls back to WeakRefs of observed removed mounts.
  That cheaper proxy is explicitly a lower bound: wrappers in another world may
  retain native DOM after the page-world wrapper dies. It never strongly owns a
  removed element. The separate browser control verifies native detection using
  deliberately leaked hosts created in an isolated world, then releases them.
  **No V8 heap snapshots are taken**, including in `--full` mode. CPU profiles
  are sampling traces, not heap snapshots.
- **UI:** live-card, mount, populated host, shadow host, visible coverage,
  duplicate, and orphan counts are sampled and recorded at settled checkpoints.
- **Long tasks:** a `PerformanceObserver` captures duration and the browser's
  available attribution. Extension attribution additionally requires a V8 CPU
  sample on an extension stack inside that task. CDP `NavigationStart` aligns
  the profiler's monotonic clock with the page's relative performance timeline.
  A brief extension contribution between samples may be missed.
- **Frame pacing:** rAF p50/p95/p99 and estimated dropped refreshes are recorded
  only while continuously scrolling. GC, settle periods, and the return jump are
  excluded. A 10% timing tolerance prevents counting rounding noise as a drop.
- **Scripting:** CPU samples are charged once when any ancestor has a
  `chrome-extension://` URL; `Debugger.scriptParsed` resolves missing frame URLs
  using script IDs. Synchronous native work on that stack is included. Both runs
  carry the same profiler overhead. CPU sampling is an estimate, not exact
  function instrumentation. Per-post cost includes extension startup and cleanup.
- **Optional marks:** visible `slop:*` marks/measures are aggregated by name,
  count, total duration, and max duration. No mark names are required. The
  extension owns clearing its timeline; the harness does not clear entries that
  a later extension measure might need, or mask retained timeline entries.

Reports include the Chromium version, workload, corpus files, build fingerprint,
content-script URLs/worlds, page errors, and raw browser attribution so coverage
and measurements can be audited. A working build with absent UI remains useful
for checking harness operation but cannot validate extension lifecycle behavior.
