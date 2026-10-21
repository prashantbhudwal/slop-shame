# Other Chromium Stores & Store-Free Distribution

Researched 2026-10-19 for Slop Shame (Manifest V3, WXT + Svelte, runs on `https://www.linkedin.com/feed*`, permissions: `storage`, host permission, `web_accessible_resources`).

This report covers:
1. Reaching users of non-Google Chromium browsers (Microsoft Edge, Opera, Brave, Vivaldi, Arc, Dia, Comet, Samsung Internet, Yandex, Naver Whale).
2. Sideloading and store-free installation in Google Chrome on macOS and Windows in 2026.
3. A future evaluation for Firefox via WXT and Mozilla Add-ons (AMO) self-distribution.

---

## TL;DR: Maximum Reach with Minimum Effort

To distribute an open-source MV3 extension across Chromium browsers with the least friction:

1. **Publish to the Chrome Web Store (CWS) first.** CWS is the universal default. Brave, Vivaldi, Arc, Dia, Comet (Perplexity), Samsung Internet (desktop), Yandex, and Opera install extensions directly from the Chrome Web Store out of the box with zero separate developer submissions.
2. **Support Microsoft Edge users via CWS initially, then register on Edge Add-ons.** Edge users visiting your CWS listing see a one-click banner: *"Allow extensions from other stores"*. Once clicked, they install directly from CWS.
3. **Submit the identical zip to Microsoft Edge Add-ons.** Partner Center registration is **free ($0)**, though it requires individual identity verification (government photo ID plus a mobile biometric selfie scan). Edge accepts the exact same WXT Chrome MV3 zip without modifications. Listing in Edge Add-ons removes the "other stores" prompt and unlocks enterprise Edge users where external stores are disabled by policy.
4. **Do not bother submitting to Opera Add-ons or Naver Whale Store** unless you specifically need catalog localization in Russia/Korea or use sidebar-docking APIs. Both browsers natively install from CWS. Opera's review queue remains notoriously slow (often weeks to months).
5. **Do not distribute raw `.crx` files or try enterprise policy scripts to share test builds with friends.** Chrome blocks direct `.crx` installation with `CRX_REQUIRED_PROOF_MISSING`. Enterprise force-install policies require domain-joined or MDM-enrolled devices and display an alarming *"Managed by your organization"* banner.
6. **Use "Load unpacked" for local developer testing, and CWS "Unlisted" for friends.** The `--load-extension` CLI switch was removed from branded Google Chrome in **Chrome 137** (mid-2025). A CWS **Unlisted** listing takes standard store review but provides smooth one-click installation and automatic background updates without scary warning dialogs.

---

## Chromium Browser Distribution Matrix

