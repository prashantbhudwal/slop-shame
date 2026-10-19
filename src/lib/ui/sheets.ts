// Constructable stylesheets shared by every injected shadow root: parsed once,
// adopted by hundreds of posts. Theme switches rewrite one tiny sheet.

import postCss from './styles/post.css?inline';
import modalCss from './styles/modal.css?inline';

export type Theme = 'light' | 'dark';

const LIGHT = `:host{
  --ss-text:#1B1F3B; --ss-muted:#5B6178; --ss-surface:#FFFFFF; --ss-line:#1B1F3B; --ss-line-soft:rgba(27,31,59,.22);
  --ss-drop:#1B1F3B; --ss-track:#EEF1E6; --ss-panel:#F6F8F0; --ss-btn:#FFFFFF; --ss-destroy-bg:#FFE6DE;
  --ss-shame-bg:#FFF1BF; --ss-chip:#F2F3EE; --ss-focus:#0A66C2; --ss-paper:#FFFDF6; color-scheme: light;
}`;
const DARK = `:host{
  --ss-text:#ECEFF6; --ss-muted:#A6ACBF; --ss-surface:#1D2226; --ss-line:#59627A; --ss-line-soft:rgba(200,210,230,.2);
  --ss-drop:#000000; --ss-track:#2A3038; --ss-panel:#22282E; --ss-btn:#2A3038; --ss-destroy-bg:#3B2622;
  --ss-shame-bg:#3A3320; --ss-chip:#252B31; --ss-focus:#71B7FB; --ss-paper:#FFFDF6; color-scheme: dark;
}`;

let base: CSSStyleSheet | null = null;
let modal: CSSStyleSheet | null = null;
let themeSheet: CSSStyleSheet | null = null;
let current: Theme = 'light';

function theme(): CSSStyleSheet {
  if (!themeSheet) {
    themeSheet = new CSSStyleSheet();
    themeSheet.replaceSync(current === 'dark' ? DARK : LIGHT);
  }
  return themeSheet;
}

export function postSheets(): CSSStyleSheet[] {
  if (!base) {
    base = new CSSStyleSheet();
    base.replaceSync(postCss);
  }
  return [theme(), base];
}

export function modalSheets(): CSSStyleSheet[] {
  if (!modal) {
    modal = new CSSStyleSheet();
    modal.replaceSync(modalCss);
  }
  return [theme(), ...postSheets().slice(1), modal];
}

export function setTheme(next: Theme): void {
  if (next === current) return;
  current = next;
  themeSheet?.replaceSync(next === 'dark' ? DARK : LIGHT);
}

export function getTheme(): Theme {
  return current;
}

function luminance(color: string): number | null {
  const m = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
  if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The page's actual background decides (LinkedIn has its own theme setting). */
export function detectTheme(): Theme {
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue;
    const l = luminance(getComputedStyle(el).backgroundColor);
    if (l !== null) return l < 0.35 ? 'dark' : 'light';
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
