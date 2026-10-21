// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedPost } from '../../../src/lib/linkedin/types';
import type { SlopReport } from '../../../src/lib/engine/types';

vi.mock('svelte', () => ({ flushSync: vi.fn(), mount: vi.fn(() => ({})), unmount: vi.fn() }));
vi.mock('../../../src/lib/engine', () => ({ analyzePost: vi.fn() }));
vi.mock('../../../src/lib/linkedin', () => ({ slotRoom: vi.fn(), watchFeed: vi.fn(() => ({ disconnect: vi.fn() })) }));
vi.mock('../../../src/lib/store/client', () => ({ reportSighting: vi.fn(), reportAction: vi.fn().mockResolvedValue(undefined), flushSightings: vi.fn().mockResolvedValue(undefined), getAuthor: vi.fn().mockResolvedValue(null), disposeStoreClient: vi.fn() }));
vi.mock('../../../src/lib/store/transport', () => ({ requestStore: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../src/lib/settings', () => ({ today: () => new Date().toLocaleDateString(), addDailyStats: vi.fn().mockResolvedValue(undefined), rememberDestroyed: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../src/lib/fx/collapse', () => ({ canTombstone: () => false, collapseAway: vi.fn().mockResolvedValue(undefined), collapseToTombstone: vi.fn(), hideInstantly: vi.fn(), hidePost: vi.fn(), pinTombstone: vi.fn(), restorePost: vi.fn() }));
vi.mock('../../../src/lib/fx/erupt', () => ({ boxOf: (el: Element) => el, erupt: vi.fn().mockResolvedValue(undefined), preloadFx: vi.fn() }));
vi.mock('../../../src/lib/fx/layer', () => ({ disposeLayer: vi.fn() }));
vi.mock('../../../src/lib/ui/PostUI.svelte', () => ({ default: {} }));
vi.mock('../../../src/lib/ui/PostDecoration.svelte', () => ({ default: {} }));
vi.mock('../../../src/lib/ui/AuthorTag.svelte', () => ({ default: {} }));
vi.mock('../../../src/lib/ui/ProfileSummary.svelte', () => ({ default: { name: 'ProfileSummary' } }));
vi.mock('../../../src/lib/ui/post-view.svelte', () => ({
  createPostView: (v: unknown) => v,
  createTagView: (v: unknown) => v,
  createSummaryView: (v: object) => ({ stats: { checked: 0, slop: 0, skipped: 0, avg: null, marks: [] }, allTime: undefined, name: null, reduceMotion: false, ...v }),
}));
vi.mock('../../../src/lib/ui/sheets', () => ({ detectTheme: () => 'light', getTheme: () => 'light', postSheets: () => [], summarySheets: () => [], setTheme: vi.fn() }));
vi.mock('../../../src/lib/ui/shame-modal', () => ({ openShame: vi.fn(), closeShame: vi.fn() }));
vi.mock('../../../src/lib/ui/toast', () => ({ showUndoToast: vi.fn() }));
import { FeedController } from '../../../src/entrypoints/linkedin.content/controller';
import { mount, unmount } from 'svelte';
import { analyzePost } from '../../../src/lib/engine';
import type { PostAuthor, ProfilePage } from '../../../src/lib/linkedin/types';
import { flushSightings, getAuthor } from '../../../src/lib/store/client';
import { addDailyStats } from '../../../src/lib/settings';
import { disposeStoreClient, reportAction, reportSighting } from '../../../src/lib/store/client';
import { openShame } from '../../../src/lib/ui/shame-modal';

// Private state is inspected only here to reproduce the reviewer's lifecycle probes.
let controller: any;
const trusted = { isTrusted: true, clientX: 1, clientY: 1 } as MouseEvent;
const report = (score = 60): SlopReport => ({ score, tier: { id: 'certified', label: '', min: 40, blurb: '' }, shameable: true, signals: [], topCategory: null, categoryWeights: {}, wordCount: 100 });
function post(id = 'p1'): FeedPost {
  const root = document.createElement('article');
  const mount = document.createElement('div');
  root.append(mount);
  document.body.append(root);
  return { id, root, mount, input: { text: 'The same post text.' }, author: { id: 'in/alice', name: 'Alice', kind: 'person' }, tagHost: () => null, avatarFrame: () => null };
}
function shown(p = post()) {
  controller.onPost(p);
  const e = controller.entries.get(p.id);
  e.state = 'shown';
  e.view = { report: report(), mode: 'badge', shameable: true };
  return e;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 19, 12));
  vi.stubGlobal('__SLOP_E2E__', false);
  vi.stubGlobal('requestIdleCallback', vi.fn(() => 1));
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  controller = new FeedController({ enabled: true, minTier: 'certified', sound: false, reduceMotion: true, rememberDestroyed: false }, new Set());
  vi.spyOn(controller, 'decorate').mockImplementation(() => {});
  vi.mocked(analyzePost).mockReturnValue(report());
});
afterEach(() => { controller.stop(); document.body.replaceChildren(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('daily accounting and bounded session state', () => {
  it('corrects both threshold crossings without increasing scanned', () => {
    const e = shown();
    for (const score of [39, 40, 70, 39, 39]) { controller.sight(e, report(score)); controller.flushDaily(); }
    expect(vi.mocked(addDailyStats).mock.calls.map(([delta]) => delta)).toEqual([{ scanned: 1, slop: 0 }, { slop: 1 }, { slop: -1 }]);
  });
  it('resets classifications on the next local day without carrying old deltas over', () => {
    const e = shown();
    controller.sight(e, report());
    vi.setSystemTime(new Date(2026, 9, 20, 12));
    controller.sight(e, report(20));
    controller.flushDaily();
    expect(addDailyStats).toHaveBeenCalledExactlyOnceWith({ scanned: 1, slop: 0 }, expect.objectContaining({ day: new Date().toLocaleDateString() }));
    expect(controller.counted.size).toBe(1);
  });
  it('bounds daily classifications and retains only the 2000 most recent destroyed IDs after 10000 removals', () => {
    for (let i = 0; i < 10_000; i++) {
      const e = shown(post(`p${i}`));
      controller.sight(e, report());
      controller.destroy(e.id, trusted);
      controller.onRemove(e.id);
      e.post.root.remove();
    }
    expect(controller.counted.size).toBeLessThanOrEqual(3000);
    expect(controller.destroyed.size).toBe(2000);
    expect(controller.destroyed.has('p0')).toBe(false);
    expect(controller.destroyed.has('p9999')).toBe(true);
    expect(controller.debugCounts()).toMatchObject({ entries: 0, mounted: 0, observedRoots: 0, queue: 0 });
  });
  it('also caps oversized persisted destroyed IDs on construction', () => {
    const c: any = new FeedController(controller.settings, new Set(Array.from({ length: 2500 }, (_, i) => String(i))));
    expect(c.destroyed.size).toBe(2000);
    expect(c.destroyed.has('499')).toBe(false);
    expect(c.destroyed.has('2499')).toBe(true);
    c.stop();
  });
  it('preserves a live post correction baseline after its ID leaves the bounded daily cache', () => {
    const e = shown();
    controller.sight(e, report(20));
    for (let i = 0; i < 3000; i++) controller.sight({ id: `other${i}`, post: { id: `other${i}`, author: null, input: { text: '' } } }, report(20));
    expect(controller.counted.has(e.id)).toBe(false);
    const bump = vi.spyOn(controller, 'bumpDaily');
    controller.sight(e, report(60));
    expect(bump).toHaveBeenCalledExactlyOnceWith({ slop: 1 });
  });
});

describe('store handoff', () => {
  it('forwards author hydration (even in-place mutation) without re-scoring', () => {
    const e = shown();
    controller.sight(e, e.view.report);
    vi.mocked(reportSighting).mockClear();
    Object.assign(e.post.author, { name: 'Alice Updated', headline: 'New headline', avatarUrl: 'https://example.com/photo' });
    e.post.input.authorHeadline = 'New headline';
    controller.onPost(e.post);
    expect(analyzePost).not.toHaveBeenCalled();
    expect(reportSighting).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ author: expect.objectContaining({ name: 'Alice Updated', headline: 'New headline', avatarUrl: 'https://example.com/photo' }) }));
    controller.onPost(e.post);
    expect(reportSighting).toHaveBeenCalledTimes(1);
  });
  it('still re-scores changed text and updates daily classification', () => {
    const e = shown();
    controller.sight(e, report(20));
    controller.flushDaily();
    controller.onPost({ ...e.post, input: { text: 'Hydrated text.' } });
    controller.flushDaily();
    expect(analyzePost).toHaveBeenCalledOnce();
    expect(addDailyStats).toHaveBeenLastCalledWith({ slop: 1 }, expect.anything());
  });
  it('uses original source IDs for sightings and both actions', async () => {
    const e = shown({ ...post('repost'), sourceId: 'original', input: { text: 'Shared text.', isBareRepost: true } });
    controller.sight(e, report());
    expect(reportSighting).toHaveBeenCalledWith(expect.objectContaining({ postId: 'original' }));
    controller.recordDestroy(e);
    expect(reportAction).toHaveBeenCalledWith('original', 'in/alice', 'destroyed');
    await controller.shame(e.id, trusted);
    vi.mocked(openShame).mock.calls[0]![0].onShamed();
    expect(reportAction).toHaveBeenCalledWith('original', 'in/alice', 'shamed');
  });
  it('omits unidentified bare reposts from sightings and actions until source hydration', () => {
    const e = shown({ ...post(), input: { text: 'Shared text.', isBareRepost: true } });
    controller.sight(e, report());
    controller.recordDestroy(e);
    expect(reportSighting).not.toHaveBeenCalled();
    expect(reportAction).not.toHaveBeenCalled();
    controller.onPost({ ...e.post, sourceId: 'original' });
    expect(reportSighting).toHaveBeenCalledWith(expect.objectContaining({ postId: 'original' }));
    expect(analyzePost).not.toHaveBeenCalled();
  });
  it('rejects untrusted Destroy and Shame events before reading the store', async () => {
    const e = shown();
    controller.destroy(e.id, new MouseEvent('click'));
    await controller.shame(e.id, new MouseEvent('click'));
    expect(e.state).toBe('shown');
    expect(openShame).not.toHaveBeenCalled();
    expect(reportAction).not.toHaveBeenCalled();
  });
});

