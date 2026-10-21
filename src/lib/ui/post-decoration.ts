// Drip Edge (slime along the card's top edge) and the avatar decorations
// (scribbled ring, tier monster), drawn from a zero-size host the adapter
// puts inside the card. The host is absolutely positioned at its
// static position, so it moves with the card and LinkedIn's scroller moves
// everything together on the compositor: nothing here listens to scroll. The
// offset from the host to the card's top-left corner, the card's width and
// the photo's box (the ring sits on it; SLOPOCALYPSE's drip runs onto it) are
// measured only when the card or photo changes size (the host sits at the
// card's end, so the card's height moves it) or the card comes near the
// viewport: one shared ResizeObserver and IntersectionObserver, batched into
// one frame (all reads, then all writes). No computed styles.
//
// The falling drop animates only while its card is on screen: a second shared
// IntersectionObserver flips data-play, and only for posts that have a drop
// and allow motion.
//
// The only writes to LinkedIn's DOM are inserting and removing our own host
// element; its inline styles are ours.

import { mount, unmount } from 'svelte';
import PostDecoration from './PostDecoration.svelte';
import { PHOTO_ROW_MAX, dripShape } from './drip';
import type { PostActions, PostView } from './post-view.svelte';
import { attachUiShadow } from './shadow';
import { postSheets } from './sheets';

export interface DecorationSource {
  view: PostView;
  actions: PostActions;
  /** The adapter's decoration host inside the card (created on demand). */
  host(): HTMLElement | null;
  /** The visible card box: the drips hang from its top edge. */
  card(): HTMLElement;
  /** The element that draws the author's photo shape (the ring sits on it; SLOPOCALYPSE's drip runs onto it). */
  avatar(): HTMLElement | null;
}

export interface Decoration {
  /** The card or the post's state may have changed: re-resolve the host and re-measure. */
  update(): void;
  /** The ring calls out `times` times (first time seen; louder tiers more). */
  pulse(times: number): void;
  dispose(): void;
}

interface Box {
  left: number;
  top: number;
  width: number;
}

interface Geometry {
  host: DOMRect;
  /** The card's padding box (where it clips), in viewport coordinates. */
  card: Box;
  photo: DOMRect | null;
}

// Our own host element: out of flow, no box, so LinkedIn's layout never moves.
const HOST_STYLE = 'position:absolute;display:block;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;pointer-events:none;';
const px = (n: number) => `${Math.round(n * 100) / 100}px`;

const live = new Set<CardDecoration>();
const byElement = new Map<Element, Set<CardDecoration>>();
const byScreen = new Map<Element, Set<CardDecoration>>();
const dirty = new Set<CardDecoration>();
let resize: ResizeObserver | undefined;
let near: IntersectionObserver | undefined;
let screen: IntersectionObserver | undefined;
let frame = 0;

function invalidate(d: CardDecoration): void {
  dirty.add(d);
  if (!frame) frame = requestAnimationFrame(flush);
}

function flush(): void {
  frame = 0;
  const batch = [...dirty].filter((d) => live.has(d));
  dirty.clear();
  for (const d of batch) d.attach();
  const geometry = batch.map((d) => d.read());
  batch.forEach((d, i) => d.write(geometry[i]!));
}

function onElements(targets: Element[]): void {
  for (const el of targets) for (const d of byElement.get(el) ?? []) invalidate(d);
}

function onScreen(records: IntersectionObserverEntry[]): void {
  for (const r of records) for (const d of byScreen.get(r.target) ?? []) d.play(r.isIntersecting);
}

/** Add or remove `d` from an element → decorations index, observing each element once. */
function track(index: Map<Element, Set<CardDecoration>>, d: CardDecoration, from: readonly Element[], to: readonly Element[], observers: () => (ResizeObserver | IntersectionObserver)[]): void {
  const next = new Set(to);
  for (const el of from) {
    if (next.has(el)) continue;
    const set = index.get(el);
    set?.delete(d);
    if (set && !set.size) {
      index.delete(el);
      for (const o of observers()) o.unobserve(el);
    }
  }
  for (const el of next) {
    let set = index.get(el);
    if (!set) {
      index.set(el, (set = new Set()));
      for (const o of observers()) o.observe(el);
    }
    set.add(d);
  }
}

class CardDecoration implements Decoration {
  private host: HTMLElement | null = null;
  private box: HTMLElement | null = null;
  private app: Record<string, unknown> | null = null;
  private watched: Element[] = [];
  private screened: Element[] = [];

  constructor(private readonly src: DecorationSource) {
    live.add(this);
    this.update();
  }

  /** SLOPOCALYPSE: one drip runs onto the photo (and a drop falls off it). */
  private get photoDrip(): boolean {
    return !!dripShape(this.src.view.report?.tier.id)?.photo;
  }

