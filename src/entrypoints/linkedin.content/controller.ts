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
import type { FeedPost, FeedWatcher } from '../../lib/linkedin/types';
import { flushSightings, getAuthor, reportAction, reportSighting } from '../../lib/store/client';
import { rankTitle } from '../../lib/store/ranking';
import { requestStore } from '../../lib/store/transport';
import type { AuthorRecord } from '../../lib/store/types';
import { SLOP_THRESHOLD } from '../../lib/store/types';
import { addDailyStats, rememberDestroyed, type DailyDelta, type Settings } from '../../lib/settings';
import { canTombstone, collapseAway, collapseToTombstone, hideInstantly, hidePost, pinTombstone, restorePost } from '../../lib/fx/collapse';
import { erupt, preloadFx } from '../../lib/fx/erupt';
import { disposeLayer } from '../../lib/fx/layer';
import PostUI from '../../lib/ui/PostUI.svelte';
import { createPostView, type PostMode, type PostView, type RankInfo } from '../../lib/ui/post-view.svelte';
import { detectTheme, postSheets, setTheme } from '../../lib/ui/sheets';
import { openShame, closeShame } from '../../lib/ui/shame-modal';
import { showUndoToast } from '../../lib/ui/toast';

const UNDO_MS = 5000;
const REPORT_CACHE_MAX = 3000;
const tierRank = (id: SlopTierId) => TIERS.findIndex((t) => t.id === id);

type EntryState = 'pending' | 'shown' | 'destroying' | 'destroyed';

interface Entry {
  id: string;
  post: FeedPost;
  sig: string;
  view: PostView | null;
  app: Record<string, unknown> | null;
  state: EntryState;
  timer?: number;
  dismissToast?: () => void;
  /** The destroy was confirmed (undo window closed) and recorded. */
  recorded?: boolean;
}

function signature(post: FeedPost): string {
  const t = post.input.text;
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return `${t.length}:${(h >>> 0).toString(36)}:${post.input.isAd ? 1 : 0}`;
}

export class FeedController {
  private settings: Settings;
  private watcher: FeedWatcher | null = null;
  private io: IntersectionObserver | null = null;
  private readonly entries = new Map<string, Entry>();
  private readonly byRoot = new Map<Element, string>();
  private readonly reports = new Map<string, { sig: string; report: SlopReport }>();
  private readonly destroyed: Set<string>;
  private readonly counted = new Set<string>();
  private queue: string[] = [];
  private idle = 0;
  private daily: DailyDelta = {};
  private dailyTimer: number | undefined;
  private themeCheckedAt = 0;
  private leaderboard: { at: number; ids: string[] } | null = null;
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly schemeMedia = matchMedia('(prefers-color-scheme: dark)');

  constructor(settings: Settings, persistedDestroyed: Set<string>) {
    this.settings = settings;
    this.destroyed = persistedDestroyed;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  start(): void {
    if (this.watcher) return;
    this.checkTheme(true);
    this.schemeMedia.addEventListener('change', this.onScheme);
    this.io = new IntersectionObserver((records) => this.onIntersect(records), { rootMargin: '900px 0px 900px 0px' });
    this.watcher = watchFeed({ onPost: (p) => this.onPost(p), onRemove: (id) => this.onRemove(id) });
  }

  stop(): void {
    this.watcher?.disconnect();
    this.watcher = null;
    for (const id of [...this.entries.keys()]) this.teardown(id, true);
    this.io?.disconnect();
    this.io = null;
    if (this.idle) cancelIdleCallback(this.idle);
    this.idle = 0;
    this.queue = [];
    this.schemeMedia.removeEventListener('change', this.onScheme);
    closeShame();
    disposeLayer();
    this.flushDaily();
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
    for (const e of this.entries.values()) {
      if (!e.view) continue;
      e.view.reduceMotion = this.reduceMotion;
      if (e.state === 'shown' && e.view.report) e.view.mode = this.modeFor(e.view.report);
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
    setTheme(detectTheme());
  }

  /** For tests: counts of live objects (proves nothing leaks). */
  debugCounts() {
    let mounted = 0;
    for (const e of this.entries.values()) if (e.app) mounted++;
    return { entries: this.entries.size, mounted, observedRoots: this.byRoot.size, reports: this.reports.size, queue: this.queue.length };
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
        this.entries.set(post.id, { id: post.id, post, sig: '', view: null, app: null, state: 'destroyed', recorded: true });
        hideInstantly(post.root, post.mount);
      }
      return;
    }
    const sig = signature(post);
    if (e) {
      e.post = post;
      if (e.sig !== sig) {
        e.sig = sig;
        if (e.view && e.state === 'shown') this.score(e, true);
      }
      return;
    }
    e = { id: post.id, post, sig, view: null, app: null, state: 'pending' };
    this.entries.set(post.id, e);
    this.byRoot.set(post.root, post.id);
    this.io?.observe(post.root);
  }

  private onRemove(id: string): void {
    this.teardown(id, true);
  }

  private onIntersect(records: IntersectionObserverEntry[]): void {
    for (const r of records) {
      if (!r.isIntersecting) continue;
      const id = this.byRoot.get(r.target);
      if (!id) continue;
      this.io?.unobserve(r.target);
      this.byRoot.delete(r.target);
      this.queue.push(id);
    }
    if (this.queue.length && !this.idle) this.idle = requestIdleCallback((d) => this.drain(d), { timeout: 120 });
  }

