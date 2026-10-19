## What and why

<!-- One or two sentences. Link the issue: "Closes #123". -->

## Checklist

- [ ] `pnpm check`, `pnpm test` and `pnpm build` pass locally
- [ ] No network calls, telemetry or new permissions (or the PR explains why, and `PRIVACY.md` is updated)
- [ ] LinkedIn selectors only in `src/lib/linkedin/`
- [ ] UI changes: screenshot or GIF attached (names and faces blurred)

### Rule-pack changes (skip if none)

- [ ] Rule id is namespaced and stable: `<pack-id>.<rule-id>`, lowercase kebab-case
- [ ] Category is an existing `SlopCategory`; contracts (`types.ts`, `rule-types.ts`) untouched
- [ ] Weight is on the scale: **2** faint tell, **5** clear tell, **10** smoking gun (12–14 only for leaked model artifacts)
- [ ] Positive test: an AI-ish example that fires the rule
- [ ] Negative test: a plausible human sentence that does **not** fire it
- [ ] No new false positives on the human corpus (`tests/fixtures/posts/normal.json`, checked by `tests/unit/engine/calibration.test.ts`)
- [ ] Perf budget held: no regex built inside `detect()`, no re-splitting text, engine still < 1 ms per 300-word post
- [ ] Borrowed patterns credited (pack `attribution` + `THIRD_PARTY_NOTICES.md`)
