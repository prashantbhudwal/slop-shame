// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlopReport, SlopTierId } from '../../../src/lib/engine/types';
import type { PostActions, PostView } from '../../../src/lib/ui/post-view.svelte';

vi.mock('svelte', () => ({ mount: vi.fn(() => ({})), unmount: vi.fn() }));
vi.mock('../../../src/lib/ui/PostDecoration.svelte', () => ({ default: {} }));
vi.mock('../../../src/lib/ui/sheets', () => ({ postSheets: () => [] }));
import { unmount } from 'svelte';
import { decorationCount, decoratePost, type Decoration } from '../../../src/lib/ui/post-decoration';

/** Fake observers: tests decide what they report, and see what's observed. */
class FakeObserver {
  static all: FakeObserver[] = [];
  observed = new Set<Element>();
  disconnected = false;
  constructor(readonly callback: (records: unknown[]) => void, readonly options?: IntersectionObserverInit) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) { this.observed.add(el); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.observed.clear(); this.disconnected = true; }
}
/** The on-screen observer is the IntersectionObserver without a rootMargin. */
const screenIo = () => FakeObserver.all.find((o) => o instanceof FakeIO && !o.options?.rootMargin && !o.disconnected);
class FakeIO extends FakeObserver {}
class FakeRO extends FakeObserver {}

let frames: FrameRequestCallback[] = [];
const runFrames = () => { const f = frames; frames = []; for (const cb of f) cb(0); };
const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

const report = (tier: SlopTierId): SlopReport => ({ score: 90, tier: { id: tier, label: '', min: 0, blurb: '' }, shameable: true, signals: [], topCategory: null, categoryWeights: {}, wordCount: 100 });

interface Card { card: HTMLElement; photo: HTMLElement; view: PostView; deco: Decoration; box: () => HTMLElement }

function card(tier: SlopTierId, { photoTop = 13, reduceMotion = false } = {}): Card {
  const card = document.createElement('div');
  const photo = document.createElement('img');
  const host = document.createElement('div');
  card.append(photo, host);
  document.body.append(card);
  // Card at (100, 500), 552 wide and 400 tall, a 1px border; the host sits at the card's end.
  card.getBoundingClientRect = () => rect(100, 500, 554, 402);
  Object.defineProperties(card, { clientLeft: { value: 1 }, clientTop: { value: 1 }, clientWidth: { value: 552, configurable: true } });
  host.getBoundingClientRect = () => rect(113, 890, 0, 0);
  photo.getBoundingClientRect = () => rect(114, 501 + photoTop, 48, 48);
  const view = { report: report(tier), mode: 'badge', reduceMotion } as PostView;
  let shadow: ShadowRoot | undefined;
  const deco = decoratePost({ view, actions: {} as PostActions, host: () => (host.isConnected ? host : null), card: () => card, avatar: () => photo });
  return {
    card, photo, view, deco,
    box: () => { shadow ??= host.shadowRoot!; return shadow.firstElementChild as HTMLElement; },
  };
}

