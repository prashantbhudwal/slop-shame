// Asset URLs and the visual identity of tiers. Every image has an emoji
// fallback so the UI still works while assets are missing or blocked.

import type { SlopCategory, SlopTierId } from '../engine/types';
import { CATEGORY_META } from '../shame/categories';

const isExtensionPage = typeof location !== 'undefined' && location.protocol.endsWith('-extension:');

/**
 * In-page (linkedin.com) assets go through runtime.getURL, which returns the
 * per-session dynamic URL (web_accessible_resources use_dynamic_url). Extension
 * pages load them same-origin.
 */
export function asset(path: string): string {
  if (isExtensionPage) return path;
  try {
    return browser.runtime.getURL(path as '/');
  } catch {
    return path; // Extension context invalidated (reloaded); images just fall back.
  }
}

export interface TierLook {
  emoji: string;
  /** Meter / accent color. */
  color: string;
  /** Text on the accent color. */
  ink: string;
  /** Wobble the icon on hover. */
  wobble: boolean;
}

export const TIER_LOOK: Readonly<Record<SlopTierId, TierLook>> = {
  artisanal: { emoji: '🧡', color: '#C9874A', ink: '#1B1F3B', wobble: false },
  whiff: { emoji: '☕', color: '#A9B84A', ink: '#1B1F3B', wobble: false },
  certified: { emoji: '🏅', color: '#7ED321', ink: '#1B1F3B', wobble: false },
  swamp: { emoji: '🐊', color: '#2FA84F', ink: '#FFFFFF', wobble: true },
  slopocalypse: { emoji: '☢️', color: '#FF5A1F', ink: '#FFFFFF', wobble: true },
};

export const tierIcon = (id: SlopTierId) => asset(`/assets/tiers/${id}.webp`);
export const categoryIcon = (c: SlopCategory) => asset(`/assets/categories/${c}.webp`);
export const categoryEmoji = (c: SlopCategory) => CATEGORY_META[c].emoji;

export const UI = {
  destroy: () => asset('/assets/ui/destroy.webp'),
  shame: () => asset('/assets/ui/shame.webp'),
  crown: () => asset('/assets/ui/crown.webp'),
  trophy: () => asset('/assets/ui/trophy.webp'),
};

export const FX = {
  kaboom: () => asset('/assets/fx/kaboom.webp'),
  splats: () => [1, 2, 3].map((n) => asset(`/assets/fx/splat-${n}.webp`)),
};

export const SHAME_ART = {
  stamp: () => asset('/assets/shame/stamp-shamed.webp'),
  seal: () => asset('/assets/shame/seal-slop.webp'),
  wantedFrame: () => asset('/assets/shame/wanted-frame.webp'),
};

export type MascotPose = 'sloppy' | 'sloppy-horrified' | 'sloppy-crowned' | 'sloppy-exploded';
export const mascot = (pose: MascotPose = 'sloppy') => asset(`/assets/mascot/${pose}.webp`);

/** Load an image once; resolves null when it's missing (never rejects). */
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
export function loadImage(src: string, crossOrigin?: 'anonymous'): Promise<HTMLImageElement | null> {
  const key = `${crossOrigin ?? ''}|${src}`;
  let p = imageCache.get(key);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(key, p);
    // Failed loads may succeed later (assets landing during dev): don't cache misses forever.
    void p.then((img) => { if (!img) setTimeout(() => imageCache.delete(key), 30_000); });
  }
  return p;
}
