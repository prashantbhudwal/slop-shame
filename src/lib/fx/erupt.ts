// The Destroy eruption. The post's real pixels can't be captured
// (tabs.captureVisibleTab needs <all_urls> or activeTab, verified on Chromium
// 156), so we shatter the post itself: N deep clones, each clipped to one
// glass shard with clip-path, slotted into the shared FX layer so LinkedIn's
// own CSS still styles them. Shards fly on a tiny physics sim driven by the
// layer's single rAF loop; slop, sparks, a shockwave and KA-SLOP! go on the
// shared canvas. Everything is removed when done.
//
// Timeline: 0–160ms cracks spread from the click · 160ms BOOM (flash, shake,
// shards fly) · ~550ms the post's space starts collapsing · ≤1.4s all clean.

import { acquire, addTask, release } from './layer';
import { drawCracks, drawFlash, drawKaboom, drawShockwave, ParticleSystem, preloadFx } from './particles';
import { shatter, type Shard } from './shatter';
import { playKaslop, playPoof } from './sound';

export { preloadFx };

export interface EruptOptions {
  /** Click point, viewport coordinates. */
  origin: { x: number; y: number };
  /** 0–1, scales the blast (higher slop tiers erupt harder). */
  power: number;
  reduceMotion: boolean;
  sound: boolean;
  /** Called when the post's space should start collapsing. */
  onCollapse(): void;
}

const CRACK = 0.16;
const SHARD_LIFE = 1.0;
const COLLAPSE_AT = 0.38;
const MAX_CLONE_NODES = 2500;
const OWN_MOUNT = '[data-slop-shame-mount]';

/** First element under `el` that actually has a box (handles display: contents). */
export function boxOf(el: HTMLElement): HTMLElement {
  let cur: HTMLElement = el;
  for (let i = 0; i < 4; i++) {
    if (getComputedStyle(cur).display !== 'contents') return cur;
    const next = cur.firstElementChild;
    if (!(next instanceof HTMLElement)) break;
    cur = next;
  }
  return cur;
}

function cardColor(el: HTMLElement): string {
  for (let cur: HTMLElement | null = el; cur; cur = cur.parentElement) {
    const bg = getComputedStyle(cur).backgroundColor;
    if (bg && !/rgba\(.*,\s*0\)$|transparent/.test(bg)) return bg;
  }
  return '#ffffff';
}

const INHERITED = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'letter-spacing', 'text-align', 'direction', '-webkit-font-smoothing'];

interface ShardState {
  el: HTMLElement | null;
  points: Shard['points'];
  cx: number; cy: number;
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number;
}

/**
 * Build the shard clones for `box`. Returns null when cloning isn't sensible
 * (huge DOM) or fails; the caller then uses the canvas-only fallback.
 */