| Browser | Core Engine | Installs Direct from CWS? | Own Store? | Separate Submission Needed? | Notes & UX |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Chrome** | Chromium | **Yes** (Primary) | Chrome Web Store | Yes (Primary baseline) | Standard store listing. |
| **Microsoft Edge** | Chromium | **Yes** | [Edge Add-ons](https://microsoftedge.microsoft.com/addons) | **Optional** (Recommended) | Users can install from CWS after clicking *"Allow extensions from other stores"*. Native store listing recommended for enterprise environments. |
| **Brave** | Chromium | **Yes** | None | **No** | Points directly to CWS. No developer portal or custom store exists. |
| **Vivaldi** | Chromium | **Yes** | None | **No** | Points directly to CWS. Fully compatible out of the box. |
| **Arc** | Chromium | **Yes** | None | **No** | Uses CWS directly. Extensions run in the Arc sidebar/toolbar. |
| **Dia** | Chromium | **Yes** | None | **No** | The Browser Company's AI browser uses Chromium and supports CWS directly. |
| **Comet (Perplexity)** | Chromium | **Yes** | None | **No** | Perplexity's Chromium-based agentic browser installs extensions directly from CWS. |
| **Opera & Opera GX** | Chromium | **Yes** | [Opera Add-ons](https://addons.opera.com/) | **No** (Optional) | Native CWS installation has been built into desktop Opera since Opera 55. Opera Add-ons queue is very slow. |
| **Samsung Internet** | Chromium | **Yes** (Desktop) | Galaxy Store (Mobile only) | **No** (for desktop) | Windows desktop version runs Chromium and installs from CWS. Mobile version does not run desktop MV3 extensions. |
| **Yandex Browser** | Chromium | **Yes** | Opera Add-ons catalog integration | **No** | Supports CWS directly alongside Opera Add-ons. |
| **Naver Whale** | Chromium | **Yes** | [Whale Store](https://store.whale.naver.com/) | **No** (Optional) | Native CWS installation works via "Add to Chrome". Whale Store is only needed for sidebar-docked widgets. |

---

## 1. Microsoft Edge Add-ons (Partner Center)

Edge accounts for ~10–15% of desktop browser share worldwide and is heavily deployed in enterprise environments where the Chrome Web Store is often blocked by policy.

### Registration Fee & Identity Verification
- **Fee:** **Free ($0.00)**. Microsoft does not charge any registration or developer fee for Edge extension developers (checked 2026-10-19 on [Microsoft Learn](https://learn.microsoft.com/microsoft-edge/extensions-chromium/publish/publish-extension)).
- **Account Type:** Sign in with a personal Microsoft Account (MSA, e.g. `@outlook.com`) to create an **Individual Developer** account in [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
- **Identity Verification:** Microsoft enforces strict KYC (Know Your Customer) identity verification to mitigate malicious extensions:
  1. Full legal name and physical address matching official records.
  2. Phone number SMS verification.
  3. Government-issued photo ID upload (Passport, National ID card, or Driver's License).
  4. Real-time biometric liveness check: scanning a QR code with a smartphone camera to take a selfie facial match.
  5. Approval typically clears within a few minutes to hours for automated verification, or 1–3 business days if routed to manual review.

### Submission Fields & Asset Specifications
Configured under Partner Center's **Store listing** (see [Microsoft Learn Store Listing Specs](https://learn.microsoft.com/microsoft-edge/extensions-chromium/publish/publish-extension)):
- **Extension Logo (Required):** PNG format, 1:1 aspect ratio. Minimum size `128 x 128` px; recommended size `300 x 300` px.
- **Description (Required):** Text between **250 and 10,000 characters**. Must clearly explain what the extension does, its features, and how it interacts with LinkedIn.
- **Small Promotional Tile (Optional):** `440 x 280` px PNG. Used in category cards and collection pages.
- **Large Promotional Tile (Optional):** `1400 x 560` px PNG. Used for featured banners.
- **Screenshots (Optional but recommended):** Up to 10 screenshots (or minimum 1). Format: `1280 x 800` px or `640 x 480` px PNG.
- **Privacy Policy URL (Required):** A public web link (`https://...`) detailing data handling practices.
- **Support Contact (Required):** A support email address or website URL.
- **Notes for Certification (Field):** A text box for submission reviewers. For Slop Shame, include test instructions: *"Extension activates on https://www.linkedin.com/feed. It parses public post text locally using heuristic rules to flag AI slop. It makes zero network calls and stores user preferences locally via chrome.storage.local."*

### Package Compatibility: Does the Same Zip Work?
**Yes.** WXT generates a standard Chromium MV3 bundle (`.output/chrome-mv3.zip` or unpacked directory).
- Microsoft Edge Chromium uses the same Extension APIs as Google Chrome (see [API Support in Microsoft Edge](https://learn.microsoft.com/microsoft-edge/extensions-chromium/developer-guide/api-support)).
- **Requirement:** Ensure `manifest.json` does **not** contain an `update_url` pointing to Google's update servers; Partner Center manages Edge updates automatically. WXT packages built for production omit `update_url` by default.
- No `browser_specific_settings` or vendor-prefixed namespaces are required.

### Certification Review Times in 2026
- **Turnaround:** Standard reviews take **24 to 72 hours** (checked 2026-10-19 on [Microsoft Learn Submission States](https://learn.microsoft.com/microsoft-edge/extensions-chromium/publish/submission-states)). Initial account submissions or major permission changes can take up to **7 business days**.
- Submissions transition through: `In draft` &rarr; `In review` &rarr; `Waiting to publish` &rarr; `In the store`.

### Common Rejection Reasons
Based on [Microsoft Edge Developer Policies](https://learn.microsoft.com/microsoft-edge/extensions-chromium/publish/developer-policies):
1. **Policy 1.1 (Single Purpose & Clear Description):** Descriptions under 250 characters or descriptions that fail to explain the extension's behavior in detail.
2. **Policy 1.1.7 (Obfuscation):** Submitting heavily obfuscated or unreadable code. WXT builds bundle with Vite/Rollup; ensure code is minified cleanly without custom packing/obfuscation tools.
3. **Policy 1.3 (Testability):** Reviewers test the extension. If an extension targets a site requiring authentication (like `linkedin.com/feed`), reviewers may reject if they cannot verify functionality without clear instructions in "Notes for certification".
4. **Policy 1.5 (Privacy Policy):** Providing a dead link, an incomplete privacy policy, or failing to declare that `storage` is used only for local user preferences.
5. **Branding Infringements:** Mentioning "Chrome" as part of the extension title, or using LinkedIn logos/trademarks in promotional tiles or icons without fair-use compliance.

### Installing Directly from the Chrome Web Store in Edge
Edge users do not strictly require an Edge Add-ons listing to run the extension:
1. When an Edge user visits the extension's Chrome Web Store page, Edge displays a top banner:  
   *"You can now add extensions from the Chrome Web Store to Microsoft Edge. [Allow extensions from other stores]"*.
2. The user clicks **Allow extensions from other stores** and confirms the prompt. (Alternatively, toggle it under `edge://extensions/`).
3. The CWS blue button changes to **"Add to Chrome"** (or **"Get"**), and the extension installs directly into Edge.
4. **Limitation:** In locked-down corporate environments, system administrators frequently disable this setting via the [`ControlDefaultStateOfAllowExtensionFromOtherStoresSettingEnabled`](https://learn.microsoft.com/deployedge/microsoft-edge-policies#controldefaultstateofallowextensionfromotherstoressettingenabled) policy. In those environments, an Edge Add-ons store listing is the only path.

---

## 2. Browser Landscape: Where Users Get Extensions

The modern desktop browser landscape (excluding Safari and Firefox) is almost entirely Chromium. Most vendors deliberately avoid maintaining their own extension stores to save on moderation and infrastructure costs.

### Browser-by-Browser Breakdown

#### Brave & Vivaldi
- **Store Model:** Zero store infrastructure.
- **How it works:** Both browsers bundle native support for the Chrome Web Store. Navigating to `brave://extensions` or `vivaldi://extensions` includes a direct link: *"Find extensions and themes in the Chrome Web Store"*.
- **Submission:** None. Publishing to CWS immediately covers 100% of Brave and Vivaldi users.

#### Arc & Dia (The Browser Company)
- **Store Model:** Zero separate store.
- **How it works:** Arc and Dia are Chromium-based. Users open the CWS page in an Arc/Dia tab and click "Add to Arc" / "Add to Dia". Extensions execute identically, accessible via the extensions icon in the sidebar or command bar (`Cmd/Ctrl + T`).
- **Submission:** None.

#### Comet (Perplexity)
- **Store Model:** Zero separate store.
- **How it works:** Perplexity's Chromium-based browser natively loads extensions from the Chrome Web Store. Users navigate to CWS, click "Add to Comet", and manage add-ons via the standard Chromium extensions menu.
- **Submission:** None.

#### Opera & Opera GX
- **Store Model:** Dual support ([Opera Add-ons](https://addons.opera.com/) + native Chrome Web Store).
- **How it works:** Opera previously required an extension named "Install Chrome Extensions". For years now (since Opera 55), desktop Opera and Opera GX have native, built-in CWS support. When an Opera user opens CWS, an "Add to Opera" button appears directly on the CWS page.
- **Opera Add-ons Portal:** Opera still operates its own developer catalog at [addons.opera.com/developer/](https://addons.opera.com/developer/). However:
  - Submissions undergo manual review that routinely suffers from multi-month delays.
  - Submitting is only recommended if an extension uses Opera-specific sidebar APIs (`opera.sidebarAction`). Slop Shame does not use these APIs.

#### Samsung Internet (Desktop)
- **Store Model:** Dual platform divergence.
- **Desktop (Windows):** Samsung released Samsung Internet for Windows on the Microsoft Store (built on Chromium). It does not have an independent desktop store and installs directly from the Chrome Web Store.
- **Mobile (Android):** Samsung Internet on Android uses Samsung's Galaxy Store for a small, curated set of extensions (mostly ad blockers and translators). Desktop MV3 extensions cannot be installed on Samsung Internet mobile.

#### Yandex Browser
- **Store Model:** Integrated multi-source catalog.
- **How it works:** Yandex Browser supports both Chrome Web Store and Opera Add-ons catalog. Desktop users navigate to CWS and install with one click.
- **Submission:** None needed beyond CWS.

#### Naver Whale
- **Store Model:** Dual support ([Whale Store](https://store.whale.naver.com/) + Chrome Web Store).
- **How it works:** Naver Whale is a Chromium browser popular in South Korea. It natively allows users to install any extension from the Chrome Web Store via "Add to Chrome".
- **Whale Store:** Naver operates a dedicated store focused on widgets that pin to its custom sidebar. Submitting to Whale Store is completely optional.

---

## 3. Sideloading in Google Chrome (macOS and Windows)

Sideloading refers to installing an extension directly without downloading it from the Chrome Web Store. Google has progressively tightened sideloading restrictions over several years to combat malware.

### A. "Load Unpacked" with Developer Mode

This is the standard mechanism for local development and private manual testing.

#### Exact Steps
1. Build the production output: `pnpm build` (WXT outputs to `.output/chrome-mv3`).
2. Open Google Chrome and enter `chrome://extensions` in the address bar.
3. Turn on the **Developer mode** toggle switch in the top-right corner.
4. Click the **Load unpacked** button that appears in the top-left menu bar.
5. In the file picker, select the `.output/chrome-mv3` folder (the folder containing `manifest.json`).
6. The extension appears immediately in the installed list and starts running.

#### Persistent Warnings
- **Startup Warning Dialog:** Every time Google Chrome launches with an unpacked extension installed, it displays a modal warning dialog:
  > *"Disable developer mode extensions. Extensions in developer mode can harm your computer. If you're not a developer, you should disable these extensions to stay safe."*
  > Buttons: `[Disable]` | `[Cancel / X]`
  - If a user clicks `Disable`, Chrome disables the extension immediately.
  - If a user clicks `Cancel` or dismisses it, Chrome leaves it active, but re-prompts on the next browser startup.
- **Extensions Dashboard Warnings:** In `chrome://extensions`, unpacked extensions display an orange warning badge noting that the item is loaded from an unpacked directory and is not verified by the Chrome Web Store.

#### Manual Reload on Updates
- **Does it update automatically?** **No.** When you replace the files in the unpacked folder or run a new build, Chrome does *not* automatically reload running service workers or injected content scripts.
- **Manual Reload Required:** The user must open `chrome://extensions` and click the circular **Reload** icon on the extension's card (or call `chrome.runtime.reload()` programmatically).
- *(Note: During active development with `wxt dev`, WXT connects a local WebSocket reload server that triggers reloads automatically. But for static build artifacts shared with testers, manual reloads are always required).*

---

### B. Status of the `--load-extension` Command-Line Flag

Historically, developers and test automation frameworks launched Chrome with command-line arguments:
```bash
google-chrome --load-extension=/path/to/extension
```

#### Removal in Chrome 137 (Branded Google Chrome)
- **Removal Announcement:** In June 2025, Google officially announced the deprecation and removal of `--load-extension` (and `--disable-extensions-except`) in standard/branded Google Chrome starting in **Chrome 137** (see [What's happening in Chrome Extensions, June 2025](https://developer.chrome.com/blog/extensions-june-2025)).
- **Reason for Removal:** Malware, adware, and unwanted software frequently abused CLI switches to silently inject malicious extensions into users' everyday browser sessions without their knowledge or consent.
- **Chrome for Testing & Chromium:** The `--load-extension` flag remains fully functional in **Chrome for Testing (CfT)** and open-source **Chromium** binaries, which are intentionally built without consumer security restrictions for CI/CD and automation pipelines.
- **Is there a supported way to install unpacked into branded Chrome from a script?**  
  **No.** In consumer-branded Google Chrome, there is no supported, non-interactive CLI flag or OS script command to install an unpacked extension into a standard user profile. Test automation tools (Puppeteer, Playwright, Selenium) have transitioned to loading extensions via the **Chrome DevTools Protocol (CDP)** / **WebDriver BiDi**, or by launching **Chrome for Testing** rather than standard Google Chrome.

---

### C. Installing a `.crx` File Directly

Can an author package a `.crx` file and give it to a friend to double-click or drag-and-drop?

#### Blocked on macOS and Windows
- **Drag-and-Drop to `chrome://extensions`:** If a user drags a self-packaged `.crx` file onto `chrome://extensions`, Chrome rejects the installation with:
  ```text
  Package is invalid: 'CRX_REQUIRED_PROOF_MISSING'
  ```
  Modern Chromium enforces the **CRX3** container specification. For consumer installs, Chrome requires an embedded cryptographic proof signature from the Chrome Web Store. A self-signed or locally packaged `.crx` lacks this signature proof.
- **Direct Web Download:** If a user clicks a link to download a `.crx` file from an external website (e.g. GitHub Releases), Chrome displays a browser warning:
  > *"Apps, extensions and user scripts cannot be added from this website."*
  Direct inline installation from external websites was completely removed from Chrome years ago.

#### Enterprise Policies on Unmanaged Personal Computers
Chrome provides enterprise management policies to force-install off-store extensions:
- Policies: [`ExtensionSettings`](https://support.google.com/chrome/a/answer/7532015), [`ExtensionInstallForcelist`](https://support.google.com/chrome/a/answer/9866145), and `ExtensionInstallSources`.
- Update Mechanism: Requires hosting an XML update manifest on an external server using Google's update protocol (`<gupdate><app...><updatecheck codebase='...crx' version='...'/></app></gupdate>`).

#### Critical Catch: Managed Device Requirement
To prevent malware from creating local registry keys or plist files to force-install extensions, Google enforces strict management requirements:
- **Windows:** The PC must be **domain-joined** (Active Directory or Microsoft Entra ID) or enrolled in Chrome Enterprise Core. On a normal consumer Windows machine, registry entries for off-store extension installation are ignored.
- **macOS:** The Mac must be **MDM-managed** via an enrolled configuration profile (`.mobileconfig`) or joined via MCX / Chrome Enterprise Core. Simply writing a plist file to `/Library/Preferences/com.google.Chrome.plist` on an unmanaged personal Mac will not force-install off-store extensions.

#### Severe Downsides of Enterprise Policies
1. **"Managed by your organization":** If any enterprise policy or profile is applied, Chrome permanently stamps *"Managed by your organization"* at the bottom of the main menu and on `chrome://settings`. This looks like malware or enterprise surveillance to casual users and friends.
2. **Infrastructure Burden:** The author must host an HTTPS web server serving the `.crx` file and a properly formatted XML autoupdate manifest.
3. **Friend Onboarding Failure:** Asking a friend to install a system configuration profile or modify system registry policies to test an extension is impractical and dangerous.

---

### D. The Practical Solution: Unlisted Listings & Trusted Testers

Because direct `.crx` sideloading is blocked and unpacked directories trigger repeated warnings, the Chrome Web Store provides two native mechanisms for sharing test and pre-release builds (see [CWS Distribution & Visibility](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/)):

#### 1. Unlisted Listing
- **How it works:** You submit the extension to the Chrome Web Store Developer Dashboard as usual, but under the **Distribution** tab, set visibility to **Unlisted**.
- **Discoverability:** The extension does **not** appear in search results, store categories, or recommendation algorithms.
- **Installation:** Anyone with the direct store link (`https://chromewebstore.google.com/detail/<extension-id>`) can open the page and click **"Add to Chrome"**.
- **Advantages:**
  - One-click installation for any user on Chrome, Edge, Brave, Vivaldi, Arc, etc.
  - Automatic background updates managed by Google's CDN whenever you push a new version.
  - No "Disable developer mode extensions" popups or "Managed by your organization" warnings.
- **Review:** Unlisted extensions undergo the exact same automated and human security reviews as public extensions.

#### 2. Private Visibility (Trusted Testers)
- **How it works:** Under the Developer Dashboard's **Account** &rarr; **Management** &rarr; **Trusted Testers**, you enter a list of tester Google Account email addresses (or a Google Group email). In the extension's **Distribution** tab, select **Private** and check **Trusted testers**.
- **Access Control:** Only users who are logged into Chrome with one of those specified Google accounts can view the listing and install the extension. Anyone else opening the URL sees a 404 or access denied page.
- **Use Case:** Best when you want to restrict access strictly to a small group of vetted testers before sharing an unlisted or public link.

---

## 4. Firefox: AMO Self-Distribution & WXT

Firefox is out of scope for the initial release, but supporting it later is technically straightforward.

### Feasibility with WXT
WXT has first-class multi-browser support:
```bash
# Build Firefox MV3 bundle
pnpm wxt build -b firefox

# Package Firefox zip and source zip
pnpm wxt zip -b firefox
```
Because Slop Shame uses only `storage`, host permission for `https://www.linkedin.com/*`, and `web_accessible_resources`, its codebase is 99% portable to Firefox without architectural changes.

### AMO Self-Distribution (Signed XPI)
Unlike Chromium, Firefox has a mature, official workflow for **self-distribution outside the store** (see [AMO Signing and Distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-with-addons-mozilla-org/)):
1. **Mandatory Signing:** Standard release versions of Firefox refuse to install unsigned extensions. However, Mozilla does not force all signed extensions to be listed on [addons.mozilla.org (AMO)](https://addons.mozilla.org/).
2. **Unlisted Signing API:** You can upload your build to AMO under the **"On your own" (unlisted)** channel. Mozilla runs automated security validation (usually completing in 5 to 15 minutes) and returns a cryptographically signed `.xpi` file.
3. **Automating with CLI:** This can be completely automated via CI using WXT's built-in command (`wxt submit --firefox-channel unlisted`) or Mozilla's `web-ext sign`:
   ```bash
   npx web-ext sign \
     --source-dir .output/firefox-mv3 \
     --channel unlisted \
     --api-key "$AMO_JWT_ISSUER" \
     --api-secret "$AMO_JWT_SECRET"
   ```
4. **Hosting on GitHub Releases:** You can attach the signed `.xpi` file directly to a GitHub Release. When a Firefox user clicks the `.xpi` link (served with `Content-Type: application/x-xpinstall`), Firefox opens a native prompt: *"Add Slop Shame to Firefox?"*.
5. **Autoupdate Effort:** Self-hosted Firefox extensions require specifying an explicit Gecko add-on ID and a self-hosted `update_url` in `manifest.json`:
   ```json
   "browser_specific_settings": {
     "gecko": {
       "id": "slop-shame@yourdomain.com",
       "update_url": "https://raw.githubusercontent.com/username/slop-shame/main/updates.json"
     }
   }
   ```
6. **Source Code Submission Requirement:** Mozilla requires developers using Vite, Svelte, or Webpack to upload a source archive (`.output/*-sources.zip`) with instructions explaining how to build the exact bundle from source during the review/signing submission.

---

## Summary of Actionable Recommendations

1. **Phase 1 (Immediate):** Publish to the **Chrome Web Store**. This single submission immediately covers Google Chrome, Brave, Vivaldi, Arc, Dia, Comet (Perplexity), desktop Samsung Internet, Yandex, and Opera.
2. **Phase 2 (Fast Follow):** Register on **Microsoft Partner Center** (free, ID verification required) and upload the exact same zip to **Microsoft Edge Add-ons** to serve institutional Edge users.
3. **Testing / Sharing:** Do not attempt `.crx` sideloading or enterprise policies. For yourself, use **Developer mode "Load unpacked"**. For friends, publish an **Unlisted** listing on the Chrome Web Store.
4. **Future (Firefox):** When ready, use `wxt zip -b firefox` and Mozilla's unlisted signing API to produce a signed `.xpi` hosted on GitHub Releases.
