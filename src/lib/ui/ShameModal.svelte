<script lang="ts">
  // The shame modal: slams in, stamps SHAMED, offers re-roll / copy / download.
  // Anything that leaves the extension is anonymized unless the user opts in,
  // every single time (the toggle always starts off).
  import { onMount } from 'svelte';
  import ShameCard from './ShameCard.svelte';
  import Sticker from './Sticker.svelte';
  import { SHAME_ART, UI, loadImage } from './assets';
  import { renderCardImage } from './card-image';
  import { cardFacts } from '../shame/card';
  import { formatById, generateShame, renderShame, shameToText, type ShameSubject } from '../shame/generate';
  import type { SlopReport } from '../engine/types';
  import type { PostAuthor } from '../linkedin/types';

  let {
    postId,
    report,
    author,
    slopCount,
    reduceMotion,
    onClose,
  }: {
    postId: string;
    report: SlopReport;
    author: PostAuthor | null;
    slopCount: number;
    reduceMotion: boolean;
    onClose: () => void;
  } = $props();

  // Props never change for one open modal; capture them once.
  const subject: ShameSubject = (() => ({ report, author, slopCount }))();
  let shame = $state(generateShame(subject));
  let roll = $state(0);
  let includeName = $state(false);
  let status = $state('');
  let busy = $state(false);
  let frameOk = $state(false);
  let stampOk = $state(true);
  let root: HTMLDivElement;
  let dialog: HTMLDivElement;
  let statusTimer: number | undefined;

  const facts = $derived(cardFacts(report, author, postId));

  function flash(text: string) {
    status = text;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => (status = ''), 2200);
  }

  function again() {
    shame = generateShame(subject);
    roll++;
  }

  /** The version that leaves the extension. */
  function shared() {
    const format = formatById(shame.formatId);
    const text = includeName || !format ? shame : renderShame(format, subject, { anonymize: true });
    return { shame: text, facts: cardFacts(report, author, postId, { anonymize: !includeName }) };
  }

  async function copy() {
    const text = shameToText(shared().shame, report);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      root.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    flash(includeName ? 'Copied, with their name.' : 'Copied (initials only).');
  }

  async function download() {
    if (busy) return;
    busy = true;
    try {
      const s = shared();
      const blob = await renderCardImage({ shame: s.shame, facts: s.facts, report, avatarUrl: author?.avatarUrl, anonymize: !includeName });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slop-shame-${shame.layout}-${report.score}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      flash('Saved. Use it wisely.');
    } catch {
      flash('Could not render the image.');
    } finally {
      busy = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    e.stopPropagation(); // LinkedIn's shortcuts must not fire under the modal.
    if (e.key === 'Tab') {
      const items = [...dialog.querySelectorAll<HTMLElement>('button, input')];
      const first = items[0];
      const last = items[items.length - 1];
      const active = (root.getRootNode() as ShadowRoot).activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  onMount(() => {
    void loadImage(SHAME_ART.wantedFrame()).then((img) => (frameOk = !!img));
    dialog.focus({ preventScroll: true });
    // Escape closes wherever focus is (it may have left the shadow root).
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', esc, true);
    // Wheel over the backdrop must not scroll LinkedIn underneath.
    const block = (e: WheelEvent) => {
      if (!dialog.contains(e.target as Node)) e.preventDefault();
    };
    root.addEventListener('wheel', block, { passive: false });
    return () => {
      window.removeEventListener('keydown', esc, true);
      root.removeEventListener('wheel', block);
      window.clearTimeout(statusTimer);
    };
  });
</script>

<div
  class="ss-modal"
  class:rm={reduceMotion}
  bind:this={root}
  role="presentation"
  onkeydown={onKey}
  onkeyup={(e) => e.stopPropagation()}
  onclick={(e) => e.stopPropagation()}
>
  <button class="backdrop" aria-label="Close" tabindex="-1" onclick={onClose}></button>
  <div class="dialog" bind:this={dialog} role="dialog" aria-modal="true" aria-label="Slop Shame: {shame.title}" tabindex="-1">
    {#key roll}
      <div class="card-wrap" data-layout={shame.layout}>
        <ShameCard {shame} {facts} {report} avatarUrl={author?.avatarUrl} {frameOk} />
        {#if stampOk}
          <img class="stamp" src={SHAME_ART.stamp()} alt="" draggable="false" onerror={() => (stampOk = false)} />
        {:else}
          <span class="stamp text-stamp" aria-hidden="true">Shamed</span>
        {/if}
      </div>
    {/key}

    <div class="toolbar">
      <button class="tool primary" onclick={again}>
        <Sticker class="tool-ico" src={UI.shame()} emoji="🔔" size={26} />Shame again
      </button>
      <button class="tool" onclick={copy}>Copy text</button>
      <button class="tool" onclick={download} disabled={busy}>{busy ? 'Rendering…' : 'Download image'}</button>
      <button class="tool close" onclick={onClose} aria-label="Close">Close</button>
    </div>
    <label class="share">
      <input type="checkbox" bind:checked={includeName} />
      <span class="switch" aria-hidden="true"></span>
      <span>
        Include their name when sharing
        <small>{includeName ? 'Copies and downloads will show their full name and photo.' : 'Copies and downloads show initials and a pixelated photo.'}</small>
      </span>
    </label>
    <p class="status" role="status" aria-live="polite">{status}</p>
  </div>
</div>
