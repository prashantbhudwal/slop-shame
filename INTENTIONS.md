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
16. **Slop = AI-written text** (not LinkedIn genres). Base it on the AI-writing
    dictionaries (avoid-ai-writing, humanizer, other maintained lists). The
    Slop Index is a **ratio/density** of AI tells in the post. No special
    LinkedIn phrase research needed.
17. Wide web research on similar repos/dictionaries/methods: fan out multiple
    Groks and Geminis, one angle each.
18. Extra workstreams approved: category ("slop-type") icons (Sol), speed +
    memory soak test (Sol), CI + contributor tooling + docs (Opus at medium —
    Sol is bad at writing).
19. Roast cards: full name/avatar inside the extension; anything shared
    (download/copy) blurs the avatar and uses initials by default, with an
    opt-in toggle (defaults off each time). [Chrome Web Store bullying policy]
20. Promoted posts: badge + Shame, but **no Destroy** (LinkedIn UA §8.2 bans
    removing/covering ads).
21. Testing: keep owner's real account, but only minimal gentle live checks;
    fixtures for everything else. No automation, no LinkedIn API calls;
    `use_dynamic_url` on web-accessible resources to resist extension probing.
22. Shame is only offered when the engine says `shameable` (score ≥ 40, ≥ 40
    words, ≥ 1 phrase/discourse tell — style alone never qualifies). Destroy
    is always available on non-ad posts.
23. **First principles: this is a general AI-text detection problem**, not a
    LinkedIn text problem. LinkedIn is only the first surface. Engine rules,
    dictionaries, calibration data and evals are about AI vs human text in
    general (all genres/registers). LinkedIn-specific code stays in the DOM
    adapter and UI.
24. Scope stays LinkedIn-feed-only for now (Slop Lab page and right-click
    "check any text" were offered and deferred).
