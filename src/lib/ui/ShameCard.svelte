<script lang="ts">
  // One shame card, in one of six layouts. Pure presentation.
  import Sticker from './Sticker.svelte';
  import { SHAME_ART, categoryIcon, mascot, type MascotPose } from './assets';
  import { CATEGORY_META } from '../shame/categories';
  import type { CardFacts } from '../shame/card';
  import type { Shame } from '../shame/types';
  import type { SlopReport } from '../engine/types';

  let {
    shame,
    facts,
    report,
    avatarUrl,
    frameOk = false,
  }: { shame: Shame; facts: CardFacts; report: SlopReport; avatarUrl?: string; frameOk?: boolean } = $props();

  const POSE: Record<Shame['layout'], MascotPose> = {
    citation: 'sloppy',
    certificate: 'sloppy-crowned',
    tabloid: 'sloppy-horrified',
    'wanted-poster': 'sloppy',
    'report-card': 'sloppy',
    eulogy: 'sloppy-exploded',
  };

  let avatarFailed = $state(false);
  const showAvatar = $derived(!!avatarUrl && !avatarFailed);
  const cat = $derived(shame.category);

  /** Split the body around the real quote so it can be highlighted. */
  const parts = $derived.by(() => {
    const q = shame.quote;
    if (!q) return [shame.body];
    const i = shame.body.indexOf(q);
    return i < 0 ? [shame.body] : [shame.body.slice(0, i), q, shame.body.slice(i + q.length)];
  });
</script>

