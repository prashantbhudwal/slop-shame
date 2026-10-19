// "Download as image": draws the shame card on a canvas by hand (no
// html2canvas) at 1080×1350. Extension art is fetched as blobs so the canvas
// stays exportable. The author's photo needs CORS: when LinkedIn's CDN doesn't
// allow it, Sloppy stands in. By default the photo is pixelated and the name
// is initials (see ShameModal's share toggle).

import type { SlopReport } from '../engine/types';
import type { CardFacts } from '../shame/card';
import { CATEGORY_META } from '../shame/categories';
import type { Shame } from '../shame/types';
import { SHAME_ART, categoryIcon, mascot, type MascotPose } from './assets';

const W = 1080;
const H = 1350;
const NAVY = '#1B1F3B';
const SLOP = '#7ED321';
const RED = '#D7262E';
const SANS = '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = '"Courier New", Courier, monospace';
const IMPACT = 'Impact, "Arial Black", "Helvetica Neue", sans-serif';
const SCRIPT = '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive';
const SLAB = 'Rockwell, "Roboto Slab", "Courier New", Georgia, serif';

type Img = ImageBitmap | null;

interface Art {
  avatar: Img;
  pose: Img;
  seal: Img;
  stamp: Img;
  frame: Img;
  category: Img;
}

export interface CardImageInput {
  shame: Shame;
  facts: CardFacts;
  report: SlopReport;
  avatarUrl?: string;
  /** Pixelate the photo (default for anything leaving the extension). */
  anonymize: boolean;
}

const POSE: Record<Shame['layout'], MascotPose> = {
  citation: 'sloppy',
  certificate: 'sloppy-crowned',
  tabloid: 'sloppy-horrified',
  'wanted-poster': 'sloppy',
  'report-card': 'sloppy',
  eulogy: 'sloppy-exploded',
};

async function bitmap(url: string | undefined, credentials: RequestCredentials = 'omit'): Promise<Img> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors', credentials });
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

/** Mosaic a photo so the face isn't recognizable. */
function pixelate(img: ImageBitmap): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = small.height = 9;
  const s = small.getContext('2d')!;
  s.drawImage(img, 0, 0, 9, 9);
  const out = document.createElement('canvas');
  out.width = out.height = 360;
  const o = out.getContext('2d')!;
  o.imageSmoothingEnabled = false;
  o.drawImage(small, 0, 0, 360, 360);
  return out;
}

// ── Text helpers ───────────────────────────────────────────────────────────

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= max || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Largest font size (step 2px) at which `text` fits in `maxLines` lines. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, max: number, maxLines: number, from: number, to: number): { px: number; lines: string[] } {
  for (let px = from; px >= to; px -= 2) {
    ctx.font = font(px);
    const lines = wrap(ctx, text, max);
    if (lines.length <= maxLines) return { px, lines };
  }
  ctx.font = font(to);
  const lines = wrap(ctx, text, max).slice(0, maxLines);
  lines[maxLines - 1] = `${(lines[maxLines - 1] ?? '').replace(/\s*\S*$/, '')}…`;
  return { px: to, lines };
}

function lines(ctx: CanvasRenderingContext2D, ls: string[], x: number, y: number, lh: number): number {
  for (const l of ls) {
    ctx.fillText(l, x, y);
    y += lh;
  }
  return y;
}

