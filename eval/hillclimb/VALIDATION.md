# Scratch proposal validation

`pnpm check`: 0 errors, 0 warnings. `pnpm test --maxWorkers=2`: 35 failed, 562 passed, 1 skipped; 6 failed files. Scratch copy removed. No existing tests changed.

The failures are real proposal regressions or assumptions about the old ten-pack inventory. They were not used to tune the proposal after final evaluation.

-  tests/unit/engine/artifacts.test.ts > ordinary prose and weak artifact lookalikes > retains zero-width evidence without a fingerprint floor or Shame
-  tests/unit/engine/artifacts.test.ts > ordinary prose and weak artifact lookalikes > retains homoglyphs evidence without a fingerprint floor or Shame
-  tests/unit/engine/calibration.test.ts > synthetic human / AI / edited-AI calibration corpus > detects >=90% of obvious synthetic AI examples and reports editorial tiers separately
-  tests/unit/engine/evidence.test.ts > independent evidence and action eligibility > does not count a word again inside a stronger lexical phrase
-  tests/unit/engine/evidence.test.ts > independent evidence and action eligibility > does not treat repeated documentation labels as independent phrase evidence
-  tests/unit/engine/packs.test.ts > engagement-bait pack > has a positive example with evidence
-  tests/unit/engine/packs.test.ts > formatting pack > has a positive example with evidence
-  tests/unit/engine/packs.test.ts > bypass-tricks pack > has a positive example with evidence
-  tests/unit/engine/packs.test.ts > measured pack > has a positive example with evidence
-  tests/unit/engine/packs.test.ts > precision and research guardrails > maps all 48 upstream types into the ten families
-  tests/unit/engine/packs.test.ts > precision and research guardrails > does not score headlines, human genre choices, one emoji, one dash, or thanks
-  tests/unit/engine/packs.test.ts > precision and research guardrails > requires phrase evidence for em-dash corroboration and caps its contribution at two
-  tests/unit/engine/packs.test.ts > precision and research guardrails > recognizes mathematical fake bold while still matching its normalized phrases
-  tests/unit/engine/packs.test.ts > precision and research guardrails > uses sentence anchors for built-in closers even when the post is one long line
-  tests/unit/engine/packs.test.ts > precision and research guardrails > dedupes metadata hashtags and accepts curly quotes in keyword CTAs
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > probe-synthetic-cache-explainer reaches 70 with actionable evidence
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > probe-synthetic-evaluation-explainer reaches 70 with actionable evidence
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > recognizes repeated labels and emoji-numbered section headers
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > recognizes missing-apostrophe cross-line pivots, arrows, and parallel pairs
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > retains repeated structural evidence as an explainer gets longer
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > recognizes a named follow request and a reader question at the end
-  tests/unit/engine/recall.test.ts > real-feed explainer regressions, using synthetic paraphrases > keeps ordinary technical caveats and maintenance notes below 20: [parameter omitted]
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes the complete textbook AI probe and permits Shame
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes a formulaic sentence after the first two post lines
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes landscape phrases with intervening adjectives
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes a closing CTA before trailing hashtags
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > keeps both conversational filler snippets as quotable evidence
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > identifies the generated rule-of-three cadence with supporting phrases
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes a generic hashtag footer as weak corroboration
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > retains ambiguous artifacts without treating them as a smoking gun: [parameter omitted]
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > compounds five distinct tells across three phrase/discourse families
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes formulaic sentences using fast-paced
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes formulaic sentences using fast–paced
-  tests/unit/engine/recall.test.ts > orchestrator recall regressions (added before fixes) > recognizes formulaic sentences using fast‑paced
-  tests/unit/engine/regex-regressions.test.ts > bounded regex scanning preserves prose matches > keeps later matches after a long mixed-script near miss through the public API

Reasons: inactive first-party rules no longer emit expected signals; altered evidence weights change old score/tier thresholds and obvious-synthetic recall (56.25% vs required 90%); extra measured pack lacks a hand-written pack fixture and changes the ten-pack count. One checklist reaches 27, exceeding its former <20 guardrail. Explicit fingerprints still meet 80. Detailed logs remain in the ignored cache.
