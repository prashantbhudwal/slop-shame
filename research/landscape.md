# Landscape: AI-slop and cringe-feed tools

Researched 2026-10-19 for Slop Shame (local LinkedIn Slop Index, Destroy, Shame card, Hall of Slop). Every factual claim below is tied to a URL. Where a store page did not show a user count or rating, that is stated. Third-party install counters (Chrome-Stats, Extpose) are labeled as such and are not Chrome’s official figures.

This is a product survey, not legal advice.

## How the field splits

Three products actually exist, and they barely overlap:

1. **Feed annotators.** A badge, blur, or collapse on posts the tool thinks are AI-written or “cringe.” Almost every LinkedIn-specific one is a tiny heuristic extension with no public ratings. The ones with real install bases (GPTZero, Copyleaks, Pangram) are cloud classifiers aimed at teachers and publishers, with a social-feed mode bolted on.
2. **Writing linters.** They flag the author’s own draft (phrase lists, em dashes, invisible Unicode). Open source and honest about being stylistic, not forensic. `avoid-ai-writing` is the one this repo already credits.
3. **A culture of mockery without a product.** r/LinkedInLunatics is a ~1 million-member screenshot community. It is not an extension. The closest shipped “roast” feature found is PostToast’s clipboard card, which **blurs names and faces**.

Nobody in this survey ships an explosion animation. A few ship the leaderboard idea in miniature: a local per-author rate plus a blocklist (Litmus, SlopScan).

