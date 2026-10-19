# Privacy Policy

_Last updated: 19 October 2026_

Slop Shame is a browser extension that scores posts on your LinkedIn home feed
for signs of AI-generated writing. It is designed so that nothing about you,
or about the posts you read, leaves your computer.

## Summary

- We do not collect, transmit, sell or share any data.
- The extension sends no network requests of its own: no analytics, no
  telemetry, no remote servers, no AI services.
- Everything it stores stays in your browser, on your device.
- There are no accounts.

## What the extension processes

When you open the LinkedIn feed, the extension reads, **in your browser
only**:

- the text of posts visible in your feed, and
- each post's author name, headline, profile link and profile picture link,
  as already shown on the page.

Post text is scored on the spot by local pattern matching. It is never sent
anywhere.

## What the extension stores

To build the **Hall of Slop** leaderboard and remember your settings, the
extension stores the following locally in its own IndexedDB database and in
`chrome.storage.local`:

- for each post author seen: name, headline, profile link, profile picture
  link, and counts and scores of their posts you have scrolled past;
- for scored posts: a post identifier, the score, its tier, the main slop
  category, the first ~200 characters of the post, and when you saw it;
- how many posts you destroyed or shamed;
- your extension settings.

This data lives in the extension's own storage area, separate from
linkedin.com, on your device. Neither LinkedIn nor the extension's developers
can read it. It is not synced to other devices.

## Network activity

The extension itself never makes network requests. Two things to be aware
of:

- It runs inside linkedin.com, which keeps making its own requests to
  LinkedIn as usual. The extension does not add to or change them.
- When the Hall of Slop page shows an author's profile picture, your browser
  loads that image from LinkedIn's servers, exactly as it does when you view
  the feed. No information from the extension is attached to that request.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings and the Hall of Slop on your device. |
| Host access to `https://www.linkedin.com/*` | Read and score feed posts, and show the Slop Index, Destroy and Shame buttons on them. The extension does not run on any other site. |

The extension requests no other permissions. If that changes, this policy
will be updated before the change ships.

## Shame cards

Shame cards are generated locally. They are only saved or shared if you
choose to download them yourself.

## Deleting your data

- **Clear all** in the Hall of Slop deletes the leaderboard and all stored
  post data.
- **Uninstalling** the extension removes everything it stored.

## Children

The extension is not directed at children and collects no data from anyone.

## Changes

Changes to this policy are published in this file in the
[project repository](https://github.com/prashantbhudwal/slop-shame), with
the date above updated.

## Contact

Questions or concerns: open an issue at
<https://github.com/prashantbhudwal/slop-shame/issues>. For security issues,
see [SECURITY.md](SECURITY.md).