function block(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, x: number, y: number, max: number, maxLines: number, from: number, to: number, lhRatio = 1.32): number {
  const { px, lines: ls } = fit(ctx, text, font, max, maxLines, from, to);
  ctx.font = font(px);
  return lines(ctx, ls, x, y + px, px * lhRatio);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number, sw: number, sh: number): void {
  const k = Math.max(w / sw, h / sh);
  const dw = sw * k;
  const dh = sh * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function sticker(ctx: CanvasRenderingContext2D, img: Img, emoji: string, x: number, y: number, size: number): void {
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    ctx.save();
    ctx.font = `${Math.round(size * 0.8)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + size / 2, y + size / 2);
    ctx.restore();
  }
}

/** The photo, or Sloppy standing in. */
function portrait(ctx: CanvasRenderingContext2D, art: Art, anonymize: boolean, x: number, y: number, w: number, h: number, filter = 'none'): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (art.avatar) {
    ctx.filter = filter;
    const src = anonymize ? pixelate(art.avatar) : art.avatar;
    const sw = src instanceof HTMLCanvasElement ? src.width : src.width;
    const sh = src instanceof HTMLCanvasElement ? src.height : src.height;
    ctx.imageSmoothingEnabled = !anonymize;
    cover(ctx, src, x, y, w, h, sw, sh);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#E8EDDC';
    ctx.fillRect(x, y, w, h);
    const s = Math.min(w, h) * 0.8;
    sticker(ctx, art.pose, '🫠', x + (w - s) / 2, y + (h - s) / 2 + 8, s);
    ctx.fillStyle = NAVY;
    ctx.font = `800 ${Math.round(w * 0.06)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('IDENTITY PROTECTED', x + w / 2, y + h - 16);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function stamp(ctx: CanvasRenderingContext2D, art: Art, x: number, y: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.16);
  if (art.stamp) {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(art.stamp, -size / 2, -size / 2, size, size);
  } else {
    ctx.strokeStyle = RED;
    ctx.fillStyle = RED;
    ctx.lineWidth = 10;
    ctx.globalAlpha = 0.85;
    ctx.strokeRect(-size / 2, -size * 0.2, size, size * 0.4);
    ctx.font = `900 ${Math.round(size * 0.24)}px ${IMPACT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHAMED', 0, 4);
  }
  ctx.restore();
}

function brand(ctx: CanvasRenderingContext2D, report: SlopReport, dark = false): void {
  ctx.save();
  ctx.font = `700 22px ${SANS}`;
  ctx.fillStyle = dark ? 'rgba(255,255,255,.75)' : 'rgba(27,31,59,.6)';
  ctx.textAlign = 'center';
  ctx.fillText(`Slop Index ${report.score}/100 · ${report.tier.label} · issued by Slop Shame`, W / 2, H - 26);
  ctx.restore();
}

// ── Layouts ────────────────────────────────────────────────────────────────

function citation(ctx: CanvasRenderingContext2D, d: CardImageInput, art: Art): void {
  ctx.fillStyle = '#FBF6DF';
  ctx.fillRect(0, 0, W, H);
  // Perforation.
  ctx.fillStyle = '#E2DCC0';
  for (let x = 20; x < W; x += 40) {
    ctx.beginPath();
    ctx.arc(x, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFD23F';
  ctx.fillRect(0, 40, W, 120);
  ctx.fillStyle = NAVY;
  ctx.font = `900 40px ${SANS}`;
  ctx.fillText('DEPARTMENT OF SLOP ENFORCEMENT', 60, 115);
  ctx.font = `700 26px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(`No. ${d.facts.ticket}`, W - 60, 115);
  ctx.textAlign = 'left';
  ctx.font = `900 54px ${IMPACT}`;
  ctx.fillStyle = RED;
  ctx.fillText('NOTICE OF VIOLATION', 60, 240);

  const rows: [string, string][] = [['OFFENDER', d.facts.name]];
  if (d.facts.headline) rows.push(['HEADLINE', d.facts.headline]);
  rows.push(['VIOLATION', d.shame.title], ['SLOP INDEX', `${d.report.score} · ${d.report.tier.label}`], ['FINE', d.facts.fine]);
  let y = 290;
  for (const [k, v] of rows) {
    ctx.fillStyle = 'rgba(27,31,59,.55)';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText(k, 60, y + 30);
    ctx.fillStyle = NAVY;
    const font = (px: number) => `${k === 'VIOLATION' || k === 'FINE' ? 800 : 600} ${px}px ${SANS}`;
    const end = block(ctx, v, font, 290, y + 2, W - 360, k === 'VIOLATION' ? 2 : 1, k === 'FINE' ? 40 : 32, 22, 1.2);
    y = Math.max(y + 58, end - 10);
    ctx.strokeStyle = 'rgba(27,31,59,.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W - 60, y);
    ctx.stroke();
    y += 14;
  }
  ctx.fillStyle = 'rgba(27,31,59,.55)';
  ctx.font = `700 24px ${MONO}`;
  ctx.fillText('OFFICER’S NOTES', 60, y + 40);
  ctx.fillStyle = NAVY;
  y = block(ctx, d.shame.body.replace(/^Officer’s notes:\s*/, ''), (px) => `${px}px ${MONO}`, 60, y + 56, W - 120, 9, 34, 22, 1.35);
  if (d.shame.footer) {
    ctx.fillStyle = RED;
    block(ctx, d.shame.footer, (px) => `italic 700 ${px}px ${SANS}`, 60, y + 16, W - 340, 2, 30, 22);
  }
  // Barcode + officer.
  let bx = 60;
  ctx.fillStyle = NAVY;
  for (let i = 0; i < 60; i++) {
    const w = 2 + ((i * 7 + d.report.score) % 5);
    if (i % 3 !== 1) ctx.fillRect(bx, H - 190, w, 100);
    bx += w + 3;
  }
  sticker(ctx, art.pose, '👮', W - 270, H - 290, 210);
  if (art.category) sticker(ctx, art.category, '', W - 400, H - 210, 120);
  stamp(ctx, art, W - 230, 330, 330);
  brand(ctx, d.report);
}

function certificate(ctx: CanvasRenderingContext2D, d: CardImageInput, art: Art): void {
  ctx.fillStyle = '#FFFBEA';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 5;
  ctx.strokeRect(62, 62, W - 124, H - 124);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(27,31,59,.65)';
  ctx.font = `700 24px ${SANS}`;
  ctx.fillText('DEPARTMENT OF SLOP ENFORCEMENT · OFFICIAL RECOGNITION', W / 2, 150);
  ctx.fillStyle = NAVY;
  let y = block(ctx, d.shame.title, (px) => `italic 700 ${px}px ${SERIF}`, W / 2, 180, W - 220, 3, 76, 44, 1.15);
  ctx.font = `italic 30px ${SERIF}`;
  ctx.fillStyle = 'rgba(27,31,59,.7)';
  ctx.fillText('presented to', W / 2, y + 30);
  ctx.fillStyle = NAVY;
  ctx.font = `700 54px ${SERIF}`;
  ctx.fillText(d.facts.name, W / 2, y + 100);
  y += 110;
  if (d.facts.headline) {
    ctx.fillStyle = 'rgba(27,31,59,.6)';
    y = block(ctx, d.facts.headline, (px) => `italic ${px}px ${SERIF}`, W / 2, y, W - 260, 2, 26, 20) - 6;
  }
  ctx.fillStyle = NAVY;
  y = block(ctx, d.shame.body, (px) => `${px}px ${SERIF}`, W / 2, y + 20, W - 240, 8, 34, 24, 1.4);
  if (d.shame.footer) {
    ctx.fillStyle = 'rgba(27,31,59,.7)';
    block(ctx, d.shame.footer, (px) => `italic ${px}px ${SERIF}`, W / 2, y + 10, W - 260, 2, 26, 20);
  }
  ctx.textAlign = 'left';
  sticker(ctx, art.seal, '🏅', 110, H - 400, 250);
  ctx.textAlign = 'center';
  for (const [x, text, label] of [[560, 'Sloppy', 'Chief Slop Officer'], [820, d.facts.date, 'Date of issue']] as const) {
    ctx.fillStyle = NAVY;
    ctx.font = `${text === 'Sloppy' ? 64 : 34}px ${SCRIPT}`;
    ctx.fillText(text, x, H - 240);
    ctx.fillRect(x - 120, H - 222, 240, 3);
    ctx.font = `600 22px ${SANS}`;
    ctx.fillStyle = 'rgba(27,31,59,.65)';
    ctx.fillText(label, x, H - 190);
  }
  ctx.textAlign = 'left';
  sticker(ctx, art.pose, '👑', W - 260, 70, 180);
  stamp(ctx, art, 250, 200, 260);
  brand(ctx, d.report);
}

function tabloid(ctx: CanvasRenderingContext2D, d: CardImageInput, art: Art): void {
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, W, 170);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 112px ${IMPACT}`;
  ctx.textAlign = 'center';
  ctx.fillText('THE DAILY SLOP', W / 2, 125);
  ctx.fillStyle = NAVY;
  ctx.font = `700 22px ${SANS}`;
  ctx.fillText(`${d.facts.date.toUpperCase()}   ·   SLOP INDEX ${d.report.score}   ·   FREE WITH EVERY PROMPT`, W / 2, 205);
  ctx.fillRect(40, 222, W - 80, 4);
  ctx.fillStyle = '#FFD23F';
  ctx.fillRect(40, 244, 260, 52);
  ctx.fillStyle = NAVY;
  ctx.font = `900 34px ${IMPACT}`;
  ctx.fillText('EXCLUSIVE', 170, 283);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111';
  const y = block(ctx, d.shame.title.toUpperCase(), (px) => `900 ${px}px ${IMPACT}`, 40, 300, W - 80, 3, 104, 56, 1.02);
  const top = y + 10;
  portrait(ctx, art, d.anonymize, 40, top, 430, 470, 'grayscale(1) contrast(1.25)');
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, top, 430, 470);
  if (art.category) sticker(ctx, art.category, '', 50, top + 350, 110);
  ctx.save();
  ctx.translate(410, top + 50);
  ctx.rotate(0.2);
  ctx.fillStyle = '#FFD23F';
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 52 : 78;
    if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.font = `900 30px ${IMPACT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SHOCK!', 0, 11);
  ctx.restore();
  ctx.fillStyle = '#333';
  const cap = d.facts.headline ? `${d.facts.name}, “${d.facts.headline}”` : d.facts.name;
  block(ctx, cap, (px) => `italic ${px}px ${SERIF}`, 40, top + 476, 430, 2, 22, 18);
  ctx.fillStyle = '#111';
  const end = block(ctx, d.shame.body, (px) => `${px}px ${SERIF}`, 500, top - 6, W - 540, 13, 32, 22, 1.36);
  if (end < H - 330) {
    sticker(ctx, art.pose, '😱', 500, end + 10, 120);
    ctx.fillStyle = '#333';
    block(ctx, '“I just scrolled past it,” said one witness. “I’ll never be the same.”', (px) => `italic ${px}px ${SERIF}`, 630, end + 10, W - 670, 4, 24, 18);
  }
  if (d.shame.footer) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, H - 170, W, 100);
    ctx.fillStyle = '#FFD23F';
    block(ctx, d.shame.footer.toUpperCase(), (px) => `900 ${px}px ${IMPACT}`, 40, H - 166, W - 80, 2, 40, 24, 1.1);
  }
  stamp(ctx, art, W - 190, top + 60, 260);
  brand(ctx, d.report);
}

function wanted(ctx: CanvasRenderingContext2D, d: CardImageInput, art: Art): void {
  if (art.frame) ctx.drawImage(art.frame, 0, 0, W, H);
  else {
    const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 900);
    g.addColorStop(0, '#F3E2B3');
    g.addColorStop(1, '#C99B5A');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3B2412';
    ctx.font = `900 190px ${SLAB}`;
    ctx.textAlign = 'center';
    ctx.fillText('WANTED', W / 2, 250);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3B2412';
  ctx.font = `italic 700 34px ${SERIF}`;
  ctx.fillText('— for —', W / 2, 330);
  let y = block(ctx, d.shame.title.toUpperCase(), (px) => `900 ${px}px ${SLAB}`, W / 2, 336, W - 240, 2, 60, 36, 1.08);
  const ph = 380;
  portrait(ctx, art, d.anonymize, W / 2 - 170, y + 10, 340, ph, 'sepia(.85) contrast(1.1)');
  ctx.strokeStyle = '#3B2412';
  ctx.lineWidth = 6;
  ctx.strokeRect(W / 2 - 170, y + 10, 340, ph);
  if (art.category) sticker(ctx, art.category, '', W / 2 + 120, y + ph - 90, 120);
  y += ph + 20;
  ctx.fillStyle = '#3B2412';
  ctx.font = `900 46px ${SLAB}`;
  ctx.fillText(d.facts.name.toUpperCase(), W / 2, y + 44);
  y += 52;
  if (d.facts.headline) y = block(ctx, `a.k.a. “${d.facts.headline}”`, (px) => `italic ${px}px ${SERIF}`, W / 2, y, W - 280, 2, 26, 20) - 4;
  y = block(ctx, d.shame.body, (px) => `${px}px ${SERIF}`, W / 2, y + 6, W - 240, 6, 30, 21, 1.32);
  if (d.shame.footer) block(ctx, d.shame.footer.toUpperCase(), (px) => `900 ${px}px ${SLAB}`, W / 2, Math.max(y + 8, H - 210), W - 260, 2, 36, 24, 1.15);
  ctx.textAlign = 'left';
  stamp(ctx, art, W - 220, 470, 280);
  brand(ctx, d.report);
}

function reportCard(ctx: CanvasRenderingContext2D, d: CardImageInput, art: Art, icons: Map<string, Img>): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(10,102,194,.18)';
  ctx.lineWidth = 2;
  for (let y = 300; y < H; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(215,38,46,.45)';
  ctx.beginPath();
  ctx.moveTo(100, 0);
  ctx.lineTo(100, H);
  ctx.stroke();
  ctx.fillStyle = '#0A66C2';
  ctx.fillRect(0, 0, W, 120);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 46px ${SANS}`;
  ctx.fillText('SLOP ACADEMY', 130, 78);
  ctx.textAlign = 'right';
  ctx.font = `700 28px ${SANS}`;
  ctx.fillText('REPORT CARD · FALL TERM', W - 50, 76);
  ctx.textAlign = 'left';
  ctx.fillStyle = NAVY;
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText(`Student: ${d.facts.name}`, 130, 180);
  if (d.facts.headline) {
    ctx.fillStyle = 'rgba(27,31,59,.6)';
    block(ctx, d.facts.headline, (px) => `${px}px ${SANS}`, 130, 192, W - 180, 1, 24, 18);
  }
  ctx.fillStyle = NAVY;
  let y = block(ctx, d.shame.title, (px) => `900 ${px}px ${SANS}`, 130, 250, W - 180, 2, 56, 36, 1.1);
  y += 10;
  for (const row of d.facts.grades) {
    sticker(ctx, icons.get(row.category) ?? null, CATEGORY_META[row.category].emoji, 130, y, 48);
    ctx.fillStyle = NAVY;
    ctx.font = `600 32px ${SANS}`;
    ctx.fillText(row.subject, 196, y + 36);
    ctx.font = `900 40px ${SCRIPT}`;
    ctx.fillStyle = row.grade === 'A' ? '#2E7D32' : RED;
    ctx.fillText(row.grade, 640, y + 40);
    y += 60;
  }
  ctx.save();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(880, y - 220, 110, 96, -0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.font = `900 120px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.fillText(d.facts.overall, 880, y - 180);
  ctx.font = `700 24px ${SANS}`;
  ctx.fillText(`Slop Index ${d.report.score}`, 880, y - 80);
  ctx.restore();
  ctx.fillStyle = 'rgba(27,31,59,.6)';
  ctx.font = `800 24px ${SANS}`;
  ctx.fillText('TEACHER’S COMMENTS', 130, y + 40);
  ctx.fillStyle = '#123E8C';
  y = block(ctx, d.shame.body, (px) => `${px}px ${SCRIPT}`, 130, y + 50, W - 200, 7, 44, 30, 1.25);
  sticker(ctx, art.pose, '🧑‍🏫', 120, H - 230, 150);
  ctx.fillStyle = NAVY;
  ctx.font = `700 28px ${SANS}`;
  ctx.fillText('Mx. Sloppy, Homeroom 4B', 290, H - 150);
  ctx.fillStyle = 'rgba(27,31,59,.55)';
  ctx.font = `24px ${SANS}`;
  ctx.fillText('Parent/guardian signature: ________________', 290, H - 112);
  stamp(ctx, art, W - 200, 210, 250);
  brand(ctx, d.report);
}

function eulogy(ctx: CanvasRenderingContext2D, d: CardImageInput, art: Art): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2B2F3A');
  g.addColorStop(1, '#14161C');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, W - 100, H - 100);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = `italic 34px ${SERIF}`;
  ctx.fillText('In Loving Memory of', W / 2, 170);
  ctx.fillStyle = '#FFFFFF';
  let y = block(ctx, d.shame.title, (px) => `700 ${px}px ${SERIF}`, W / 2, 190, W - 200, 3, 80, 46, 1.12);
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.font = `26px ${SERIF}`;
  ctx.fillText(`A post by ${d.facts.name} · ${d.facts.date} – ${d.facts.date}`, W / 2, y + 30);
  ctx.font = `64px ${SANS}`;
  ctx.fillText('🕯️', W / 2 - 220, y + 190);
  ctx.fillText('🕯️', W / 2 + 220, y + 190);
  sticker(ctx, art.pose, '🪦', W / 2 - 110, y + 60, 220);
  ctx.fillStyle = '#ECECEC';
  y = block(ctx, d.shame.body, (px) => `${px}px ${SERIF}`, W / 2, y + 300, W - 220, 8, 36, 24, 1.42);
  if (d.shame.footer) {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    y = block(ctx, d.shame.footer, (px) => `italic ${px}px ${SERIF}`, W / 2, y + 16, W - 260, 2, 30, 22);
  }
  ctx.fillStyle = SLOP;
  ctx.font = `700 26px ${SANS}`;
  ctx.fillText(`Cause of death: ${d.report.tier.label} (Slop Index ${d.report.score})`, W / 2, H - 110);
  ctx.textAlign = 'left';
  stamp(ctx, art, W - 210, 150, 230);
  brand(ctx, d.report, true);
}

