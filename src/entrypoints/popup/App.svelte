<script lang="ts">
  import { onMount } from 'svelte';
  import { TIERS } from '../../lib/engine/tiers';
  import type { SlopTierId } from '../../lib/engine/types';
  import { getDailyStats, saveSettings, settings, watchDailyStats, type DailyStats } from '../../lib/settings';
  import { getLeaderboard, subscribe } from '../../lib/store/read';
  import { HALL_MIN_SLOP_POSTS, rankTitle } from '../../lib/store/ranking';
  import type { AuthorRecord } from '../../lib/store/types';

  let today = $state<DailyStats | null>(null);
  let top = $state<AuthorRecord[]>([]);

  const slopPct = $derived(today && today.scanned ? Math.round((100 * today.slop) / today.scanned) : 0);

  async function loadTop() {
    try {
      top = await getLeaderboard(3);
    } catch {
      top = [];
    }
  }

  onMount(() => {
    void getDailyStats().then((s) => (today = s));
    void loadTop();
    const unwatch = watchDailyStats((s) => (today = s));
    const unsub = subscribe(() => void loadTop());
    return () => {
      unwatch();
      unsub();
    };
  });

  const set = (patch: Parameters<typeof saveSettings>[0]) => void saveSettings(patch);
</script>

<main>
  <header>
    <img src="/assets/mascot/sloppy.webp" alt="" width="44" height="44" />
    <h1>Slop Shame</h1>
    <label class="switch">
      <input type="checkbox" checked={$settings.enabled} onchange={(e) => set({ enabled: e.currentTarget.checked })} />
      <span>{$settings.enabled ? 'On' : 'Off'}</span>
    </label>
  </header>

  <section class="stats" aria-label="Today">
    <div><b>{today?.scanned ?? 0}</b><span>scanned</span></div>
    <div><b>{slopPct}%</b><span>slop</span></div>
    <div><b>{today?.destroyed ?? 0}</b><span>destroyed</span></div>
    <div><b>{today?.shamed ?? 0}</b><span>shamed</span></div>
  </section>

  <section>
    <h2>Badge from</h2>
    <div class="tiers" role="radiogroup" aria-label="Minimum tier for a badge">
      {#each TIERS.filter((t) => t.min >= 40) as tier (tier.id)}
        <button
          role="radio"
          aria-checked={$settings.minTier === tier.id}
          title={tier.label}
          onclick={() => set({ minTier: tier.id as SlopTierId })}
        >
          <img src="/assets/tiers/{tier.id}.webp" alt={tier.label} width="34" height="34" />
        </button>
      {/each}
    </div>
    <label class="row"><input type="checkbox" checked={$settings.sound} onchange={(e) => set({ sound: e.currentTarget.checked })} /> KA-SLOP sound</label>
    <label class="row"><input type="checkbox" checked={$settings.reduceMotion} onchange={(e) => set({ reduceMotion: e.currentTarget.checked })} /> Reduce motion</label>
    <label class="row"><input type="checkbox" checked={$settings.rememberDestroyed} onchange={(e) => set({ rememberDestroyed: e.currentTarget.checked })} /> Keep destroyed posts hidden</label>
  </section>

  <section>
    <h2>Top sloppers</h2>
    {#if top.length}
      <ol class="top">
        {#each top as a, i (a.id)}
          <li>
            <span class="pos">{i === 0 ? '👑' : `#${i + 1}`}</span>
            <span class="who"><b>{a.name}</b><small>{rankTitle(a.slopPoints)} · {a.slopPosts} of {a.postsSeen} posts slop</small></span>
            <span class="pts">{a.slopPoints}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="empty">No sloppers yet. Authors join after {HALL_MIN_SLOP_POSTS} slop posts that are at least half of what you've seen from them.</p>
    {/if}
  </section>
</main>

<style>
  main { width: 330px; padding: 14px; display: grid; gap: 12px; }
  header { display: flex; align-items: center; gap: 8px; }
  h1 { margin: 0; flex: 1; font-size: 19px; font-weight: 900; letter-spacing: -0.01em; }
  h2 { margin: 0 0 6px; font-size: 10.5px; font-weight: 900; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); }
  .switch { display: flex; align-items: center; gap: 6px; font-weight: 800; cursor: pointer; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .stats div { display: grid; justify-items: center; padding: 8px 4px; border: 2px solid var(--navy); border-radius: 12px; background: #fff; box-shadow: 2px 2px 0 var(--navy); }
  .stats b { font-size: 18px; font-weight: 900; }
  .stats span { font-size: 10.5px; color: var(--muted); font-weight: 700; }
  .tiers { display: flex; gap: 4px; margin-bottom: 6px; }
  .tiers button { flex: 1; display: grid; place-items: center; padding: 4px; border: 2px solid transparent; border-radius: 10px; background: #fff; cursor: pointer; }
  .tiers button[aria-checked='true'] { border-color: var(--navy); background: #eef9df; box-shadow: 2px 2px 0 var(--navy); }
  .row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 13px; cursor: pointer; }
  .top { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
  .top li { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; background: #fff; border: 1.5px solid rgba(27, 31, 59, 0.15); }
  .pos { width: 26px; text-align: center; font-weight: 900; }
  .who { flex: 1; display: grid; min-width: 0; }
  .who b, .who small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .who small { color: var(--muted); font-size: 11px; }
  .pts { font-weight: 900; color: var(--slop-deep); }
  .empty { margin: 0; color: var(--muted); font-size: 13px; }
</style>
