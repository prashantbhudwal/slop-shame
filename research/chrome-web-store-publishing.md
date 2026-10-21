# Publishing Slop Shame on the Chrome Web Store

Checked 2026-10-19 against the live Chrome developer docs, the Chromium blog, the chromium-extensions group, and public developer reports. Content policy (single purpose, privacy-policy duty, the 1 Jul 2026 Limited Use update, Grey Potassium, LinkedIn trademarks, MV3 remote code) is already in [landscape.md](landscape.md). This file is the operational path: account, dashboard, review, rejection codes, and what happens after the listing is live.

Pages below often carry an old "Last updated" stamp while the body has later rules (the two-extension limit, for example, is in a page whose footer still says 2014). Where that happens, the claim is tied to the page text fetched on 2026-10-19, and the footer date is noted.

## TL;DR checklist

Budget **about one week if payment and review both go smoothly, and three to four weeks if review queues or a rejection adds a cycle.** A new developer plus a new extension is a stated reason for a closer look. Google's own review page says most items finish in a few days and some take a few weeks; contact support if it is still pending after three weeks. ([review process](https://developer.chrome.com/docs/webstore/review-process), footer 2021-12-10; [Aug 2026 review update](https://developer.chrome.com/blog/cws-review-updates-2026))

1. **Google account.** Use a dedicated account you actually read. The account email cannot be changed later, and a deleted account's email cannot be reused. ([register](https://developer.chrome.com/docs/webstore/register), footer 2024-02-13)
2. **2-Step Verification** on that Google account, before the first publish and before every later update. ([2-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification))
3. **Open the developer dashboard, accept the agreement, pay the one-time registration fee.** India is on the supported-country list. The current registration page does not print a dollar amount. The developer agreement says the amount is set by Google. The last official figure is **$5.00**, from the 12 Mar 2020 Chromium blog, and secondary write-ups checked in Oct 2026 still say $5. Confirm the number on the payment screen. ([register](https://developer.chrome.com/docs/webstore/register); [agreement §2.1](https://developer.chrome.com/docs/webstore/program-policies/terms); [Chromium blog, 12 Mar 2020](https://blog.chromium.org/2020/03/new-developer-dashboard-and.html))
4. **Account page.** Publisher display name. Verify a contact email (a link is sent; this address is shown on the listing). Declare **non-trader** if this is a personal, non-business publish. Turn on "published" email notifications; rejection and takedown mail is already on. Add `chromewebstore-noreply@google.com` to contacts. ([set up account](https://developer.chrome.com/docs/webstore/set-up-account); [trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq); [check review](https://developer.chrome.com/docs/webstore/check-review))
5. **Privacy policy URL, live, before submit.** It has to describe collection, use, and sharing, including local use of page text and the IndexedDB leaderboard. Put the Limited Use statement on a site you control (see landscape.md). ([privacy policy](https://developer.chrome.com/docs/webstore/program-policies/privacy); [Purple Lithium](https://developer.chrome.com/docs/webstore/troubleshooting))
6. **Build the zip.** Valid MV3 manifest, version set low (for example `0.0.0.1`) so later uploads can increase it. Name ≤ 75 characters. Short description ≤ 132 characters. Include the 128×128 PNG icon. Zip ≤ 2 GB. No remote script, no `eval` of fetched strings. ([prepare](https://developer.chrome.com/docs/webstore/prepare); [manifest name](https://developer.chrome.com/docs/extensions/reference/manifest/name); [publish](https://developer.chrome.com/docs/webstore/publish); [Blue Argon](https://developer.chrome.com/docs/webstore/troubleshooting))
7. **Assets.** At least one screenshot at 1280×800 (or 640×400), up to five. Small promo tile 440×280. Marquee 1400×560 is optional. Store icon 128×128. A YouTube URL is listed as required on the store-listing page and is absent from the "mandatory images" page; treat a short unlisted YouTube video as required until the dashboard says otherwise. No LinkedIn logo, no "in" mark. ([images](https://developer.chrome.com/docs/webstore/images); [store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing))
8. **Add new item, upload the zip.** An automated install check runs on the draft as of 20 Aug 2026. Fix install failures before submitting. ([publish](https://developer.chrome.com/docs/webstore/publish); [Aug 2026 review update](https://developer.chrome.com/blog/cws-review-updates-2026))
9. **Fill five tabs:** Package (read the manifest summary; optional verified-CRX opt-in), Store listing, Privacy practices (single purpose, a justification per permission and per host, remote-code = No, data-use checkboxes, Limited Use certification, privacy-policy URL), Distribution (Public, all regions, free), Test instructions (optional; useful so a reviewer can reach `linkedin.com/feed` without guessing). ([publish](https://developer.chrome.com/docs/webstore/publish); [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy); [distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution); [test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions))
10. **Submit for review.** Leave "publish automatically" checked unless you want to hold the release. A deferred item must be published within 30 days of approval or it returns to draft. ([publish](https://developer.chrome.com/docs/webstore/publish))
11. **Wait.** Status is Pending, then Published, Rejected, or Taken Down. Pending items are not in the store. ([check review](https://developer.chrome.com/docs/webstore/check-review))
12. **If rejected,** read the color-element code, fix that issue, upload a higher version, resubmit. You get one appeal per violation. A reply can take up to three days. ([notification and appeals](https://developer.chrome.com/docs/webstore/program-policies/notification-and-appeals); [review process](https://developer.chrome.com/docs/webstore/review-process))

New accounts start with **two published-extension slots**. One listing fits. Themes do not count. ([publish, Item limits](https://developer.chrome.com/docs/webstore/publish); [20 Aug 2026 blog](https://developer.chrome.com/blog/cws-review-updates-2026))

The API cannot create the first item. The first upload, the listing, and the privacy fields are dashboard work. `wxt submit` is for later updates. ([API v2 announcement](https://developer.chrome.com/blog/cws-api-v2))

## Hurdles for Slop Shame

Ranked by how likely they are to block or remove this listing.

**1. A LinkedIn trademark or "unauthorized modification" complaint, after you are live.** LinkedIn (and firms writing on its behalf) already ask Google to remove extensions that put the LinkedIn name or the "in" mark in screenshots, and they pair that with a claim that the extension modifies or scrapes the site. "LinkedIn Open to Work" was blocked in the US store. The complaint asked for the marks to come off the listing and for the extension to be removed. The developer said the extension only read the page the user was already on. ([r/chrome_extensions, Aug 2024](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/)) A separate extension, "LinkedIn Jobs Filterer," was taken down after a trademark notice about the word LinkedIn in the listing; Google's mail told the developer to deal with the complainant. ([blog, 21 Aug 2023](https://blog.kamens.us/2023/08/21/any-advice-on-dealing-with-a-bogus-trademark-infringement-claim-sent-to-google/)) An Instagram extension was removed for the phrase "for Instagram" in the name plus Instagram's gradient, with no other distinctive branding. ([chromium-extensions, 4 Aug 2023](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/WJ3OExNJJbA))

Mitigation: the extension name is "Slop Shame", with its own icon. The short description names LinkedIn once, as the site it runs on, plus a non-affiliation sentence. Screenshots crop or blur the LinkedIn wordmark and the "in" logo. The listing does not say "for LinkedIn". Policy text for this is in landscape.md.

**2. Grey Potassium, if a reviewer reads Shame or the leaderboard as ridicule of a named person.** The code means violent or bullying content. If bullying is a primary feature, the fix is to unpublish. The examples include content whose predominant purpose is to single out another person for abuse, malicious attack, or ridicule. ([troubleshooting, Grey Potassium](https://developer.chrome.com/docs/webstore/troubleshooting), footer 2026-07-20) The policy reading is in landscape.md.

Mitigation: the single-purpose sentence is about scoring how a post is written. The card mocks the writing. Shared cards use initials and a blurred avatar. The leaderboard stays in the user's IndexedDB and is not a public page of named people. Do not ship a website of "offenders."

**3. First review takes longer than the happy path.** A new developer and a new extension are both signals for a closer look. A lot of code, or hard-to-review code, also lengthens review. Minification is allowed; it still makes review harder. Google's suggestion is to submit code as authored where you can. ([review process](https://developer.chrome.com/docs/webstore/review-process)) In April 2026 the store team posted that a submission surge had stretched waits, and that cancelling a pending item to resubmit **resets the queue**. ([chromium-extensions PSA, 23 Apr 2026](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y)) On 20 Aug 2026 Google said it had brought review times back to baseline, without publishing a new number. ([blog](https://developer.chrome.com/blog/cws-review-updates-2026))

`https://www.linkedin.com/*` is a single host. The patterns Google names as slow are `*://*/*`, `https://*/*`, and `<all_urls>`. ([review process](https://developer.chrome.com/docs/webstore/review-process)) A single-site content script is not, on that page, called out as its own trigger.

Mitigation: ship only `storage` (if `chrome.storage` is actually called) and `https://www.linkedin.com/*`. No `<all_urls>`. Keep the package free of dead code and unused permissions. Write a short test-instructions note: open `https://www.linkedin.com/feed` while signed in, scroll until posts appear, use Slop Index, Destroy, and Shame. If the Vite bundle is heavily mangled, a review that stalls is a reason to ask whether a less aggressive minify would help. That last step is a judgment, not a documented requirement. If status is still Pending after three weeks, use [One Stop Support](https://support.google.com/chrome_webstore/contact/one_stop_support). Do not cancel and resubmit to "bump" the queue.

**4. Privacy fields that do not match a local-only extension.** A broken or missing privacy-policy URL is Purple Lithium, including when the URL does not load. ([troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting)) Website content and browsing activity are user data even when they stay on the device (landscape.md). Collecting browsing activity without a user-facing feature is Purple Magnesium. ([troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting))

Mitigation: the policy URL is on a host you control (GitHub Pages is enough if it stays up). Dashboard checkboxes match the policy: website content is used, it is not sold, it is not sent off the device, it is not used for credit. The Limited Use certification is checked, and the same statement is on the policy page.

**5. Single purpose, if the listing reads as four products.** Codes Red Magnesium, Red Copper, Red Lithium, and Red Argon. Unrelated features, or an extra feature hanging off the action icon, are the usual hits. ([troubleshooting, Single purpose](https://developer.chrome.com/docs/webstore/troubleshooting))

Mitigation: one sentence in the privacy tab and the first line of the description: show how AI-written a LinkedIn post looks, and let the user dismiss or joke about that post. Slop Index, Destroy, Shame, and the local board are that sentence. A general AI detector, a job scraper, or a comment writer in the same package is a different extension.

**6. The registration payment itself, for an Indian card.** Official docs do not list accepted card brands. India can register. ([register](https://developer.chrome.com/docs/webstore/register)) A public Chrome help thread from Dec 2025 through Feb 2026 records repeated declines of the fee, including an Indian developer whose Fi debit card and OneCard credit card both failed. Replies there blame bank-side blocks on international card-not-present charges and suggest a traditional bank credit card, a billing address that matches the card, and enabling international and online usage. Those replies are other users, not Google. ([Chrome community thread](https://support.google.com/chrome/thread/398705272/register-as-a-chrome-web-store-developer-fee-paying-visa-card-payment-fail-every-time-is-all-right?hl=en)) Whether a given Indian card works is **unconfirmed** until the dashboard accepts it.

Mitigation: try the card you already use for Google payments, with the billing address identical to the card statement. If it declines, the escalation path in that thread is One Stop Support, category "My developer account." Keep the purchase-order id if one is shown; the support form asks for it. ([One Stop Support](https://support.google.com/chrome_webstore/contact/one_stop_support))

**7. Keyword spam and a brand-led title.** Yellow Argon. Repeating one keyword more than five times, or listing sites and brands, is the example. Listing more than five sites or brands in the description is what the spam FAQ says to avoid. ([Yellow Argon](https://developer.chrome.com/docs/webstore/troubleshooting); [spam FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq); [listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements), footer 2024-07-10)

Mitigation: "LinkedIn" appears a few times, in sentences, because that is the only site. No keyword block, no city list, no testimonials.

**8. A minified bundle mistaken for obfuscation.** Red Titanium is obfuscation: base64-encoded code, character-code hiding, concealed behavior. Minification (whitespace, shortened names, concatenated files) is explicitly allowed. ([troubleshooting, Obfuscation](https://developer.chrome.com/docs/webstore/troubleshooting))

Mitigation: do not run a second obfuscator on top of the WXT production build. Do not fetch logic. Remote JSON that only selects bundled paths is the allowed pattern (landscape.md).

## 1. Registration

Open the developer dashboard while signed into the Google account that will own the item. The first visit shows the agreement and the fee. After both are done, that screen does not return. ([register](https://developer.chrome.com/docs/webstore/register))

**Fee.** One-time, per developer account, paid before the dashboard can be used. The agreement says the amount is "determined in Google's sole discretion," and that you pay any taxes on top, with no reduction. ([agreement §2.1 and §3.1](https://developer.chrome.com/docs/webstore/program-policies/terms)) The registration page, fetched 2026-10-19, says "one-time registration fee" and does not print a number (footer 2024-02-13). The Chromium blog on 12 Mar 2020 states the fee as **$5.00**, required before dashboard access, including for developers who had only published to trusted testers. ([blog](https://blog.chromium.org/2020/03/new-developer-dashboard-and.html)) Secondary pages dated Oct 2026 still say $5, for example [Extension Radar, updated 18 Oct 2026](https://www.extensionradar.com/blog/chrome-web-store-developer-fee-2026). Treat $5 as the standing public figure, and read the amount off the payment screen.

**Payment methods.** Not listed on the registration page. Payment happens in that registration screen. Which Indian cards clear is **unconfirmed** in official docs; see hurdle 6 for the 2025–26 failure reports.

**Countries.** India is on the supported list. If a country is absent, Google says it cannot accept registrations from there. ([register](https://developer.chrome.com/docs/webstore/register))

**Account email.** Choose one you will keep. It cannot be changed. A transfer to a new account is a support form. A recently deleted account's email cannot be reused. Google suggests a dedicated inbox. ([register](https://developer.chrome.com/docs/webstore/register))

**Contact email.** Separate field, on the Account page. Required. Click Add email, request a link, open the link. This address is what the listing shows under contact information, and it is where review mail goes. The trader FAQ says this contact email can be updated in the dashboard. ([set up account](https://developer.chrome.com/docs/webstore/set-up-account), footer 2023-10-16; [trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq))

**2-Step Verification.** Required on the Google account before publishing or updating. ([policy](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification), footer 2022-11-01)

**Identity or address verification.** The current registration and account-setup pages do **not** describe a government-ID check for every new publisher. Claims on third-party blogs that every new account must upload a government ID were not on those official pages on 2026-10-19. Mark that requirement **unconfirmed**.

What does exist:

- **Contact-email verification**, above.
- **Trader verification**, only if you declare yourself a trader. Google may ask for legal name, phone, address, and "possibly other relevant identification documents." The phone is confirmed by SMS and is shown on the listing. The address is public. ([trader disclosure](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure), footer 2024-02-09; [trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq))
- **Physical address on the account page**, "required in some circumstances": only items that offer purchases, extra paid features, or subscriptions. A free extension is outside that sentence. ([set up account](https://developer.chrome.com/docs/webstore/set-up-account))
- **Established Publisher** later asks that "the publisher's identity has been verified," without saying what that check is. The discovery page's footer is 2022-03-21. ([discovery](https://developer.chrome.com/docs/webstore/discovery))

**Trader or non-trader.** Every developer must declare one or the other. Google will not decide for you. A trader is someone acting for their trade, business, craft, or profession. A non-trader is someone acting outside that. For a non-trader, the store tells the user that consumer-protection rights do not apply to contracts with you. Accurate self-declaration is the developer's job. ([trader disclosure](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure); [trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq))

An individual in India publishing a free, non-commercial extension is the non-trader fact pattern as the EU text defines it. This report is not legal advice. If the extension is sold, or it is part of a business, the trader path applies, and the legal name, SMS phone, and address go on the public listing.

**What is public.**

| Item | Public? | Source |
|---|---|---|
| Publisher name ("Offered by") | Yes | [set up account](https://developer.chrome.com/docs/webstore/set-up-account) |
| Contact email | Yes, under the listing's contact information | [set up account](https://developer.chrome.com/docs/webstore/set-up-account) |
| Non-trader status | Yes, as a notice that consumer-protection rights do not apply | [trader disclosure](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure) |
| Trader legal name, phone, address | Yes, at the bottom of the listing, traders only | [trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq) |
| Google account email | Mail from the store goes there; the account-setup page does not say it is printed on the listing | [set up account](https://developer.chrome.com/docs/webstore/set-up-account) |
| Home address of a non-trader | Not required for a free item | [set up account](https://developer.chrome.com/docs/webstore/set-up-account) |

A verified site (Search Console) can be shown as an official URL under the title. Optional. ([store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing))

**Publishers and extra people.** Registering creates a publisher. You may create one more publisher in the account's lifetime. Deleting it does not give the slot back. The old "individual vs group publisher" split is gone; any publisher you admin can have members. Roles are Viewer, Item Manager, Editor, and Admin. ([group publishers](https://developer.chrome.com/docs/webstore/group-publishers), footer 2026-04-15) A member who publishes updates must have their own registered, paid developer account. ([group publishers source note](https://developer.chrome.com/docs/webstore/group-publishers), fetched 2026-10-19) One person publishing alone does not need a second publisher.

**How many extensions.** As of 20 Aug 2026, the default is two published extensions per publisher. The exact cap is shown in the dashboard and can differ by account. Publishers who were already over the new cap kept those items; the new cap is at least their count on that date. Requesting an increase usually returns an immediate decision. Denial reasons Google lists: existing extensions need higher sustained engagement, or the account does not meet tenure and activity requirements. Themes are exempt. ([20 Aug 2026 blog](https://developer.chrome.com/blog/cws-review-updates-2026); [publish](https://developer.chrome.com/docs/webstore/publish))

## 2. Submission

Dashboard tabs for a new item, from the publish guide: **Package, Store listing, Privacy, Distribution, Test instructions.** ([publish](https://developer.chrome.com/docs/webstore/publish), footer 2014-02-28; the item-limit section on that same page matches the Aug 2026 blog)

### Package

1. Add new item, choose the zip, upload. The manifest and the zip have to be valid or you cannot continue. Max zip size 2 GB. ([publish](https://developer.chrome.com/docs/webstore/publish))
2. On first create, the Package tab shows the uploaded item and is not editable. Name, version, and the short description come from the manifest. A typo means a new zip with a higher version. Comments in `manifest.json` cause "Cannot parse the manifest." ([prepare](https://developer.chrome.com/docs/webstore/prepare); [publish](https://developer.chrome.com/docs/webstore/publish))
3. Since 20 Aug 2026, uploading a draft runs an automated install test on supported Chrome platforms. A failure is fixed by uploading again, before review. ([Aug 2026 blog](https://developer.chrome.com/blog/cws-review-updates-2026))
4. **Verified CRX uploads** are optional, under Package. Opt in by giving an RSA public key (2048-bit is the documented example). After that, every package update must be a CRX signed with the matching private key, or it is rejected. Google still re-signs with the store key, so the extension id stays the same. If you never opt in, Google signs uploads as before. Losing the private key means a support request that can take up to a week. Do not commit the private key, and do not store it in the same Google account as the dashboard. ([update](https://developer.chrome.com/docs/webstore/update); [verified uploads, 7 May 2025](https://developer.chrome.com/blog/verified-uploads-cws)) Opt-in is a security choice, not a publish requirement.

### Store listing

**From the manifest, not typed again:** name (max 75), short description (max 132). Both show on the store and on `chrome://extensions`. ([manifest](https://developer.chrome.com/docs/extensions/reference/manifest); [name](https://developer.chrome.com/docs/extensions/reference/manifest/name))

**Product details:**

- Detailed description. Lead with one sentence on what it does. An official page does not state the character cap. A Google-published listing template says 16,000 characters. ([template in chrome/modern-web-guidance](https://github.com/googlechrome/modern-web-guidance/blob/main/skills/chrome-extensions/references/webstore/chromewebstore-template.md)) Treat any other number as **unconfirmed**. Keyword-spam rules apply. ([store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), footer 2020-12-07)
- One category. The best-practices list, fetched 2026-10-19: Accessibility, Art & Design, Communication, Developer Tools, Education, Entertainment, Functionality & UI, Games, Household, Just for Fun, News & Weather, Privacy & Security, Shopping, Social Media & Networking, Tools, Travel, Well-being, Workflow & Planning. The discovery page's examples (Shopping, Education, Just for Fun) are a subset, and its footer is 2022-03-21, so use the dashboard dropdown if it differs. For this product, Social Media & Networking is the closest label on that list. ([best practices](https://developer.chrome.com/docs/webstore/best-practices); [discovery](https://developer.chrome.com/docs/webstore/discovery))
- Language. Extra locales need `_locales/<code>` in the package. Descriptions and screenshots can be localized. The small tile and the marquee cannot. ([store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing))

**Graphic assets.** Two official pages disagree on what is mandatory. Fetched 2026-10-19:

| Asset | Spec | Listing page | Images page |
|---|---|---|---|
| Store icon | 128×128 | Required | Required, PNG, in the zip. Guidance: 96×96 artwork plus 16 px transparent padding. No alpha means the store puts it in a 12 px rounded frame. |
| Screenshot | 1280×800 or 640×400, square corners, full bleed, no padding. 1280×800 preferred; the store downscales to 640×400. | At least one, up to 5 | At least one, preferably 5 |
| Small promo tile | 440×280 PNG or JPEG | Required | Required. Items without it rank after items with it. |
| YouTube video | A link that shows the features | Listed as required | Not in the mandatory set |
| Marquee | 1400×560 PNG or JPEG | Optional | Optional. Needed only if you want marquee placement. |

([store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing); [images](https://developer.chrome.com/docs/webstore/images), footer 2018-06-11)

Promo images are reviewed on their own. Statuses: Pending Review (not shown, expected within a week), no status (approved and shown), Rejected (reason on the edit page). Draft and trusted-tester items do not show an image status until the item is published. ([images](https://developer.chrome.com/docs/webstore/images))

Display order: localized video, localized screenshots, global video, global screenshots. ([store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing))

**Also on this tab, optional unless noted:** official URL (only domains you verified in Search Console), homepage URL, support URL, and a Mature-content flag. Mature items are hidden from signed-out store search. ([store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)) A roast extension that is still all-ages does not need Mature. Grey Nickel is the code if content is not family-safe and the flag is off. ([troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting))

### Privacy practices

The tab has these blocks. ([privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), footer 2020-06-12)

1. **Single purpose description.** One narrow purpose, matching the listing.
2. **Permission justifications.** One field per permission and per host permission taken from the manifest. Unused entries mean delete them from the manifest and re-upload. `storage` is justified only if the code calls `chrome.storage`. IndexedDB does not need the `storage` permission; requesting it anyway is a Purple Potassium pattern. ([troubleshooting, Excessive permissions](https://developer.chrome.com/docs/webstore/troubleshooting)) `https://www.linkedin.com/*` is justified as the only site where the content script reads posts the user is already viewing.
3. **Remote code.** "No, I am not using remote code" unless you truly execute remote code. MV3 forbids loading and running a remotely hosted file. Declared remote code is reviewed more slowly. Undeclared remote code is a rejection. ([privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy))
4. **Data usage.** Two groups of checkboxes: which data types are collected, and certification statements. The official privacy-fields page does not print the checkbox labels. A developer copy of the form lists: personally identifiable information, health, financial and payment, authentication, personal communications, location, web history, user activity, and website content. ([ff-for-github PRIVACY.md](https://github.com/simnalamburt/ff-for-github/blob/main/PRIVACY.md)) That list is a third-party transcription, so confirm it against the live form. The three certification lines that then show on a public listing are: not sold to third parties outside approved uses; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending. ([example listing text](https://chromewebstore.google.com/detail/github-tags-on-commits/gdhejonbolabkbkobjjhgmogfkngdjck), fetched 2026-10-19) For this product, website content is the honest box if post text is read, even locally. Web history is a different box; do not tick it unless the extension reads history.
5. **Limited Use certification.** The same tab asks you to certify the limited-use policy. The disclosures are shown to users and must match the privacy-policy URL. ([privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)) The July 2026 policy text is in landscape.md.
6. **Privacy policy URL.** Required when the product handles user data. The designated field is this box, not the description. ([privacy policy](https://developer.chrome.com/docs/webstore/program-policies/privacy))

### Distribution

**Visibility**, all three go through the same review:

- **Public.** Listed and installable by anyone.
- **Unlisted.** No listing in browse or search; anyone with the store URL can install.
- **Private.** Trusted testers (account-level list of Google account emails; group addresses do not work there) plus, per item, Google Groups you manage. Workspace domain publishing appears only if a domain admin has enabled it.

([distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution), footer 2020-12-07; [set up account](https://developer.chrome.com/docs/webstore/set-up-account))

Moving private to public or unlisted is a visibility change and a republish. Moving a public item back to private requires unpublish, then the visibility change, then a new version through review again. ([update](https://developer.chrome.com/docs/webstore/update))

**Regions.** Default is all regions. You can pick countries, or select all and clear some. The choice applies to search as well as the listing. ([distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution))

**Pricing.** The publish guide still says the Distribution tab is where you say whether the item is paid. Chrome Web Store payments no longer charge. New paid items and in-app products have been blocked since 21 Sep 2020. Existing CWS charges stopped on 1 Feb 2021. ([payments deprecation](https://developer.chrome.com/docs/webstore/cws-payments-deprecation)) The developer agreement says that if you charge some other way, Google does not process the payment. ([agreement §3.2](https://developer.chrome.com/docs/webstore/program-policies/terms)) Slop Shame is free. There is no store price to set.

**Percentage rollout** is not on the first publish. It appears for an update of an item with more than 10,000 seven-day active users. ([update](https://developer.chrome.com/docs/webstore/update))

### Test instructions

Optional. A text field for credentials and steps, meant for features behind a login or a paywall. ([test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions), footer 2025-05-16) This extension needs a signed-in LinkedIn feed to show a score. Give the reviewer that path. Do not put a password you cannot rotate into a field you do not fully control; a throwaway LinkedIn account is safer than a personal one. Whether reviewers use the note is **unconfirmed**.

### Submit dialog

Submit for review. A checkbox publishes automatically after approval. Uncheck it, or later choose Defer publish, to hold the approved package. You then have 30 days. After that the staged submission becomes a draft and needs review again. Cancel review if you need to replace the zip while it is still queued. ([publish](https://developer.chrome.com/docs/webstore/publish))

## 3. Review

Every submission, new or update, enters the same system. Tenure and install count do not create a separate queue. The system is manual and automated together. ([review process](https://developer.chrome.com/docs/webstore/review-process)) The lifecycle page says every item gets an automated review, and a manual review is added in some cases, "especially when sensitive permissions are requested." ([check review](https://developer.chrome.com/docs/webstore/check-review), footer 2021-08-17)

**Times.**

| Source | What it says | Date |
|---|---|---|
| Review process | Most extensions: a few days. Some: a few weeks. Write to support after three weeks pending. Longer after a rejection or a warning. | Page footer 2021-12-10, fetched 2026-10-19 |
| MV3 publish guide | Most extensions within three days. Mail usually within three days. It tells you to contact support if pending over two weeks. | [publish-mv3](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3) |
| Store team, chromium-extensions | Surge from early 2026. Do not cancel and resubmit. By 29 Apr 2026 they reported improvement and a remaining backlog. | [23–29 Apr 2026](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y) |
| Store blog | Processes optimized; times "back to expected baselines." No new day-count. Pre-submit install checks added. | [20 Aug 2026](https://developer.chrome.com/blog/cws-review-updates-2026) |

The two-week and three-week support thresholds disagree. Use three weeks before filing, and file at two weeks if a broken update is blocking users. Developer reports, not Google's clock: about 1–5 days for ordinary updates in a Nov 2025 thread, including a LinkedIn comment tool with `activeTab`, `storage`, `identity`, and a host permission at 24–36 hours; `<all_urls>` was described by commenters as slower. ([r/chrome_extensions, 13 Nov 2025](https://www.reddit.com/r/chrome_extensions/comments/1ovvjf5/how_long_does_it_take_to_review/)) In May 2026 a new account with content scripts on payment sites was still Pending after about three weeks (submitted 10 Apr, post 3 May). Replies cited two-week first reviews and a March–April surge. ([r/chrome_extensions, 3 May 2026](https://www.reddit.com/r/chrome_extensions/comments/1t2myzh/chrome_extension_stuck_in_pending_review_for_3/))

**What lengthens review**, in Google's words:

- New developers, new extensions, dangerous permission requests, significant code changes.
- Broad host patterns: `*://*/*`, `https://*/*`, `<all_urls>`.
- Sensitive execution permissions. Examples given: `tabs` and `downloads` on their own; `cookies` and `webRequest` combined with host access.
- Lots of code, obfuscation (forbidden), or minification that is hard to read.

([review process](https://developer.chrome.com/docs/webstore/review-process))

The current review page does **not** use the phrase "in-depth review." It says those signals make a reviewer examine the extension more closely and that the review takes longer. A single host such as `https://www.linkedin.com/*` is not in the broad-host list. Any host permission still produces an install warning (below), and the lifecycle page says manual review is especially likely for sensitive permissions, without defining that set beyond the examples above.

**Install warning the user sees.** Host permissions and content-script match patterns can both trigger a warning. The last official warning table (on the Manifest V2 page, which says the table can drift and that you should confirm by packing the extension) gives:

- A specific host such as `https://HostName.com/`: "Read and change your data on HostName.com."
- `<all_urls>` and the all-site patterns: "Read and change all your data on the websites you visit."

([MV2 permission warnings](https://developer.chrome.com/docs/extensions/mv2/permission-warnings)) The current warning guide confirms that host and content-script patterns can warn, and that `activeTab` does not. It does not repeat the sentence text. ([permission warnings](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings), footer 2024-02-05) `storage` is not in that warning table. Adding a new warning permission later disables the extension until the user accepts it. ([same page](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings))

**Deferred publish.** Uncheck automatic publish, or choose Defer publish while the item is in review. After approval you have 30 days to press publish. The expiry is shown on the item status. Cancel publish sends an approved-but-unreleased item back to draft, and it needs review again. ([publish](https://developer.chrome.com/docs/webstore/publish); [update](https://developer.chrome.com/docs/webstore/update))

**Staged percentage rollout.** Only an update, only above 10,000 seven-day active users, only after a new draft is uploaded, and the field locks once you submit. The percentage can only go up, and raising it does not start a new review. New installs always get the new version. One partial rollout at a time. If the last published version was taken down or warned, the next version must go to 100%. ([update](https://developer.chrome.com/docs/webstore/update)) The v2 API can set the same percentage without a new review. ([API v2, 15 Oct 2025](https://developer.chrome.com/blog/cws-api-v2))

**Every update is reviewed** under the same process. Time depends on the item and the size of the change. The published version stays in place until the new one is approved and published. Users on the old version are unaffected in the meantime. A new permission prompts them to accept it or disable the extension. ([update](https://developer.chrome.com/docs/webstore/update); [review process](https://developer.chrome.com/docs/webstore/review-process))

**Statuses you will see:** Published, Pending, Rejected, Taken Down. Pending means queued and invisible in the store. Rejection detail is on the item's Status tab if the mail does not arrive within a week. ([check review](https://developer.chrome.com/docs/webstore/check-review))

Published items are also re-reviewed on a periodic basis, after a violation in a new submission, and after user reports. That can end in no action, a warning, a takedown, or a malware-style removal. ([review process](https://developer.chrome.com/docs/webstore/review-process))

## 4. Rejections

Each code is two words, a color and an element. The list below is the full set on the troubleshooting page fetched 2026-10-19 (footer 2026-07-20). ([troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting))

| Code | Meaning |
|---|---|
| Blue Argon | MV3 remote code: external script tags, `eval` of a fetched string, or an interpreter for remote commands. |
| Yellow Magnesium | Does not work as the listing says, or the package is missing files the manifest names. |
| Purple Potassium | A permission is unused or broader than the feature. |
| Yellow Zinc | Missing or meaningless icon, title, screenshot, or description. |
| Red Nickel, Red Potassium, Red Silicon | Deceptive behavior: the product does something other than the listing, impersonates someone, or pretends to be authorized. |
| Purple Lithium | User-data disclosure: no privacy policy, policy not in the designated field, URL dead, or policy silent on collection, use, and sharing. |
| Grey Zinc | Illegal activity. |
| Grey Copper | Online gambling. |
| Grey Lithium | Pornographic content. |
| Grey Magnesium | Hate content against a protected class. |
| Grey Nickel | Not family-safe, and not marked Mature. |
| Grey Potassium | Violent or bullying content, including a product whose predominant purpose is to single someone out for ridicule. |
| Red Magnesium, Red Copper, Red Lithium, Red Argon | Single purpose. |
| Purple Nickel | User data collected without a prominent disclosure and affirmative consent. |
| Purple Copper | User data sent insecurely. |
| Purple Magnesium | Browsing activity collected without a user-facing feature, or user data disclosed publicly. |
| Grey Silicon | Cryptocurrency mining. |
| Blue Zinc, Blue Copper, Blue Lithium, Blue Magnesium | Prohibited products: paywall or login bypass, unauthorized download of copyrighted media. |
| Yellow Argon | Keyword stuffing. |
| Yellow Lithium | The extension's purpose is to open another app, theme, page, or extension. |
| Yellow Nickel | Spam: duplicate extensions, fake reviews or installs, notification abuse, sending messages for the user. |
| Blue Nickel, Blue Potassium | Changing the new-tab page or omnibox search without the override APIs. |
| Red Zinc | Deceptive install flow: hidden metadata, misleading buttons, bundled offers. |
| Red Titanium | Obfuscated code. Minification is allowed. |
| Yellow Potassium | No real functionality, or the feature is just a link out. |
| Grey Titanium | Affiliate codes or links without disclosure and a related user action. |
| Blue Titanium | Circumventing review or enforcement. The policy text says this terminates the developer account. |

**Most plausible for this extension, and the pre-empt.**

- **Grey Potassium.** Pre-empt: the card and the board are about the writing, shared output is initials plus a blur, and the board never leaves the browser. If a reviewer still files this and bullying is judged to be the primary feature, the documented fix is to unpublish. ([Grey Potassium](https://developer.chrome.com/docs/webstore/troubleshooting))
- **Red Nickel / Red Potassium / Red Silicon.** A title, icon, or screenshot that looks authorized by LinkedIn. Pre-empt: own name, own icon, non-affiliation line, no "in" mark.
- **Purple Lithium.** Policy URL 404s, or the policy does not mention page text and the local leaderboard. Pre-empt: a stable URL and a policy that lists what is read, that it stays on device, and that nothing is shared.
- **Purple Potassium.** `storage` declared while only IndexedDB is used, or a host wider than linkedin.com. Pre-empt: justify each manifest entry with the call site, and delete the rest.
- **Red Magnesium family.** Listing promises a detector, a publisher, and a social network. Pre-empt: one purpose sentence, repeated in the description and the privacy tab.
- **Yellow Argon.** "LinkedIn" stacked to win search. Pre-empt: under five uses, in real sentences. ([spam FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq))
- **Yellow Zinc.** Thin description or a screenshot that does not show the score, Destroy, and Shame. Pre-empt: one screenshot per main control.
- **Blue Argon / Red Titanium.** A remote script, or a bundle that hides logic. Pre-empt: all logic in the zip; minify only.
- **Yellow Magnesium.** Reviewer opens the extension on a logged-out tab and sees nothing. Pre-empt: test instructions, and an in-product empty state that says the feed is required.

**What a rejection does.** The submission is rejected. The already-published listing, if any, stays as it was, unless the same bug is in the live version, in which case a warning or a takedown can follow. Users are not told about a rejected submission. The mail names the policy and how to appeal. ([review process](https://developer.chrome.com/docs/webstore/review-process))

**Appeals.** One appeal per violation. After the decision, that violation cannot be appealed again. Frivolous appeals can cost you later appeal rights. For a takedown or a warning: item page, Appeal, fill in the form. For a suspended account: Account page, Appeal. Other issues, including trader verification, go through [One Stop Support](https://support.google.com/chrome_webstore/contact/one_stop_support). A few minutes after filing you get a mail with a case id. A reply can take up to three days; if none comes, reply to that mail. Escalations (stats, transfers, account recovery) can take longer than seven days. ([review process](https://developer.chrome.com/docs/webstore/review-process); [notification and appeals](https://developer.chrome.com/docs/webstore/program-policies/notification-and-appeals))

Fixing and resubmitting a new version is the normal path. The appeal is for when the verdict is wrong and you can point at the code.

## 5. After publishing

**Privacy policy stays up.** It has to remain accurate and up to date, linked from the dashboard field. A URL that does not load is a Purple Lithium removal reason, including on a later re-review. ([privacy policy](https://developer.chrome.com/docs/webstore/program-policies/privacy); [Purple Lithium](https://developer.chrome.com/docs/webstore/troubleshooting)) Change the data practices and you update both the policy and the privacy tab before the next publish.

**Complaints from a site owner.** Anyone signed in can open the listing and use Flag Issue at the bottom left. A trademark or copyright claim uses the form linked from the help article "Flag issues & report copyright infringement." The fetched article says the team reviews the report and takes action; the destination URL of "this form" was not in the page text, so it is not repeated here. ([help](https://support.google.com/chrome_webstore/answer/7508032))

What Google does next is the enforcement ladder:

- **Warning** for a minor issue on a live item. Typically 7 to 30 days, depending on the violation. The listing stays up. Fix by submitting a clean version. Miss the window and it is taken down. ([review process](https://developer.chrome.com/docs/webstore/review-process))
- **Takedown.** Immediate for moderate or worse issues, or after a warning expires. The public page 404s. Search, collections, and categories drop it. A signed-in publisher still sees the last version plus a banner. Users are not told at once. If it stays unresolved for several weeks, Chrome disables it and tells the user; the user can turn it back on. You return by submitting a fixed version and passing review. Removals are permanent until that revision. They apply worldwide unless the mail says the restriction is territorial. ([review process](https://developer.chrome.com/docs/webstore/review-process); [notification and appeals](https://developer.chrome.com/docs/webstore/program-policies/notification-and-appeals)) The Open to Work developer reported a US-only block, which matches the territorial case. ([Reddit, Aug 2024](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/))
- **Malware and extreme cases.** Removed, often with no explanation, disabled on clients with no re-enable. The account can be permanently suspended. Suspension mail is sent; the item-removal mail may not be. ([review process](https://developer.chrome.com/docs/webstore/review-process))

**Account strikes.** There is no numbered strike ladder in the program policies. Serious or repeated violations suspend the developer account and possibly related accounts, and can ban you from the store. In extreme cases related Google services on that account can be suspended too. Repeated intellectual-property infringement terminates the account. Trying to dodge an enforcement action terminates it immediately (Blue Titanium). ([repeat abuse](https://developer.chrome.com/docs/webstore/program-policies/repeat-abuse), footer 2022-11-01; [policies](https://developer.chrome.com/docs/webstore/program-policies/policies))

**Inactivity.** No Chrome Web Store rule found, on 2026-10-19, that unpublishes an extension or closes a developer account for lack of updates. The six-month inactivity rule that shows up in search results is a Google Play rule, described on a third-party page about Play and the App Store, not CWS. ([that page](https://webtoapp.design/blog/app-removed-from-stores)) Treat a CWS inactivity takedown as **unconfirmed** and, on the docs searched, undocumented.

**Badges.**

- **Featured.** Self-nomination closed 20 Aug 2026, including nominations already in the queue. The program is being sunset "later this year" (2026). The discovery page still describes how to nominate; that section is stale relative to the August blog. Do not plan a launch around Featured. ([20 Aug 2026 blog](https://developer.chrome.com/blog/cws-review-updates-2026); [discovery](https://developer.chrome.com/docs/webstore/discovery))
- **Established Publisher.** Automatic. Two conditions: identity verified, and a consistent positive track record with Google services and the program policies. New developers: at least a few months with no unresolved violations. It cannot be bought. The discovery page says this covered nearly 75% of extensions when that page was written (footer 2022-03-21). A publisher page (clicking the company name) is only for organizations that finished trader verification and have this badge. ([discovery](https://developer.chrome.com/docs/webstore/discovery))
- **Home-page merchandising** is editorial. No checklist guarantees it, and you cannot pay for it. A marquee image is required before an item can be used in the marquee. ([discovery](https://developer.chrome.com/docs/webstore/discovery); [images](https://developer.chrome.com/docs/webstore/images))

**Ratings.** From 20 Aug 2026, the store rating weighs recent reviews more heavily. ([blog](https://developer.chrome.com/blog/cws-review-updates-2026))

## 6. Practical gotchas, 2025–26

Concrete reports. Older cases are included only where they are the clearest example of a pattern that is still in the 2026 policy text, and they are dated.

**Review queues, and the thing that makes them worse.** On 23 Apr 2026 Sebastian Benz, posting for the Chrome Web Store team, said a surge of new extensions had stretched review times. His list: submit early and use deferred publish; do not cancel and resubmit a pending item, because that resets the queue; drop unused permissions; prefer `activeTab` or optional hosts when you can; strip dead code; no remote hosted code; make sure you can receive mail; check that the privacy-policy URL loads. On 29 Apr 2026 he said times were improving and the backlog was still being worked. ([thread](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y)) Oliver Dunk, on 5 May 2026, told a developer whose update had been pending more than a week that the increase was expected and that he could not explain why one item was slower than another. ([thread](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/I63HPvjLEv0)) A May 2026 r/chrome_extensions post describes a first submission, with content scripts aimed at payment flows, still Pending after about three weeks. One reply said their own first review with broader scopes took two weeks, and that later updates dropped to one or two days. ([post](https://www.reddit.com/r/chrome_extensions/comments/1t2myzh/chrome_extension_stuck_in_pending_review_for_3/))

**Ordinary reviews are often a few days.** A 13 Nov 2025 thread: commenters report about 24 hours to five days. One LinkedIn-only extension (comment suggestions, host permission, `activeTab`, `storage`, `identity`) was cited at 24–36 hours. Another was rejected for an unused permission and then accepted after a second wait of about two days. ([thread](https://www.reddit.com/r/chrome_extensions/comments/1ovvjf5/how_long_does_it_take_to_review/))

**Third-party site, trademark, screenshots.** The Open to Work complaint, quoted on Reddit in Aug 2024, objects to the LinkedIn mark in promotional screenshots, to users thinking the extension is authorized because LinkedIn has its own store items, and to "modifying and scraping" the site. The developer said they removed the Open-to-Work image from promo images and that the extension only analyzed the current page. The US listing was blocked. ([thread](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/)) "LinkedIn Jobs Filterer" was removed after a notice aimed at the name in the listing; the developer was told the recourse was with the complainant, not a normal policy appeal. ([21 Aug 2023](https://blog.kamens.us/2023/08/21/any-advice-on-dealing-with-a-bogus-trademark-infringement-claim-sent-to-google/)) "for Instagram" plus Instagram's gradient, with no separate brand, was enough for a trademark removal in Aug 2023. ([chromium-extensions](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/WJ3OExNJJbA)) No 2025 or 2026 LinkedIn-logo rejection with a public write-up turned up in this pass beyond the August 2024 thread still being the case people point at. The 2026 policy text is unchanged on impersonation and intellectual property (landscape.md).

**Keyword spam.** The live examples are a list of sites or brands, a list of places, the same keyword more than five times, and anonymous testimonials. ([listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements); [Yellow Argon](https://developer.chrome.com/docs/webstore/troubleshooting)) The spam FAQ says keep a given keyword under five uses, and do not list more than five sites or brands in the description; put a longer list behind a link or inside one screenshot. ([spam FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq)) A Chrome reviewer's reply on chromium-extensions (the "guess what's wrong" thread) told a developer that a domain list in the description would be rejected under that FAQ. The thread itself is older than 2025; the FAQ it cites was still the live page on 2026-10-19. ([thread](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/o3I5pFH5z_g/m/FnvY0pI3AwAJ))

**"for LinkedIn" in the title.** The Instagram removal above is the published analogue: "for [brand]" with no distinctive name of your own. The Open to Work extension's store title began with "LinkedIn". Both were complainant-driven, not a published Google rule that the word may never appear. A non-affiliation line did not save Open to Work's screenshots. ([Reddit](https://www.reddit.com/r/chrome_extensions/comments/1el3lr0/my_chrome_extension_got_a_legal_complaint_from/); [Instagram thread](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/WJ3OExNJJbA))

**Hacker News.** No 2025–26 HN thread specifically about a CWS rejection of a third-party-site extension turned up in this search pass. That absence is **unconfirmed** as a claim that none exist; it means this pass did not find one worth citing.

## 7. WXT and the Chrome Web Store API

**`wxt submit` exists.** It is an alias for `publish-browser-extension`. The docs page fetched 2026-10-19 shows CLI package `publish-extension/6.0.0`. The page has no "last updated" line. Subcommands: default submit, `init`, `set-deploy-percentage`, `status`. ([wxt submit](https://wxt.dev/api/cli/wxt-submit))

**v1.1 credentials are marked deprecated on that CLI:** `--chrome-client-id`, `--chrome-client-secret`, `--chrome-refresh-token`, plus publish target and review exemption. **v2 credentials:** `--chrome-publisher-id`, `--chrome-extension-id`, `--chrome-service-account-client-email`, `--chrome-service-account-private-key`. Also `--chrome-zip`, `--chrome-publish-type STAGED_PUBLISH` (do not publish the moment review passes), `--chrome-deploy-percentage`, `--chrome-skip-submit-review` (upload only), and `--chrome-cancel-pending`. ([wxt submit](https://wxt.dev/api/cli/wxt-submit))

**API v2** shipped 15 Oct 2025. Endpoints moved to `chromewebstore.googleapis.com`. Upload is `POST .../upload/v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:upload`. Publish is `POST .../v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:publish`. New abilities: fetch published and pending status, cancel a pending submission, set rollout percentage without a new review, stage with `publishType: STAGED_PUBLISH`, and call the API as a service account. v2 does **not** create new items, and it does **not** change visibility. The first item is created in the dashboard. After you change visibility in the dashboard, the API cannot publish until you have published once by hand with the new visibility. ([API v2 blog](https://developer.chrome.com/blog/cws-api-v2); [using the API](https://developer.chrome.com/docs/webstore/using-api))

**v1.1 sunset.** The same blog says Google planned to support v1.1 until **15 Oct 2026**, and that after that date requests have to use v2. That date is four days before this report. A separate "v1.1 is now off" notice was not found on 2026-10-19. Assume v1.1 is done, because that is what the timetable said, and confirm with one dry-run if a pipeline still holds a refresh token.

**Service account.** One service account per publisher, added by email under Account in the dashboard. Enable "Chrome Web Store API" on a Google Cloud project, create the account, create a JSON key if you are not using impersonation. Scope: `https://www.googleapis.com/auth/chromewebstore`. ([service accounts](https://developer.chrome.com/docs/webstore/service-accounts), footer 2025-10-15)

**What the CLI will not do for the first release.** It will not register the developer, pay the fee, create the item, or fill the listing, privacy, or distribution tabs. Use it for version bumps after the extension id and the publisher id exist. `--chrome-skip-review` is described on the WXT page as applying to some updates, "like ad-blocker rule updates." This product is not that case. A normal upload still waits for review. ([wxt submit](https://wxt.dev/api/cli/wxt-submit); [review process](https://developer.chrome.com/docs/webstore/review-process))

**Verified CRX and CI.** If you opt in, the file `wxt submit` uploads has to be a CRX signed with the opted-in key, and the upload needs the raw-upload headers documented for the API. The private key stays out of the repo. ([update](https://developer.chrome.com/docs/webstore/update))