/** Render the card to a PNG blob. */
export async function renderCardImage(d: CardImageInput): Promise<Blob> {
  const [avatar, pose, seal, stampImg, frame, category] = await Promise.all([
    bitmap(d.avatarUrl),
    bitmap(mascot(POSE[d.shame.layout])),
    d.shame.layout === 'certificate' ? bitmap(SHAME_ART.seal()) : null,
    bitmap(SHAME_ART.stamp()),
    d.shame.layout === 'wanted-poster' ? bitmap(SHAME_ART.wantedFrame()) : null,
    d.shame.category ? bitmap(categoryIcon(d.shame.category)) : null,
  ]);
  const icons = new Map<string, Img>();
  if (d.shame.layout === 'report-card') {
    await Promise.all(d.facts.grades.map(async (r) => icons.set(r.category, await bitmap(categoryIcon(r.category)))));
  }
  const art: Art = { avatar, pose, seal, stamp: stampImg, frame, category };
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';
  switch (d.shame.layout) {
    case 'citation': citation(ctx, d, art); break;
    case 'certificate': certificate(ctx, d, art); break;
    case 'tabloid': tabloid(ctx, d, art); break;
    case 'wanted-poster': wanted(ctx, d, art); break;
    case 'report-card': reportCard(ctx, d, art, icons); break;
    case 'eulogy': eulogy(ctx, d, art); break;
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  for (const b of [avatar, pose, seal, stampImg, frame, category, ...icons.values()]) b?.close();
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error('Could not encode the card');
  return blob;
}
