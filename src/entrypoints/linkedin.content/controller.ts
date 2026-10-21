// Feed adapter → engine → per-post UI → store, with lazy scoring.
//
// Memory rules (the feed is infinite): one IntersectionObserver for every
// post, one Svelte component per *visible-ish* post, unmounted and forgotten
// when LinkedIn removes the post. Reports are cached by post id (no DOM refs)
// so re-scrolling never re-scores.

import { flushSync, mount, unmount } from 'svelte';
import { analyzePost } from '../../lib/engine';
import { TIERS } from '../../lib/engine/tiers';
import type { SlopReport, SlopTierId } from '../../lib/engine/types';
import { watchFeed } from '../../lib/linkedin';
import type { FeedPost, FeedWatcher, ProfilePage } from '../../lib/linkedin/types';
import { disposeStoreClient, flushSightings, getAuthor, reportAction, reportSighting } from '../../lib/store/client';
import { rankTitle } from '../../lib/store/ranking';
import { requestStore } from '../../lib/store/transport';
import type { AuthorRecord } from '../../lib/store/types';
import { SLOP_THRESHOLD } from '../../lib/store/types';
import { today, type DailyDelta, type Settings } from '../../lib/settings';
import { postDailyStats, postDestroyed } from '../../lib/settings/outbox';
import { canTombstone, collapseAway, collapseToTombstone, hideInstantly, hidePost, pinTombstone, restorePost } from '../../lib/fx/collapse';
import { boxOf, erupt, preloadFx } from '../../lib/fx/erupt';
import { disposeLayer } from '../../lib/fx/layer';
import { decorationCount, decoratePost, type Decoration } from '../../lib/ui/post-decoration';
import AuthorTag from '../../lib/ui/AuthorTag.svelte';
import PostUI from '../../lib/ui/PostUI.svelte';
import ProfileSummary from '../../lib/ui/ProfileSummary.svelte';
import { AuthorTally } from '../../lib/ui/author-tally';
import { createPostView, createSummaryView, createTagView, type PostActions, type PostMode, type PostView, type SummaryView, type TagView } from '../../lib/ui/post-view.svelte';
import { detectTheme, getTheme, postSheets, setTheme, summarySheets } from '../../lib/ui/sheets';
import { attachUiShadow } from '../../lib/ui/shadow';
import { openShame, closeShame } from '../../lib/ui/shame-modal';
import { showUndoToast } from '../../lib/ui/toast';
import { HostFitter, type FitHost } from './host-fitting';

const UNDO_MS = 5000;
const REPORT_CACHE_MAX = 3000;
const DAILY_POST_CAP = 3000;
const DESTROYED_CAP = 2000;
/** How often the Hall of Slop (who gets a "Certified Slopper" tag) is re-read. */
const HALL_TTL_MS = 30_000;
/** The profile summary re-reads the store at most this often while their posts are being scored. */
const ALL_TIME_REFRESH_MS = 3000;
const CHIP_FITS = ['full', 'score', 'icon'] as const;
const TAG_FITS = ['full', 'short', 'icon'] as const;
const tierRank = (id: SlopTierId) => TIERS.findIndex((t) => t.id === id);
/** Attention scales with slop: how many times the avatar ring calls out when first seen. */
const RING_PULSES: Partial<Record<SlopTierId, number>> = { swamp: 1, slopocalypse: 2 };

type EntryState = 'pending' | 'shown' | 'destroying' | 'destroyed';

interface Entry {
  id: string;
  post: FeedPost;
  sig: string;
  metadataSig: string;
  shadow: ShadowRoot | null;
  near?: boolean;
  queued?: boolean;
  /** Keep a live post's correction baseline even if its ID leaves the daily LRU. */
  dailyClass?: { day: string; slop: boolean };
  view: PostView | null;
  actions?: PostActions;
  app: Record<string, unknown> | null;
  state: EntryState;
  timer?: number;
  dismissToast?: () => void;
  /** The destroy was confirmed (undo window closed) and recorded. */
  recorded?: boolean;
  /** Drip Edge along the card's top edge, ring and monster on the author's photo, drawn from inside the card. */
  decoration?: Decoration;
  /** The "Certified Slopper" tag, when the author is in the Hall of Slop. */
  tag?: { host: HTMLElement; shadow: ShadowRoot; app: Record<string, unknown>; view: TagView } | null;
  /** Elements waiting to be seen once (chip wobble, ring pulse). */
  watching?: Element[];
}

