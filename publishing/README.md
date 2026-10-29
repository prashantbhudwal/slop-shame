# Publishing preparation

This workstream prepares publishing while extension development continues. The public website lives in `site/`; store materials are drafts in `store/`. No registration payment, ZIP upload, or Chrome review submission has been made.

## Ready independently of the release

- Public project, privacy, and support pages using existing branding.
- Listing description, purpose, permission explanations, remote-code answer, and data-handling inventory.
- Reviewer instructions and artwork requirements.
- A separate GitHub Pages branch. Only website content is published there; extension source and the current development tree are not included.

Build website (Python standard library only):

```sh
python3 scripts/publishing/build-site.py
```

This regenerates `publishing/site/privacy.html` from root `PRIVACY.md`. Review both before deploying. The public policy describes current development behavior and needs a final release audit.

## Owner/account steps

- Complete Google's one-time registration payment when ready; no card was supplied.
- Choose publisher display name and contact email; verify the email.
- Enable/confirm Google Account 2-Step Verification. Current status is unverified.
- Accurately declare trader/non-trader status and complete Google's applicable identity/contact verification. Do not infer this from a free price or personal project.
- Any optional official-site ownership verification can follow; a custom domain is not required for the privacy/support pages.

## Release-dependent steps

- Confirm final code matches public policy and store claims. Current full Hall of Slop page and data-clearing UI are missing; don't advertise them. Existing APIs are not shipped controls.
- Resolve release bugs and run `pnpm check`, `pnpm test`, `pnpm test:e2e`; follow repository browser/process etiquette.
- Review person-directed ridicule in cards and author rankings against Google's bullying policy. No approval guarantee; copy changes alone do not resolve behavior concerns.
- Capture real UI screenshots from the release. The small promo tile is ready at `store/assets/promo-440x280.png`; see `store/artwork.md`.
- Run `pnpm zip`; inspect `.output/` for the generated production ZIP. Verify the ZIP's manifest/version, permissions, bundled assets, and absence of secrets/profiles/development data. Upload only the extension ZIP, never the repository.
- Enter listing drafts and live questionnaire answers, add assets and privacy URL, set distribution/free pricing, and supply reviewer instructions.
- Submit for review only after final validation. Select deferred publication if the owner wants approval before launch. Nothing has been submitted by this preparation task.

## Update the website

Use a separate temporary checkout of remote `gh-pages`, replace its website files with `publishing/site/`, review the diff, commit, and push normally. Never force-push, switch the shared development checkout, or publish the whole dirty workspace. GitHub Pages is configured to serve `/` of `gh-pages`.

References checked 19 October 2026:
- https://developer.chrome.com/docs/webstore/set-up-account
- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/abuse
