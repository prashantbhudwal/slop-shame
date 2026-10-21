# Slop Shame — Sol validation of adversarial findings

Date: 2026-10-21  
Six independent GPT-6.1-Sol validators, high reasoning effort, reviewed the 23 claims in the [original Grok report](adversarial-review-2026-10-21.md). Batches covered trust/privacy, release/evaluation, delivery/settings, persistence, adapter logic, and the engine.

**Final result: 11 confirmed findings, 12 excluded claims.** The 11 comprise ten defects and one already documented v2 startup limitation. Seven affect code in the installed release, two affect local tooling/reporting, and two affect rejected, unshipped v2. Eight are P2 and three are P3. No P1 was retained.

This document supersedes the original report's bug classification, severity and impact claims. Reproducing a mechanism was insufficient when it matched documented policy, required unsupported markup, or lacked demonstrated material impact.

## Confirmed findings

### Installed release and current root

These seven concern `mvp-20261021T103441Z` and the corresponding current delivery/adapter/store code.

| ID | Priority | Validated finding |
|---|---|---|
| TRUST-1 | P2 | WXT broadcasts the extension ID to page scripts, including with scoring disabled. |
| PERSIST-1 | P2 | Equivalent author-ID spellings split one author's history and reject legitimate updates/actions. |
| ADAPTER-1 | P2 | Supported activity-page bare reposts bypass the unidentified-original Hall safeguard. |
| DELIV-5 | P2 | Recoverable pre-commit settings-write failures permanently lose daily deltas or remembered IDs. |
| DELIV-6 | P2 | A single initial settings-read failure leaves the tab inactive after recovery. |
| DELIV-7 | P3 | A saved master-switch change can be missed during startup, allowing a disabled tab to start scoring. |
| DELIV-3 | P3 | A transient rank-read failure is cached as an empty result and prevents ordinary retry. |

**TRUST-1 — extension-ID disclosure.** [Entrypoint options](../src/entrypoints/linkedin.content/index.ts):14–16 omit WXT's `noScriptStartedPostMessage` opt-out. WXT constructs its context before application startup and posts a message whose type contains the runtime ID. Chrome for Testing 156 received it in a page-world listener while persisted `settings.enabled` was false; its ID matched the service worker, and the source was the shared window. The validator also confirmed that the opt-out suppresses the message while preserving the lifecycle CustomEvent. This violates the recorded resistance-to-probing intention. It does not establish external messaging privileges or access to Hall/settings data. **Fix direction:** enable the opt-out and verify the built entrypoint.

**PERSIST-1 — inconsistent canonical identity.** The [adapter](../src/lib/linkedin/index.ts):142–148 explicitly considers decoded/lowercased author IDs equivalent, but extraction at lines 215–217 preserves raw spelling. [Repository writes/actions](../src/lib/store/repository.ts):93–95,124 and [queries](../src/lib/store/query.ts):23–26 compare exact strings. Independent adapter/store probes split three distinct slop posts into **2 + 1 author records**, preventing Hall qualification. Alternate-spelling corrections and Destroy were rejected; original-spelling controls succeeded. Percent-escape-only rescore retained the old score and returned `wrote: false`; export/import preserved the split. This establishes duplicate author identities, not duplicate counting of one retained post. Live frequency remains unmeasured. **Fix direction:** shared canonical IDs across all boundaries, plus an atomic migration of existing author keys, aggregates and post references.

**ADAPTER-1 — activity repost classification bypass.** The [bare-repost contract](../src/lib/engine/types.ts):12–13 and [source-ID contract](../src/lib/linkedin/types.ts):35–41 exclude unidentified originals from Hall samples. In the supported activity fixture, Jane's no-commentary repost is correctly attributed to Rowan but has `isBareRepost=false`, no source ID, and a non-null Hall key. Adding only the SDUI content hook changes eligibility to the expected exclusion. The validator evaluated the actual [controller helper](../src/entrypoints/linkedin.content/controller.ts):123–125. The classification depends on markup in [adapter extraction](../src/lib/linkedin/index.ts):311–316. **Correction:** repeated ranking inflation was not established: cloning without changing the header ID retains one durable key. Real LinkedIn reshare-ID semantics remain unresolved. **Fix direction:** classify supported flat reposts consistently and preserve the existing exclusion when the original ID cannot be verified.

