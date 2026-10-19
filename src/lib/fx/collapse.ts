// Hiding and collapsing a destroyed post. This is the ONLY place we write
// styles onto LinkedIn's DOM, and only to hide/collapse; every write is
// recorded and undone exactly by restorePost().
//
// The in-place tombstone adds no DOM: the post box shrinks to the height of
// our own mount (which may sit anywhere inside the post), the box becomes an
// overflow:hidden window, and we scroll that window to the mount. Everything
// else in the post stays visibility:hidden.

import { boxOf } from './erupt';

interface Saved {
  box: HTMLElement;
  rootStyle: string | null;
  boxStyle: string | null;
  mount: HTMLElement | null;
  mountStyle: string | null;
}

const saved = new WeakMap<HTMLElement, Saved>();
const EASE = 'cubic-bezier(.2,.9,.25,1)';
/** Collapse target before the tombstone renders; close to its real height. */
const TOMB_GUESS = 48;

function remember(root: HTMLElement, mount: HTMLElement | null): Saved {
  let s = saved.get(root);
  if (!s) {
    const box = boxOf(root);
    s = {
      box,
      rootStyle: root.getAttribute('style'),
      boxStyle: box === root ? null : box.getAttribute('style'),
      mount,
      mountStyle: mount?.getAttribute('style') ?? null,
    };
    saved.set(root, s);
  }
  return s;
}

function setAttr(el: HTMLElement, value: string | null): void {
  if (value === null) el.removeAttribute('style');
  else el.setAttribute('style', value);
}

/** True when the post can host an in-place tombstone (our mount lives inside its box). */
export function canTombstone(root: HTMLElement, mount: HTMLElement | null): boolean {
  return !!mount && boxOf(root).contains(mount);
}

/** Make the original invisible but keep its space (the shards take over visually). */
export function hidePost(root: HTMLElement, mount: HTMLElement | null, fade = false): void {
  remember(root, mount);
  if (fade) {
    root.style.transition = 'opacity 220ms ease-out';
    root.style.opacity = '0';
  } else root.style.visibility = 'hidden';
}

function animateHeight(box: HTMLElement, to: number, ms: number, extra: Partial<CSSStyleDeclaration> = {}): Promise<void> {
  const h = box.offsetHeight;
  Object.assign(box.style, { height: `${h}px`, overflow: 'hidden', boxSizing: 'border-box', transition: 'none' });
  void box.offsetHeight; // Commit the start height before transitioning.
  box.style.transition = ms ? `height ${ms}ms ${EASE}, padding ${ms}ms ${EASE}, margin ${ms}ms ${EASE}, border-width ${ms}ms ${EASE}, opacity ${ms}ms` : 'none';
  Object.assign(box.style, { height: `${to}px`, paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', ...extra });
  return new Promise((resolve) => window.setTimeout(resolve, ms + 20));
}

/** Shrink the post to roughly the tombstone's height. Call pinTombstone() once it renders. */
export function collapseToTombstone(root: HTMLElement, mount: HTMLElement, ms = 360): Promise<void> {
  const s = remember(root, mount);
  // Opacity can't be overridden by the mount, visibility can: switch the
  // reduced-motion fade over to visibility before the tombstone shows.
  for (const el of new Set([root, s.box])) Object.assign(el.style, { visibility: 'hidden', opacity: '1' });
  return animateHeight(s.box, TOMB_GUESS, ms);
}

/** Fit the window to the rendered tombstone and scroll it into view. */
export function pinTombstone(root: HTMLElement, mount: HTMLElement): void {
  const s = remember(root, mount);
  const box = s.box;
  Object.assign(mount.style, { visibility: 'visible', opacity: '1' });
  box.style.transition = 'none';
  box.style.height = `${mount.offsetHeight}px`;
  box.scrollTop = 0;
  const offset = mount.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientTop;
  box.scrollTop = Math.max(0, offset);
}

/** Collapse to nothing, then display:none. Resolves when hidden. */
export async function collapseAway(root: HTMLElement, mount: HTMLElement | null, ms = 300): Promise<void> {
  const s = remember(root, mount);
  if (!s.box.isConnected) return;
  const cs = getComputedStyle(s.box);
  Object.assign(s.box.style, { marginTop: cs.marginTop, marginBottom: cs.marginBottom });
  await animateHeight(s.box, 0, ms, { marginTop: '0px', marginBottom: '0px', opacity: '0' });
  hideInstantly(root, mount);
}

/** For posts destroyed earlier this session: gone without ceremony. */
export function hideInstantly(root: HTMLElement, mount: HTMLElement | null): void {
  remember(root, mount);
  root.style.display = 'none';
}

/** Undo: put every style back exactly as LinkedIn had it. */
export function restorePost(root: HTMLElement): void {
  const s = saved.get(root);
  if (!s) return;
  saved.delete(root);
  s.box.scrollTop = 0;
  setAttr(root, s.rootStyle);
  if (s.box !== root) setAttr(s.box, s.boxStyle);
  if (s.mount) setAttr(s.mount, s.mountStyle);
}

export function isCollapsed(root: HTMLElement): boolean {
  return saved.has(root);
}