LinkedIn itself shipped the category name. Since August 2026, the post menu has **“Seems like AI slop.”** It is a report to LinkedIn, not a personal filter. LinkedIn says more than a million members used it in the first two weeks, and that views of content it classifies as AI slop fell 40%. Sources: [LinkedIn newsroom, 15 Sep 2026](https://news.linkedin.com/2026/how-linkedin-is-tackling-ai-slop), [The Verge, 30 Jul 2026](https://www.theverge.com/ai-artificial-intelligence/973384/linkedin-seems-like-ai-slop-button), [TechCrunch, 30 Jul 2026](https://techcrunch.com/2026/07/30/linkedin-adds-a-button-to-report-ai-generated-slop/), [Hari Srinivasan](https://www.linkedin.com/posts/hsrinivasan1_one-more-follow-up-on-ai-slop-first-activity-7495960472341409792-U4ZA).

## Comparison

| Tool | Surface | Detection | UX | Scale (as published) | Source |
|---|---|---|---|---|---|
| LinkedIn “Seems like AI slop” | LinkedIn, first party | Their classifiers, fed by reports | Hides the post for the reporter; author may see a private analytics tip | >1M members used the button in two weeks | [newsroom](https://news.linkedin.com/2026/how-linkedin-is-tackling-ai-slop) |
| GPTZero + AI Vision | Docs, Reddit, X, LinkedIn, Medium, Substack | Proprietary cloud model; Writing Replay uploads keystrokes | Sentence highlights; colored badges while scrolling | CWS: 400,000 users, 4.7. Chrome-Stats on 2026-10-16: 500,000 users, 4.64 from 741 ratings | [CWS](https://chromewebstore.google.com/detail/gptzero-ai-detection-writ/kgobeoibakoahbfnlficpmibdbkdchap?hl=en), [Chrome-Stats](https://chrome-stats.com/d/kgobeoibakoahbfnlficpmibdbkdchap), [AI Vision](https://support.gptzero.me/articles/1675846160-ai-vision) |
| Copyleaks | Any page, highlight-to-scan | Cloud model, account required | Score on selection, not a live feed overlay | CWS: 100,000 users, Featured, 4.1 | [CWS](https://chromewebstore.google.com/detail/ai-content-detector-copyl/gplcmncpklkdjiccbknjjkoidpgkcakd?hl=en) |
| Pangram | X, LinkedIn, Reddit, Medium, Substack, Docs | Cloud classifier; feed text stored by default for a “feed health” view | Human / AI-Assisted / AI labels | CWS: 20,000 users, 5.0. Firefox: 1,150 daily users, 2.00 from 6 ratings (2026-10-18) | [CWS](https://chromewebstore.google.com/detail/pangram-ai-detection/eakpippijmmohmdlpgcjnipolcgciaga?hl=en), [Chrome-Stats Firefox](https://chrome-stats.com/d/pangram-ai-detection), [product page](https://www.pangram.com/solutions/chrome-extension) |
| Originality.ai | Docs + on-demand page scan | Cloud model + typing replay | Login, then Scan | 160 ratings on the listing read; user count not shown in that listing text | [CWS](https://chromewebstore.google.com/detail/ai-detector-writing-repla/kdngfaamkbbkdbemejnlkmjfpmndjdmb) |
| Winston AI | Highlight / right-click, plus images | Cloud, credits, account | Corner panel | 19 ratings; user count not in the listing text | [CWS](https://chromewebstore.google.com/detail/ai-detector-for-text-and/cdbldfdikpkmfcnpidikieafacjkchbg) |
| NoSlop | LinkedIn feed | 11 on-device pattern rules; optional Jev cloud score | % badge; collapse to a FILTERED card | Launched Sep 2026; no official user count found | [noslop.lol](https://noslop.lol/), [press](https://noslop.lol/press), [privacy](https://noslop.lol/privacy) |
| SlopScan (LinkedIn) | LinkedIn posts and comments | 7 local signals; Premium sends hovered posts to their model | Green/amber/red badge, blocklist | Soft launch Apr 2026; no user count on the site | [slopscan.app](https://www.slopscan.app/), [privacy](https://www.slopscan.app/privacy.html) |
| PostToast | LinkedIn | 40+ local cringe patterns | 0–10 badge, signal breakdown, Copy Roast, Copy Card | Chrome-Stats: 11 users as of 2026-10-17 | [posttoast.app](https://posttoast.app/), [Chrome-Stats](https://chrome-stats.com/d/fjcahfiidddcomdcnbocfkcnaphmidnl) |
| Cringe Guard | LinkedIn | User’s own LLM API (Groq and others) | Blur or remove | GitHub 105 stars, MIT. Store listing has no rating count in the text fetched. Reddit launch post: 632 points | [GitHub](https://github.com/Pankajtanwarbanna/cringe-guard), [CWS](https://chromewebstore.google.com/detail/cringe-guard-filter-out-c/noaafhfibcojghlilpedjjmlflmpamia), [r/IndiaTech](https://www.reddit.com/r/IndiaTech/comments/1impnti/built_an_ai_tool_to_filter_out_cringe_content_on/) |
| STOP SLOP | X, LinkedIn, Reddit, articles | Local filters plus cloud checks via their Cloudflare proxy and OpenRouter | Review / Mark / Collapse / Hide | Extpose (third party): 19 installs, four short positive reviews in Sep 2026 | [stopslop.tools](https://stopslop.tools/), [Extpose](https://extpose.com/ext/nhcffcobenbolefgdokapilaneemenbg) |
| avoid-ai-writing | Agent skill, npm, browser extension on text fields | Local regex + stylometry, 0–100 | Highlights in the draft you are writing | GitHub 5,083 stars, MIT, © 2026 Conor Bronsdon | [repo](https://github.com/conorbronsdon/avoid-ai-writing), [license](https://github.com/conorbronsdon/avoid-ai-writing/blob/HEAD/LICENSE), [extension](https://www.avoidaiwriting.com/extension) |

## LinkedIn-specific extensions

These are the direct neighbors. Most are heuristic, local, and too new to have a review record.

### NoSlop for LinkedIn

- **URLs:** [noslop.lol](https://noslop.lol/), [privacy](https://noslop.lol/privacy), [press kit](https://noslop.lol/press). ChromeBoard records the extension id `ckfhgllpojcocmdedaghjdbjanckljmg`: [ChromeBoard](https://chromeboard.com/extension/noslop-for-linkedin-ckfhgllpojcocmdedaghjdbjanckljmg).
- **Open source?** Not claimed.
- **Users / ratings:** Press kit says Chrome Web Store launch in September 2026, Edge listing in certification, made by Abdumajid Rashidov. No user count or rating was on the pages fetched.
- **Detection:** Eleven on-device pattern rules by default. Optional **Slop Score** sends post text (trimmed to 4,000 characters) plus a random install id to a Cloudflare Worker, which forwards it to TypeSafe AI’s Jev model. Four scores: AI-written, engagement bait, fake story, recruiter/sales spam. Cap of 400 cloud scores per install per day, then local rules until midnight UTC. Author name, profile, messages, and connections are not sent. Hashes of scored text stay on device for seven days. [privacy](https://noslop.lol/privacy), [ChromeBoard listing text](https://chromeboard.com/extension/noslop-for-linkedin-ckfhgllpojcocmdedaghjdbjanckljmg).
- **UX:** “% AI” badge. Over a threshold (Lenient 80 / Balanced 65 / Strict 50) the post collapses to a one-line card with “Show anyway.” Checkboxes for engagement bait, humblebrag, and recruiter spam. One permission: `storage`. [press](https://noslop.lol/press), [homepage](https://noslop.lol/).
- **Positioning:** Their own FAQ says LinkedIn’s button is a per-post report, not a filter, and that the extension “changes only what is displayed in your own browser, the same way a reader mode or an ad blocker” would. [noslop.lol](https://noslop.lol/). That framing is common. LinkedIn’s help page disagrees; see the User Agreement section.
- **Calibration they publish:** 24 labeled posts. Human posts scored 6–16%, generated posts 44–89%, no false positives at the default threshold, including Russian and Uzbek samples. [press](https://noslop.lol/press). That set is too small to treat as an accuracy claim.

An earlier, different “NoSlop” post by Guy Treves (Oct 2025, 29 reactions) asked people to comment if they wanted an extension. [LinkedIn post](https://www.linkedin.com/posts/guy-treves_i-hate-ai-when-its-used-to-post-slop-all-activity-7389546243351375872-4c15). The September 2026 press kit names a different maker. Treat them as possibly unrelated.

### SlopScan (LinkedIn) — not the Firefox repo grader

- **URLs:** [slopscan.app](https://www.slopscan.app/), [privacy](https://www.slopscan.app/privacy.html).
- **Open source?** Not claimed. Do not confuse it with [ashkitten/slopscan-webext](https://codeberg.org/ashkitten/slopscan-webext), a Firefox add-on that letter-grades **git repos** (94 daily users, 4.00 from 8 ratings, as of 2026-10-12 on [Chrome-Stats](https://chrome-stats.com/d/slopscan)).
- **Users:** Privacy policy dated 30 Apr 2026 says soft launch, free extension only, no Premium subscribers yet. No install count.
- **Detection:** Seven local signals: lexical tells (“delve,” “tapestry”), punctuation (em dashes, Oxford commas), burstiness, hook → three bullets → question, hedging, tidy closers (“What are your thoughts?”), and sentence templates (“It’s not X, it’s Y”). Free tier stays in the browser. Premium (not yet sold) would send hovered posts to a hosted model and sync the blocklist. [homepage](https://www.slopscan.app/), [privacy](https://www.slopscan.app/privacy.html).
- **UX:** Green / amber / red badge on posts and top-level comments. Hover shows which signals fired. One-click blocklist of repeat authors, stored in `chrome.storage.local`, including profile names, headlines, and rolling scores. They explicitly say a red badge means “looks AI-generated,” not “this person is a fraud.”
- **ToS claim to treat skeptically:** The FAQ says a read-only DOM annotator is “invisible” to LinkedIn and “on the right side of their terms” because it does not click, scrape to a server, or call LinkedIn’s API. [slopscan.app](https://www.slopscan.app/). LinkedIn’s own help page prohibits extensions that modify appearance, whether or not they exfiltrate data. See below.

### PostToast — the only roast-card cousin

- **URLs:** [posttoast.app](https://posttoast.app/), [Chrome-Stats](https://chrome-stats.com/d/fjcahfiidddcomdcnbocfkcnaphmidnl), privacy at `https://posttoast.app/privacy.html` as listed there.
- **Open source?** Not claimed. Publisher on Chrome-Stats: Kingly Insights LLC. Version 2.5.4, updated 2026-09-10. Created 2026-03-03.
- **Users:** Chrome-Stats: **11 users** as of 2026-10-17. No review themes found.
- **Detection:** Local only. Marketing page says 80+ signals; the store description Chrome-Stats quotes says 40+ patterns: humble brag, broetry, engagement bait, fabricated parable, hustle porn, jargon. No API.
- **UX:** 0–10 “bullshit” badge. Click for the point breakdown. **Copy Roast** puts text on the clipboard. **Copy Card** captures the post plus the score strip **with names and faces blurred**. Listing text calls it “a satirical entertainment tool” and includes “Not affiliated with, endorsed by, or sponsored by LinkedIn.” Permissions quoted by Chrome-Stats: `storage`, `clipboardWrite`, `offscreen`; host `https://www.linkedin.com/*`.
- **Why it matters here:** This is the shipped answer to “a shame card of a real author.” They joke, and they blur identity on the thing you can paste somewhere else.

### FeedFilter

- **URL:** [CWS](https://chromewebstore.google.com/detail/feedfilter-%E2%80%93-linkedin-ai/nfiodpednhhaaecoijkdmacfkegcfakp).
- **Open source?** Not claimed. Developer email on the listing: namanrajkhadia@gmail.com. Version 1.0.0, updated 7 Apr 2026, **13.53 KiB**.
- **Users:** Listing text says no ratings.
- **Detection:** In-browser phrases, emoji lists, listicles, hook+CTA, “robotic cadence.” “Zero network requests.”
- **UX:** Three tiers (Very Likely AI, Possibly AI, AI Vibes). Flag or Hide. Sensitivity Low/Medium/High. Live scanned/flagged counts.
- A 14 KiB package is a word list, not a model. That is the whole local-heuristic genre.

### LinkedIn AI Post Detector

- **URL:** [CWS](https://chromewebstore.google.com/detail/linkedin-ai-post-detector/lemhicgfdgkoofhlgiipimjbkkicgmac). Version 1.0.0, updated 8 Feb 2026, 17.22 KiB. Offered by chrs.buckmnster. No ratings on the listing.
- **Detection:** Local heuristics. Phrases (“let’s unpack,” “delve into”), numbered lists, emoji, bro-poem line breaks, sentence-length uniformity, hedges, engagement bait (“Agree?”, “Tag someone”), repeated sentence starters.
- **UX:** 0–100% badge. 70–100 red, 50–69 orange, 30–49 yellow, 15–29 light green, 0–14 green. Click for the breakdown.
- **Their own limit, worth copying verbatim in spirit:** human corporate writers score high; edited AI scores low; “sniff test, not a verdict.”

### Cringe Guard

- **URLs:** [CWS](https://chromewebstore.google.com/detail/cringe-guard-filter-out-c/noaafhfibcojghlilpedjjmlflmpamia), [GitHub](https://github.com/Pankajtanwarbanna/cringe-guard). **MIT.** 105 stars, 16 forks. Store version 0.0.6, updated 6 Jul 2025. The listing’s “all processing happens locally” means the API key stays in the browser; the README sends post text to Groq (or another LLM).
- **UX:** Blur with click-to-view, or delete the node. Mute words. Stats for posts filtered and “time saved.” Promoted posts removed by default.
- **Reception:** r/IndiaTech, 11 Feb 2025, **632 points**, 77 comments. Author said it hid about 70% of their feed. Commenters asked for DOM removal (shipped), an OpenAI-compatible endpoint, and pointed at r/LinkedInLunatics. [thread](https://www.reddit.com/r/IndiaTech/comments/1impnti/built_an_ai_tool_to_filter_out_cringe_content_on/). Show HN the same day got 2 points and the joke “so it blocks all of LinkedIn?” [HN](https://news.ycombinator.com/item?id=43008609).
- **Complaint pattern:** API-key setup, cost and latency of an LLM per post, and a threshold so aggressive the feed disappears. The README still lists a console-spam bug. [README](https://github.com/Pankajtanwarbanna/cringe-guard).

### LAID (LinkedIn AI Detector)

- **URL:** [oldeucryptoboi/linkedin-ai-detector](https://github.com/oldeucryptoboi/linkedin-ai-detector). Show HN: [item 47213559](https://news.ycombinator.com/item?id=47213559) (2 points). Load-unpacked; not a store listing in that post.
- **License:** Not stated in the README text fetched. Do not assume one.
- **Detection:** Default is 14 weighted local signals (burstiness 10%, abstraction 9%, generic phrases 9%, em dash 8%, hedges, transitions, paragraph uniformity, hook→CTA, contractions, specificity, cadence, “not X but Y,” list density, rule of three). Optional Claude / OpenAI / Gemini, with the local scores sent along with the post text. Sensitivity slider.
- **UX:** Green 0–40, amber 40–70, red 70–100. Click for all 14 signals.
- The Show HN cites Kobak et al. on excess vocabulary, Liang et al. on “delve” in reviews, and Jakesch et al. (PNAS) on humans being bad at spotting AI text. Those citations live in the HN post, not as papers re-checked for this note.

### Other small LinkedIn listings

Details below are from the store text. None of these fetches included an official user count.

- **LinkedIn Cringe Blocker** — keyword hide or soft-blur, `chrome.storage.local` only. Version 0.1.2, updated 14 Nov 2025, 79.61 KiB. “0 out of 5,” no ratings. [CWS](https://chromewebstore.google.com/detail/linkedin-cringe-blocker/ldcfnchoijkcepagaocfgkplddobhaae).
- **LinkedIn AI Filter** — red/amber/green, hover to vote, optional hide. Claims “anonymous vote counts and post IDs,” so it is not local-only. 5.0 from 7 ratings. [CWS](https://chromewebstore.google.com/detail/linkedin-ai-filter/oineddpikecdckoecleedpbppokmgnlf).
- **Litmus** — inline AI / mixed / human next to the author name, per-author AI rate over time, auto-hide authors past a threshold (example given: 80% after 5 posts), manual blacklist/whitelist, skip promoted/suggested/company blocks “before any API call.” Version 0.2.5, updated 28 Apr 2026. The “API call” means classification is not fully on-device. [CWS](https://chromewebstore.google.com/detail/litmus/bbppjabmjgilcfnmnoedhcljgnlapnad).
- **LinkedLens** — “6 patterns” from a research project the author attributes to Shawn David; badge plus ignore-this-author; “open source, code is on my github” but the listing text fetched did not include the repo URL. Version 0.2, updated 14 Jul 2025. 3 ratings. [CWS](https://chromewebstore.google.com/detail/linkedlens-linkedin-ai-de/ihejidmpaegmhkolekndpohaliaomali).
- **CringeIn** (`0xfauzi/cringedin`) — blur via the user’s OpenAI key (README says GPT-4.1), cache 7 days. Load-unpacked. Not a store product in the README. [GitHub](https://github.com/0xfauzi/cringedin).
- **StopSlopIn** — Chrome extension whose published backend is an n8n workflow: posts go to OpenAI (or another chat model) with a Qdrant RAG of the user’s own good/slop votes. Self-hosted. The template warns that post text is forwarded to the model provider. [n8n](https://n8n.io/workflows/15226-filter-ai-slop-from-your-linkedin-feed-backend-for-stopslopin-chrome-extension/).
- **Slop Mop** (`slopmop.lol`) — Show HN, 2 points, 21 days before a page dated in this research window: hides AI or promotional posts. A commenter said silent false positives are the hard problem, and asked whether the UI shows reasons. [HN](https://news.ycombinator.com/item?id=49819820).

## Cross-site feed tools

### STOP SLOP

- **URLs:** [stopslop.tools](https://stopslop.tools/), store id `nhcffcobenbolefgdokapilaneemenbg` via [Extpose](https://extpose.com/ext/nhcffcobenbolefgdokapilaneemenbg). Publisher there: Stas Kulesh. Version 0.8.13 when fetched. Extpose’s install counter read **19**. Four Sep 2026 reviews praise cleaner feeds and user-chosen actions; that is the whole public review set found.
- **Open source?** Not claimed.
- **Detection:** Local community-list matching plus optional cloud review. Cloud path sends up to 8,000 characters through their Cloudflare service and OpenRouter. 5,000 free checks per install per month, then the user’s own key. Article checks start local. They cache hashes and results 30 days and say they do not persist raw text. English, at least 80 words. They state they have **no validated accuracy claim**. [homepage](https://stopslop.tools/).
- **UX worth copying:** one control with four presentations — Review, Mark, Collapse, Hide — and the slider changes presentation, not the detector threshold. Unknown stays visible. Show is session-scoped. Account exceptions exist for X.

### SlopScout

- **URL:** [CWS](https://chromewebstore.google.com/detail/slopscout/hiicncilkepbgpcfoojkkpnkfnpjeean). 5.0 from 1 rating. Built by BraynLabs.
- **Detection:** 30+ local rules (em dashes, “that’s not X, that’s Y,” broetry, buzzwords, engagement bait) **and** negative signals for human writing (misspellings, slang, profanity, ALL CAPS, first person, URLs). No network.
- **UX:** Blur on X by default; other sites including LinkedIn, Reddit, Facebook, YouTube are opt-in. Four sensitivity levels. Verified accounts, politicians, and 200+ news orgs are labeled but not blurred.

### GetHumanOnly

- **URL:** [gethumanonly.com](https://gethumanonly.com/). No store listing or user count was in the pages found.
- **Detection:** Free local heuristic pass, then optional “deep” scan through **GPTZero’s API**, paid in credits.
- **UX:** Tag, blur, or hide. Auto-scan on Google, Bing, Reddit, Twitter, LinkedIn, Medium, and news pages.

### Slop Stop

- **URL:** [CWS](https://chromewebstore.google.com/detail/slop-stop/ddlbneeopkgolghemhohnianfhmgheen). 5.0 from 2 ratings. Version 1.0.2, updated 12 Feb 2026, 490 KiB.
- Community curation that hides “slop” on Twitter, YouTube, LinkedIn, and the web. Disclosed data types: user activity and website content. Not a pure on-device scorer.

### Pangram

- **URLs:** [CWS](https://chromewebstore.google.com/detail/pangram-ai-detection/eakpippijmmohmdlpgcjnipolcgciaga?hl=en) (20,000 users, 5.0), [Firefox stats](https://chrome-stats.com/d/pangram-ai-detection) (1,150 daily users, rating 2.00 from 6, data as of 2026-10-18), [product page](https://www.pangram.com/solutions/chrome-extension).
- **Detection:** Their classifier, marketed at “over 99%” with a “1-in-10,000” false-positive figure on the Chrome listing. Text from X, LinkedIn, Substack, and Medium is scanned on their servers. **Stored by default** for a Feed Health screenshot; opt out in preferences. They say they do not sell it or train on it.
- **UX:** Live Human / AI-Assisted / AI labels, a feed-health percentage, and highlight-to-check anywhere.
- **Complaint signal:** Chrome 5.0 versus Firefox 2.00 from a small sample. Do not average those. The product lesson is the default: feed text leaves the machine unless the user opts out.

### GPTZero AI Vision and the big detectors

- **GPTZero extension:** [CWS](https://chromewebstore.google.com/detail/gptzero-ai-detection-writ/kgobeoibakoahbfnlficpmibdbkdchap?hl=en) shows Featured, Education, **400,000 users**, version 2026.8.0 in one fetch and a mangled “4.7 out of 5723 ratings” line. [Chrome-Stats](https://chrome-stats.com/d/kgobeoibakoahbfnlficpmibdbkdchap), data as of 2026-10-16: **500,000 users**, rating 4.64 from 741, version 2026.10.4. [chrome-stats reviews](https://chrome-stats.com/d/kgobeoibakoahbfnlficpmibdbkdchap/reviews) summarize praise for Docs workflow and isolated billing complaints. Treat the two user counts as conflicting scrapes of the same listing, both in October 2026.
- **AI Vision** (inside that extension) badges Reddit, X, LinkedIn, Medium, and Substack while you scroll. [support article](https://support.gptzero.me/articles/1675846160-ai-vision).
- **How they say detection works:** patterns, predictability, sentence variation; they claim a 1% ESL false-positive target and tell users not to punish from a score. [gptzero.me/chrome](https://gptzero.me/chrome).
- **Writing Replay Anywhere** records an editor changelog plus page title and URL and uploads it to GPTZero while you are logged in. [FAQ](https://support.gptzero.me/articles/7223290711-writing-replay-anywhere-faq). That is the opposite of a local feed toy.
- **Complaints that stuck:** Trustpilot score 2.5, with the summary saying reviewers call it inaccurate on human text. [Trustpilot](https://www.trustpilot.com/review/gptzero.me). A May 2025 Reddit write-up says a handwritten essay scored 51% AI and that the same passage rescored differently. [r/AIToolTesting](https://www.reddit.com/r/AIToolTesting/comments/1kc5frd/my_3_month_experience_using_gptzero_premium_is_it/). A Feb 2026 thread says voice typing was marked as paste. [r/ArtificialInteligence](https://www.reddit.com/r/ArtificialInteligence/comments/1r7sovo/gptzero_google_doc_extension_is_trash/). HN threads from 2025 argue the false positive, not the false negative, is what makes a detector unusable as a verdict. [43139353](https://news.ycombinator.com/item?id=43139353), [46735062](https://news.ycombinator.com/item?id=46735062).
- **Copyleaks:** [CWS](https://chromewebstore.google.com/detail/ai-content-detector-copyl/gplcmncpklkdjiccbknjjkoidpgkcakd?hl=en), 100,000 users, Featured, 4.1. Highlight text, click the icon. Account. They claim 99% accuracy and a 0.2% false-positive rate. [copyleaks.com](https://copyleaks.com/ai-detector/extension). Not a feed overlay.
- **Originality.ai:** [CWS](https://chromewebstore.google.com/detail/ai-detector-writing-repla/kdngfaamkbbkdbemejnlkmjfpmndjdmb), 160 ratings in the fetch. Login, then scan a Doc or a page. Writer replay and “auto-typer” detection. Same “not 100%” disclaimer.
- **Winston AI:** [CWS](https://chromewebstore.google.com/detail/ai-detector-for-text-and/cdbldfdikpkmfcnpidikieafacjkchbg), 19 ratings. Highlight at least 500 characters, spend credits. They say extension scans are not saved.

These products won distribution by selling **authorship proof to schools**, not by being fun on LinkedIn. The feed badge is a feature of a detector people already pay for.

## Open-source engines and userscripts

### avoid-ai-writing (already in this repo’s notices)

MIT, © 2026 Conor Bronsdon. 5,083 stars, 463 forks when fetched. [repo](https://github.com/conorbronsdon/avoid-ai-writing), [license](https://github.com/conorbronsdon/avoid-ai-writing/blob/HEAD/LICENSE). The detector in `patterns.js` is zero-dependency, runs in Node and the browser, and returns a 0–100 score, a label, per-issue severity, and sentence spans. [detector README](https://github.com/conorbronsdon/avoid-ai-writing/blob/main/detector/README.md). The browser extension scans text fields locally; deep audit is an opt-in account. [extension page](https://www.avoidaiwriting.com/extension). It is a writer’s linter, not a feed overlay. Rules are English-first.

### LLM Slop Detector

MIT, © 2026 Mathias Axell. [license](https://github.com/mandakan/llm-slop-detector/blob/HEAD/LICENSE), [repo](https://github.com/mandakan/llm-slop-detector). Chrome: [CWS](https://chromewebstore.google.com/detail/llm-slop-detector/ancpfnfeflffphhpaejhpggfhjmafeid). Firefox: [AMO](https://addons.mozilla.org/en-US/firefox/addon/llm-slop-detector/). No user count on the listing text fetched.

Local only. No telemetry, no remote rule updates. Flags invisible Unicode, “AI punctuation,” and phrase packs (~40 core rules, 500+ patterns across opt-in packs, including per-model tells). Two modes: underline while you type, or a one-shot “scan this page” that does not run in the background. Fixes go through `execCommand('insertText')` so the host editor can undo them. The opt-in packs are the design idea: do not turn on every tell at once.

### De-Slop

GPL-3.0, Copyright 2024 Kief Studio LLC / HxHippy. [license](https://github.com/HxHippy/DeSlop/blob/main/LICENSE), [repo](https://github.com/HxHippy/DeSlop), [site](https://hxhippy.github.io/DeSlop/). Star count was not in the fetched license page.

600+ patterns, 11 languages, sensitivity 1–5, highlight-only mode with tooltips, custom patterns, and a `linkedin-fixer.js`. Zero API calls. **Do not copy this into an MIT tree.** GPL-3.0 on the program is not compatible with dropping their pattern lists into Slop Shame without taking on the license.

### Other local engines (not LinkedIn products)

- **distil-labs/distil-ai-slop-detector** — Apache-2.0, 95 stars. Fine-tuned Gemma 3 270M, quantized ~242 MB, run in-browser via Wllama. They claim ~95% on the quantized build against a teacher that scored 100% on their test. Paste-to-analyze, not a feed walker. ~253 MB download. [GitHub](https://github.com/distil-labs/distil-ai-slop-detector/).
- **awnist/slop-cop** — MIT, 160 stars. In-browser editor. 36 local rules on a 350 ms debounce; optional Haiku/Sonnet (or a local model) with the user’s key in `localStorage`. [GitHub](https://github.com/awnist/slop-cop). Explicitly “does it read like AI,” not “was it AI.”
- **eric-tramel/slop-guard** — MIT, 164 stars. CLI/library, 0–100, 24 rules, no LLM. [GitHub](https://github.com/eric-tramel/slop-guard).
- **meow-d/slop-alerter** — browser extension, custom fastText model. Sites include Reddit, Twitter, Bluesky, and LinkedIn marked “broken?”. Author’s disclaimer: detection is “theoretically impossible”; the model imitates a human slop reflex. [GitHub](https://github.com/meow-d/slop-alerter).
- **kenpodragon/GhostBustersInTheShell** — local heuristics (68+ patterns) plus optional MiniLM/RoBERTa. Unpacked MV3 extension scans a page or a selection and can rewrite in a voice profile. [GitHub](https://github.com/kenpodragon/GhostBustersInTheShell).

### Userscripts (Greasy Fork)

All tiny. They are the existence proof that a word list plus a `MutationObserver` is the whole MVP, and that LinkedIn’s DOM eats them.

- **LinkedIn AI Word Highlighter** — MIT. Highlights “delve,” “foster,” “testament,” “let that sink in,” and similar, on `linkedin.com/feed/*`. [source](https://greasyfork.org/en/scripts/585983-linkedin-ai-word-highlighter/code).
- **AI Content Detector — Em Dash & Emoji Flagger v2.8** — robot badge on LinkedIn, Bluesky, and Mastodon from em dashes and emoji. Local. [Greasy Fork](https://greasyfork.org/en/scripts/566885-ai-content-detector-em-dash-emoji-flagger-v2-8).
- **LinkedIn AI slop detector** — highlight “suspected slop characters.” Greasy Fork listed **3 total installs** when the site index was fetched. [index](https://greasyfork.org/en/scripts/by-site/linkedin.com?sort=updated).
- **not_interested** — MIT, [abernier/userscripts](https://github.com/abernier/userscripts). Hides Suggested, Promoted, Learning, and puzzles. **15 total installs** on that same index. Not an AI detector. [source](https://greasyfork.org/en/scripts/582163-not-interested-a-cleaner-linkedin-feed/code). The author notes LinkedIn’s own “I don’t want to see this” does not stick: [LinkedIn help a523209](https://www.linkedin.com/help/linkedin/answer/a523209).

### Feed cleaners (no AI score)

Useful only as DOM-survival notes.

- **jjarndt/linkedin-focus** — hide feed, ads, news, badges. `document_start` CSS plus a MutationObserver. Two shells (new React and classic Ember). Disclaimer: unofficial, LinkedIn’s DOM can break selectors, use at your own risk. [GitHub](https://github.com/jjarndt/linkedin-focus).
- **jgalea/noiseout** — hides puzzles, ads, upsells, promoted posts. Prefers `data-testid` and `aria-label`. [GitHub](https://github.com/jgalea/noiseout).
- **LinkOff** — Noah Jelich. Selects posts with `[data-id*="urn:li:activity"]` because class names move. [write-up](https://jelich.cc/posts/LinkOff-Making-LinkedIn-Slightly-Less-Dreadful/).

**DOM breakage, March 2026:** Rohit Saini wrote that LinkedIn’s SDUI migration removed `.occludable-update`, `.feed-shared-update-v2`, and `.social-details-social-activity` in favor of hashed classes like `_1c51cc16`, and that his LinkedComment extension suddenly saw zero posts. He moved to `data-testid`, `aria-label`, SVG ids, and screen-reader text. [LinkedIn post, 25 Mar 2026](https://www.linkedin.com/posts/rohitsainier_chromeextension-webdevelopment-linkedin-activity-7442442684600053760-qR6Z). A scraper README documents the same split between classic `urn:li:activity` cards and a newer `componentkey` / `data-testid="expandable-text-box"` layout. [abhishekgoyal-a11y](https://github.com/abhishekgoyal-a11y/Projects/tree/main/linkedin-post-scraper).

## The cultural product: r/LinkedInLunatics

Not software. Public Reddit community for screenshots of over-the-top LinkedIn posts. The community text says LinkedIn posts are public and **names do not need to be hidden**. [gummysearch excerpt of the description](https://gummysearch.com/r/LinkedInLunatics/), [prowlo excerpt](https://prowlo.com/tools/subreddit-stats/linkedinlunatics).

Member counts from third-party trackers, not from Reddit’s own UI in this research: 1.08M as of the week ending 27 Sep 2026 [oscylo](https://oscylo.com/sub/linkedinlunatics); 1,090,640 as of a crawl dated Oct 9 [prowlo](https://prowlo.com/tools/subreddit-stats/linkedinlunatics); 1.1M as of 15 Oct 2026 [gummysearch](https://gummysearch.com/r/LinkedInLunatics/). Created 1 Oct 2019 [redpulse](https://redpulse.io/subreddit-search/r/linkedinlunatics/).

That community is why a shame button will feel familiar. It is also the behavior Chrome’s bullying examples describe, if the extension itself becomes the publisher of named ridicule. See the store section.

## What got attention, and what people complain about

Attention went to:

- **A first-party button with the words “AI slop.”** LinkedIn’s launch was covered by The Verge, TechCrunch, and Bloomberg in the same week. [Verge](https://www.theverge.com/ai-artificial-intelligence/973384/linkedin-seems-like-ai-slop-button), [TechCrunch](https://techcrunch.com/2026/07/30/linkedin-adds-a-button-to-report-ai-generated-slop/), [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-30/linkedin-is-cracking-down-on-ai-slop-with-new-reporting-tool).
- **Cringe Guard’s demo GIF** on r/IndiaTech (632 points), not its Show HN (2 points). The joke that landed was “it hid 70% of my feed.”
- **GPTZero, Copyleaks, Pangram** selling certainty to institutions. Hundreds of thousands of installs sit here, not on the hobby LinkedIn filters.
- **avoid-ai-writing** as a portable rule list (5,083 stars), because writers want to delete the tells, not prosecute authors.

Complaints that repeat:

- **False positives, and rescoring the same text.** Trustpilot and the two Reddit threads above. HN: a detector that sometimes flags humans cannot be a verdict. [43139353](https://news.ycombinator.com/item?id=43139353).
- **Silent hiding.** The only substantive comment on Slop Mop was that a hidden good post destroys trust faster than a missed bad one, unless the UI shows confidence and reasons. [HN 49819820](https://news.ycombinator.com/item?id=49819820).
- **“It hid everything.”** Cringe Guard’s author and the HN joke. Aggressive LLM “cringe” classifiers match the culture of the site, not a distinct class of posts.
- **Keys, credits, and text leaving the browser.** Cringe Guard, GetHumanOnly, STOP SLOP, Pangram, GPTZero Replay. Local-by-default is the hobby pitch; the paid products do the opposite.
- **The extension died overnight** when LinkedIn renamed classes. [Saini](https://www.linkedin.com/posts/rohitsainier_chromeextension-webdevelopment-linkedin-activity-7442442684600053760-qR6Z).

No Hacker News thread found in this pass made a LinkedIn slop extension famous. The Show HN posts for Cringe Guard, LAID, and Slop Mop each sat at 2 points.

## Enforcement history (extensions and scraping)

No source found in this pass shows LinkedIn or Google taking down a **local slop-badge** extension. The documented cases are scrapers, automation, trademark, and appearance changes. That is not a safe harbor. The User Agreement text covers overlays anyway.

- **Browserflow, 27 Jan 2023.** LinkedIn’s cease-and-desist to Road to Ramen LLC. The extension advertised scraping people results, profile data, emails from comments, and automated connection responses, and it used the IN logo. LinkedIn demanded they stop offering those features and stop using the mark. The letter cites `hiQ Labs, Inc. v. LinkedIn Corp.`, N.D. Cal. No. 17-CV-03301-EMC, 2022 WL 18399982 (4 Nov 2022), for the claim that the User Agreement is enforceable and bars scraping. [PDF](https://browserflow.app/linkedin.pdf).
- **hiQ settlement.** After that summary judgment, the parties stipulated a $500,000 judgment against hiQ, liability for trespass to chattels and misappropriation, and an injunction against future scraping. [Morgan Lewis, Dec 2022](https://www.morganlewis.com/blogs/sourcingatmorganlewis/2022/12/linkedin-v-hiq-landmark-data-scraping-suit-provides-guidance-to-data-scrapers-and-web-operators).
- **“Private Notes for LinkedIn, Twitter, Facebook.”** A Medium account of a short-lived Chrome extension says LinkedIn accused it of copying content from linkedin.com. [Medium](https://medium.com/@emironic/short-life-and-death-of-chrome-plugin-for-linkedin-2bf4431e147a).
- **LinkedIn Open To Work, Aug 2024.** The developer posted LinkedIn’s notice to Google. LinkedIn asked for removal from the Chrome Web Store in the US. Grounds quoted in the post: unauthorized use of the LinkedIn mark in screenshots (users might think it is an official extension, and LinkedIn publishes its own), plus “improperly and without authorization modifying and scraping information from LinkedIn’s website.” The developer said the extension only read the page the user was already looking at, and that Google had blocked the US listing. [r/chrome_extensions](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/).
- **BrowserGate, 2026.** LinkedIn detects extensions by the static resources (images, JavaScript) those extensions expose so they can be injected into LinkedIn pages. LinkedIn told Hacker News it uses that to find extensions that scrape or otherwise violate the terms, and to explain accounts pulling unusual amounts of member data. [Ars Technica, Apr 2026](https://arstechnica.com/tech-policy/2026/04/linkedin-scanning-users-browser-extensions-sparks-controversy-and-two-lawsuits/). Two user lawsuits over that scanning were dismissed in September 2026. Judge Vince Chhabria found the plaintiffs had not alleged they had extensions installed that conveyed private information. LinkedIn’s motion, as reported, says the signals are what extensions openly provide to sites, and that some extensions extract job listings, which the terms forbid. [Ars Technica, Sep 2026](https://arstechnica.com/tech-policy/2026/09/linkedin-beats-browsergate-lawsuits-over-scanning-users-chrome-extensions/).

Practical reading: an extension with `web_accessible_resources` on linkedin.com is visible to LinkedIn’s page. “Read-only” and “no network” do not make it invisible. Enforcement so far has aimed at scraping, automation, and brand confusion, then used “modifying the website” as a Chrome Web Store complaint.

## Chrome Web Store policies that touch this product

Policies below are Google’s public developer docs as fetched on 2026-10-19.

### Single purpose

An extension needs one narrow purpose. A shopping tool may search and coupon within shopping. Unrelated features should be separate extensions. Extra permissions are treated as extra purposes. Violations are removed. [quality guidelines FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq), [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

Slop Index, Destroy, Shame, and a local Hall of Slop can be argued as one purpose — “show me how AI-written this LinkedIn post looks, and let me dismiss or mock it” — only if every permission and every screen serves that. A general AI detector, a job-scraper, or a comment-writer in the same package is how listings get this rejection.

The dashboard asks for a single-purpose description that matches the listing. [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

### Privacy policy, even when nothing is uploaded

“Handle” includes collecting or using data, and the examples include clipping or scraping content from a page the user visits. [user data FAQ §2](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

User data includes website content, web browsing activity, and user-generated content. [FAQ §4](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

Local-only processing still has to be disclosed. [FAQ §3](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). A product that only uses `chrome.storage` still needs a privacy policy. [FAQ §14](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). The policy has to say what is collected, how it is used, and what is shared, and the dashboard needs the URL. [program policies, Privacy Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), [FAQ §7](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

If any post text is transmitted, the disclosure has to be inside the product UI before collection, not only on the store page, and the user has to take an affirmative action. [FAQ §10](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). NoSlop’s consent card before Slop Score is this pattern. [privacy](https://noslop.lol/privacy).

### Limited use (tightened 1 Jul 2026)

Collected user data must be necessary to the disclosed single purpose. Browsing activity may be collected only for a user-facing feature described prominently on the store listing and in the UI. Do not transfer it except to provide that purpose, comply with law, fight abuse, or in a sale after explicit consent. Humans do not read user data except in narrow cases. No ads, no data brokers, no credit uses. An affirmative Limited Use statement has to live on a site the extension controls. [program policies, Limited Use](https://developer.chrome.com/docs/webstore/program-policies/policies), [1 Jul 2026 announcement](https://developer.chrome.com/blog/cws-policy-updates-2026).

A Hall of Slop that uploads author names to a server the developer can browse fails this. A local IndexedDB the user can clear does not, if the privacy policy says that.

### Harassment and identifiable people

The short policy: products should not contain material that threatens, harasses, or bullies other users. Hate speech against protected classes is separate and also banned. [hate and violence](https://developer.chrome.com/docs/webstore/program-policies/hate-and-violence).

The reviewer troubleshooting page for notification **Grey Potassium** quotes the examples Google says are violations:

- a specific threat of serious harm
- **content whose predominant purpose is to single out another person for abuse, malicious attack, or ridicule**
- unwanted sexualization
- a series of posts whose primary intention is harassment

If bullying content is a primary feature, the instruction is to unpublish. [troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting).

A score of a post, with the reasons, is the genre Google already lists (GPTZero, Pangram, the small LinkedIn badgers). A generated card whose job is to ridicule a named author, and a leaderboard of named people, is the sentence in that example. PostToast’s public artifact blurs names and faces and calls itself satire. [Chrome-Stats listing text](https://chrome-stats.com/d/fjcahfiidddcomdcnbocfkcnaphmidnl). r/LinkedInLunatics does the opposite on purpose, on Reddit, not in a Chrome extension. [gummysearch](https://gummysearch.com/r/LinkedInLunatics/).

Nothing found in this pass is a store rejection of a joke LinkedIn extension for tone alone. The examples are still the policy a reviewer would cite.

### Trademark and “not an official LinkedIn extension”

Do not imply authorization or endorsement. Do not infringe trademarks. [impersonation and IP](https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property).

LinkedIn’s brand rules: the brand may be used only as the guidelines allow, or with written permission. Do not use the name or logos in a way that suggests source, sponsorship, or affiliation. Do not use the brand in a defamatory or disparaging way. Do not imitate the look and feel of the site. [brand home](https://brand.linkedin.com/en-us). The full LinkedIn logo is not available to third parties without a license. [logo page](https://brand.linkedin.com/linkedin-logo). The [in] mark is for profile links, social-icon rows, and specific API widgets, not for an extension icon. [in logo](https://brand.linkedin.com/in-logo). The Open To Work takedown request was explicitly about screenshots using the mark. [Reddit](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/). Browserflow was dinged for the IN logo in the same letter as the scraping claims. [PDF](https://browserflow.app/linkedin.pdf).

Store listing text on PostToast already carries a non-affiliation line and names LinkedIn as a trademark of LinkedIn Corporation. [Chrome-Stats](https://chrome-stats.com/d/fjcahfiidddcomdcnbocfkcnaphmidnl).

### Code and permissions

Manifest V3: the logic ships in the package. Remote JavaScript, `eval` of fetched strings, and an interpreter for remote commands are violations. Remote JSON that only selects among bundled code paths is allowed. [MV3 additional requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements). A pattern list fetched as data can be fine; a pattern list fetched as code is not.

Host access should be the site the feature needs. [declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions). The LinkedIn-only extensions above request `https://www.linkedin.com/*` or equivalent, plus `storage`.

Deceptive or impossible claims in the listing are their own rejection (“who viewed your profile” is the example). [unexpected behavior](https://developer.chrome.com/docs/webstore/program-policies/unexpected-behavior). “99% accurate AI detector” is how the commercial tools market themselves; the hobby tools that survived their own README say the opposite.

## LinkedIn User Agreement

Current agreement text fetched from [linkedin.com/legal/user-agreement](https://www.linkedin.com/legal/user-agreement). Effective date on that page: **3 Nov 2025**. Section 8.2 survives termination of the contract (section 5).

LinkedIn Help restates the extension ban in one paragraph: they do not permit third-party software, including browser extensions, that **scrape, modify the appearance of, or automate activity** on LinkedIn. Members who use those tools risk restriction or shutdown, and LinkedIn may break the tools without notice. [help a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387).

Section 8.2 clauses that map onto a local, read-only overlay:

| Clause | Text (compressed) | How it reaches Slop Shame |
|---|---|---|
| 8.2.2 | Do not develop or use scripts, crawlers, **browser plugins and add-ons** to **scrape or copy** the Services, including profiles and other data | Reading posts to score them is what every extension here does. LinkedIn has called page-reading “scraping” in the Open To Work notice. A leaderboard of profile names is closer to the clause’s examples than a badge that is discarded when the node unmounts |
| 8.2.4 | Do not copy, use, display, or distribute information from the Services without the content owner’s consent | A shame card that quotes the post, or a Hall of Slop entry stored past the session, is a copy. Sharing that card is distribution |
| 8.2.6 | Do not copy or distribute others’ posts except through LinkedIn’s sharing tools, unless they used a license that allows it | Same, for the post body |
| 8.2.7 | Do not use the word “LinkedIn” or the logos in a business name, email, or URL, except as the brand guidelines allow | Product name, domain, and support email |
| 8.2.10 | Do not imply affiliation or endorsement | Icon, screenshots, “official” wording |
| 8.2.13 | No bots or unauthorized automation of access, messages, likes, comments, shares, or other inauthentic engagement | Clicking “Seems like AI slop,” dismissing posts through LinkedIn’s own endpoints, or auto-scrolling would cross this. A canvas animation that does not call LinkedIn does not |
| 8.2.14 | No framing, mirroring, or simulating the Services | A shame card that clones LinkedIn’s UI chrome |
| **8.2.15** | **Do not overlay or otherwise modify the Services or their appearance, including by inserting elements, or by removing, covering, or obscuring an advertisement** | This is the clause. A badge is an inserted element. Destroy and Hide remove or cover the post. Covering a promoted post is the example in parentheses |
| 8.2.16 | Do not interfere with the Services or place an unreasonable load on them, including manipulating algorithms | Auto-firing the slop report would be both 8.2.13 and this |
| 8.2.18 | Do not use the Services for anything unlawful, misleading, or fraudulent, including manipulated media that depicts a person saying or doing something they did not | A roast card that invents quotes |
| 8.2.19 | Do not misuse reporting | Scripting the official slop button |

Help repeats 8.2.2, 8.2.13, 8.2.15, 8.2.4, 8.2.3, 8.2.12, and 8.2.16 as the reasons extensions are prohibited. [a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387).

Section 3.5 reserves the LinkedIn and “in” marks. [user agreement](https://www.linkedin.com/legal/user-agreement).

What “purely local and read-only” does **not** buy, on the text:

- It does not exit 8.2.15. Appearance modification is its own bullet, separate from scraping and from automation.
- It does not make the extension invisible. BrowserGate is LinkedIn looking for injectable extension resources. [Ars, Apr 2026](https://arstechnica.com/tech-policy/2026/04/linkedin-scanning-users-browser-extensions-sparks-controversy-and-two-lawsuits/).
- It does not stop a Chrome Web Store trademark complaint. The Open To Work developer’s defense was “I only read the page,” and the complaint still bundled modification, scraping, and the logo. [Reddit](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/).

What it does change, in the enforcement record rather than the contract text: the lawsuits and demand letters in this survey punish **bulk collection, automation, and brand use**. A badge that never leaves the tab is not the fact pattern in the Browserflow letter or the hiQ judgment. SlopScan’s FAQ treats that gap as “on the right side of the terms.” [slopscan.app](https://www.slopscan.app/). The contract does not say that. The honest design assumption is: members are using a tool LinkedIn’s help page forbids; the extension should not also scrape, automate, store other people’s posts on a server, or dress itself as LinkedIn.

Section 2.3 of the agreement (account restrictions) was not re-quoted here. The help article is the operational statement: restricted or shut-down accounts, and tools that stop working without notice. [a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387).

## Ideas worth stealing

- **Say “sniff test” in the badge.** LinkedIn AI Post Detector and SlopScan both refuse a fraud verdict. The commercial detectors’ accuracy slogans are what their one-star reviews quote back at them.
- **Show the rules that fired.** Every local tool users can trust does this: LAID’s 14 rows, SlopScan’s hover, PostToast’s point breakdown, LLM Slop Detector’s per-finding popover. Slop Mop’s HN comment is the counterexample.
- **Collapse with one-click restore, and make hide a setting.** NoSlop’s FILTERED card, FeedFilter’s Flag vs Hide, STOP SLOP’s Review / Mark / Collapse / Hide. Default to visible-plus-badge. Silent removal is the complaint.
- **Separate the threshold from the punishment.** STOP SLOP’s slider changes what you do with a flag, not how eager the detector is. FeedFilter and LAID also expose sensitivity.
- **Score human tells downward.** SlopScout subtracts for typos, slang, profanity, and first person, so a polished memo is not the only thing that can look “AI.”
- **Ship pattern packs, default off the harsh ones.** LLM Slop Detector’s opt-in academic / structural / per-model packs. A LinkedIn feed will otherwise flag every consultant who learned the same hooks.
- **Per-author memory, stored locally, with undo.** Litmus’s “80% of the last 5 posts” and SlopScan’s blocklist are the Hall of Slop without a server. SlopScan’s privacy policy admits it stores profile names in `chrome.storage.local`. Publish that.
- **Blur identity on anything that can leave the browser.** PostToast Copy Card. The in-page joke can name the author the user is already looking at. The clipboard, the PNG, and the leaderboard export should not.
- **Treat Destroy as a local animation, not a LinkedIn action.** Nobody else explodes a post. Do not also call LinkedIn’s dismiss or “seems like AI slop” endpoints. That is 8.2.13 and 8.2.19, and it is the native feature LinkedIn wants people to click themselves.
- **One permission story.** `storage` plus linkedin.com, no analytics, no account. NoSlop and FeedFilter lead with this because the alternative is Pangram storing feed text.
- **If a cloud score ever exists, copy NoSlop’s consent card:** off by default, post text only, author stripped, daily cap, hash cache on device, plain-language privacy page.
- **Anchor on `urn:li:activity` and accessible names, and keep a second selector set.** LinkOff, noiseout, and the March 2026 SDUI break. Class names like `feed-shared-update-v2` already died once.
- **Non-affiliation line on the listing, the popup, and the card.** PostToast. No IN logo, no LinkedIn-blue chrome that looks like a first-party control, no “LinkedIn” in the domain.
- **Keep the MIT boundary.** `avoid-ai-writing` is MIT and already attributed. De-Slop is GPL-3.0. Do not “borrow” the 600-pattern file.

## Risks to design around

- **8.2.15 is the product.** Inserting a badge, collapsing a post, covering a promoted unit, and painting an explosion on top of the feed are appearance modifications. LinkedIn Help says that class of extension is prohibited and that the member’s account can be restricted. Design so the extension never makes it worse: no LinkedIn API, no auto-report, no bulk export, no background crawl of profiles.
- **LinkedIn can see the extension.** BrowserGate uses web-accessible images and scripts. Assume the extension id is known. Do not add a scraping mode later “just for the leaderboard.”
- **Shame cards of named people are the Chrome Web Store risk, not the score.** Grey Potassium’s example is a product whose predominant purpose is to single someone out for ridicule. Keep the card about the writing. Blur name and face on copy, download, and share. Do not ship a public, searchable Hall of Slop of real members. Local, user-private tallies are the Litmus/SlopScan shape; a website of named “offenders” is a different product.
- **Quoting the post on a shareable card trips 8.2.4 and 8.2.6.** A card that paraphrases the tells (“three bullets, a hook, and ‘Agree?’”) carries less of their copyrighted text than a screenshot of the post.
- **Invented quotes and fake portraits trip 8.2.18** and ordinary defamation risk. Generated roast copy should insult the style, not assert biography.
- **Trademark complaints arrive as store takedowns.** Open To Work lost the US listing over screenshots and “unauthorized modification,” even though the developer denied scraping. No LinkedIn logo. “Not affiliated with LinkedIn” in the listing. Do not put LinkedIn in the extension’s name in a way that reads as an official client (8.2.7 and the brand guidelines).
- **Single purpose and permissions.** Score, explode, shame, and a local board are one story only if the listing says that story and the manifest does not ask for anything else. A privacy policy is required even though the database is local, because website content is user data. Limited Use (Jul 2026) forbids collecting feed text for a side purpose.
- **Do not cover ads as a feature.** 8.2.15 names obscuring an advertisement. Cringe Guard removes promoted posts by default. That is the example in the clause. Let Destroy run on the post the user clicked; do not hunt for “Promoted.”
- **False positives are the product risk that is not legal.** Commercial detectors are hated for them. Default to a badge, require a click for Destroy and Shame, and let a hidden post come back. Do not print an accuracy percentage the project has not measured.
- **The feed DOM will break.** Budget for a selector fallback list and a fixture test. The March 2026 class-name wipe was not announced as an anti-extension measure; it still zeroed a content script overnight.
- **License contamination.** GPL pattern corpora (De-Slop) do not belong in this MIT extension. Cloud models (Jev, GPTZero, Pangram, Groq) contradict the local-only design and create a Limited Use surface the moment post text is uploaded.