**DELIV-5 — definite failed writes are forgotten.** [Daily flushing](../src/entrypoints/linkedin.content/controller.ts):807–814 clears its buffer before acknowledgement; [remembered destruction](../src/entrypoints/linkedin.content/controller.ts):720–725 ignores failed persistence. The [settings worker](../src/lib/settings/background.ts):85–87 marks every error non-retryable. Injected **pre-commit** storage failures through the real worker lost a daily delta and a remembered ID; neither recovered after storage became healthy and 120 simulated seconds elapsed, although unrelated writes succeeded. **Correction:** acknowledgement rejection alone does not prove loss. A successful commit followed by a lost acknowledgement retained the correct count in the negative control. **Fix direction:** retain operations, distinguish recoverable failures, and use operation IDs/deduplication before retrying daily increments. Hide-list retries also need ordering/generation protection.

**DELIV-6 — bootstrap cannot recover.** A real worker storage-read failure propagated through [initial startup](../src/entrypoints/linkedin.content/index.ts):17–23 before controller start, subscription or invalidation registration. A later healthy settings save and 120 simulated seconds did not start processing; explicitly invoking startup again succeeded. WXT's wrapper logs/rethrows and supplies no retry. This is a tab-availability failure after a recoverable dependency error; Chrome wake-failure frequency was not measured. **Fix direction:** register cancellation early and retry bootstrap with bounded backoff, preserving the disabled preference.

**DELIV-7 — master-switch save lost during bootstrap.** [Startup](../src/entrypoints/linkedin.content/index.ts):18–23 reads settings, awaits remembered IDs, then subscribes. The validator held that real destroyed-ID read, saved `enabled:false` through the real worker, and observed delivery to zero listeners. Releasing the read started the real controller's watcher from its stale enabled snapshot. It stayed active through 120 simulated seconds; a subsequent settings change reached the subscription and stopped it. This violates the [master-switch contract](../src/lib/settings/index.ts):10. The first review established only an await gap; this validation reproduced the missed change and stale behavior. Event delivery used synthetic browser primitives, not a Chrome race. **Fix direction:** subscribe and reconcile using version/generation protection, or re-read after subscribing. P3 reflects the narrow startup window.

**DELIV-3 — error cached as successful absence.** A rejected flush or author read assigns `rank=null` in [loadRank](../src/entrypoints/linkedin.content/controller.ts):774–796. Its guard then prevents subsequent opens from reading after transport recovery. Independent tests exercised both failure paths. **Correction:** an [author-metadata update](../src/entrypoints/linkedin.content/controller.ts):271 resets rank to `undefined` and permits recovery, so “for the entry's lifetime” was too broad. P3 reflects optional rank-detail impact. **Fix direction:** preserve a retryable/not-loaded state on failure, reserving null for a successful empty result.

### Local packaging and research reporting

| ID | Priority | Validated finding |
|---|---|---|
| REL-1 | P2 | Supported source-archive packaging includes private research, captures and generated excerpts. |
| REL-3 | P3 | V2's audit mislabels generated negative controls as human controls. |

**REL-1 — conditional source-distribution hazard.** [WXT configuration](../wxt.config.ts):4 supplies no source exclusions. The validator executed the installed WXT resolver and actual glob dependency, reading paths/sizes only. The source-archive selection contained:

| Directory | Files | Bytes |
|---|---:|---:|
| `data/eval/raw/` | 798 | 1,890,605,459 |
| `tests/fixtures/feed/captured/` | 9 | 914,478 |
| `eval/results/` | 12 | 17,339,327 |
| `.playwright/` | 0 | 0 |

WXT does not consult `.gitignore` for this selection. Explicit `--sources` enables it; Firefox/Opera also default to source archives. This conflicts with the private-data distribution contract. **Limits:** ordinary Chrome ZIPs do not enable sources by default; no archive was created or distributed, and the installed extension is unaffected. P1 was reduced to P2. **Fix direction:** source allowlist or explicit private/generated exclusions and a pre-distribution file-list check. Disabling the source-ZIP default alone does not protect explicit `--sources`.

**REL-3 — provenance misreporting.** [evaluate.mjs](../eval/v2/evaluate.mjs):9–10 loads generated effortful posts as AI, then labels panel `none`/`some` as `human`. [audit.py](../eval/v2/audit.py):26–27 uses that label in the human ranking, and [the report](../eval/v2/REPORT.md):331 calls it “highest-scoring human controls.” All 210 evaluated effortful IDs matched generated-input IDs. The human-labeled bucket contains 77 none and 65 some rows; five generated some rows enter the human top list at 89, 82, 62, 56 and 53. **Limits:** good AI intentionally belongs among slop-negatives; that classification is correct. Smell-based shipping checks and v2's rejection remain consistent. P2 was reduced to P3 because the defect is reporting terminology/provenance, not the decision. **Fix direction:** separate provenance from target labels or name the combined table accurately.

