<script lang="ts">
  // The "why it reeks" panel with Destroy and Shame. It lives in the browser's
  // top layer (no card can clip it) and hangs from the control that opened it,
  // which must sit in the same shadow root: CSS anchor positioning
  // (`--ss-anchor`, see post.css) keeps it attached on the compositor while
  // LinkedIn's feed scrolls, with no scroll listeners. When the anchor leaves
  // the viewport (scrolled away, hidden, removed) the panel closes instead of
  // floating somewhere else.
  import Sticker from './Sticker.svelte';
  import { TIER_LOOK, UI, categoryIcon, tierIcon } from './assets';
  import { CATEGORY_META } from '../shame/categories';
  import { cleanQuote } from '../shame/generate';
  import { HALL_MIN_SLOP_POSTS } from '../store/ranking';
  import type { SlopReport } from '../engine/types';
  import { setPanelOpen, type PostActions, type PostView } from './post-view.svelte';

  let { view, actions, anchor }: { view: PostView; actions: PostActions; anchor: HTMLElement | undefined } = $props();

  const report = $derived(view.report);
  const look = $derived(TIER_LOOK[report?.tier.id ?? 'whiff']);
  const evidence = $derived(report ? topSignals(report) : []);

  function topSignals(r: SlopReport) {
    return r.signals.slice(0, 3).map((s) => ({
      s,
      quote: s.matches.map((m) => cleanQuote(m, 64)).find(Boolean) ?? '',
    }));
  }

  const close = () => setPanelOpen(view, actions, false);
  const anchored = typeof CSS !== 'undefined' && CSS.supports('position-anchor: --ss-anchor');

  function floating(node: HTMLElement) {
    try { node.showPopover(); } catch { /* unsupported: still fixed-positioned below */ }
    let stopFallback = () => {};
    if (!anchored || !node.matches(':popover-open')) {
      // No anchor positioning: place once, and close on scroll rather than chase the anchor a frame late.
      const a = anchor?.getBoundingClientRect();
      if (a) {
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        node.style.left = `${Math.max(8, Math.min(a.left, innerWidth - w - 8))}px`;
        node.style.top = `${a.bottom + 6 + h > innerHeight - 8 && a.top - h - 6 > 8 ? a.top - h - 6 : a.bottom + 6}px`;
      }
      document.addEventListener('scroll', close, { capture: true, passive: true, once: true });
      window.addEventListener('resize', close, { once: true });
      stopFallback = () => {
        document.removeEventListener('scroll', close, { capture: true });
        window.removeEventListener('resize', close);
      };
    }
    // Also closes at once if the anchor has no box (never pins to the viewport corner).
    const gone = new IntersectionObserver((records) => {
      if (records.some((r) => !r.isIntersecting)) close();
    });
    if (anchor) gone.observe(anchor);
    else queueMicrotask(close);
    // Close on a click anywhere outside our own host, or Escape.
    const root = node.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : null;
    const outside = (e: Event) => {
      if (!host || !e.composedPath().includes(host)) close();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', esc, true);
    return {
      destroy() {
        gone.disconnect();
        stopFallback();
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', esc, true);
        const focused = root instanceof ShadowRoot && root.activeElement && node.contains(root.activeElement);
        try { node.hidePopover(); } catch { /* already closed */ }
        if (focused && anchor?.isConnected) anchor.focus({ preventScroll: true });
      },
    };
  }
</script>

{#if report}
  <div class="panel" popover="manual" role="dialog" aria-label="Why this post reeks" use:floating>
    <div class="head" style:--tier={look.color} style:--tier-ink={look.ink}>
      <Sticker class="head-icon" src={tierIcon(report.tier.id)} emoji={look.emoji} size={34} />
      <span class="head-text">
        <span class="kicker">Slop Index</span>
        <span class="head-score">
          <b>{report.score}</b> <span class="tier-chip">{report.tier.label}</span>
          {#if view.isAd}<span class="ad-chip" title="Ads can be shamed, not destroyed">Ad</span>{/if}
        </span>
      </span>
      <button class="close" aria-label="Close" onclick={close}>×</button>
    </div>
    <p class="blurb">{report.tier.blurb}</p>
    {#if evidence.length}
      <p class="why">Why it reeks</p>
      <ul class="sigs">
        {#each evidence as { s, quote } (s.ruleId)}
          <li class="sig">
            <Sticker class="cat" src={categoryIcon(s.category)} emoji={CATEGORY_META[s.category].emoji} size={28} />
            <span class="sig-label">{s.label}</span>
            <span class="sig-quote">
              {#if quote}<q>{quote}</q>{:else}{CATEGORY_META[s.category].label}{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
    {#if view.rank}
      <div class="rank">
        <Sticker class="crown" src={UI.crown()} emoji="👑" size={20} />
        <span>
          {#if view.rank.rank}
            <b>#{view.rank.rank}</b> in your Hall of Slop · {view.rank.title} ·
            {view.rank.slopPosts} of {view.rank.postsSeen} posts slop
          {:else}
            {view.rank.slopPosts} of {view.rank.postsSeen} posts slop so far. The Hall of Slop needs
            {HALL_MIN_SLOP_POSTS}+, at least half.
          {/if}
        </span>
      </div>
    {/if}
    {#if !view.isAd || view.shameable}
      <div class="panel-actions">
        {#if !view.isAd}
          <button class="act destroy" onclick={actions.destroy} onpointerenter={actions.arm} onfocus={actions.arm}>
            <Sticker class="ico" src={UI.destroy()} emoji="🧨" size={26} />
            <span class="lbl">Destroy</span>
          </button>
        {/if}
        {#if view.shameable}
          <button class="act shame" onclick={actions.shame}>
            <Sticker class="ico" src={UI.shame()} emoji="🔔" size={26} />
            <span class="lbl">Shame</span>
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
