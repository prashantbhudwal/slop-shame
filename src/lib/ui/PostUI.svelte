<script lang="ts">
  // Everything Slop Shame shows inside one post: the badge (or a quiet chip on
  // clean posts), the "why it reeks" panel, and the tombstone after Destroy.
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import Sticker from './Sticker.svelte';
  import { TIER_LOOK, UI, categoryIcon, tierIcon } from './assets';
  import { CATEGORY_META } from '../shame/categories';
  import { cleanQuote } from '../shame/generate';
  import type { SlopReport } from '../engine/types';
  import type { PostActions, PostView } from './post-view.svelte';

  let { view, actions }: { view: PostView; actions: PostActions } = $props();

  const report = $derived(view.report);
  const look = $derived(TIER_LOOK[report?.tier.id ?? 'artisanal']);
  const shown = new Tween(0, { duration: 900, easing: cubicOut });
  $effect(() => {
    void shown.set(report?.score ?? 0, { duration: view.reduceMotion ? 0 : 900 });
  });
  const evidence = $derived(report ? topSignals(report) : []);

  function topSignals(r: SlopReport) {
    return r.signals.slice(0, 3).map((s) => ({
      s,
      quote: s.matches.map((m) => cleanQuote(m, 64)).find(Boolean) ?? '',
    }));
  }

  function toggle() {
    view.expanded = !view.expanded;
    actions.expand(view.expanded);
  }

  // Our clicks and keys must never reach LinkedIn's handlers on the card.
  function stop(e: Event) {
    e.stopPropagation();
  }
</script>

{#snippet destroyButton()}
  <button class="act destroy" onclick={actions.destroy} onpointerenter={actions.arm} onfocus={actions.arm} aria-label="Destroy this post">
    <Sticker class="ico" src={UI.destroy()} emoji="🧨" size={28} />
    <span class="lbl">Destroy</span>
  </button>
{/snippet}

{#snippet shameButton()}
  <button class="act shame" onclick={actions.shame} aria-label="Shame this post">
    <Sticker class="ico" src={UI.shame()} emoji="🔔" size={28} />
    <span class="lbl">Shame</span>
  </button>
{/snippet}

{#snippet details(r: SlopReport, withActions: boolean)}
  <div class="panel" transition:slide={{ duration: view.reduceMotion ? 0 : 200 }}>
    <p class="blurb">{r.tier.blurb}</p>
    {#if evidence.length}
      <p class="why">{r.tier.id === 'artisanal' ? 'Faint traces' : 'Why it reeks'}</p>
      <ul class="sigs">
        {#each evidence as { s, quote } (s.ruleId)}
          <li class="sig">
            <Sticker class="cat" src={categoryIcon(s.category)} emoji={CATEGORY_META[s.category].emoji} size={30} />
            <span class="sig-label">{s.label}</span>
            <span class="sig-quote">
              {#if quote}You said: <q>{quote}</q>{:else}{CATEGORY_META[s.category].label}{/if}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="none">No AI tells found. That doesn’t prove a human wrote it.</p>
    {/if}
    {#if view.rank}
      <div class="rank">
        <Sticker class="crown" src={UI.crown()} emoji="👑" size={22} />
        <span>
          {#if view.rank.rank}<b>#{view.rank.rank}</b> in your Hall of Slop ·{/if}
          {view.rank.title} · {view.rank.slopPosts}
          {view.rank.slopPosts === 1 ? 'slop post' : 'slop posts'} seen
        </span>
      </div>
    {/if}
    {#if withActions && (!view.isAd || view.shameable)}
      <div class="panel-actions">
        {#if !view.isAd}{@render destroyButton()}{/if}
        {#if view.shameable}{@render shameButton()}{/if}
      </div>
    {/if}
  </div>
{/snippet}

{#if view.mode !== 'none'}
  <div
    class="wrap"
    class:slim={view.mode !== 'badge'}
    class:rm={view.reduceMotion}
    role="presentation"
    onclick={stop}
    onpointerdown={stop}
    onmousedown={stop}
    onkeydown={stop}
    onkeyup={stop}
  >
    {#if view.mode === 'tomb'}
      <div class="tomb" role="status" style:--ms="{view.undoMs}ms">
        <Sticker class="ico" src={UI.destroy()} emoji="💥" size={26} />
        <span>Slop destroyed.</span>
        <button class="undo" onclick={() => actions.undo()}>Undo</button>
        <span class="timer"></span>
      </div>
    {:else if report && view.mode === 'badge'}
      <div
        class="bar"
        data-tier={report.tier.id}
        data-wobble={look.wobble || undefined}
        style:--tier={look.color}
        style:--tier-ink={look.ink}
        style:--fill={shown.current.toFixed(1)}
      >
        <button class="toggle" aria-expanded={view.expanded} aria-label="Slop Index {report.score}: {report.tier.label}. Show why." onclick={toggle}>
          <Sticker class="tier-icon" src={tierIcon(report.tier.id)} emoji={look.emoji} size={46} />
          <span class="score">
            <span class="score-top">
              <span class="kicker">Slop Index</span>
              <span class="num">{Math.round(shown.current)}</span>
              <span class="tier-chip">{report.tier.label}</span>
              {#if view.isAd}<span class="ad-chip">Ad</span>{/if}
              <svg class="caret" data-open={view.expanded || undefined} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="meter"><span class="fill"></span></span>
          </span>
        </button>
        <span class="actions">
          {#if !view.isAd}{@render destroyButton()}{/if}
          {#if view.shameable}{@render shameButton()}{/if}
        </span>
      </div>
      {#if view.expanded}{@render details(report, false)}{/if}
    {:else if report && view.mode === 'chip'}
      <button class="chip" aria-expanded={view.expanded} aria-label="Slop Index {report.score}: {report.tier.label}" onclick={toggle}>
        <Sticker class="ico" src={tierIcon(report.tier.id)} emoji={look.emoji} size={20} />
        <span>{report.tier.label}</span>
        <span class="n">· {report.score}</span>
        {#if view.isAd}<span class="ad-chip">Ad</span>{/if}
      </button>
      {#if view.expanded}{@render details(report, true)}{/if}
    {/if}
  </div>
{/if}