### Rejected, unshipped v2

| ID | Priority | Validated finding |
|---|---|---|
| EL-1 | P2 | Source filenames accidentally assign unrelated dictionary evidence to one exclusive construction bundle. |
| EP-1 | P2, existing debt | Synchronous initialization produces repeatable browser long tasks. |

**EL-1 — metadata misbundling, with arbitrary representative selection.** [initialize.mjs](../eval/v2/initialize.mjs):38–40 tests dictionary source references for words including `list`. Filenames such as `slop_list_by_freq.json` and `slop_list_phrases.jsonl` therefore put unrelated vocabulary and phrases into the globally exclusive list construction bundle. [score.ts](../src/lib/engine/score.ts):129–137 selects one representative by priority and hashed ID, contrary to the [same-construction bundle contract](../src/lib/engine/scorecard-schema.ts):12–13.

Equal-word-count public-API probes eliminated exposure differences:

- At 25 words, substituting “I'm happy to answer” for neutral words removed non-overlapping “is a must”: **6 → 4**.
- At 24 words, replacing “agency” with “nces” removed “flexible work arrangements”: **4 → 0**, replacing a habit witness with vocabulary.

**Corrections:** lexicographic ties alone need not be defective; misbundling unrelated evidence is the strongest established cause. The nces unit retains about 0.745 displayed index points; flooring produces integer zero. Neither example crosses 40, and no contribution to overall recall regression was established. **Fix direction:** explicit construction metadata rather than incidental filenames; deliberate representative selection using effective contribution and witness eligibility. Use development data, not frozen final sets, for future validation.

**EP-1 — confirmed existing startup limitation.** The static engine import in [controller.ts](../src/entrypoints/linkedin.content/controller.ts):9 reaches top-level inflation, JSON parsing and table reconstruction; first creation also builds DFA/matchers. This debt was already disclosed in [the v2 report](../eval/v2/REPORT.md):396–398.

Chrome for Testing 156, three fresh synthetic loopback contexts per baseline:

| Measurement | V2 | Round 2 |
|---|---|---|
| Initialization execution | 62.0 / 57.2 / 57.5 ms | 2.6 / 2.6 / 2.3 ms |
| Corresponding initialization Long Tasks | 62 / 57 / 57 ms | none |
| First empty analysis | 31.0–33.1 ms | 8.7–8.9 ms |
| Warm synthetic 300-word analysis | 0.355–0.450 ms | 0.400–0.410 ms |

File reading/transfer preceded timing. Function construction was separately measured at 5.9–8.0 ms for v2; execution still includes residual V8 lazy compilation. **Limits:** these are pure-engine fixture measurements, not installed-extension startup latency or observed LinkedIn interaction delay. The warmed synthetic budget passed. This is not a newly discovered regression and does not affect installed round 2. **Fix direction if v2 resumes:** isolate initialization in a worker or genuinely bounded chunks, preserving useful dictionaries.

## Excluded claims

These mechanisms were not all disproved. The dispositions distinguish documented policy from insufficient evidence.

