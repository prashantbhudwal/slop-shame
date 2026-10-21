# Chrome Web Store listing draft

Prepared 19 October 2026. Recheck against the release; this is copy to enter after developer registration, not an uploaded listing.

## Fields

- Name: Slop Shame
- Short description (114 characters): Score AI-style writing in your LinkedIn feed, hide posts with a burst, and make locally generated satirical cards.
- Language: English
- Proposed category: Just for Fun (choose the closest current dashboard category)
- Homepage: https://prashantbhudwal.github.io/slop-shame/
- Privacy: https://prashantbhudwal.github.io/slop-shame/privacy.html
- Support: https://prashantbhudwal.github.io/slop-shame/support.html
- Publisher display name proposal: Prashant Bhudwal (owner must confirm in Google dashboard)

## Detailed description

Slop Shame gives posts in your LinkedIn home feed a Slop Index from 0 to 100, based on recurring patterns associated with AI-style writing.

Open a score to see the signals behind it. Hide an ordinary post with the Destroy effect, or generate a satirical Shame card for an eligible post. Cards use bundled templates and the post's actual signals; they are created locally without an AI service.

Features:
- Local rule-based scoring with tier artwork and explanations.
- Destroy effects for non-promoted feed posts. Promoted posts do not offer Destroy.
- Copy card text or download a card image when you choose. Identity sharing starts off for each card; exports use initials and pixelated photos by default.
- Local author rankings and settings in the toolbar popup.

A Slop Index is a writing-pattern heuristic, not proof that a person used AI. It can be wrong. Initials and pixelated photos do not guarantee anonymity because cards can include post quotes. Review cards before sharing.

Post text, scores, and local rankings are not uploaded to a developer server. Profile images can load from LinkedIn's image servers when cards are displayed or exported. See the privacy policy for local storage and retention details.

Requires a LinkedIn account and access to the LinkedIn home feed. Slop Shame is an independent project and is not affiliated with or endorsed by LinkedIn or Google.

## Single purpose

Help users assess AI-style writing patterns in their LinkedIn home feed through local scores, explanations, and related hide/card controls.

## Permission justifications

storage: Saves settings, daily usage counters, and optional remembered hidden post identifiers in local extension storage. Author/post score records are stored in the extension's local IndexedDB. No browser sync or developer backend is used.

https://www.linkedin.com/*: Allows the content script to read displayed home-feed post content and author metadata, calculate scores locally, attach controls, and refresh the relevant tabs after store changes. LinkedIn is the only supported host. No automation of posting, messaging, likes, or account actions.

Remote code: No. All executable code, rules, templates, and artwork are bundled. External author photos are images, not executable code.

## Privacy questionnaire preparation

Disclose local handling; do not choose “no data” just because no backend receives it. Working inventory for matching to the dashboard's exact definitions:
- Personally identifiable information: displayed author names, identifiers, profile links and metadata.
- Website content: post text, snippets, quotes, scores derived from that content.
- Web history: assess the live definition against retained LinkedIn post/profile URLs and seen timestamps; no general browser-history API is used.
- User activity: assess the live definition against extension-only Destroy/Shame actions and counters; no general click/keystroke tracking.

No payment, password, authentication-cookie, precise-location, or private-message access is implemented. Post text itself can contain sensitive information; do not promise that arbitrary content can never contain it. Reconcile the live questionnaire, release code, and privacy policy before certifying. Data is not sold, used beyond the stated purpose, or used for lending/credit decisions.

Sources checked 19 October 2026:
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