describe('idle budget', () => {
  function queue(n = 3) {
    for (let i = 0; i < n; i++) { const p = post(`p${i}`); controller.onPost(p); controller.queue.push(p.id); }
    return vi.spyOn(controller, 'show').mockImplementation(() => {});
  }
  it('does no work with zero remaining idle time before timeout', () => {
    const show = queue();
    controller.drain({ didTimeout: false, timeRemaining: () => 0 });
    expect(show).not.toHaveBeenCalled();
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 120 });
  });
  it('guarantees exactly one post when the idle timeout expires', () => {
    const show = queue();
    controller.drain({ didTimeout: true, timeRemaining: () => 0 });
    expect(show).toHaveBeenCalledTimes(1);
  });
  it('stops after a slow first engine call consumes the budget', () => {
    const show = queue();
    controller.drain({ didTimeout: false, timeRemaining: () => show.mock.calls.length ? 0 : 10 });
    expect(show).toHaveBeenCalledTimes(1);
  });
});

it('disposes store retries/listeners when the controller stops', () => {
  controller.stop();
  expect(disposeStoreClient).toHaveBeenCalledOnce();
});

it('refits only nearby shown hosts and batches them in one resize frame', () => {
  const fit = vi.spyOn(controller.fitter, 'fit').mockImplementation(() => {});
  const frame = vi.fn();
  vi.stubGlobal('requestAnimationFrame', frame.mockImplementation(() => 1));
  const near = shown(post('near'));
  const far = shown(post('far'));
  for (const e of [near, far]) e.shadow = e.post.mount.attachShadow({ mode: 'closed' });
  controller.onIntersect([{ target: near.post.root, isIntersecting: true }, { target: far.post.root, isIntersecting: false }]);
  controller.onResize();
  controller.onResize();
  expect(frame).toHaveBeenCalledTimes(1);
  frame.mock.calls[0]![0]();
  expect(fit).toHaveBeenCalledExactlyOnceWith([{ host: near.post.mount, shadow: near.shadow, fits: ['full', 'score', 'icon'] }]);
  // Coming back after an offscreen resize schedules a fresh fit.
  controller.onIntersect([{ target: far.post.root, isIntersecting: true }]);
  expect(frame).toHaveBeenCalledTimes(2);
});