function buildShards(box: HTMLElement, rect: DOMRect, shards: Shard[], offsetY: number, slot: HTMLElement): HTMLElement[] | null {
  try {
    if (box.getElementsByTagName('*').length > MAX_CLONE_NODES) return null;
    const template = box.cloneNode(true) as HTMLElement;
    const origMount = box.querySelector<HTMLElement>(OWN_MOUNT);
    const parentStyle = getComputedStyle(box.parentElement ?? box);
    const inherited = INHERITED.map((p) => `${p}:${parentStyle.getPropertyValue(p)}`).join(';');

    // Sanitize: no duplicate ids, no feed-adapter hooks, nothing that loads or plays.
    for (const node of [template, ...template.querySelectorAll<HTMLElement>('*')]) {
      node.removeAttribute('id');
      node.removeAttribute('data-urn');
      node.removeAttribute('data-id');
      node.removeAttribute('componentkey');
      node.removeAttribute('autoplay');
      if (node.tagName === 'IMG') {
        node.setAttribute('loading', 'eager');
        node.setAttribute('decoding', 'sync');
      }
    }
    for (const n of template.querySelectorAll('script, noscript, iframe, object, embed, audio, source, track')) n.replaceWith(document.createElement('div'));

    // Videos and canvases don't clone their pixels: snapshot each once.
    const snaps: HTMLCanvasElement[] = [];
    const origMedia = box.querySelectorAll<HTMLVideoElement | HTMLCanvasElement>('video, canvas');
    const cloneMedia = template.querySelectorAll<HTMLElement>('video, canvas');
    origMedia.forEach((m, i) => {
      const c = document.createElement('canvas');
      const w = m instanceof HTMLVideoElement ? m.videoWidth : m.width;
      const h = m instanceof HTMLVideoElement ? m.videoHeight : m.height;
      c.width = w || 1;
      c.height = h || 1;
      try { c.getContext('2d')?.drawImage(m, 0, 0); } catch { /* not ready: black frame */ }
      snaps.push(c);
      const placeholder = document.createElement('canvas');
      placeholder.className = m.className;
      placeholder.style.cssText = `display:block;width:${m.offsetWidth}px;height:${m.offsetHeight}px;background:#000`;
      placeholder.setAttribute('data-ss-snap', String(i));
      cloneMedia[i]?.replaceWith(placeholder);
    });

    const cloneMount = template.querySelector<HTMLElement>(OWN_MOUNT);
    if (cloneMount) {
      cloneMount.removeAttribute('data-slop-shame-mount');
      cloneMount.style.height = `${origMount?.offsetHeight ?? 0}px`;
      cloneMount.setAttribute('data-ss-badge', '');
    }

    Object.assign(template.style, {
      margin: '0', width: `${rect.width}px`, height: `${rect.height}px`, maxWidth: 'none', boxSizing: 'border-box',
      visibility: 'visible', opacity: '1', transform: 'none', position: 'relative', inset: 'auto', transition: 'none', animation: 'none',
    });
    const bg = cardColor(box);
    if (getComputedStyle(box).backgroundColor.match(/rgba\(.*,\s*0\)$|transparent/)) template.style.background = bg;

    const els: HTMLElement[] = [];
    for (const s of shards) {
      const wrap = document.createElement('div');
      const poly = s.points.map(([x, y]) => `${x.toFixed(1)}px ${(y + offsetY).toFixed(1)}px`).join(',');
      wrap.style.cssText = `${inherited};position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;padding:0;`
        + `clip-path:polygon(${poly});will-change:transform,opacity;transform-origin:${s.cx.toFixed(1)}px ${(s.cy + offsetY).toFixed(1)}px;`
        + 'pointer-events:none;contain:layout paint style;';
      const clone = template.cloneNode(true) as HTMLElement;
      // Re-render the badge into the clone so it shatters with the post.
      const badge = clone.querySelector<HTMLElement>('[data-ss-badge]');
      if (badge && origMount?.shadowRoot) {
        const sr = badge.attachShadow({ mode: 'open' });
        sr.adoptedStyleSheets = origMount.shadowRoot.adoptedStyleSheets;
        sr.innerHTML = origMount.shadowRoot.innerHTML;
      }
      for (const c of clone.querySelectorAll<HTMLCanvasElement>('canvas[data-ss-snap]')) {
        const snap = snaps[Number(c.getAttribute('data-ss-snap'))];
        if (!snap) continue;
        c.width = snap.width;
        c.height = snap.height;
        c.getContext('2d')?.drawImage(snap, 0, 0);
      }
      wrap.append(clone);
      els.push(wrap);
    }
    slot.append(...els);
    return els;
  } catch {
    return null;
  }
}

/**
 * Erupt `el`. Builds the shards synchronously (so the caller can hide the
 * original in the same frame) and resolves when every effect is cleaned up.
 */
