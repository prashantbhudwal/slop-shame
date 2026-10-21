<script lang="ts">
  // Drip Edge: slime along the card's top edge, inside the card (drip.ts has
  // the shapes), plus the tier's look on the author's photo: a scribbled ring
  // around it and the tier monster under it (like an online-status dot), which
  // opens the same panel as the chip. Rendered from the zero-size host inside
  // the card (see post-decoration.ts), so it scrolls with the post and never
  // needs repositioning. The drip is click-through; only the monster takes clicks.
  //
  // One SVG: every outline first, then every fill on top, so the strip and
  // its drips read as one blob. x is in % of the card's width; the photo drip
  // is moved to the photo's centre with a CSS transform (--ph-x). The falling
  // drop is its own element so its animation (transform and opacity) runs on
  // the compositor.
  import Panel from './Panel.svelte';
  import { TIER_LOOK, tierIcon } from './assets';
  import { OUTLINE, dripShape, shortLen } from './drip';
  import { togglePanel, type PostActions, type PostView } from './post-view.svelte';

  let { view, actions }: { view: PostView; actions: PostActions } = $props();
  const report = $derived(view.report);
  const color = $derived(TIER_LOOK[report?.tier.id ?? 'certified'].color);
  let monster = $state<HTMLButtonElement>();

  // Our clicks, keys and hovers must never reach LinkedIn's handlers on the card around us.
  function stop(e: Event) {
    e.stopPropagation();
  }
  function stopClick(e: Event) {
    e.stopPropagation();
    if ((e.target as Element | null)?.closest?.('a[href]') == null) e.preventDefault();
  }
  const tier = $derived(view.report?.tier.id);
  const shape = $derived(view.mode === 'badge' ? dripShape(tier) : null);
  const photo = $derived(shape?.photo);
</script>

{#snippet bead(x: string, len: number, w: number, r: number, cls: string)}
  <line class="d {cls}" x1={x} y1="0" x2={x} y2={len} stroke-width={w} />
  <circle class={cls} cx={x} cy={len} {r} />
{/snippet}

{#snippet goo(o: number)}
  <line class="strip" x1="-4%" y1="0" x2="{shape!.reach}%" y2="0" stroke-width={shape!.strip - o * 2} />
  {#each shape!.drips as d (d.x)}
    {@render bead(`${d.x}%`, d.len, d.w - o * 2, d.r - o, '')}
  {/each}
  {#if photo}
    <g class="ph">
      {@render bead('0', photo.len, photo.w - o * 2, photo.r - o, 'ph-long')}
      {@render bead('0', shortLen(photo), photo.w - o * 2, photo.r - o, 'ph-short')}
    </g>
  {/if}
{/snippet}

{#if shape}
  <div class="ss-drip" class:rm={view.reduceMotion} data-tier={tier} aria-hidden="true">
    <div class="ss-drip-clip">
      <svg class="ss-drip-goo">
        <g class="ol">{@render goo(0)}</g>
        <g class="fill">{@render goo(OUTLINE)}</g>
        {#each shape.drips.filter((d) => d.hi) as d (d.x)}
          <circle class="hi" cx="{d.x}%" cy={d.len} r={d.hi} transform="translate({-(d.hi! + 0.1)} {-(d.hi! + 0.1)})" />
        {/each}
        {#if photo?.hi}
          <g class="ph">
            <circle class="hi ph-long" cx="0" cy={photo.len} r={photo.hi} transform="translate({-(photo.hi + 0.1)} {-(photo.hi + 0.1)})" />
            <circle class="hi ph-short" cx="0" cy={shortLen(photo)} r={photo.hi} transform="translate({-(photo.hi + 0.1)} {-(photo.hi + 0.1)})" />
          </g>
        {/if}
      </svg>
    </div>
    {#if photo}
      <span
        class="ss-drip-fall"
        style:--rx="{photo.fall.rx}px"
        style:--ry="{photo.fall.ry}px"
        style:--fy="{photo.fall.y}px"
        style:--fb="{OUTLINE}px"
      ></span>
    {/if}
  </div>
{/if}

{#if report && view.mode === 'badge'}
  <div
    class="ss-deco"
    class:rm={view.reduceMotion}
    style:color
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
    <div class="ss-avatar-decoration">
      <svg class="ss-avatar-scribble" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path d="M50 5 C72 2 96 23 94 48 C99 70 76 96 50 94 C26 99 3 76 6 50 C1 26 25 2 50 5 Z" />
        <path d="M48 8 C77 5 94 27 91 52 C94 78 69 94 46 91 C20 95 5 69 9 46 C5 20 30 6 48 8 Z" />
      </svg>
      <button
        class="ss-avatar-monster"
        bind:this={monster}
        aria-label="Slop Index {report.score}: {report.tier.label}. Show why."
        aria-expanded={view.expanded && view.openAt === 'avatar'}
        aria-haspopup="dialog"
        title="{report.score} · {report.tier.label}"
        onclick={(event) => { if (event.isTrusted) togglePanel(view, actions, 'avatar'); }}
      >
        <img src={tierIcon(report.tier.id)} alt="" draggable="false" />
      </button>
    </div>
    {#if view.expanded && view.openAt === 'avatar'}
      <Panel {view} {actions} anchor={monster} />
    {/if}
  </div>
{/if}