25. Once a testable build exists, **install it on the owner's own Chrome**
    (branded Chrome 155). Branded Chrome blocks `--load-extension` and
    off-store `.crx`, so it is "Load unpacked" from a stable folder outside the
    repo (agents' rebuilds can't break the owner's copy). Owner does the
    one-time click; we give exact steps.
26. Research how to **publish on the Chrome Web Store**: registration,
    review, and the hurdles Google puts in the way. Also cover other Chromium
    stores and sideloading. Reports go to `research/chrome-web-store-publishing.md`
    and `research/other-chromium-stores.md`.
27. (2026-10-21) Use the measured dictionaries to set the scoring instead of
    dropping entries by guesswork; get a bigger eval set (full RAID, modern
    books). "Use orchestrator subagents, then get this done, basically hill
    climb and tell me when you have a better classifier."
28. (2026-10-21) UI: "I don't want it to encircle the whole postcard."
29. (2026-10-21) On a person's profile / all-posts page, as you scroll, show
    near the person's photo (top or left of it) that person's slop summary:
    their slop index in general, or how many sloppy posts have been detected
    so far and what percent, "so you can easily see if a person is a slop
    poster or not". (Extends scope beyond the home feed.)
30. (2026-10-21) Use the Kaggle "LinkedIn Influencers' Data" (2021 scrape) —
    "yeah use that" — privately, as human LinkedIn text for checking false
    alarms only: never committed, shipped, or used to derive weights.
31. (2026-10-21) **Redefinition of slop** (refines 16 and 23). Slop is not
    AI writing in general. It is text a human produced with AI with zero
    effort: copy-pasted output from cheap / low-quality models, free plans,
    or at scale, with obvious AI smells. People who put in effort, rewriting
    with a strong model like a human and checking everything, are not
    producing slop. Readability is irrelevant. Pangram-style fingerprinting
    of all AI text is not the objective (we can't train that model). The
    question to answer: "was any effort put into creating this post or was it
    just generated and pasted online from a cheap low-quality model?"
32. (2026-10-21) **Ship the MVP first.** "The first version doesn't need to
    be perfect ... the algorithm needs to be better than before. That is
    where we need to stop this. We can't just keep hill climbing till the end
    of the world." Edge-case product questions are irrelevant for now.
33. (2026-10-21) Density/point-sum scoring isn't working across situations:
    "we need a more sophisticated algorithm ... more specific sophisticated
    math. Figure out what works based on how people solve similar problems
    and then make that algorithm." Get independent architecture ideas from
    one Opus (extra high) and one GPT-6-Astra (on the Codex account with the
    most limits; never more than one Astra), with little context.
34. (2026-10-21) The human-curated AI-slop dictionaries are important and must
    be used in the scorer: "you now have a bigger data set, you have improved
    the process so much, and you still refuse to use these human-curated
    libraries of AI slop ... At least the phrases should be taken." 
35. (2026-10-21) Changing the post highlight to the Drip Edge did **not**
    authorize removing the avatar monster or photo ring/chip. Keep the monster
    immediately below the author's photo, the scribbled photo ring, the
    action-bar chip and the Drip Edge together; no frame around the whole post.
    Removing the avatar decorations was an agent mistake, not an owner choice.
36. (2026-10-21) The owner rejected an arbitrary 1 MB classifier bundle limit.
    Judge performance by measured cold startup and per-post blocking; move work
    off the page's main thread where useful. Do not discard useful dictionary
    entries just to satisfy a byte cap.
37. (2026-10-21) Run multiple Grok agents for adversarial review of risky
    security, performance and logic code, excluding frontend work. Split the
    scope by area and consolidate all findings into one Markdown report before
    reporting back. Seven Grok 4.7 reviewers were assigned; production fixes
    and a new release are outside this review pass.
38. (2026-10-21) Send the Grok findings to multiple Sol agents, batched by
    area, to independently validate or invalidate each claim, then return the
    real findings. Six fresh Sol validation tasks cover all 23 claims. This is
    validation only; no fixes or new release requested.
39. (2026-10-29) The repo goes to a collaborator. Write docs for them that
    don't assume the owner's agent accounts, machine or local data, and don't
    burden them with any of that. The agent guide is `AGENTS.md` (Claude reads
    it too); don't create a separate Claude file.

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
| Slop categories | 10 AI-tell families grouping avoid-ai-writing's 48 detector types: ai-vocabulary, template-phrases, chatbot-leak, negation-pivot, inflation, hedging, engagement-bait, formatting, robotic-rhythm, bypass-tricks | Owner: slop = AI-written. LinkedIn-genre packs dropped; still pluggable for later. |
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
- [x] Slop engine r1 committed: 10 AI-tell packs, Aho-Corasick + regex scanner, density scoring with family caps, `shameable`, 0.126 ms/post, 122 tests.
  - [ ] Recall fix (same agent): orchestrator probes showed textbook AI post = 23, chatbot leak = 36 (core rules not firing; smoking-gun floor broken). Human probes = 0 (good).
- [x] LinkedIn feed adapter + fixtures + Playwright harness — committed (aec40c1). Live: 8/8 real cards detected. Real-feed run: `SLOP_REAL=1 pnpm test:e2e --project=real-linkedin`; re-login: `pnpm linkedin:login`.
  - [x] Round 2: mutation churn cut (240 → 0 re-extractions under simulated churn), committed
- [x] Leaderboard store (IndexedDB, background) — done, reviewed, committed. Ranking: round(Σ(score−30)^1.3/10 + 3×slopocalypse posts) over posts ≥40. Titles: Slop Intern → Slop Emperor.
- [ ] Assets (tier icons, buttons, shame art, mascot "Sloppy", extension icon) — delegated (Sol high, codex, slop-shame-assets-r1); art direction in the task prompt, prompts saved to assets-src/prompts/
- [ ] UI: badge, Destroy eruption, Shame modal, popup, Hall of Slop page — delegated (Opus xhigh, claudeAgent_cash, slop-shame-ui-r2; r1 cancelled for running at medium)
- [ ] Category icons (10) — queued as follow-up on the asset agent's thread
- [x] Perf + memory soak harness committed (`pnpm perf`, `--full`). Heap growth gate changed to growth over baseline. First run INCOMPLETE (no UI yet); all budgets passed.
- [x] CI, issue/PR templates, CONTRIBUTING, README, PRIVACY, SECURITY — done, reviewed, committed. Before going public: confirm GitHub owner `prashantbhudwal/slop-shame`; update PRIVACY.md if permissions change (e.g. captureVisibleTab/downloads); add screenshots to docs/.
- [x] research/social-post-tells.md (Gemini) committed
- [x] research/landscape.md, detection-methods.md, slop-dictionaries.md (Grok) committed. Top lists to vendor in engine round 2: Zero Slop patterns.json (MIT), Sam Paech weighted adjustments (Apache-2.0) + essay freq (MIT), vale-ai-tells (MIT), slop-radar (MIT), Kobak excess_words (MIT repo). NOT usable: Wikipedia signs (CC BY-SA), sloptells (no license), gptslop (AGPL).
- [x] research/frequency-evidence.md (Gemini) committed — 152 markers with fold-ratios; suggests weight w = min(10, α·log2(ratio)). Em-dash evidence conflicts between reports → keep em-dash weak/corroborating.
- [x] All 5 research reports in.
- Engine round 2, split so independent parts start now:
  - [ ] Vendor external dictionaries → `src/lib/engine/packs/vendor/` (not registered yet) — delegated (Sol xhigh, codex_nush, slop-shame-dicts-ingest-r1)
  - [ ] Calibration dataset (human vs AI, hard human negatives: non-native, formal) + `pnpm eval` harness → `eval/`, `data/eval/` — delegated (Sol xhigh, codex_quaternary, slop-shame-calibration-r1)
  - [ ] Retune scoring with vendor packs + eval (needs engine r1 + both above)
- [x] Bug-hunt review of store + adapter (Sol xhigh, codex_account_3) — 5×P2 + 1×P3, all reproduced: actions lost after a failed sighting flush; hydration misses (structural descendants, media/poll); fingerprint misses `<br>` text changes; score-only dedupe drops metadata updates; unbounded client dedupe map; zero-count histogram bins corrupt maxScore. Transactions, worker-kill retry, aggregates, adapter GC all checked out.
  - [ ] Fixes (same agent, red tests first, slop-shame-review-store-adapter-r1-fix)
- Blocked on UI agent: content-script integration on real feed, perf soak vs real UI, README screenshots/GIFs. Then: final Opus review + security review.
- Capacity note (15:20): claudeAgent_cash 66% of 5h (resets ~17:00); if UI agent hits stop threshold, resume it after reset.
- ~~Research → `research/`:~~ slop-dictionaries.md (Grok), detection-methods.md (Grok), landscape.md incl. Chrome Web Store / LinkedIn ToS risks (Grok), frequency-evidence.md (Gemini), social-post-tells.md (Gemini)
- [ ] Orchestrator review + integration + commit of each workstream; feed research findings into the engine (round 2)
- [ ] Install a testable build on the owner's Chrome (after UI r2 lands + passes e2e): copy `.output/chrome-mv3` to a stable folder outside the repo, owner does Load unpacked once, reload after updates.
- [ ] Publishing research: CWS process + hurdles (Grok, cursor, slop-shame-research-cws-publish-r1); other Chromium stores + sideloading (Gemini, antigravity, slop-shame-research-other-stores-r1)
- [x] Owner logged in to LinkedIn once (profile `.playwright/linkedin-profile`, verified: feed loads)
- [ ] End-to-end test on real LinkedIn
  - Finding: the real feed uses LinkedIn's new SDUI markup (hashed classes, no `data-urn`). Stable hooks: `data-view-name` (`feed-full-update` = post card, `feed-commentary` = text, `feed-actor` = author), `componentkey` (`expanded<id>FeedType_MAIN_FEED_RELEVANCE`), `data-sdui-anchor-id="feed-header-urn:li:activity:<n>-0"`. Sent to the adapter agent as a steer.

## Open questions for the owner

- Shame target: the post's author (current assumption) or something else?

## Chrome Web Store account preparation — 2026-10-19

- Owner requested preparing their signed-in Google account for Chrome Web Store
  uploads ahead of publishing. No extension submission or publication requested.
- Confirmed the in-app browser is signed in and the developer account is not yet
  registered. Opened registration, selected the developer agreement checkbox,
  and prepared checkout. Live checkout confirms a one-time US $5.00 fee.
- Registration remains incomplete: checkout offers adding a credit/debit card;
  owner must supply payment details and complete payment in Google's form.
  No payment made and no extension uploaded.
- Remaining account checks after registration: publisher name, verified contact
  email, accurate trader/non-trader declaration and any applicable verification,
  plus Google Account 2-Step Verification. The security-page inspection timed
  out, so 2-Step Verification status is unknown.
- Owner asked about approval hurdles. Google reviews extension submissions
  separately from registration; review usually takes days and can take weeks.
  Slop Shame needs particular review of person-directed ridicule in Shame/cards
  and leaderboard features, privacy disclosures for local page/author data,
  permissions, and accurate store claims. See publishing research for sources.
- Owner wants the full publishing requirements and setup explained before paying
  the registration fee. Discussed GitHub Pages as a possible host for public
  privacy/support pages; no website publication or repository push authorized.

## Publishing preparation continuation — 2026-10-19

- Owner explicitly authorized drafting publishing materials and publishing the
  supporting website using authenticated GitHub access while extension development
  continues. This supersedes the earlier no-push note for website content only.
- Created public `prashantbhudwal/slop-shame` repository. Published only project,
  privacy, support pages and existing branding on `gh-pages`; no development
  source, dirty implementation changes, browser profiles or release ZIP uploaded.
- GitHub Pages serves `/` of `gh-pages`, with HTTPS enforced. Intended URLs:
  `https://prashantbhudwal.github.io/slop-shame/`, `privacy.html`, `support.html`.
  Private vulnerability reporting enabled; GitHub Issues is the public support path.
- Local website source: `publishing/site/`; regenerate from root PRIVACY.md via
  `python3 scripts/publishing/build-site.py`. Local listing, permission/privacy
  drafts, reviewer instructions, artwork inventory and release/account checklist
  are in `publishing/`. These drafts are not a Google dashboard submission.
- Read-only engineering audit completed by Sol: corrected blanket no-network
  claims (card preview/export can request LinkedIn author photos), documented
  local retention (90-day / 20,000 post detail pruning on writes/imports; author
  aggregates and archived worst snippets persist), optional remembered destroyed
  IDs, copy/download identity defaults and limits of de-identification.
- Confirmed no shipped full-page leaderboard or user-facing clear-data control.
  Public policy/support accurately say uninstall removes browser-managed extension
  data; downloaded/copied exports remain separately. Do not claim Clear all exists.
- Public site says in development; no store badge/install link or fabricated
  product screenshots. Existing 128px PNG icon verified; final screenshot captures
  and 440×280 promo export remain release artwork work.
- Registration payment still pending. Publisher/contact verification, factual
  trader declaration and 2-Step Verification confirmation require account work.
  No payment, extension upload, review submission or store publication performed.
- Final release must be checked against website/listing. Person-directed ridicule
  policy review is still unresolved; preparation does not establish approval.
- Deployment verified: GitHub Pages build `44c59ab` completed successfully;
  homepage, privacy, support, stylesheet and both assets return HTTP 200 and
  byte-match local source. Browser checks passed for loaded artwork and no
  horizontal overflow at desktop/mobile widths. Temporary local server stopped.

## Promo artwork and account deferral — 2026-10-19

- Owner explicitly asked the agent to produce the store promo using existing
  artwork/tools. Account security/setup will be handled by the owner later;
  do not continue those account steps in this workstream.
- Completed required 440×280 opaque PNG promo using existing Sloppy identity:
  `publishing/store/assets/promo-440x280.png`. Master and generation prompt saved;
  actual extension screenshots remain release-dependent. Built-in ImageGen used;
  ImageMagick used for dimension normalization only.
- Owner clarified this project is outside their professional activity. Record
  non-trader as the owner's declaration for later Google publisher setup;
  no dashboard declaration submitted. Owner asked which setup steps the agent
  can help with; account actions remain deferred pending their direction.

## Feed UI rework — 2026-10-19 (owner's words, condensed)

- The first feed UI was too intrusive ("the slop extension itself looks like
  slop"). Keep the playful art and animations, but:
  - **Never say "No Slop Found".** Absence of evidence is not evidence of
    absence: only mark clearly sloppy posts (badge from Certified Slop, 40+).
    Nothing at all on other posts.
  - **Inside the card, not between cards**, and **calmer, not smaller**: one
    fixed size for every tier, no layout shift; it should feel like a
    permanent part of the timeline.
  - **Placement chosen by the owner:** the empty space in the post's action
    bar, between the actions (Like · Comment · Repost · Send) and the
    reactions summary, styled like LinkedIn's own actions. Find space by
    measuring placeholders on the live feed first, at every screen size.
  - **Motion proportional to slop**: more attention for worse slop; not
    every post animating on load.
  - **Tier colors**: not green (reads as "pass"), not red: a violet → magenta
    ramp.
  - **Avatar ring** in the tier's color around the poster's photo, so slop
    reads from the photo too.
- Posts hidden by ad blockers must not leave stray rows.
- **Shame targets the original poster**, never the person who liked,
  reposted, commented or follows.
- **Hall of Slop needs a sample size** before naming anyone (now: 3+ slop
  posts that are at least half of what you've seen from them). Hall members
  get a **"Certified Slopper"** tag next to their name on their posts.
- Test headed browsers on the second monitor (x=2600), never the main one.
- UI/design work stays with Opus; Sol never gets frontend/design. Delegated
  reviews/fixes spend the account whose 5-hour window resets first.

## Registration payment support — 2026-10-19

- Registration attempt fails with Google Payments `OR_CCR_123`. Owner says
  their only card works for Google Play and explicitly authorized contacting
  support through the signed-in browser.
- Submitted Chrome Web Store support → Developer registration fee → Email.
  Explained no order ID was created, the $5 payment fails with OR_CCR_123,
  owner is in India and their only card works for Google Play; requested
  investigation of the payment-profile/currency conflict.
- Browser confirmed “Your email has been sent”; follow-up address is the
  owner's signed-in Gmail. No case number was displayed. Google says it will
  follow up only if it needs or has more information. No payment profile/card
  changes made, and no registration payment completed by the agent.

## Required browser verification — 2026-10-19

- Owner requires testing the exact loadable extension in Chrome for Testing and taking and inspecting real screenshots before handing over any update. Include multiple live-feed posts, social-header posts (liked/reposted), action-bar placement, and the extension controls. Fixture tests alone are not enough to call a build ready.

## Avatar and post decoration — 2026-10-19

- Owner explicitly requested keeping the action-bar chip and adding the same tier monster immediately below the actual author's photo, like an online-status button. Scale it to the photo size and open the same dropdown when clicked.
- Make the avatar circle look sloppy/scribbled and tint the whole visible post border with the detected tier color. Preserve no markings below the configured slop threshold.

## Author activity pages — 2026-10-19

- Owner expanded scope: the same filter and decorations must also work on any author's /in/<author>/recent-activity/ pages. Verify against https://www.linkedin.com/in/shashank-sharma2016/recent-activity/all/.


## Frontend ownership and next priority — 2026-10-19

- Owner stopped Sol frontend work after reporting broken/moving borders and
  dialogs attaching to the wrong places. The next task is to check and fix
  frontend bugs with **Opus on the Primary Claude account**, after its limit
  resets. Sol is authorized to save the checkpoint and arrange that continuation.
- Check multiple posts and scrolling behavior; sparse classifier output remains
  a separate issue. Detailed unresolved symptoms and continuation status are
  recorded in HANDOFF.md and the private orchestrator checkpoint.

## Payment support follow-up — 2026-10-21

- Owner provided support case 6-2981000041352: Google said it reviewed and
  released the account and requested retrying the payment method. Owner retried
  but the same OR_CCR_123 error persists (screenshot confirmed).
- Sent a reply in the existing Gmail case thread to support-eea@google.com,
  asking to reopen/escalate to the payments team, verify the relevant
  profile/card release, clarify any waiting period, and enable registration
  using the only card without disrupting Google Play. Gmail confirmed
  “Message sent”. No card screenshot or card credentials were attached.
- Registration remains blocked. No payment/card/profile changes performed.

## Avatar restoration and v2 outcome — 2026-10-21

- Avatar monster, scribbled photo ring, action-bar chip and Drip Edge are
  restored together and verified; removing the avatar decorations had not been
  requested. No frame surrounds the whole post.
- Installed `mvp-20261021T103441Z` at `~/slop-shame-extension` with the shipped
  round-2 engine. Previous install backed up; 41 files byte-verified. Unit,
  fixture browser, production and real-layout screenshot verification recorded
  in HANDOFF.md. Owner must reload the extension and refresh LinkedIn.
- V2 failed its frozen final comparison: fresh slop catches 61 -> 7/351 and
  target holdout 51 -> 18/160. It is not shipped. Its experimental work is
  preserved; no further hill climbing begun. The byte-size cap is withdrawn;
  scoring has not been moved to a background worker.

## Adversarial non-frontend review — 2026-10-21

- Completed seven Grok 4.7 reviews at high reasoning effort: extension trust,
  persistence, delivery/settings races, adapter lifecycle/identity, engine logic,
  engine performance and release/evaluation tooling.
- Consolidated all results and parent adjudication in
  `research/adversarial-review-2026-10-21.md`: 23 entries (20 newly verified
  issues/hazards, two documented risks, one narrower startup race). Priorities
  distinguish installed-runtime issues from unshipped v2 and tooling hazards.
- Parent baseline: 225 tests passed; 31 distinct adversarial probe cases passed
  while asserting the observed conditions. Checked all 78 captured runtime/
  tooling source hashes and all 41 installed release files; unchanged.
- Review only: no production fixes, new build/install, classifier tuning,
  frontend work, commit or push. The selected installed release remains round 2.

## Independent Sol validation — 2026-10-21

- Six fresh GPT-6.1-Sol validators at high reasoning reviewed all 23 Grok/
  parent claims by area. Retained 11 findings (8 P2, 3 P3), including one
  already documented v2 startup limitation; excluded 12 as intentional,
  invalid, or unproven. Seven retained findings affect installed runtime code,
  two concern tooling/reporting, and two concern rejected unshipped v2.
- Authoritative list and every exclusion rationale:
  `research/adversarial-review-validation-2026-10-21.md`. Original Grok report
  preserved as the initial claim set and marked superseded for triage.
- Additional evidence: installed extension ID received in Chrome page world
  while disabled; equal-word-count v2 misbundling probes; Chrome synthetic
  v2 initialization long tasks of 57–62 ms; actual missed master-switch save
  during bootstrap. Parent reran all 20 delivery integration cases successfully.
- Earlier unload, dispose and remembered-list live-sync claims lacked an
  established violated contract. Retention recounting is documented policy;
  leaderboard scan impact and three synthetic adapter conditions remain
  unproven as real defects. No fixes, build/install, tuning, commit or push.