export function erupt(el: HTMLElement, opts: EruptOptions): Promise<void> {
  const box = boxOf(el);
  const rect = box.getBoundingClientRect();
  const vh = window.innerHeight;
  const layer = acquire();
  const ox = opts.origin.x;
  const oy = opts.origin.y;
  const power = Math.max(0.2, Math.min(1, opts.power));
  const particles = new ParticleSystem();
  const debris = cardColor(box);

  if (opts.reduceMotion) {
    if (opts.sound) playPoof();
    particles.puff(rect.left + rect.width / 2, Math.min(Math.max(rect.top + rect.height / 2, 40), vh - 40), rect.width, Math.min(rect.height, vh));
    let collapsed = false;
    const start = performance.now();
    return new Promise((resolve) => {
      addTask((now, dt) => {
        const t = (now - start) / 1000;
        if (!collapsed && t > 0.22) { collapsed = true; opts.onCollapse(); }
        particles.step(layer.ctx, dt);
        const alive = t < 0.3 || particles.alive;
        if (!alive) { release(); resolve(); }
        return alive;
      });
    });
  }

  // Only shatter what's on screen (tall posts): rect-local coordinates.
  const visTop = Math.max(rect.top, -40);
  const visBottom = Math.min(rect.bottom, vh + 40);
  const visH = Math.max(1, visBottom - visTop);
  const offsetY = visTop - rect.top;
  const lx = ox - rect.left;
  const ly = oy - visTop;
  const big = box.getElementsByTagName('*').length > 900;
  const pattern = shatter(rect.width, visH, lx, ly, { rays: big ? 6 : 8, rings: big ? 2 : 3 });
  const els = rect.width > 0 && rect.height > 0 ? buildShards(box, rect, pattern, offsetY, layer.host) : null;

  const shards: ShardState[] = pattern.map((s, i) => {
    const dx = s.cx - lx;
    const dy = s.cy - ly;
    const d = Math.hypot(dx, dy) || 1;
    const speed = (650 + 850 * power) * (1.2 - s.near * 0.75) * (0.8 + Math.random() * 0.4);
    return {
      el: els?.[i] ?? null,
      points: s.points,
      cx: s.cx, cy: s.cy,
      x: 0, y: 0,
      vx: (dx / d) * speed + (Math.random() - 0.5) * 120,
      vy: (dy / d) * speed - (220 + Math.random() * 380),
      rot: 0,
      vr: (Math.random() - 0.5) * 2 * (220 + 520 * (1 - s.near)),
    };
  });

  // Crack edges (rect-local → viewport), drawn while the post holds together.
  const edges: [number, number, number, number][] = [];
  for (const s of pattern) {
    for (let i = 0; i < s.points.length; i++) {
      const [x1, y1] = s.points[i]!;
      const [x2, y2] = s.points[(i + 1) % s.points.length]!;
      edges.push([x1 + rect.left, y1 + visTop, x2 + rect.left, y2 + visTop]);
    }
  }

  if (opts.sound) playKaslop(CRACK);
  const start = performance.now();
  let boomed = false;
  let collapsed = false;
  let shardsGone = false;
  const kaboomSize = Math.min(330, Math.max(210, rect.width * 0.5)) * (0.8 + 0.25 * power);
  const kx = Math.min(Math.max(ox, kaboomSize / 2), window.innerWidth - kaboomSize / 2);
  const ky = Math.min(Math.max(oy, kaboomSize / 2.6), vh - kaboomSize / 2.6);

  const removeShards = () => {
    if (shardsGone) return;
    shardsGone = true;
    for (const s of shards) s.el?.remove();
    for (const s of shards) s.el = null;
  };

  return new Promise((resolve) => {
    addTask((now, dt) => {
      const { ctx, width, height } = layer;
      const t = (now - start) / 1000;
      if (t < CRACK) {
        // Hold together and tremble while cracks race outward.
        const j = 1.6 * (t / CRACK);
        for (const s of shards) if (s.el) s.el.style.transform = `translate3d(${((Math.random() - 0.5) * j).toFixed(2)}px,${((Math.random() - 0.5) * j).toFixed(2)}px,0)`;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.left, visTop, rect.width, visH);
        ctx.clip();
        if (!els) drawCanvasShards(ctx, shards, rect.left, visTop, rect.width, visH, debris, 1);
        drawCracks(ctx, ox, oy, edges, t / CRACK);
        ctx.restore();
        return true;
      }
      if (!boomed) {
        boomed = true;
        particles.burst({ x: ox, y: oy, power, debrisColor: debris });
      }
      const tb = t - CRACK;

      // Camera shake on our own layer (never LinkedIn's DOM).
      if (tb < 0.32) {
        const a = 10 * power * (1 - tb / 0.32);
        layer.host.style.transform = `translate3d(${((Math.random() - 0.5) * a).toFixed(1)}px,${((Math.random() - 0.5) * a).toFixed(1)}px,0)`;
      } else if (layer.host.style.transform) layer.host.style.transform = '';

      if (!shardsGone) {
        const fade = tb > 0.55 ? Math.max(0, 1 - (tb - 0.55) / (SHARD_LIFE - 0.55)) : 1;
        const scale = 1 - 0.18 * Math.min(1, tb / SHARD_LIFE);
        for (const s of shards) {
          s.vy += 2300 * dt;
          s.vx *= 0.995;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rot += s.vr * dt;
          if (s.el) {
            s.el.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) rotate(${s.rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
            s.el.style.opacity = fade.toFixed(3);
          }
        }
        if (!els) drawCanvasShards(ctx, shards, rect.left, visTop, rect.width, visH, debris, fade);
        if (tb >= SHARD_LIFE) removeShards();
      }

      if (!collapsed && tb > COLLAPSE_AT) {
        collapsed = true;
        opts.onCollapse();
      }

      drawShockwave(ctx, ox, oy, tb, power);
      particles.step(ctx, dt);
      const kaboomAlive = drawKaboom(ctx, kx, ky, tb, kaboomSize);
      drawFlash(ctx, width, height, ox, oy, tb);

      const alive = !shardsGone || particles.alive || kaboomAlive;
      if (!alive) {
        layer.host.style.transform = '';
        release();
        resolve();
      }
      return alive;
    });
  });
}

/** Fallback when the post can't be cloned: flat card-colored glass on the canvas. */
function drawCanvasShards(ctx: CanvasRenderingContext2D, shards: ShardState[], left: number, top: number, w: number, h: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const s of shards) {
    ctx.save();
    ctx.translate(left + s.cx + s.x, top + s.cy + s.y);
    ctx.rotate((s.rot * Math.PI) / 180);
    ctx.beginPath();
    ctx.rect(-s.cx, -s.cy, w, h); // The shard is glass cut from the card, not beyond it.
    ctx.clip();
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x - s.cx, y - s.cy) : ctx.moveTo(x - s.cx, y - s.cy)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(27,31,59,.7)';
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
