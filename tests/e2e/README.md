The default Playwright run uses synthetic feeds; it never needs a LinkedIn login.

```sh
pnpm test:e2e                         # builds, runs fixtures, skips live test
pnpm test:e2e --project=fixture-feed  # only the three synthetic feeds
SLOP_HEADED=1 pnpm test:e2e --project=fixture-feed
```

`test:e2e` builds with `SLOP_E2E=1`. Only these test builds expose open shadow
roots for Playwright locators and the `slop-shame:debug` object-count hook.
For a separate build/run, use `SLOP_E2E=1 pnpm build` then
`pnpm exec playwright test --project=ui --project=fixture-feed`.
Plain `pnpm build` and `pnpm zip` use closed roots and omit the debug hook.
Rebuild without the flag after testing before loading or distributing a release.
To verify closed roots and the absent debug hook on that release build, run:

```sh
pnpm build
SLOP_PRODUCTION=1 pnpm exec playwright test --project=ui --grep 'production build hides roots'
```

`helpers.ts` exports `test`, `expect`, `launchWithExtension(options)`,
`openFixtureFeed(page, 'sdui' | 'classic' | 'hashed')`, and
`waitForContentScript(page, extensionId)`. The extended `test` provides a fresh
persistent extension context, `page`, and `extensionId`. Add UI assertions to
`fixture-feed.spec.ts`. The fixture server runs on port 4179 (override with
`SLOP_FIXTURE_PORT`). Routing serves those files at
`https://www.linkedin.com/feed/`, so Chrome injects the actual built content
script into its isolated world. The smoke test checks that world via CDP.

`sdui.html` is the primary fixture: synthetic names/text in the structure observed
on the current live feed. It includes `feed-full-update` wrappers, expanded/focus
component keys, an initial lazy list plus later sibling batches, social headers,
duplicate actor anchors, unnamed headline paragraphs, inline commentary links,
clipped full text, and separate comment tools. `classic.html` and `hashed.html`
exercise older markup and structural fallbacks. Each of these three has 12 posts.

`activity.html` is a synthetic activity page (`/in/jane-doe/recent-activity/all/`)
in the structure captured from the live SDUI page: a left `Sidebar` profile card
(cover, round photo, name) whose block is sticky inside the `<main>` scroller,
nine `CREATOR_PROFILE` posts without `data-view-name` hooks (one a bare repost of
another author, one too short to judge) and a right `Aside`. The `profile`
project (`profile.spec.ts`) swaps corpus samples into its posts and checks the
profile summary: placement above the photo, own-post filtering, small-sample
wording, stickiness, SPA navigation, card re-render and cleanup. Screenshots go
to `test-results/ui-profile-summary/`.

The real project is opt-in and uses the owner's existing login:

```sh
SLOP_REAL=1 pnpm test:e2e --project=real-linkedin
```

Only one process may hold `.playwright/linkedin-profile`. The live project and
capture script use headed Chromium positioned off-screen with the agreed
automation flags; they always close their context. Do not run them concurrently.
For a future expired login, run `pnpm linkedin:login`, sign in in the visible
window, and wait for the feed. The script saves the profile and closes Chromium.
Install the bundled browser if needed with `pnpm exec playwright install chromium`.

To inspect markup changes gently:

```sh
node scripts/capture-feed.mjs --scrolls=2
```

Snapshots remove scripts/styles, event handlers, URL queries, and image sources.
They retain other people's names and posts and are **not anonymized**. They stay
in gitignored `tests/fixtures/feed/captured/`; never copy their content into the
committed synthetic fixtures. The login profile is also gitignored.

Mutation performance can be measured without adding production instrumentation:

```sh
SLOP_REAL=1 node tests/e2e/measure-adapter.mjs --label=after
node tests/e2e/measure-adapter.mjs --fixture=sdui --churn --revision=aec40c1 --label=controlled-before
node tests/e2e/measure-adapter.mjs --fixture=sdui --churn --label=controlled-after
```

The live run measures a warmed 30-second idle interval, then three 650 px scrolls
with the pointer over the feed. It reports process/root lookup/extraction counts,
total extraction time, viewport/video state, card coverage and actual scroll
offsets. No video is played manually. A quiet live sample can legitimately report
zero work before and after; it does not demonstrate an autoplay improvement.
The fixture workload changes classes and reaction counts on 12 cards for 20
ticks, without touching LinkedIn. `--revision` bundles the adapter and selectors
from that local commit for a reproducible comparison. Results contain counts,
not posts or names, and are written under the ignored capture directory.
