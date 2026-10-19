// Canvas effects: slop droplets, splat stickers, debris, sparks, shockwave,
// flash and the KA-SLOP! burst. Plain arrays of numbers, no per-frame allocation.

import { FX, loadImage } from '../ui/assets';

const SLOP = ['#7ED321', '#9BE33B', '#5DB31C', '#B8F05A', '#3F9A1A'];
const SPARK = ['#FFD23F', '#FF8A1F', '#FFFFFF'];
const NAVY = '#1B1F3B';
const GRAVITY = 1900;

const enum Kind { Blob, Splat, Debris, Spark, Puff }

interface Particle {
  kind: Kind;
  x: number; y: number; vx: number; vy: number;
  r: number; rot: number; vr: number;
  life: number; max: number;
  color: string;
  img: HTMLImageElement | null;
}

export interface BurstOptions {
  x: number;
  y: number;
  /** 0–1: how big the eruption is (scaled by slop tier). */
  power: number;
  /** Card background, for debris confetti. */
  debrisColor: string;
}

let splats: (HTMLImageElement | null)[] = [];
let kaboom: HTMLImageElement | null = null;
let preloaded = false;

/** Warm the sprite cache (call on Destroy hover/press, before the boom). */
export function preloadFx(): void {
  if (preloaded) return;
  preloaded = true;
  void Promise.all(FX.splats().map((s) => loadImage(s))).then((imgs) => (splats = imgs));
  void loadImage(FX.kaboom()).then((img) => (kaboom = img));
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]): T => xs[(Math.random() * xs.length) | 0]!;

export class ParticleSystem {
  private ps: Particle[] = [];