describe('profile summary on activity pages', () => {
  const tiers = { 30: 'whiff', 45: 'certified', 70: 'swamp', 90: 'slopocalypse' } as const;
  const scored = (score: keyof typeof tiers, wordCount = 120): SlopReport => ({ ...report(score), tier: { id: tiers[score], label: '', min: 0, blurb: '' }, wordCount });
  const by = (id: string, authorId: string): FeedPost => ({ ...post(id), author: { id: authorId, name: authorId === 'in/jane-doe' ? 'Jane Doe' : 'Other', kind: 'person' } as PostAuthor });
  const page = (ownerId = 'in/jane-doe'): ProfilePage => ({
    ownerId, summaryHost: document.createElement('div'), owns: (a) => a?.id.toLowerCase() === ownerId,
  });
  let frames: FrameRequestCallback[];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => frames.push(cb)));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  const paint = () => { for (const cb of frames.splice(0)) cb(0); };
  const sighted = (p: FeedPost, r: SlopReport) => {
    controller.onPost(p);
    const e = controller.entries.get(p.id);
    e.state = 'shown';
    e.view = { report: r, mode: 'badge', shameable: true };
    controller.sight(e, r);
    return e;
  };

  it('counts only the owner\'s own posts, once per post, painted once per frame', () => {
    controller.onProfile(page());
    expect(mount).toHaveBeenCalledWith(expect.objectContaining({ name: 'ProfileSummary' }), expect.anything());
    const view = controller.profile.view;
    sighted(by('own-1', 'in/jane-doe'), scored(70));
    sighted(by('own-2', 'in/Jane-Doe'), scored(30));
    sighted(by('liked', 'in/someone-else'), scored(90)); // a repost's original, a like, a comment: someone else's
    const own3 = sighted(by('own-3', 'in/jane-doe'), scored(45));
    controller.sight(own3, scored(45)); // re-scrolled: no double count
    expect(frames).toHaveLength(1);
    expect(view.stats.checked).toBe(0);
    paint();
    expect(view.stats).toMatchObject({ checked: 3, slop: 2, avg: 48, marks: ['swamp', null, 'certified'] });
    expect(view.name).toBe('Jane Doe');
    expect(controller.debugCounts()).toMatchObject({ profiles: 1, profilePosts: 3 });
  });

  it('counts the owner\'s posts scored before the card showed up', () => {
    sighted(by('early', 'in/jane-doe'), scored(90));
    sighted(by('other', 'in/x'), scored(90));
    controller.onProfile(page());
    expect(controller.profile.view.stats).toMatchObject({ checked: 1, slop: 1 });
  });

  it('reads the all-time record by the id their own posts use, after flushing sightings', async () => {
    vi.mocked(getAuthor).mockResolvedValue({ id: 'in/Jane-Doe', postsSeen: 21, slopPosts: 5 } as never);
    controller.onProfile(page());
    await vi.waitFor(() => expect(controller.profile.view.allTime).toEqual({ postsSeen: 21, slopPosts: 5, rank: null }));
    expect(getAuthor).toHaveBeenLastCalledWith('in/jane-doe');
    sighted(by('own', 'in/Jane-Doe'), scored(70));
    paint();
    vi.advanceTimersByTime(3000);
    await vi.waitFor(() => expect(getAuthor).toHaveBeenLastCalledWith('in/Jane-Doe'));
    expect(vi.mocked(flushSightings).mock.invocationCallOrder.at(-1)!).toBeLessThan(vi.mocked(getAuthor).mock.invocationCallOrder.at(-1)!);
  });

  it('shows no all-time record when the store has none or fails', async () => {
    vi.mocked(getAuthor).mockRejectedValueOnce(new Error('worker asleep'));
    controller.onProfile(page());
    await vi.waitFor(() => expect(controller.profile.view.allTime).toBeNull());
  });

  it('starts over for another person and drops every reference when the page closes or the extension stops', () => {
    controller.onProfile(page());
    const first = controller.profile;
    sighted(by('own', 'in/jane-doe'), scored(70));
    controller.onProfile(page('in/rowan-example'));
    expect(unmount).toHaveBeenCalledOnce();
    expect(controller.profile).not.toBe(first);
    expect(controller.profile.tally.size).toBe(0); // Jane's post never counts for Rowan
    controller.onProfile(null);
    expect(unmount).toHaveBeenCalledTimes(2);
    expect(controller.profile).toBeNull();
    expect(controller.debugCounts()).toMatchObject({ profiles: 0, profilePosts: 0 });
    // A frame or store refresh still in flight must not resurrect it.
    paint();
    vi.advanceTimersByTime(5000);
    expect(controller.profile).toBeNull();
    controller.onProfile(page());
    controller.stop();
    expect(controller.profile).toBeNull();
    expect(unmount).toHaveBeenCalledTimes(3);
  });

  it('ignores posts when no activity page is open', () => {
    sighted(by('own', 'in/jane-doe'), scored(70));
    paint();
    expect(frames).toHaveLength(0);
    expect(controller.debugCounts()).toMatchObject({ profiles: 0 });
  });
});

describe('rank in the panel', () => {
  it.each(['author read', 'sighting flush'])('leaves the rank unloaded after a failed %s, so the next open retries', async (step) => {
    const e = shown();
    vi.mocked(step === 'author read' ? getAuthor : flushSightings).mockRejectedValueOnce(new Error('worker asleep'));
    await controller.loadRank(e.id);
    expect(e.view.rank).toBeUndefined();
    vi.mocked(getAuthor).mockResolvedValueOnce({ id: 'in/alice', postsSeen: 4, slopPosts: 3, slopPoints: 30 } as never);
    await controller.loadRank(e.id);
    expect(e.view.rank).toMatchObject({ rank: null, slopPosts: 3, postsSeen: 4, points: 30 });
  });

  it('keeps a successful "no record" and does not read again', async () => {
    const e = shown();
    vi.mocked(getAuthor).mockResolvedValueOnce(null);
    await controller.loadRank(e.id);
    expect(e.view.rank).toBeNull();
    await controller.loadRank(e.id);
    expect(getAuthor).toHaveBeenCalledOnce();
  });
});
