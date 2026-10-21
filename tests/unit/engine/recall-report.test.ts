import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzePost } from '../../../src/lib/engine';
import type { SlopReport } from '../../../src/lib/engine/types';
import { corpus } from './corpus';

/** Explicit opt-in artifact generation; normal unit runs remain read-only. */
describe('recall before/after artifacts', () => {
  it.skipIf(!process.env.SLOP_BASELINE_ENGINE)('evaluates every fixture against the frozen pre-fix engine', async () => {
    const baselinePath = process.env.SLOP_BASELINE_ENGINE!;
    const before = await import(/* @vite-ignore */ baselinePath) as { analyzePost: typeof analyzePost };
    const summarize = (report: SlopReport) => ({ score: report.score, tier: report.tier.id, shameable: report.shameable, wordCount: report.wordCount, signals: report.signals.map(({ ruleId, weight, matches }) => ({ ruleId, weight, matches })) });
    const rows = corpus.map((post) => ({ id: post.id, authorship: post.authorship, before: summarize(before.analyzePost(post)), after: summarize(analyzePost(post)) }));
    const groups = ['human', 'mixed', 'original-ai', 'blind-ai', 'probes'].map((group) => {
      const selected = rows.filter((row) => group === 'human' || group === 'mixed' ? row.authorship === group : group === 'blind-ai' ? row.id.startsWith('realism-ai-') : group === 'probes' ? row.id.startsWith('probe-') : row.authorship === 'ai' && !/^(?:realism-ai-|probe-)/.test(row.id));
      const mean = (key: 'before' | 'after') => selected.reduce((sum, row) => sum + row[key].score, 0) / selected.length;
      return { group, posts: selected.length, beforeMean: Number(mean('before').toFixed(2)), afterMean: Number(mean('after').toFixed(2)), beforeAt60: selected.filter((row) => row.before.score >= 60).length, afterAt60: selected.filter((row) => row.after.score >= 60).length, beforeShameable: selected.filter((row) => row.before.shameable).length, afterShameable: selected.filter((row) => row.after.shameable).length };
    });
    console.table(groups);
    console.table(rows.filter((row) => row.id.startsWith('probe-')).map((row) => ({ id: row.id, before: row.before.score, after: row.after.score, beforeShameable: row.before.shameable, afterShameable: row.after.shameable })));
    const json = { baseline: 'Engine snapshot frozen before the recall fixes and first red-test run', baselineRevision: process.env.SLOP_BASELINE_REVISION ?? 'unrecorded', rows, groups };
    writeFileSync(new URL('./recall-before-after.json', import.meta.url), JSON.stringify(json, null, 2) + '\n');
    const lines = ['# Recall repair: every fixture before / after', '', `Baseline: engine revision ${json.baselineRevision}, frozen before the first red-test run.`, '', 'Synthetic style labels are not independent authorship proof. The 20 blind AI samples were written without inspecting the packs and are excluded from fitted tier-calibration accuracy.', '', '| Dataset | Cases | Mean before → after | >=60 before → after | Shame before → after |', '| --- | ---: | --- | --- | --- |', ...groups.map((g) => `| ${g.group} | ${g.posts} | ${g.beforeMean} → ${g.afterMean} | ${g.beforeAt60} → ${g.afterAt60} | ${g.beforeShameable} → ${g.afterShameable} |`), '', '## Every fixture', '', '| Fixture | Label | Before | After | Shame before → after |', '| --- | --- | ---: | ---: | --- |', ...rows.map((row) => `| ${row.id} | ${row.authorship} | ${row.before.score} | ${row.after.score} | ${row.before.shameable} → ${row.after.shameable} |`), ''];
    writeFileSync(new URL('./RECALL_REPORT.md', import.meta.url), lines.join('\n'));
    expect(rows.length).toBe(corpus.length);
  });
});