interface HallEntry {
  rank: number;
  record: AuthorRecord;
}

/** The open activity page's summary: a live tally of the owner's own posts, drawn in the adapter's host. */
interface ProfileState {
  page: ProfilePage;
  tally: AuthorTally;
  view: SummaryView;
  app: Record<string, unknown> | null;
  /** The id the store knows them by: from their own posts' links once seen, else the address bar. */
  authorId: string;
  frame: number;
  allTimeTimer?: number;
}

const visible = (el: Element) => (typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0);

/**
 * Ad blockers hide posts with cosmetic CSS, often on a wrapper inside the
 * card, which would leave our mount as an orphan row. The post counts as
 * visible only if the card shows and something other than our mount in it
 * takes up real space.
 */
function contentVisible(post: FeedPost): boolean {
  const { root, mount } = post;
  if (!root.isConnected) return false;
  // LinkedIn's post wrapper is often display:contents (no box): measure its real box.
  const box = boxOf(root);
  if (!visible(box) || (mount.parentElement && !visible(mount.parentElement))) return false;
  return box.getBoundingClientRect().height - mount.getBoundingClientRect().height > 40;
}

function signature(post: FeedPost): string {
  const t = post.input.text;
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return `${t.length}:${(h >>> 0).toString(36)}:${JSON.stringify([post.input.isAd, post.input.isBareRepost, post.input.hasMedia, post.input.hasPoll, post.input.hashtags])}`;
}

function metadataSignature(post: FeedPost): string {
  const a = post.author;
  return JSON.stringify([post.sourceId, a?.id, a?.name, a?.headline, a?.avatarUrl, a?.profileUrl, a?.kind]);
}

/** Unidentified bare reposts must never become extra samples for the original author. */
function storeId(post: FeedPost): string | null {
  return post.input.isBareRepost && !post.sourceId ? null : post.sourceId ?? post.id;
}

export class FeedController {
  private settings: Settings;
  private watcher: FeedWatcher | null = null;
  private io: IntersectionObserver | null = null;
  private readonly entries = new Map<string, Entry>();
  private readonly byRoot = new Map<Element, string>();
  private readonly reports = new Map<string, { sig: string; report: SlopReport }>();
  private readonly destroyed: Set<string>;
  private readonly counted = new Map<string, boolean>();
  private countedDay = today();
  private readonly fitter = new HostFitter();
  private queue: string[] = [];
  private idle = 0;
  private daily: DailyDelta = {};
  private dailyTimer: number | undefined;
  private themeCheckedAt = 0;
  private resizeFrame = 0;
  /** One observer for "seen for the first time" moments: the louder the slop, the more it moves. */
  private seenIo: IntersectionObserver | null = null;
  private readonly onSeen = new WeakMap<Element, () => void>();
  private hall = new Map<string, HallEntry>();
  private hallAt = 0;
  private hallLoading: Promise<void> | null = null;
  private profile: ProfileState | null = null;
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly schemeMedia = matchMedia('(prefers-color-scheme: dark)');

