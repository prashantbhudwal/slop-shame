// Drip Edge: slime along the top edge of a sloppy post's card (option 5 in
// design/highlight-options.html, the owner's pick). The tier scales the shape,
// not only the colour: how far the goo reaches along the edge, how many drips
// hang from it and how long they are. SLOPOCALYPSE drips along the whole edge,
// with one drip running onto the author's photo and a drop falling off it.
//
// Shapes are data, in the design's units: x in % of the card's width, sizes in
// px, outline sizes (the fill sits 1.5 px inside, see OUTLINE).

import type { SlopTierId } from '../engine/types';

export interface Drip {
  /** Where it hangs along the top edge, % of the card's width. */
  x: number;
  /** Length below the edge to the bead's centre, px. */
  len: number;
  /** Outline stroke width. */
  w: number;
  /** Outline radius of the bead at its end. */
  r: number;
  /** Radius of the bead's white highlight, if it has one. */
  hi?: number;
}

export interface PhotoDrip extends Drip {
  /** The drop that falls off it onto the photo: outline radii, centre px below the edge. */
  fall: { rx: number; ry: number; y: number };
}

export interface DripShape {
  /** How far the goo strip reaches along the top edge, % of the card's width (it starts off the left edge). */
  reach: number;
  /** Outline stroke width of the strip. It is centred on the edge, so half of it shows. */
  strip: number;
  drips: readonly Drip[];
  /** SLOPOCALYPSE only: the drip over the author's photo (placed at the photo's centre, not at `x`). */
  photo?: PhotoDrip;
}

/** The fill is drawn this much inside every outline (stroke widths shrink by twice this). */
export const OUTLINE = 1.5;

/**
 * No drip reaches deeper than this below the card's top edge, bead included:
 * the card's top padding, as the design intends. Measured on the real feed,
 * the first text sits lower (a social header's line box at 11.5 px with its
 * glyphs from ~14 px, the author's name at 14 px with glyphs from ~17 px), so
 * text is never covered. The one exception is the photo drip, when the photo
 * is in the card's first row: it runs onto the photo, never onto text.
 */
export const TEXT_DEPTH = 12;

/** The photo counts as the card's first row when its top is at most this far below the edge (no header above it). */
export const PHOTO_ROW_MAX = 24;

/** The photo drip's length when there's no room to run onto the photo. */
export const shortLen = (d: Drip) => Math.max(0, Math.round((TEXT_DEPTH - d.r) * 10) / 10);

// The design's numbers (design/highlight-options.html, "5 · Drip Edge").
const DESIGN: Readonly<Partial<Record<SlopTierId, DripShape>>> = {
  whiff: {
    reach: 18,
    strip: 9,
    drips: [{ x: 9, len: 5, w: 7, r: 4.1 }],
  },
  certified: {
    reach: 46,
    strip: 11,
    drips: [
      { x: 7, len: 6, w: 8, r: 4.8 },
      { x: 21, len: 10, w: 8.5, r: 5.1, hi: 1.1 },
      { x: 37, len: 5, w: 7, r: 4.1 },
    ],
  },
  swamp: {
    reach: 76,
    strip: 12,
    drips: [
      { x: 6, len: 7, w: 8, r: 4.8, hi: 1 },
      { x: 17, len: 12, w: 9, r: 5.5, hi: 1.2 },
      { x: 33, len: 6, w: 8, r: 4.8 },
      { x: 50, len: 9, w: 8.5, r: 5.1, hi: 1.1 },
      { x: 66, len: 5, w: 7, r: 4.1 },
    ],
  },
  slopocalypse: {
    reach: 100,
    strip: 13,
    drips: [
      { x: 4, len: 6, w: 8, r: 4.8 },
      { x: 30, len: 7, w: 8, r: 4.8, hi: 1 },
      { x: 46, len: 9, w: 8.5, r: 5.1, hi: 1.1 },
      { x: 62, len: 5, w: 7.5, r: 4.5 },
      { x: 78, len: 8, w: 8.5, r: 5.1, hi: 1.1 },
      { x: 93, len: 5, w: 7, r: 4.1 },
    ],
    photo: { x: 14, len: 22, w: 9.5, r: 5.8, hi: 1.3, fall: { rx: 3.9, ry: 4.7, y: 34 } },
  },
};

/**
 * The design's drips, shortened where they would reach past TEXT_DEPTH: on
 * the narrow mock card its longest drips happened to hang over the photo; on
 * a real 552 px card the same % positions hang over the author's name.
 */
function fit(shape: DripShape): DripShape {
  return { ...shape, drips: shape.drips.map((d) => (d.len + d.r > TEXT_DEPTH ? { ...d, len: shortLen(d) } : d)) };
}

export const DRIP_SHAPES: Readonly<Partial<Record<SlopTierId, DripShape>>> = Object.fromEntries(
  Object.entries(DESIGN).map(([id, shape]) => [id, fit(shape)]),
);

/** The tier's drip shape; null for posts without slop evidence (they get nothing). */
export function dripShape(tier: SlopTierId | undefined): DripShape | null {
  return (tier && DRIP_SHAPES[tier]) || null;
}

/** The design source, for tests that compare against it. */
export const DRIP_DESIGN = DESIGN;