  burst(o: BurstOptions): void {
    const n = Math.round(46 + 50 * o.power);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(260, 900) * (0.7 + 0.6 * o.power);
      this.ps.push({
        kind: Kind.Blob, x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rand(150, 450),
        r: rand(3, 9) * (0.8 + o.power * 0.5), rot: 0, vr: 0, life: 0, max: rand(0.7, 1.25),
        color: pick(SLOP), img: null,
      });
    }
    const sprites = splats.filter(Boolean) as HTMLImageElement[];
    for (let i = 0; i < 4 + Math.round(5 * o.power); i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(200, 560);
      this.ps.push({
        kind: Kind.Splat, x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 320,
        r: rand(26, 54), rot: rand(0, 6.28), vr: rand(-6, 6), life: 0, max: rand(0.8, 1.2),
        color: pick(SLOP), img: sprites.length ? pick(sprites) : null,
      });
    }
    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(300, 800);
      this.ps.push({
        kind: Kind.Debris, x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 250,
        r: rand(4, 10), rot: rand(0, 6.28), vr: rand(-14, 14), life: 0, max: rand(0.8, 1.3),
        color: o.debrisColor, img: null,
      });
    }
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(700, 1400);
      this.ps.push({
        kind: Kind.Spark, x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: rand(1.5, 3), rot: 0, vr: 0, life: 0, max: rand(0.25, 0.5), color: pick(SPARK), img: null,
      });
    }
  }

  /** Soft puff for reduced motion: no flying, no flashing. */
  puff(x: number, y: number, w: number, h: number): void {
    for (let i = 0; i < 9; i++) {
      this.ps.push({
        kind: Kind.Puff, x: x + rand(-w / 3, w / 3), y: y + rand(-h / 4, h / 4), vx: 0, vy: -rand(10, 30),
        r: rand(18, 36), rot: 0, vr: 0, life: 0, max: rand(0.5, 0.8), color: '#B8F05A', img: null,
      });
    }
  }

  get alive(): boolean {
    return this.ps.length > 0;
  }

  step(ctx: CanvasRenderingContext2D, dt: number): void {
    const ps = this.ps;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]!;
      p.life += dt;
      if (p.life >= p.max) continue;
      const drag = p.kind === Kind.Spark ? 0.9 : 0.985;
      p.vx *= drag;
      p.vy = p.vy * drag + (p.kind === Kind.Puff ? 0 : GRAVITY * dt * (p.kind === Kind.Spark ? 0.3 : 1));
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      draw(ctx, p);
      ps[w++] = p;
    }
    ps.length = w;
  }

  clear(): void {
    this.ps.length = 0;
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle): void {
  const t = p.life / p.max;
  const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  ctx.globalAlpha = fade;
  switch (p.kind) {
    case Kind.Blob: {
      // Stretch along velocity: gooey, not confetti.
      const speed = Math.hypot(p.vx, p.vy);
      const stretch = Math.min(2.2, 1 + speed / 900);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * stretch, p.r / Math.sqrt(stretch), 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.r * 0.3 * stretch, -p.r * 0.3, p.r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fill();
      ctx.restore();
      break;
    }
    case Kind.Splat: {
      const grow = Math.min(1, p.life / 0.12);
      const s = p.r * 2 * (0.4 + 0.6 * grow);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.img) ctx.drawImage(p.img, -s / 2, -s / 2, s, s);
      else {
        // Vector splat: a lumpy blob with a navy outline.
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          const rr = (s / 2) * (k % 2 ? 0.62 : 1);
          const x = Math.cos(a) * rr;
          const y = Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = NAVY;
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case Kind.Debris: {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(27,31,59,.55)';
      ctx.strokeRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      ctx.restore();
      break;
    }
    case Kind.Spark: {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.r;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
      break;
    }
    case Kind.Puff: {
      ctx.globalAlpha = 0.45 * (1 - t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + t), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

/** Full-screen flash. t: seconds since the boom. */
export function drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, t: number): void {
  const a = Math.max(0, 0.55 - t * 3.6);
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
  g.addColorStop(0, `rgba(255,255,240,${a})`);
  g.addColorStop(0.35, `rgba(214,255,160,${a * 0.6})`);
  g.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawShockwave(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, power: number): void {
  const d = 0.42;
  if (t > d) return;
  const k = t / d;
  const r = (60 + 320 * power) * (1 - Math.pow(1 - k, 3));
  ctx.globalAlpha = 1 - k;
  ctx.lineWidth = 10 * (1 - k) + 1;
  ctx.strokeStyle = '#B8F05A';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = NAVY;
  ctx.beginPath();
  ctx.arc(x, y, r + 6 * (1 - k), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** KA-SLOP! comic burst: overshoot pop, hang, fade. */
export function drawKaboom(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, size: number): boolean {
  const total = 0.95;
  if (t > total) return false;
  const pop = t < 0.14 ? t / 0.14 : 1;
  const ease = pop < 1 ? 1 - Math.pow(1 - pop, 3) : 1;
  const over = t < 0.14 ? 1.25 * ease : 1.25 - 0.25 * Math.min(1, (t - 0.14) / 0.12);
  const s = size * over;
  const fade = t > 0.65 ? 1 - (t - 0.65) / 0.3 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.translate(x, y);
  ctx.rotate(-0.12 + 0.05 * Math.sin(t * 30) * (1 - Math.min(1, t * 3)));
  if (kaboom) {
    const h = (s * kaboom.naturalHeight) / (kaboom.naturalWidth || 1);
    ctx.drawImage(kaboom, -s / 2, -h / 2, s, h);
  }
  else drawVectorKaboom(ctx, s);
  ctx.restore();
  return true;
}

function drawVectorKaboom(ctx: CanvasRenderingContext2D, s: number): void {
  const spikes = 14;
  ctx.beginPath();
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = (s / 2) * (i % 2 ? 0.62 : 1) * (i % 4 === 0 ? 1 : 0.92);
    const px = Math.cos(a) * r * 1.25;
    const py = Math.sin(a) * r * 0.85;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFD23F';
  ctx.fill();
  ctx.lineWidth = Math.max(3, s * 0.03);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.scale(0.72, 0.72);
  ctx.beginPath();
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 + 0.1;
    const r = (s / 2) * (i % 2 ? 0.66 : 1);
    const px = Math.cos(a) * r * 1.2;
    const py = Math.sin(a) * r * 0.8;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#7ED321';
  ctx.fill();
  ctx.scale(1 / 0.72, 1 / 0.72);
  ctx.font = `900 ${Math.round(s * 0.2)}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(4, s * 0.035);
  ctx.strokeStyle = NAVY;
  ctx.strokeText('KA-SLOP!', 0, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('KA-SLOP!', 0, 0);
}

/** Crack lines spreading from the impact point before the boom. */
export function drawCracks(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  edges: ReadonlyArray<readonly [number, number, number, number]>,
  k: number,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of edges) {
    const d1 = Math.hypot(x1 - ox, y1 - oy);
    const d2 = Math.hypot(x2 - ox, y2 - oy);
    const reach = k * 900;
    if (Math.min(d1, d2) > reach) continue;
    const t = Math.min(1, (reach - Math.min(d1, d2)) / Math.max(1, Math.abs(d2 - d1)));
    const [ax, ay, bx, by] = d1 <= d2 ? [x1, y1, x2, y2] : [x2, y2, x1, y1];
    const ex = ax + (bx - ax) * t;
    const ey = ay + (by - ay) * t;
    ctx.strokeStyle = 'rgba(27,31,59,.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,255,160,.95)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}
