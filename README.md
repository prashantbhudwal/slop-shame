# Slop Shame

**Your LinkedIn feed, graded for AI slop. Then destroyed. Then shamed.**

Slop Shame is a browser extension that gives every post on your LinkedIn home
feed a **Slop Index** from 0 to 100: how much it reads like a language model
wrote it after one prompt. If it's bad, you can blow it up. If it's really bad,
you can roast its author.

It runs entirely on your machine. No servers, no AI, no accounts. Just regexes
with opinions.

<!-- SCREENSHOT: hero GIF of a feed being scored and a post erupting.
     Add at docs/hero.gif and uncomment:
![Slop Shame in action](docs/hero.gif)
-->

## What it does

### The Slop Index

Every post gets a score and a tier badge. Hover it to see exactly which tells
gave the post away ("It's not X, it's Y", "Agree?", seven em dashes,
"delve").

| | Tier | Score | Meaning |
|---|---|---|---|
| <img src="public/assets/tiers/artisanal.webp" width="40" alt=""> | **No Slop Found** | 0–19 | No AI tells found. That doesn’t prove a human wrote it. |
| <img src="public/assets/tiers/whiff.webp" width="40" alt=""> | **Faint Whiff** | 20–39 | Something smells a little… optimized. |
| <img src="public/assets/tiers/certified.webp" width="40" alt=""> | **Certified Slop** | 40–59 | Grade A, farm-raised LinkedIn slop. |
| <img src="public/assets/tiers/swamp.webp" width="40" alt=""> | **Slop Swamp** | 60–79 | Wading waist-deep in thought leadership. |
| <img src="public/assets/tiers/slopocalypse.webp" width="40" alt=""> | **SLOPOCALYPSE** | 80–100 | Pure, uncut, machine-grade slop. Evacuate. |

<!-- SCREENSHOT: a scored post with the badge open. Add at docs/badge.png:
![A post with its Slop Index badge](docs/badge.png)
-->

### Destroy

Press it and the post erupts off your screen. Gone. It only disappears for
you; the author's 14 reposts are unaffected.

<!-- GIF: Destroy eruption. Add at docs/destroy.gif:
![Destroying a post](docs/destroy.gif)
-->

### Shame

Generates a roast card for the post's author: a wanted poster, a citation, a
certificate of achievement in slop. It quotes their actual slop back at them,
so every card is personal. Save it as a PNG and do with it what your
conscience allows.

<!-- SCREENSHOT: a shame card. Add at docs/shame.png:
![A shame card](docs/shame.png)
-->

### Hall of Slop

A local leaderboard of the people who post the most slop in your feed. Post
it once, you're a statistic. Post it every morning at 8:03, you climb the
ranks. Posts are counted once, however many times you scroll past them.

<!-- SCREENSHOT: the Hall of Slop page. Add at docs/hall-of-slop.png:
![The Hall of Slop](docs/hall-of-slop.png)
-->

## Install (from source)

Not on the Chrome Web Store yet. Build it yourself; it takes a minute.

```bash
git clone https://github.com/prashantbhudwal/slop-shame.git
cd slop-shame
pnpm install
pnpm build
```

Then load it in any Chromium browser (Chrome, Edge, Brave, Arc, …):

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick the `.output/chrome-mv3` folder.
4. Open [your feed](https://www.linkedin.com/feed/) and brace yourself.

Requires Node.js 22+ and [pnpm](https://pnpm.io/installation).

## Privacy

Everything stays on your machine.

- No data collection, analytics or telemetry.
- The extension makes no network requests of its own. Scoring is local
  pattern matching, not an AI service.
- Scores and the Hall of Slop live in the extension's own local storage.
  Delete them with **Clear all** in the Hall of Slop, or by uninstalling.
- It only runs on `linkedin.com`.

The full policy is in [PRIVACY.md](PRIVACY.md).

## How scoring works

The Slop Index is a heuristic, not an AI detector. It looks for the tells AI
writing leaves behind: overused model vocabulary, template phrases, "it's not
X, it's Y" pivots, engagement-bait closers, emoji bullet lists, suspiciously
uniform sentence rhythm, leaked chatbot artifacts like `[Your Name]` or
`utm_source=chatgpt`, and invisible characters from "humanizer" tools.

Each tell has a weight (faint, clear, or smoking gun). The engine adds them
up, adjusts for how dense they are in the post, and squashes the result into
0–100. One "leverage" in a long post is forgiven; a 60-word post with nine
tells is not. Rules are organised in
pluggable packs, compiled once, and the whole thing scores a 300-word post in
under a millisecond.

It will be wrong sometimes. It's tuned hard against false positives: being
accused of slop when you typed it yourself is its own kind of tragedy. When it's wrong, please
[report the score](https://github.com/prashantbhudwal/slop-shame/issues/new?template=wrong_score.yml).

Many AI-tell patterns are adapted from
[avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing)
(MIT, © Conor Bronsdon) and
[humanizer](https://github.com/blader/humanizer) (MIT, © Siqi Chen). See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing

Found a phrase only a model would write? Adding it is a few lines of data and
a test. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the
[rule pack guide](src/lib/engine/packs/README.md).

## License

[MIT](LICENSE). Slop responsibly.
