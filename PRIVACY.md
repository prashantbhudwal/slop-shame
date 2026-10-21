# Slop Shame Privacy Policy

_Last updated: 19 October 2026_

Slop Shame is a browser extension by Prashant Bhudwal for the LinkedIn home feed. This policy describes the current development version. We will check it against the release before submitting the extension to the Chrome Web Store.

## Local processing

The extension reads feed post text and author information already present on the LinkedIn page: author identifiers, names, headlines, profile links, profile picture URLs, and whether an author is a person or company. It computes a Slop Index locally using bundled rules. The score is a heuristic about writing patterns, not proof of AI authorship.

Post text and scores are not sent to the developer, an AI service, analytics, or a leaderboard server. Slop Shame has no separate account, telemetry, advertising service, or remote scoring service.

## Data stored on your device

The extension uses its own IndexedDB database and browser local extension storage, separate from LinkedIn's page storage. It stores:

- Author identifiers and profile information, score/category aggregates, action counts, timestamps, and a worst-post identifier, score, and text snippet.
- Post identifiers, scores, tiers, categories, up to 200 characters of post text, first/last seen times, and whether you used Destroy or Shame.
- Settings and daily counts of scanned, high-scoring, destroyed, and shamed posts.
- Up to 2,000 remembered destroyed post identifiers, only if you enable that setting; it is off by default.

The extension does not use browser sync for this data. The developer does not receive or have remote access to the local database.

## Retention and deletion

Post-detail pruning runs when sightings are written or data is imported. It removes detail rows last seen more than 90 days ago and keeps at most 20,000 detail rows, removing the oldest first. This is not a scheduled daily deletion. Author aggregates and an archived worst-post snippet can remain after post details are pruned.

The current development version has no user-facing leaderboard clear control. Uninstalling the extension removes its browser-managed local extension data. Files you downloaded and text you copied remain wherever you saved or pasted them; delete those separately. Settings and author history otherwise remain on the device until removed. Any additional deletion controls will be documented when they ship.

## Network activity and profile images

Scoring and card generation run locally. Displaying a card can cause the browser to load the author's existing image URL from LinkedIn or its image delivery provider. Exporting a card can fetch that image again, even when the output uses a pixelated photo. Those servers receive ordinary connection information such as your IP address and the requested image URL. Card preview images use a no-referrer policy; the export fetch omits credentials. LinkedIn also makes its normal page requests independently.

Bundled extension artwork is loaded from the extension package. No remotely hosted executable code or AI model service is used.

## Copying and downloading cards

Card previews inside the extension show author identity. Copy text and Download image are actions you choose. Each new card starts with identity sharing off: copied text uses initials, and downloaded images use initials and a pixelated photo. You can opt in to including the full name and photo.

Initials and pixelation do not guarantee anonymity: cards can retain post quotes and other contextual information. Review an export before sharing it. The extension does not automatically post cards to LinkedIn or send them to the author.

## Permissions

- `storage`: save extension settings, daily counters, and optional remembered destroyed post identifiers locally.
- `https://www.linkedin.com/*`: attach the feed UI, read feed content for local scoring, and notify relevant tabs when local store data changes. The product's intended surface is the home feed.

The current manifest requests no `tabs`, `activeTab`, `downloads`, or clipboard permission.

## Website and support

The project website is hosted by GitHub Pages. GitHub processes ordinary website request information under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The site adds no analytics, tracking scripts, or forms.

If you open a GitHub issue, the information you submit is handled by GitHub and may be public. Please omit private feed content and personal information. The developer can read information you choose to submit through support.

## Data use

We do not sell data or use it for advertising, creditworthiness, or unrelated profiling. Locally handled data supports the extension's feed scoring, cards, and local ranking features. The extension is not directed at children.

## Contact and changes

For privacy questions, [open a project issue](https://github.com/prashantbhudwal/slop-shame/issues). Do not include sensitive information in a public issue. For vulnerabilities, use the repository's private security reporting option.

Policy changes will appear on the [privacy page](https://prashantbhudwal.github.io/slop-shame/privacy.html) with an updated date.
