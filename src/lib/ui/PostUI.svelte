<script lang="ts">
  // Everything Slop Shame shows inside one post's action bar: a slop chip in
  // the bar's empty space, styled like LinkedIn's own actions; the panel it
  // opens (Panel.svelte: evidence, Destroy, Shame), hanging from the chip;
  // and the tombstone after Destroy. Posts without slop evidence get nothing.
  //
  // Calm by default: one fixed size for every tier, so nothing in the feed
  // moves; the tier speaks through its icon and color. Motion scales with
  // the slop (one wobble when a Slop Swamp chip is first seen, two for
  // SLOPOCALYPSE); the loud parts (eruption, shame cards) only happen when
  // the user asks for them.
  import Panel from './Panel.svelte';
  import Sticker from './Sticker.svelte';
  import { TIER_LOOK, UI, tierIcon } from './assets';
  import { togglePanel, type PostActions, type PostView } from './post-view.svelte';

  let { view, actions }: { view: PostView; actions: PostActions } = $props();

  const report = $derived(view.report);
  const look = $derived(TIER_LOOK[report?.tier.id ?? 'whiff']);
  let chip = $state<HTMLButtonElement>();

  // Our clicks, keys and hovers must never reach LinkedIn's handlers on the
  // card around us (the action bar, or the header with its profile link).
  function stop(e: Event) {
    e.stopPropagation();
  }
  function stopClick(e: Event) {
    e.stopPropagation();
    if ((e.target as Element | null)?.closest?.('a[href]') == null) e.preventDefault();
  }
</script>

{#if view.mode !== 'none'}
  <div
    class="wrap"
    class:rm={view.reduceMotion}
    role="presentation"
    onclick={stopClick}
    onpointerdown={stop}
    onpointerup={stop}
    onmousedown={stop}
    onmouseup={stop}
    onkeydown={stop}
    onkeyup={stop}
    onmouseover={stop}
    onmouseout={stop}
    onpointerover={stop}
    onpointerout={stop}
    onfocusin={stop}
    onfocusout={stop}
  >
    {#if view.mode === 'tomb'}
      <div class="tomb" role="status" style:--ms="{view.undoMs}ms">
        <Sticker class="ico" src={UI.destroy()} emoji="💥" size={22} />
        <span>Slop destroyed.</span>
        <button class="undo" onclick={() => actions.undo()}>Undo</button>
        <span class="timer"></span>
      </div>
    {:else if report && view.mode === 'badge'}
      <span class="bar" data-tier={report.tier.id} style:--tier={look.color} style:--tier-ink={look.ink}>
        <button
          class="toggle"
          bind:this={chip}
          aria-expanded={view.expanded && view.openAt === 'chip'}
          aria-haspopup="dialog"
          aria-label="Slop Index {report.score}: {report.tier.label}. Show why."
          title="Slop Index {report.score}: {report.tier.label}"
          onclick={(event) => { if (event.isTrusted) togglePanel(view, actions, 'chip'); }}
        >
          <Sticker class="tier-icon" src={tierIcon(report.tier.id)} emoji={look.emoji} size={22} />
          <span class="num">{report.score}</span>
          <span class="lbl">{report.tier.label}</span>
        </button>
      </span>
      {#if view.expanded && view.openAt === 'chip'}
        <Panel {view} {actions} anchor={chip} />
      {/if}
    {/if}
  </div>
{/if}