  constructor(settings: Settings, persistedDestroyed: Set<string>) {
    this.settings = settings;
    this.destroyed = new Set([...persistedDestroyed].slice(-DESTROYED_CAP));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  start(): void {
    if (this.watcher) return;
    this.checkTheme(true);
    this.schemeMedia.addEventListener('change', this.onScheme);
    this.io = new IntersectionObserver((records) => this.onIntersect(records), { rootMargin: '900px 0px 900px 0px' });
    this.seenIo = new IntersectionObserver((records) => this.onSeenRecords(records), { threshold: 0.9 });
    this.watcher = watchFeed({ onPost: (p) => this.onPost(p), onRemove: (id) => this.onRemove(id), onProfile: (p) => this.onProfile(p) });
    window.addEventListener('resize', this.onResize);
  }

  stop(): void {
    this.watcher?.disconnect();
    this.watcher = null;
    this.dropProfile();
    window.removeEventListener('resize', this.onResize);
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    for (const id of [...this.entries.keys()]) this.teardown(id, true);
    this.io?.disconnect();
    this.io = null;
    this.seenIo?.disconnect();
    this.seenIo = null;
    if (this.idle) cancelIdleCallback(this.idle);
    this.idle = 0;
    this.queue = [];
    this.schemeMedia.removeEventListener('change', this.onScheme);
    closeShame();
    disposeLayer();
    this.flushDaily();
    disposeStoreClient();
  }

  updateSettings(next: Settings): void {
    const wasEnabled = this.settings.enabled;
    this.settings = next;
    if (!next.enabled) {
      if (wasEnabled) this.stop();
      return;
    }
    if (!wasEnabled || !this.watcher) {
      this.start();
      return;
    }
    if (this.profile) this.profile.view.reduceMotion = this.reduceMotion;
    for (const e of this.entries.values()) {
      if (!e.view) continue;
      e.view.reduceMotion = this.reduceMotion;
      if (e.state === 'shown' && e.view.report) {
        e.view.mode = this.modeFor(e.view.report);
        flushSync();
        this.decorate(e);
      }
    }
  }

  private get reduceMotion(): boolean {
    return this.settings.reduceMotion || this.media.matches;
  }

  private onScheme = () => this.checkTheme(true);

  private checkTheme(force = false): void {
    const now = performance.now();
    if (!force && now - this.themeCheckedAt < 2000) return;
    this.themeCheckedAt = now;
    const next = detectTheme();
    const changed = next !== getTheme();
    setTheme(next);
    if (changed) {
      this.fitter.invalidate();
      this.onResize();
    }
  }

  /** For tests: counts of live objects (proves nothing leaks). */
  debugCounts() {
    let mounted = 0;
    for (const e of this.entries.values()) if (e.app) mounted++;
    let tags = 0;
    for (const e of this.entries.values()) if (e.tag) tags++;
    return {
      entries: this.entries.size, mounted, tags, decorations: decorationCount(), observedRoots: this.byRoot.size, reports: this.reports.size, queue: this.queue.length,
      profiles: this.profile ? 1 : 0, profilePosts: this.profile?.tally.size ?? 0,
    };
  }

  // ── Feed events ──────────────────────────────────────────────────────────

  private onPost(post: FeedPost): void {
    let e = this.entries.get(post.id);
    if (e && (e.post.root !== post.root || e.post.mount !== post.mount)) {
      this.teardown(post.id, true);
      e = undefined;
    }
    if (this.destroyed.has(post.id)) {
      if (!e || e.state === 'pending' || e.state === 'shown') {
        if (e) this.teardown(post.id, false);
        // Remember the entry so onRemove can clean up; no UI, no scoring.
        this.entries.set(post.id, { id: post.id, post, sig: '', metadataSig: '', shadow: null, view: null, app: null, state: 'destroyed', recorded: true });
        hideInstantly(post.root, post.mount);
      }
      return;
    }
    const sig = signature(post);
    const metadataSig = metadataSignature(post);
    if (e) {
      const metadataChanged = e.metadataSig !== metadataSig;
      e.post = post;
      e.metadataSig = metadataSig;
      if (metadataChanged && e.view) e.view.rank = undefined;
      if (e.sig !== sig) {
        e.sig = sig;
        if (e.view && e.state === 'shown') this.score(e, true);
      } else if (metadataChanged && e.state === 'shown' && e.view?.report) {
        this.sight(e, e.view.report);
      }
      // The chip may have moved into the action bar, or the header re-rendered.
      if (e.view && e.state === 'shown') this.decorate(e);
      if (e.state === 'pending' && e.near && !e.queued) this.enqueue(e);
      return;
    }
    e = { id: post.id, post, sig, metadataSig, shadow: null, view: null, app: null, state: 'pending' };
    this.entries.set(post.id, e);
    this.byRoot.set(post.root, post.id);
    this.io?.observe(post.root);
  }

  private onRemove(id: string): void {
    this.teardown(id, true);
  }

  private onIntersect(records: IntersectionObserverEntry[]): void {
    for (const r of records) {
      const id = this.byRoot.get(r.target);
      if (!id) continue;
      const e = this.entries.get(id);
      if (!e) continue;
      e.near = r.isIntersecting;
      if (!e.near) continue;
      if (e.state === 'pending' && !e.queued) this.enqueue(e);
      else if (e.state === 'shown') this.onResize();
    }
  }

  private enqueue(e: Entry): void {
    e.queued = true;
    this.queue.push(e.id);
    if (this.queue.length && !this.idle) this.idle = requestIdleCallback((d) => this.drain(d), { timeout: 120 });
  }

  /** Score + mount in idle time, a few posts per slice. */
  private drain(deadline: IdleDeadline): void {
    this.idle = 0;
    this.checkTheme();
    let n = 0;
    while (this.queue.length && (deadline.timeRemaining() > 2 || (n === 0 && deadline.didTimeout))) {
      const e = this.entries.get(this.queue.shift()!);
      if (e) e.queued = false;
      if (e && e.state === 'pending' && e.post.root.isConnected) this.show(e);
      n++;
    }
    if (this.queue.length) this.idle = requestIdleCallback((d) => this.drain(d), { timeout: 120 });
  }

  private reportFor(e: Entry, fresh = false): SlopReport | null {
    const cached = this.reports.get(e.id);
    if (cached && cached.sig === e.sig && !fresh) return cached.report;
    let report: SlopReport;
    try {
      report = analyzePost(e.post.input);
    } catch {
      return null; // The engine must never break the feed.
    }
    this.reports.delete(e.id);
    this.reports.set(e.id, { sig: e.sig, report });
    if (this.reports.size > REPORT_CACHE_MAX) this.reports.delete(this.reports.keys().next().value!);
    return report;
  }

  private modeFor(report: SlopReport): PostMode {
    // Absence of evidence is not evidence of absence: below the threshold we
    // say nothing at all rather than vouch for the post.
    return tierRank(report.tier.id) >= tierRank(this.settings.minTier) ? 'badge' : 'none';
  }

  private show(e: Entry): void {
    // An ad blocker (or LinkedIn) hid the post: never draw a stray row on it.
    if (!contentVisible(e.post)) return;
    // No author means a LinkedIn module (jobs, suggestions), not someone's post.
    if (!e.post.author) return;
    const report = this.reportFor(e);
    if (!report) return;
    e.state = 'shown';
    this.sight(e, report);
    const view = createPostView({
      report,
      mode: this.modeFor(report),
      isAd: !!e.post.input.isAd,
      shameable: report.shameable,
      reduceMotion: this.reduceMotion,
      undoMs: UNDO_MS,
    });
    e.view = view;
    const actions: PostActions = {
      destroy: (ev: MouseEvent) => this.destroy(e.id, ev),
      shame: (ev: MouseEvent) => void this.shame(e.id, ev),
      undo: () => this.undo(e.id),
      expand: (open: boolean) => open && this.opened(e),
      arm: () => preloadFx(),
    };
    e.actions = actions;
    const target = e.post.mount;
    const shadow = attachUiShadow(target);
    e.shadow = shadow;
    shadow.replaceChildren();
    shadow.adoptedStyleSheets = postSheets();
    e.app = mount(PostUI, { target: shadow, props: { view, actions } });
    flushSync();
    this.decorate(e);
    this.refreshHall();
  }

  /** One panel open at a time, feed-wide; opening it is a good moment to load the rank. */
  private opened(e: Entry): void {
    for (const other of this.entries.values()) if (other !== e && other.view) other.view.expanded = false;
    void this.loadRank(e.id);
  }

  /** Everything around the chip that follows its state: fit, card decoration, Slopper tag. */
  private decorate(e: Entry): void {
    this.applyDecoration(e);
    this.watchAttention(e);
    this.applyTag(e);
    if (e.near) this.fitter.fit(this.fitHosts(e));
  }

  private fitHosts(e: Entry): FitHost[] {
    const hosts: FitHost[] = [];
    if (e.shadow && e.view?.mode === 'badge') hosts.push({ host: e.post.mount, shadow: e.shadow, fits: CHIP_FITS });
    if (e.tag) hosts.push({ host: e.tag.host, shadow: e.tag.shadow, fits: TAG_FITS });
    return hosts;
  }

  /** The tier's Drip Edge along the card's top edge, ring and monster on the author's photo, on posts that get a badge. */
  private applyDecoration(e: Entry): void {
    const badged = e.state === 'shown' && e.view?.mode === 'badge' && !!e.view.report;
    const host = e.post.decorationHost;
    if (!badged || !e.view || !e.actions || !host) {
      e.decoration?.dispose();
      e.decoration = undefined;
      return;
    }
    if (e.decoration) e.decoration.update();
    else e.decoration = decoratePost({
      view: e.view,
      actions: e.actions,
      host: () => e.post.decorationHost?.() ?? null,
      card: () => e.post.cardFrame?.() ?? boxOf(e.post.root),
      avatar: () => e.post.avatarFrame(),
    });
  }

  /**
   * The one-time "look here" moments, when each part first comes into view
   * (not when it mounts, 900px off-screen): the chip's icon wobbles, the
   * avatar ring pulses. Louder tiers move more; Certified Slop stays still.
   */
  private watchAttention(e: Entry): void {
    const report = e.view?.report;
    if (e.watching || e.view?.mode !== 'badge' || !report) return;
    e.watching = [];
    const chip = e.shadow?.querySelector('.toggle');
    if (chip) this.whenSeen(e, chip, () => e.post.mount.setAttribute('data-seen', ''));
    const pulses = this.reduceMotion ? 0 : RING_PULSES[report.tier.id] ?? 0;
    const frame = e.post.avatarFrame();
    if (frame && pulses) this.whenSeen(e, frame, () => e.decoration?.pulse(pulses));
  }

  private whenSeen(e: Entry, el: Element, run: () => void): void {
    if (!this.seenIo) return;
    this.onSeen.set(el, run);
    e.watching?.push(el);
    this.seenIo.observe(el);
  }

  private onSeenRecords(records: IntersectionObserverEntry[]): void {
    for (const r of records) {
      if (!r.isIntersecting) continue;
      this.seenIo?.unobserve(r.target);
      const run = this.onSeen.get(r.target);
      this.onSeen.delete(r.target);
      run?.();
    }
  }

  /** "Certified Slopper" by the name of anyone in your Hall of Slop, on any of their posts. */
  private applyTag(e: Entry): void {
    const author = e.post.author;
    const member = e.state === 'shown' && author ? this.hall.get(author.id) : undefined;
    const host = member ? e.post.tagHost() : null;
    if (e.tag && e.tag.host !== host) this.dropTag(e);
    if (!member || !host) return;
    const info = { rank: member.rank, title: rankTitle(member.record.slopPoints), slopPosts: member.record.slopPosts, postsSeen: member.record.postsSeen };
    if (e.tag) {
      Object.assign(e.tag.view, info);
      return;
    }
    const shadow = attachUiShadow(host);
    shadow.replaceChildren();
    shadow.adoptedStyleSheets = postSheets();
    const view = createTagView(info);
    this.fitter.invalidate(host);
    e.tag = { host, shadow, view, app: mount(AuthorTag, { target: shadow, props: { tag: view } }) };
    flushSync();
  }

  private dropTag(e: Entry): void {
    if (!e.tag) return;
    try { unmount(e.tag.app); } catch { /* already gone */ }
    this.fitter.invalidate(e.tag.host);
    e.tag.host.removeAttribute('data-fit');
    e.tag = null;
  }

  /** Re-read the Hall of Slop (at most every HALL_TTL_MS) and retag shown posts. */
  private refreshHall(force = false): Promise<void> {
    if (this.hallLoading) return this.hallLoading;
    if (!force && Date.now() - this.hallAt < HALL_TTL_MS) return Promise.resolve();
    this.hallAt = Date.now();
    this.hallLoading = requestStore<AuthorRecord[]>({ type: 'store/leaderboard', limit: 100 })
      .then((rows) => {
        this.hall = new Map((rows ?? []).map((record, i) => [record.id, { rank: i + 1, record }]));
        const hosts: FitHost[] = [];
        for (const e of this.entries.values()) if (e.state === 'shown') {
          this.applyTag(e);
          if (e.near) hosts.push(...this.fitHosts(e));
        }
        this.fitter.fit(hosts);
      })
      .catch(() => { /* the Hall is optional: no tags this round */ })
      .finally(() => { this.hallLoading = null; });
    return this.hallLoading;
  }

  private readonly onResize = () => {
    if (this.resizeFrame) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      const hosts: FitHost[] = [];
      for (const e of this.entries.values()) if (e.state === 'shown' && e.near) hosts.push(...this.fitHosts(e));
      this.fitter.fit(hosts);
    });
  };

  private score(e: Entry, fresh: boolean): void {
    const report = this.reportFor(e, fresh);
    if (!report || !e.view) return;
    e.view.report = report;
    e.view.shameable = report.shameable;
    e.view.isAd = !!e.post.input.isAd;
    e.view.mode = this.modeFor(report);
    this.fitter.invalidate(e.post.mount);
    flushSync();
    this.decorate(e);
    this.sight(e, report);
  }

  private sight(e: Entry, report: SlopReport): void {
    this.tally(e, report);
    this.rollDay();
    const slop = report.score >= SLOP_THRESHOLD;
    const previous = e.dailyClass?.day === this.countedDay ? e.dailyClass.slop : this.counted.get(e.id);
    if (previous === undefined) this.bumpDaily({ scanned: 1, slop: slop ? 1 : 0 });
    else if (previous !== slop) this.bumpDaily({ slop: slop ? 1 : -1 });
    this.counted.delete(e.id);
    this.counted.set(e.id, slop);
    e.dailyClass = { day: this.countedDay, slop };
    if (this.counted.size > DAILY_POST_CAP) this.counted.delete(this.counted.keys().next().value!);
    const author = e.post.author;
    const postId = storeId(e.post);
    if (!author || !postId) return;
    try {
      reportSighting({
        postId,
        author,
        score: report.score,
        tierId: report.tier.id,
        topCategory: report.topCategory,
        snippet: e.post.input.text.slice(0, 200),
        seenAt: Date.now(),
      });
    } catch { /* store unavailable: scoring still works */ }
  }

  // ── Profile summary (activity pages) ─────────────────────────────────────

  /** An activity page opened (mount its summary) or closed (drop it and every reference). */
  private onProfile(page: ProfilePage | null): void {
    if (page && this.profile?.page === page) return;
    this.dropProfile();
    if (!page) return;
    const view = createSummaryView({ reduceMotion: this.reduceMotion });
    const shadow = attachUiShadow(page.summaryHost);
    shadow.replaceChildren();
    shadow.adoptedStyleSheets = summarySheets();
    const p: ProfileState = { page, tally: new AuthorTally(), view, app: null, authorId: page.ownerId, frame: 0 };
    this.profile = p;
    p.app = mount(ProfileSummary, { target: shadow, props: { view } });
    // Their posts already scored on this page (the card can render after them) still count.
    for (const e of this.entries.values()) if (e.state !== 'pending' && e.view?.report) this.tally(e, e.view.report);
    this.paintProfile(p);
    void this.loadAllTime(p);
  }

  /** Count a scored post on the open profile when its owner wrote it. Painted once per frame. */
  private tally(e: Entry, report: SlopReport): void {
    const p = this.profile;
    const author = e.post.author;
    if (!p || !author || !p.page.owns(author)) return;
    p.authorId = author.id;
    p.view.name ??= author.name;
    if (!p.tally.set(e.id, report) || p.frame) return;
    p.frame = requestAnimationFrame(() => {
      p.frame = 0;
      if (this.profile !== p) return;
      this.paintProfile(p);
      this.queueAllTime(p);
    });
  }

  private paintProfile(p: ProfileState): void {
    p.view.stats = p.tally.stats();
  }

  /** Trailing refresh of the stored record while their posts are being scored. */
  private queueAllTime(p: ProfileState): void {
    if (p.allTimeTimer !== undefined) return;
    p.allTimeTimer = window.setTimeout(() => {
      p.allTimeTimer = undefined;
      void this.loadAllTime(p);
    }, ALL_TIME_REFRESH_MS);
  }

  private async loadAllTime(p: ProfileState): Promise<void> {
    try {
      await flushSightings();
      const record = await getAuthor(p.authorId);
      if (this.profile !== p) return;
      p.view.allTime = record && record.postsSeen > 0
        ? { postsSeen: record.postsSeen, slopPosts: record.slopPosts, rank: this.hall.get(record.id)?.rank ?? null }
        : null;
    } catch {
      if (this.profile === p) p.view.allTime = null; // The store is optional; the live tally still works.
    }
  }

  private dropProfile(): void {
    const p = this.profile;
    if (!p) return;
    this.profile = null;
    if (p.frame) cancelAnimationFrame(p.frame);
    window.clearTimeout(p.allTimeTimer);
    if (p.app) {
      try { unmount(p.app); } catch { /* already gone */ }
    }
    p.app = null;
  }

  /** Unmount the UI and drop every reference to the post's DOM. */
  private teardown(id: string, restore: boolean): void {
    const e = this.entries.get(id);
    if (!e) return;
    window.clearTimeout(e.timer);
    e.dismissToast?.();
    if (e.state === 'destroying' && !e.recorded) this.recordDestroy(e);
    if (e.app) {
      try { unmount(e.app); } catch { /* already gone */ }
    }
    e.app = null;
    e.decoration?.dispose();
    e.decoration = undefined;
    e.view = null;
    e.shadow = null;
    this.fitter.invalidate(e.post.mount);
    this.dropTag(e);
    e.actions = undefined;
    for (const el of e.watching ?? []) {
      this.seenIo?.unobserve(el);
      this.onSeen.delete(el);
    }
    e.watching = undefined;
    this.io?.unobserve(e.post.root);
    this.byRoot.delete(e.post.root);
    // LinkedIn may recycle the card element for another post: never leave it hidden.
    if (restore && e.post.root.isConnected) restorePost(e.post.root);
    this.entries.delete(id);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  private destroy(id: string, ev: MouseEvent): void {
    if (!ev.isTrusted) return;
    const e = this.entries.get(id);
    if (!e || e.state !== 'shown' || !e.view?.report || e.post.input.isAd) return;
    e.decoration?.dispose();
    e.decoration = undefined;
    const { root, mount: host } = e.post;
    const button = ev.currentTarget instanceof Element ? ev.currentTarget.getBoundingClientRect() : null;
    const origin = ev.clientX || ev.clientY
      ? { x: ev.clientX, y: ev.clientY }
      : { x: button ? button.left + button.width / 2 : innerWidth / 2, y: button ? button.top + button.height / 2 : innerHeight / 2 };
    const reduce = this.reduceMotion;
    // A chip inside a LinkedIn row (the action bar) can't become a tombstone
    // there: collapse the post and offer undo in a toast.
    const inPlace = !host.hasAttribute('data-slot') && canTombstone(root, host);
    e.state = 'destroying';
    e.recorded = false;
    e.view.expanded = false;
    this.destroyed.delete(id);
    this.destroyed.add(id);
    if (this.destroyed.size > DESTROYED_CAP) this.destroyed.delete(this.destroyed.values().next().value!);

    void erupt(root, {
      origin,
      power: 0.35 + 0.65 * (e.view.report.score / 100),
      reduceMotion: reduce,
      sound: this.settings.sound,
      onCollapse: () => {
        if (e.state !== 'destroying' || !e.view) return;
        if (inPlace) {
          void collapseToTombstone(root, host, reduce ? 0 : 340).then(() => {
            if (e.state !== 'destroying' || !e.view) return;
            e.view.mode = 'tomb';
            flushSync();
            pinTombstone(root, host);
          });
        } else {
          void collapseAway(root, host, reduce ? 0 : 320);
          e.dismissToast = showUndoToast('Slop destroyed.', UNDO_MS, () => this.undo(id));
        }
      },
    });
    hidePost(root, host, reduce); // Same frame as the shards appear: no flicker.
    e.timer = window.setTimeout(() => this.finalizeDestroy(id), UNDO_MS + (reduce ? 250 : 500));
  }

  private finalizeDestroy(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.state !== 'destroying') return;
    e.dismissToast?.();
    e.dismissToast = undefined;
    this.recordDestroy(e);
    e.state = 'destroyed';
    void collapseAway(e.post.root, e.post.mount, this.reduceMotion ? 0 : 280).then(() => {
      if (e.view) e.view.mode = 'none';
    });
  }

  private recordDestroy(e: Entry): void {
    e.recorded = true;
    this.bumpDaily({ destroyed: 1 });
    if (this.settings.rememberDestroyed) void postDestroyed(e.id);
    const postId = storeId(e.post);
    if (e.post.author && postId) void reportAction(postId, e.post.author.id, 'destroyed').catch(() => {});
  }

  private undo(id: string): void {
    const e = this.entries.get(id);
    if (!e || e.state !== 'destroying') return;
    window.clearTimeout(e.timer);
    e.dismissToast?.();
    e.dismissToast = undefined;
    this.destroyed.delete(id);
    restorePost(e.post.root);
    e.state = 'shown';
    if (e.view?.report) e.view.mode = this.modeFor(e.view.report);
    flushSync();
    this.decorate(e);
  }

  private async shame(id: string, ev: MouseEvent): Promise<void> {
    if (!ev.isTrusted) return;
    const e = this.entries.get(id);
    const report = e?.view?.report;
    if (!e || !report || !e.view?.shameable) return;
    const opener = ev.currentTarget instanceof HTMLElement ? ev.currentTarget : null;
    // The panel lives in the top layer: left open, it would sit on top of the modal.
    e.view.expanded = false;
    const author = e.post.author;
    const postId = storeId(e.post);
    let record: AuthorRecord | null = null;
    if (author) {
      try {
        await flushSightings();
        record = await getAuthor(author.id);
      } catch { /* the Hall of Slop is optional for a roast */ }
    }
    if (this.entries.get(id) !== e || e.state !== 'shown') return;
    openShame({
      postId: id,
      report,
      author,
      slopCount: Math.max(1, record?.slopPosts ?? 1),
      reduceMotion: this.reduceMotion,
      opener,
      onShamed: () => {
        this.bumpDaily({ shamed: 1 });
        if (author && postId) void reportAction(postId, author.id, 'shamed').catch(() => {});
      },
    });
  }

  private async loadRank(id: string): Promise<void> {
    preloadFx();
    const e = this.entries.get(id);
    const author = e?.post.author;
    if (!e?.view || !author || e.view.rank !== undefined) return;
    try {
      await flushSightings();
      const [record] = await Promise.all([getAuthor(author.id), this.refreshHall(true)]);
      if (!e.view || e.post.author?.id !== author.id) return;
      if (!record || record.slopPosts < 1) {
        e.view.rank = null;
        return;
      }
      e.view.rank = {
        rank: this.hall.get(author.id)?.rank ?? null,
        title: rankTitle(record.slopPoints),
        slopPosts: record.slopPosts,
        postsSeen: record.postsSeen,
        points: record.slopPoints,
      };
    } catch {
      // Not loaded, rather than "no record": the next open tries again.
    }
  }

  // ── Today's counters ─────────────────────────────────────────────────────

  private bumpDaily(delta: DailyDelta): void {
    this.rollDay();
    for (const [k, v] of Object.entries(delta) as [keyof DailyDelta, number][]) this.daily[k] = (this.daily[k] ?? 0) + v;
    if (this.dailyTimer === undefined) this.dailyTimer = window.setTimeout(() => this.flushDaily(), 3000);
  }

  private flushDaily(): void {
    this.rollDay();
    window.clearTimeout(this.dailyTimer);
    this.dailyTimer = undefined;
    const delta = this.daily;
    this.daily = {};
    if (Object.values(delta).some(Boolean)) void postDailyStats(delta);
  }

  private rollDay(): void {
    const day = today();
    if (day === this.countedDay) return;
    this.countedDay = day;
    this.counted.clear();
    // The settings API writes today's counters; don't apply yesterday's last
    // unflushed seconds to the new day after a suspended tab wakes up.
    window.clearTimeout(this.dailyTimer);
    this.dailyTimer = undefined;
    this.daily = {};
  }
}