  /** Score + mount in idle time, a few posts per slice. */
  private drain(deadline: IdleDeadline): void {
    this.idle = 0;
    this.checkTheme();
    let n = 0;
    while (this.queue.length && (n < 2 || deadline.timeRemaining() > 2)) {
      const e = this.entries.get(this.queue.shift()!);
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
    if (tierRank(report.tier.id) >= tierRank(this.settings.minTier)) return 'badge';
    return this.settings.showClean ? 'chip' : 'none';
  }

  private show(e: Entry): void {
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
    const target = e.post.mount;
    const shadow = target.shadowRoot ?? target.attachShadow({ mode: 'open' });
    shadow.replaceChildren();
    shadow.adoptedStyleSheets = postSheets();
    e.app = mount(PostUI, {
      target: shadow,
      props: {
        view,
        actions: {
          destroy: (ev: MouseEvent) => this.destroy(e.id, ev),
          shame: (ev: MouseEvent) => void this.shame(e.id, ev),
          undo: () => this.undo(e.id),
          expand: (open: boolean) => open && this.loadRank(e.id),
          arm: () => preloadFx(),
        },
      },
    });
  }

  private score(e: Entry, fresh: boolean): void {
    const report = this.reportFor(e, fresh);
    if (!report || !e.view) return;
    e.view.report = report;
    e.view.shameable = report.shameable;
    e.view.isAd = !!e.post.input.isAd;
    e.view.mode = this.modeFor(report);
    this.sight(e, report);
  }

  private sight(e: Entry, report: SlopReport): void {
    if (!this.counted.has(e.id)) {
      this.counted.add(e.id);
      this.bumpDaily({ scanned: 1, slop: report.score >= SLOP_THRESHOLD ? 1 : 0 });
    }
    const author = e.post.author;
    if (!author) return;
    try {
      reportSighting({
        postId: e.id,
        author,
        score: report.score,
        tierId: report.tier.id,
        topCategory: report.topCategory,
        snippet: e.post.input.text.slice(0, 200),
        seenAt: Date.now(),
      });
    } catch { /* store unavailable: scoring still works */ }
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
    e.view = null;
    this.io?.unobserve(e.post.root);
    this.byRoot.delete(e.post.root);
    // LinkedIn may recycle the card element for another post: never leave it hidden.
    if (restore && e.post.root.isConnected) restorePost(e.post.root);
    this.entries.delete(id);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  private destroy(id: string, ev: MouseEvent): void {
    const e = this.entries.get(id);
    if (!e || e.state !== 'shown' || !e.view?.report || e.post.input.isAd) return;
    const { root, mount: host } = e.post;
    const button = ev.currentTarget instanceof Element ? ev.currentTarget.getBoundingClientRect() : null;
    const origin = ev.clientX || ev.clientY
      ? { x: ev.clientX, y: ev.clientY }
      : { x: button ? button.left + button.width / 2 : innerWidth / 2, y: button ? button.top + button.height / 2 : innerHeight / 2 };
    const reduce = this.reduceMotion;
    const inPlace = canTombstone(root, host);
    e.state = 'destroying';
    e.recorded = false;
    e.view.expanded = false;
    this.destroyed.add(id);

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
    if (this.settings.rememberDestroyed) void rememberDestroyed(e.id, true).catch(() => {});
    if (e.post.author) void reportAction(e.id, e.post.author.id, 'destroyed').catch(() => {});
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
  }

  private async shame(id: string, ev: MouseEvent): Promise<void> {
    const e = this.entries.get(id);
    const report = e?.view?.report;
    if (!e || !report || !e.view?.shameable) return;
    const opener = ev.currentTarget instanceof HTMLElement ? ev.currentTarget : null;
    const author = e.post.author;
    let record: AuthorRecord | null = null;
    if (author) {
      try {
        await flushSightings();
        record = await getAuthor(author.id);
      } catch { /* the Hall of Slop is optional for a roast */ }
    }
    openShame({
      postId: id,
      report,
      author,
      slopCount: Math.max(1, record?.slopPosts ?? 1),
      reduceMotion: this.reduceMotion,
      opener,
      onShamed: () => {
        this.bumpDaily({ shamed: 1 });
        if (author) void reportAction(id, author.id, 'shamed').catch(() => {});
      },
    });
  }

  private async loadRank(id: string): Promise<void> {
    preloadFx();
    const e = this.entries.get(id);
    const author = e?.post.author;
    if (!e?.view || !author || e.view.rank !== undefined) return;
    try {
      const [record, ids] = await Promise.all([getAuthor(author.id), this.topIds()]);
      if (!e.view) return;
      if (!record || record.slopPosts < 1) {
        e.view.rank = null;
        return;
      }
      const pos = ids.indexOf(author.id);
      const info: RankInfo = { rank: pos >= 0 ? pos + 1 : null, title: rankTitle(record.slopPoints), slopPosts: record.slopPosts, points: record.slopPoints };
      e.view.rank = info;
    } catch {
      if (e.view) e.view.rank = null;
    }
  }

  private async topIds(): Promise<string[]> {
    if (this.leaderboard && Date.now() - this.leaderboard.at < 30_000) return this.leaderboard.ids;
    const rows = await requestStore<AuthorRecord[]>({ type: 'store/leaderboard', limit: 100 });
    this.leaderboard = { at: Date.now(), ids: (rows ?? []).map((r) => r.id) };
    return this.leaderboard.ids;
  }

  // ── Today's counters ─────────────────────────────────────────────────────

  private bumpDaily(delta: DailyDelta): void {
    for (const [k, v] of Object.entries(delta) as [keyof DailyDelta, number][]) this.daily[k] = (this.daily[k] ?? 0) + v;
    if (this.dailyTimer === undefined) this.dailyTimer = window.setTimeout(() => this.flushDaily(), 3000);
  }

  private flushDaily(): void {
    window.clearTimeout(this.dailyTimer);
    this.dailyTimer = undefined;
    const delta = this.daily;
    this.daily = {};
    if (Object.values(delta).some(Boolean)) void addDailyStats(delta).catch(() => {});
  }
}