beforeEach(() => {
  vi.stubGlobal('__SLOP_E2E__', true);
  vi.stubGlobal('ResizeObserver', FakeRO);
  vi.stubGlobal('IntersectionObserver', FakeIO);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
});
afterEach(() => {
  document.body.replaceChildren();
  FakeObserver.all = [];
  frames = [];
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Drip Edge and avatar decoration coordinator', () => {
  it('hangs the drip from the card’s top edge, measured from the host, inside the card’s border', () => {
    const c = card('certified');
    runFrames();
    expect(c.box().getAttribute('data-measured')).toBe('1');
    // Padding box (101, 501), host at (113, 890): -12 px across, -389 px up, 552 wide.
    expect(c.box().style.getPropertyValue('--card-x')).toBe('-12px');
    expect(c.box().style.getPropertyValue('--card-y')).toBe('-389px');
    expect(c.box().style.getPropertyValue('--card-w')).toBe('552px');
    // Only SLOPOCALYPSE runs a drip onto the photo.
    expect(c.box().style.getPropertyValue('--ph-x')).toBe('');
    expect(c.box().getAttribute('data-photo')).toBe('none');
    c.deco.dispose();
  });

  it('puts the ring and monster on the photo, measured from the host, on every tier', () => {
    const c = card('certified');
    runFrames();
    // Photo at (114, 514), host at (113, 890), 48 px wide.
    expect(c.box().getAttribute('data-avatar')).toBe('1');
    expect(c.box().style.getPropertyValue('--av-x')).toBe('1px');
    expect(c.box().style.getPropertyValue('--av-y')).toBe('-376px');
    expect(c.box().style.getPropertyValue('--av-s')).toBe('48px');
    const resize = FakeObserver.all.find((o) => o instanceof FakeRO)!;
    expect([...resize.observed]).toEqual([c.card, c.photo]);
    c.deco.dispose();
  });

  it('hides the ring and monster while the photo has no box, but still drips', () => {
    const c = card('swamp');
    c.photo.getBoundingClientRect = () => rect(0, 0, 0, 0);
    runFrames();
    expect(c.box().getAttribute('data-measured')).toBe('1');
    expect(c.box().getAttribute('data-avatar')).toBe('0');
    c.deco.dispose();
  });

  it('SLOPOCALYPSE runs its drip onto the photo only when the photo is the card’s first row', () => {
    const top = card('slopocalypse');
    const far = card('slopocalypse', { photoTop: 46 });
    runFrames();
    // Photo centre 114 + 24 = 138, from the padding box's left edge at 101.
    expect(top.box().style.getPropertyValue('--ph-x')).toBe('37px');
    expect(top.box().getAttribute('data-photo')).toBe('top');
    expect(far.box().getAttribute('data-photo')).toBe('far');
    const resize = FakeObserver.all.find((o) => o instanceof FakeRO)!;
    expect(resize.observed.has(top.photo)).toBe(true);
    top.deco.dispose();
    far.deco.dispose();
  });

  it('runs the falling drop only while the card is on screen, and never with reduced motion', () => {
    const c = card('slopocalypse');
    const calm = card('slopocalypse', { reduceMotion: true });
    const other = card('swamp');
    runFrames();
    const io = screenIo()!;
    expect([...io.observed]).toEqual([c.card]);
    io.callback([{ target: c.card, isIntersecting: true }]);
    expect(c.box().getAttribute('data-play')).toBe('1');
    io.callback([{ target: c.card, isIntersecting: false }]);
    expect(c.box().getAttribute('data-play')).toBe('0');
    expect(calm.box().getAttribute('data-play')).not.toBe('1');
    expect(other.box().getAttribute('data-play')).not.toBe('1');
    // Switching Reduce motion on stops it and stops watching.
    io.callback([{ target: c.card, isIntersecting: true }]);
    c.view.reduceMotion = true;
    c.deco.update();
    expect(c.box().getAttribute('data-play')).toBe('0');
    expect(io.observed.size).toBe(0);
    for (const d of [c, calm, other]) d.deco.dispose();
  });

  it('a removed post takes everything along: host, app, observers and every reference', () => {
    const a = card('slopocalypse');
    const b = card('whiff');
    runFrames();
    expect(decorationCount()).toBe(2);
    a.deco.dispose();
    expect(decorationCount()).toBe(1);
    expect(a.card.querySelector('div')).toBeNull();
    expect(vi.mocked(unmount)).toHaveBeenCalledTimes(1);
    expect(screenIo()?.observed.size ?? 0).toBe(0);
    b.deco.dispose();
    expect(decorationCount()).toBe(0);
    expect(FakeObserver.all.every((o) => o.disconnected || o.observed.size === 0)).toBe(true);
    expect(FakeObserver.all.filter((o) => !o.disconnected)).toEqual([]);
    // A late update after disposal does nothing.
    a.deco.update();
    runFrames();
    expect(decorationCount()).toBe(0);
  });

  it('stays hidden while the card has no box', () => {
    const c = card('certified');
    Object.defineProperty(c.card, 'clientWidth', { value: 0 });
    c.card.getBoundingClientRect = () => rect(0, 0, 0, 0);
    runFrames();
    expect(c.box().getAttribute('data-measured')).toBe('0');
    c.deco.dispose();
  });
});
