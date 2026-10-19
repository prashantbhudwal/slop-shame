// The one body-level host for everything that floats over LinkedIn: the FX
// canvas, eruption shards and the shame modal. Created lazily, removed when
// nothing has used it for a moment. One rAF loop drives all effects.
//
//   <div data-slop-shame-mount data-slop-shame-layer>   ← light DOM: shards
//     #shadow-root
//       <slot>      shards render here, styled by LinkedIn's own CSS
//       <canvas>    particles, flash, KA-SLOP
//       <div.ui>    modal / toasts (pointer-events on)
//
// `data-slop-shame-mount` makes the feed adapter ignore this subtree.

export type FrameTask = (now: number, dt: number) => boolean; // return false when done

interface Layer {
  host: HTMLElement;
  shadow: ShadowRoot;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ui: HTMLElement;
  dpr: number;
  width: number;
  height: number;
}

const IDLE_MS = 1500;
let layer: Layer | null = null;
let holds = 0;
let idleTimer: number | undefined;
const tasks = new Set<FrameTask>();
let raf = 0;
let last = 0;

const HOST_CSS = `
:host { all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; contain: strict; }
canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ui { position: absolute; inset: 0; pointer-events: none; }
.ui > * { pointer-events: auto; }
`;

let hostSheet: CSSStyleSheet | null = null;
function hostSheets(): CSSStyleSheet {
  if (!hostSheet) {
    hostSheet = new CSSStyleSheet();
    hostSheet.replaceSync(HOST_CSS);
  }
  return hostSheet;
}

/** Adopt UI stylesheets into the layer; the layer's own host rules always win. */
export function useLayerSheets(l: Layer, sheets: CSSStyleSheet[]): void {
  l.shadow.adoptedStyleSheets = [...sheets, hostSheets()];
}

function resize(l: Layer): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (l.width === w && l.height === h && l.dpr === dpr) return;
  l.dpr = dpr;
  l.width = w;
  l.height = h;
  l.canvas.width = Math.round(w * dpr);
  l.canvas.height = Math.round(h * dpr);
}

const onResize = () => layer && resize(layer);

function create(): Layer {
  const host = document.createElement('div');
  host.setAttribute('data-slop-shame-mount', '');
  host.setAttribute('data-slop-shame-layer', '');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.adoptedStyleSheets = [hostSheets()];
  const slot = document.createElement('slot');
  const canvas = document.createElement('canvas');
  const ui = document.createElement('div');
  ui.className = 'ui';
  shadow.append(slot, canvas, ui);
  (document.body ?? document.documentElement).append(host);
  const ctx = canvas.getContext('2d')!;
  const l: Layer = { host, shadow, canvas, ctx, ui, dpr: 0, width: 0, height: 0 };
  resize(l);
  window.addEventListener('resize', onResize, { passive: true });
  return l;
}

function destroy(): void {
  if (!layer) return;
  window.removeEventListener('resize', onResize);
  layer.canvas.width = layer.canvas.height = 0; // Release the backing store now.
  layer.host.remove();
  layer = null;
}

function scheduleIdle(): void {
  window.clearTimeout(idleTimer);
  idleTimer = undefined;
  if (holds > 0 || tasks.size) return;
  idleTimer = window.setTimeout(() => {
    idleTimer = undefined;
    if (holds === 0 && !tasks.size) destroy();
  }, IDLE_MS);
}

/** Get the layer, creating it if needed. Pair with release(). */
export function acquire(): Layer {
  window.clearTimeout(idleTimer);
  idleTimer = undefined;
  holds++;
  layer ??= create();
  return layer;
}

export function release(): void {
  holds = Math.max(0, holds - 1);
  scheduleIdle();
}

/** Current layer without creating it. */
export function peek(): Layer | null {
  return layer;
}

function frame(now: number): void {
  raf = 0;
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
  last = now;
  if (layer) {
    resize(layer);
    const { ctx, dpr, canvas } = layer;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  for (const task of tasks) {
    let alive = false;
    try {
      alive = task(now, dt);
    } catch {
      alive = false; // A broken effect must never wedge the loop.
    }
    if (!alive) tasks.delete(task);
  }
  if (tasks.size) raf = requestAnimationFrame(frame);
  else {
    last = 0;
    scheduleIdle();
  }
}

/** Run a task every frame until it returns false. */
export function addTask(task: FrameTask): void {
  tasks.add(task);
  window.clearTimeout(idleTimer);
  idleTimer = undefined;
  if (!raf) raf = requestAnimationFrame(frame);
}

/** Tear everything down immediately (content script invalidated / disabled). */
export function disposeLayer(): void {
  tasks.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  last = 0;
  holds = 0;
  window.clearTimeout(idleTimer);
  destroy();
}

export type { Layer };