| ID | Disposition | Reason excluded from real findings |
|---|---|---|
| REL-2 | Intentional / known procedure | Developer builds use working source. The documented release process selects a frozen engine in isolation; no compliant release path was shown selecting rejected v2. |
| REL-4 | Invalid as a standalone defect | The nested results ignore works; broad dry-run staging includes the guard and excludes results. Tooling and guard are all untracked additions. Source-ZIP exposure is already REL-1. |
| REL-5 | Intentional workflow | Fixture instrumentation/output sharing is documented. Releases require a flag-free rebuild and production check. The inline test flag does not persist to later commands. |
| REL-6 | Intentional CI policy | E2E is explicitly advisory. Current required check/unit/build gates match contributor documentation; artifact upload is not publication. |
| DELIV-1 | Unproven requirement violation | The undo/buffer loss window exists, but commit-on-document-discard or lossless buffered telemetry was not required. Synthetic pagehide is not actual discard; no already-persisted destroy was lost. |
| DELIV-2 | Intentional disposal policy | Disable/unmount explicitly drops queued work and late replies; existing tests enforce it. Live retries and forced-flush controls work. |
| DELIV-4 | Invalid stronger contract | The flag promises persistence across sessions. Future writes follow it correctly; retroactive history import, immediate cross-tab hiding and restoring session hides were not promised. |
| PERSIST-2 | Intentional retention tradeoff | Dedupe/action flags intentionally share the 90-day/20,000-row detail horizon. Retained retries and boundary checks work. Recounting after expiry is documented. |
| PERSIST-3 | Mechanics confirmed; impact unproven | Cursor scan growth and transaction waiting exist, but results/pagination are correct. No material Chrome latency, starvation or response-time violation was established. |
| ADAPTER-2 | Unproven reachability | Sibling duplicate-ID eviction reproduces synthetically, but supported fixtures have distinct independent-root IDs. Repeated nested identity hooks work. |
| ADAPTER-3 | Unproven reachability | Hidden retained-old-main failure reproduces synthetically; no supported navigation capture establishes that layout. Normal replacement and updates inside the retained main work. |
| ADAPTER-4 | Unproven reachability/requirement | Malformed generic candidates can skip a card, with healthy siblings protected. Actor/body controls work; malformed-card isolation is explicitly tested. Per-candidate recovery was not required. |

The leaderboard scan remains an optimization candidate to measure in Chrome. The synthetic adapter conditions can be revisited if supported captures demonstrate them. The documented retention/disposal policies can change if the owner adopts stronger durability requirements; their current consequences are not implementation bugs.

## Evidence and reproduction

Validators used fresh tasks, one area each, and were explicitly asked to falsify the prior claims. They used real modules and focused synthetic inputs; no production fixes, classifier tuning, new release or installation occurred.

- **Delivery:** 20 real-module integration cases passed; the parent independently reran all 20. Tests include definite pre-commit versus lost-ack controls, successful future persistence writes, metadata-reset recovery and the actual missed settings change.
- **Adapter:** 16 DOM/helper cases passed, including unchanged-ID cloning, supported-fixture controls and actual controller-key evaluation.
- **Persistence:** eight focused cases passed, including raw adapter alias emission, explicit retention clocks, correct pagination and conflicting-transaction ordering.
- **Trust/privacy:** installed-extension broadcast received in Chrome's page world with scoring disabled; actual WXT opt-out/defaults and safe scratch-index staging probed.
- **Engine:** equal-length logic assertions and legitimate-bundle/exposure controls passed; six browser baseline runs measured initialization and long tasks.
- **Release/eval:** hashes, generation linkage, flag scope and policy boundaries checked with metadata-only probes.

One evidence correction: an earlier aggregate/rescore negative-control probe used 2023 timestamps without passing the current clock, allowing pruning before later operations. It did not establish its claimed retained-row coverage. Sol's explicit-clock rescore/stale/action/dedupe/import control supplies that coverage.

Safe local reproductions from the repository root:

```sh
# Bounded real-module delivery suite; 20 cases, including DELIV-7
python3 .playwright/adversarial-sol-validation-20261021/delivery/run.py --reporter verbose

# Isolate the supported activity-repost finding
python3 .playwright/adversarial-sol-validation-20261021/adapter/run-probes.py ADAPTER-1

# Isolate author identity and retained-row controls
python3 .playwright/adversarial-sol-validation-20261021/persistence/run-probe.py -t PERSIST-1
python3 .playwright/adversarial-sol-validation-20261021/persistence/run-probe.py -t 'negative control'

# Trust/static/eval probes, each bounded; browser uses only a scratch profile
node -e 'const c=require("node:child_process"); for(const n of ["static","eval"]) c.execFileSync(process.execPath,[".playwright/adversarial-sol-validation-20261021/trust_privacy/"+n+"-probe.mjs"],{stdio:"inherit",timeout:4500})'
node .playwright/adversarial-sol-validation-20261021/trust_privacy/browser-probe.mjs

# Pure-engine fixture browser timings; scratch bundles are already prepared
node .playwright/adversarial-sol-validation-20261021/engine/browser.mjs
```

Full task results, per-ID verdicts, safe probe scripts and measurements are under ignored `.playwright/adversarial-sol-validation-20261021/`. Results assert the observed conditions; passing does not mean the defects were fixed.

The selected installed release remains round 2. Its 41 files match the archived manifest. All 78 captured runtime/tooling source hashes remain unchanged. Browser contexts, loopback servers and review processes were closed.