{#snippet body(cls: string)}
  <p class={cls}>{#each parts as part, i}{#if i === 1}<mark>{part}</mark>{:else}{part}{/if}{/each}</p>
{/snippet}

{#snippet portrait(cls: string)}
  {#if showAvatar}
    <img class={cls} src={avatarUrl} alt="" referrerpolicy="no-referrer" onerror={() => (avatarFailed = true)} />
  {:else}
    <span class="{cls} placeholder"><Sticker src={mascot('sloppy')} emoji="🫠" size={120} /></span>
  {/if}
{/snippet}

{#snippet catSticker(size: number)}
  {#if cat}<Sticker class="cat-sticker" src={categoryIcon(cat)} emoji={CATEGORY_META[cat].emoji} {size} alt={CATEGORY_META[cat].label} />{/if}
{/snippet}

{#if shame.layout === 'citation'}
  <article class="card citation">
    <header class="cit-head">
      <span class="dept">Department of Slop Enforcement</span>
      <span class="no">No. {facts.ticket}</span>
    </header>
    <div class="cit-kind">Notice of Violation</div>
    <dl class="cit-fields">
      <dt>Offender</dt><dd>{facts.name}</dd>
      {#if facts.headline}<dt>Headline</dt><dd class="muted">{facts.headline}</dd>{/if}
      <dt>Violation</dt><dd class="viol">{@render catSticker(26)}<span>{shame.title}</span></dd>
      <dt>Slop Index</dt><dd><b>{report.score}</b> · {report.tier.label}</dd>
      <dt>Fine</dt><dd class="fine">{facts.fine}</dd>
    </dl>
    {@render body('cit-notes')}
    {#if shame.footer}<p class="cit-foot">{shame.footer}</p>{/if}
    <footer class="cit-bottom">
      <span class="barcode" aria-hidden="true"></span>
      <span class="issued">Issued {facts.date}<br />Officer Sloppy, Badge #404</span>
      <Sticker class="pose" src={mascot(POSE.citation)} emoji="👮" size={74} />
    </footer>
  </article>
{:else if shame.layout === 'certificate'}
  <article class="card certificate">
    <div class="cert-inner">
      <p class="cert-kicker">Department of Slop Enforcement · Official Recognition</p>
      <h2 class="cert-title">{shame.title}</h2>
      <p class="cert-to">presented to <b>{facts.name}</b>{#if facts.headline}<span class="cert-hl">{facts.headline}</span>{/if}</p>
      {@render body('cert-body')}
      <div class="cert-sign">
        <Sticker class="seal" src={SHAME_ART.seal()} emoji="🏅" size={104} />
        <div class="sig"><span class="script">Sloppy</span><span class="line">Chief Slop Officer</span></div>
        <div class="sig"><span class="script date">{facts.date}</span><span class="line">Date of issue</span></div>
        <Sticker class="pose" src={mascot(POSE.certificate)} emoji="👑" size={86} />
      </div>
      {#if shame.footer}<p class="cert-foot">{shame.footer}</p>{/if}
    </div>
  </article>
{:else if shame.layout === 'tabloid'}
  <article class="card tabloid">
    <header class="tab-mast">
      <span class="tab-name">The Daily Slop</span>
      <span class="tab-meta"><span>{facts.date}</span><span>Slop Index {report.score}</span><span>Free with every prompt</span></span>
    </header>
    <div class="tab-flag">Exclusive</div>
    <h2 class="tab-head">{shame.title}</h2>
    <div class="tab-grid">
      <figure class="tab-photo">
        {@render portrait('tab-img')}
        <span class="tab-burst">Shock!</span>
        <figcaption>{facts.name}{#if facts.headline}, “{facts.headline}”{/if}</figcaption>
      </figure>
      <div class="tab-col">
        {@render body('tab-body')}
        <div class="tab-witness">
          <Sticker class="pose" src={mascot(POSE.tabloid)} emoji="😱" size={70} />
          <span>“I just scrolled past it,” said one witness. “I'll never be the same.”</span>
        </div>
      </div>
    </div>
    {#if shame.footer}<footer class="tab-foot">{shame.footer}</footer>{/if}
  </article>
{:else if shame.layout === 'wanted-poster'}
  <article class="card wanted" class:framed={frameOk} style:background-image={frameOk ? `url("${SHAME_ART.wantedFrame()}")` : undefined}>
    {#if !frameOk}<div class="w-top">Wanted</div>{/if}
    <p class="w-for">for</p>
    <h2 class="w-title">{shame.title}</h2>
    <div class="w-photo">{@render portrait('w-img')}</div>
    <p class="w-name">{facts.name}</p>
    {#if facts.headline}<p class="w-alias">a.k.a. “{facts.headline}”</p>{/if}
    {@render body('w-body')}
    {#if shame.footer}<p class="w-reward">{shame.footer}</p>{/if}
  </article>
{:else if shame.layout === 'report-card'}
  <article class="card report">
    <header class="rc-head"><span>Slop Academy</span><span>Report Card · Fall Term</span></header>
    <div class="rc-student">
      <span>Student: <b>{facts.name}</b></span>
      {#if facts.headline}<span class="muted">{facts.headline}</span>{/if}
    </div>
    <h2 class="rc-title">{shame.title}</h2>
    <div class="rc-grid">
      <table class="rc-grades">
        <tbody>
          {#each facts.grades as row (row.category)}
            <tr>
              <td class="rc-ico"><Sticker src={categoryIcon(row.category)} emoji={CATEGORY_META[row.category].emoji} size={24} /></td>
              <td>{row.subject}</td>
              <td class="g" data-g={row.grade[0]}>{row.grade}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="rc-overall">
        <span class="rc-ring" data-g={facts.overall[0]}>{facts.overall}</span>
        <span class="rc-ovl">Slop Index {report.score}</span>
      </div>
    </div>
    <div class="rc-comment">
      <span class="lbl">Teacher’s comments</span>
      {@render body('rc-body')}
    </div>
    <footer class="rc-foot">
      <Sticker class="pose" src={mascot(POSE['report-card'])} emoji="🧑‍🏫" size={60} />
      <span>Mx. Sloppy, Homeroom 4B<br /><span class="muted">Parent/guardian signature: ______________</span></span>
    </footer>
  </article>
{:else}
  <article class="card eulogy">
    <p class="eu-kicker">In Loving Memory of</p>
    <h2 class="eu-title">{shame.title}</h2>
    <p class="eu-dates">A post by {facts.name} · {facts.date} – {facts.date}</p>
    <div class="eu-art">
      <span class="eu-candle" aria-hidden="true">🕯️</span>
      <Sticker class="pose" src={mascot(POSE.eulogy)} emoji="🪦" size={96} />
      <span class="eu-candle" aria-hidden="true">🕯️</span>
    </div>
    {@render body('eu-body')}
    {#if shame.footer}<p class="eu-foot">{shame.footer}</p>{/if}
    <p class="eu-cause">Cause of death: {report.tier.label} (Slop Index {report.score})</p>
  </article>
{/if}
