<script lang="ts">
  // A profile's slop summary on their activity page, at the top of their
  // profile card: above the cover and photo, and sticky with the card, so it
  // stays in view while their posts scroll by and fills in as they're scored.
  //
  // Two numbers, kept apart: this page, live (only posts they wrote, not
  // reposts, comments or likes), and everything you've seen from them (the
  // Hall of Slop store). Stats and tier art, not insults: small samples say
  // so, and "no slop found" never means human-written. Every state renders
  // the same rows on single lines, so the card never moves after first paint.
  import Sticker from './Sticker.svelte';
  import { TIER_LOOK, UI, mascot, tierIcon } from './assets';
  import { SLOP_THRESHOLD } from '../store/types';
  import { SUMMARY_MIN_POSTS, TALLY_MIN_WORDS, STRIP_MAX_SEGMENTS, stripSegments, summaryVerdict } from './author-tally';
  import type { SummaryView } from './post-view.svelte';

  let { view }: { view: SummaryView } = $props();

  /** Nothing to call yet, or no slop found: the neutral grey, never a "pass" color. */
  const NEUTRAL = TIER_LOOK.artisanal.color;
  const s = $derived(view.stats);
  const verdict = $derived(summaryVerdict(s));
  const color = $derived(verdict.art ? TIER_LOOK[verdict.art].color : NEUTRAL);
  const segments = $derived(stripSegments(s.marks));
  const dense = $derived(s.marks.length > STRIP_MAX_SEGMENTS);
  const pct = $derived(s.checked ? Math.round((100 * s.slop) / s.checked) : 0);
  const who = $derived(view.name ?? 'this person');
  const all = $derived(view.allTime);
  const about = $derived(
    `Slop check for ${who}. This page: posts ${who} wrote (not reposts, comments or likes), checked as you scroll past them. ` +
      `Slop means a Slop Index of ${SLOP_THRESHOLD}+. Posts under ${TALLY_MIN_WORDS} words count only when they're slop` +
      (s.skipped ? ` (${s.skipped} too short so far)` : '') +
      `. All seen: every post of theirs you've scrolled past, here and in your feed. ` +
      `Low numbers mean no slop found, not proof a human wrote it.`,
  );
</script>

<section class="summary" class:rm={view.reduceMotion} style:--tier={color} aria-label="Slop check for {who}" title={about}>
  <div class="top" data-art={verdict.art ?? 'none'}>
    {#key verdict.art}
      <Sticker
        class="art"
        src={verdict.art ? tierIcon(verdict.art) : mascot()}
        emoji={verdict.art ? TIER_LOOK[verdict.art].emoji : '🫠'}
        size={44}
      />
    {/key}
    <div class="head">
      <p class="big">
        {#if verdict.sure}
          <b>{pct}%</b> <span>of posts slop</span>
        {:else if s.checked}
          <b>{s.slop}/{s.checked}</b> <span>posts slop</span>
        {:else}
          <b>0</b> <span>posts checked</span>
        {/if}
      </p>
      <p class="verdict">{verdict.label}</p>
    </div>
  </div>
  <div class="strip" class:dense aria-hidden="true">
    {#each segments as seg, i (dense ? `t-${seg.tier}` : i)}
      <i class="seg" class:slop={seg.tier} style:flex-grow={seg.weight} style:--seg={seg.tier ? TIER_LOOK[seg.tier].color : null}></i>
    {/each}
  </div>
  <dl class="rows">
    <div class="row">
      <dt>This page</dt>
      <dd>
        {#if verdict.sure}
          <b>{s.slop}</b> of <b>{s.checked}</b> · avg <b>{s.avg}</b>
        {:else if s.checked}
          need {SUMMARY_MIN_POSTS - s.checked} more · avg <b>{s.avg}</b>
        {:else if s.skipped}
          {s.skipped} too short to judge
        {:else}
          only posts they wrote
        {/if}
      </dd>
    </div>
    <div class="row all">
      <dt>All seen</dt>
      <dd>
        {#if all === undefined}
          …
        {:else if !all}
          nothing stored yet
        {:else}
          <b>{all.slopPosts}</b> of <b>{all.postsSeen}</b> slop
          {#if all.rank}
            <span class="rank" title="#{all.rank} in your Hall of Slop"><Sticker class="crown" src={UI.crown()} emoji="👑" size={13} />#{all.rank}</span>
          {/if}
        {/if}
      </dd>
    </div>
  </dl>
</section>