  update(): void {
    if (!live.has(this)) return;
    this.attach();
    const card = this.src.card();
    const photo = this.src.avatar();
    this.watch(photo ? [card, photo] : [card]);
    // Only a post with a falling drop, when motion is allowed, needs to know it's on screen.
    this.screen(this.photoDrip && !this.src.view.reduceMotion ? [card] : []);
    invalidate(this);
  }

  /** Mount into the adapter's current host (a re-rendered card gets a new one). */
  attach(): void {
    const host = this.src.host();
    if (host === this.host && host?.isConnected) return;
    this.detach();
    if (!host) return;
    host.style.cssText = HOST_STYLE;
    const shadow = attachUiShadow(host);
    shadow.adoptedStyleSheets = postSheets();
    shadow.replaceChildren();
    const box = document.createElement('div');
    box.setAttribute('data-measured', '0');
    shadow.append(box);
    this.host = host;
    this.box = box;
    this.app = mount(PostDecoration, { target: box, props: { view: this.src.view, actions: this.src.actions } });
  }

  read(): Geometry | null {
    if (!this.host?.isConnected) return null;
    const card = this.src.card();
    if (!card.isConnected) return null;
    const r = card.getBoundingClientRect();
    const photo = this.src.avatar();
    const p = photo?.isConnected ? photo.getBoundingClientRect() : null;
    return {
      host: this.host.getBoundingClientRect(),
      // Inside the card's border, where its own overflow clip starts.
      card: { left: r.left + card.clientLeft, top: r.top + card.clientTop, width: card.clientWidth || r.width },
      photo: p && p.width > 0 && p.height > 0 ? p : null,
    };
  }

  write(g: Geometry | null): void {
    const box = this.box;
    if (!box) return;
    // Nothing to draw on a card without a box (hidden, not rendered yet).
    if (!g || g.card.width <= 0) {
      box.setAttribute('data-measured', '0');
      return;
    }
    const { host, card, photo } = g;
    let vars = `--card-x:${px(card.left - host.left)};--card-y:${px(card.top - host.top)};--card-w:${px(card.width)};`;
    if (photo) {
      vars += `--av-x:${px(photo.left - host.left)};--av-y:${px(photo.top - host.top)};--av-s:${px(photo.width)};`;
      if (this.photoDrip) vars += `--ph-x:${px(photo.left + photo.width / 2 - card.left)};`;
    }
    box.style.cssText = vars;
    // The ring and monster need a visible photo (not rendered yet, or none).
    box.setAttribute('data-avatar', photo ? '1' : '0');
    box.setAttribute('data-photo', !photo || !this.photoDrip ? 'none' : photo.top - card.top <= PHOTO_ROW_MAX ? 'top' : 'far');
    box.setAttribute('data-measured', '1');
  }

  pulse(times: number): void {
    const ring = this.box?.querySelector('.ss-avatar-scribble');
    if (!ring || times <= 0 || typeof ring.animate !== 'function') return;
    // Our own element, transform only: the compositor runs it.
    ring.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.14) rotate(-6deg)', offset: 0.35 }, { transform: 'scale(1)' }],
      { duration: 900, delay: 150, iterations: times, easing: 'ease-in-out' },
    );
  }

  /** The card entered or left the viewport: run the falling drop only while it's on screen. */
  play(on: boolean): void {
    this.box?.setAttribute('data-play', on ? '1' : '0');
  }

  dispose(): void {
    if (!live.delete(this)) return;
    dirty.delete(this);
    this.watch([]);
    this.screen([]);
    this.detach();
    if (live.size) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    resize?.disconnect();
    resize = undefined;
    near?.disconnect();
    near = undefined;
    screen?.disconnect();
    screen = undefined;
  }

  private detach(): void {
    if (this.app) {
      try { void unmount(this.app); } catch { /* already gone */ }
    }
    this.app = null;
    this.box = null;
    this.host?.remove();
    this.host = null;
  }

  private watch(elements: Element[]): void {
    if (elements.length) {
      resize ??= new ResizeObserver((records) => onElements(records.map((r) => r.target)));
      near ??= new IntersectionObserver((records) => onElements(records.filter((r) => r.isIntersecting).map((r) => r.target)), { rootMargin: '300px 0px' });
    }
    track(byElement, this, this.watched, elements, () => [resize!, near!]);
    this.watched = elements;
  }

  private screen(elements: Element[]): void {
    if (elements.length) screen ??= new IntersectionObserver(onScreen);
    else this.play(false);
    track(byScreen, this, this.screened, elements, () => [screen!]);
    this.screened = elements;
  }
}

export function decoratePost(src: DecorationSource): Decoration {
  return new CardDecoration(src);
}

/** Live decorations (tests prove nothing leaks). */
export function decorationCount(): number {
  return live.size;
}
