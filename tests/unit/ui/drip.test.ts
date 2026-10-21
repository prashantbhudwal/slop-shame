import { describe, expect, it } from 'vitest';
import { DRIP_DESIGN, DRIP_SHAPES, OUTLINE, PHOTO_ROW_MAX, TEXT_DEPTH, dripShape, shortLen, type DripShape } from '../../../src/lib/ui/drip';
import { TIERS } from '../../../src/lib/engine/tiers';
import type { SlopTierId } from '../../../src/lib/engine/types';

const SLOP: SlopTierId[] = ['whiff', 'certified', 'swamp', 'slopocalypse'];
const all = (s: DripShape) => [...s.drips, ...(s.photo ? [s.photo] : [])];
const longest = (s: DripShape) => Math.max(...all(s).map((d) => d.len));
const total = (s: DripShape) => all(s).reduce((n, d) => n + d.len, 0);

describe('Drip Edge shapes', () => {
  it('covers every slop tier and gives posts without slop evidence nothing', () => {
    expect(TIERS.map((t) => t.id).filter((id) => dripShape(id))).toEqual(SLOP);
    expect(dripShape('artisanal')).toBeNull();
    expect(dripShape(undefined)).toBeNull();
  });

  it('scales by shape with the tier: reach, drip count and drip length all grow, not just colour', () => {
    const shapes = SLOP.map((id) => dripShape(id)!);
    for (let i = 1; i < shapes.length; i++) {
      const [lo, hi] = [shapes[i - 1]!, shapes[i]!];
      expect(hi.reach).toBeGreaterThan(lo.reach);
      expect(all(hi).length).toBeGreaterThan(all(lo).length);
      expect(longest(hi)).toBeGreaterThanOrEqual(longest(lo));
      expect(total(hi)).toBeGreaterThan(total(lo));
      expect(hi.strip).toBeGreaterThan(lo.strip);
    }
    // The design's two ends: one small bead; the whole edge with seven drips.
    expect(all(shapes[0]!)).toHaveLength(1);
    expect(shapes[0]!.reach).toBe(18);
    expect(shapes[3]!.reach).toBe(100);
    expect(all(shapes[3]!)).toHaveLength(7);
  });

  it('only SLOPOCALYPSE has a drip running onto the photo, with a drop falling off it', () => {
    for (const id of SLOP) expect(!!dripShape(id)!.photo).toBe(id === 'slopocalypse');
    const photo = dripShape('slopocalypse')!.photo!;
    // Long enough to run onto a photo that starts within the card's first row…
    expect(photo.len + photo.r).toBeGreaterThan(PHOTO_ROW_MAX);
    expect(photo.fall.y - photo.fall.ry).toBeGreaterThan(photo.len);
    // …and as short as the others when a header sits above the photo.
    expect(shortLen(photo) + photo.r).toBeLessThanOrEqual(TEXT_DEPTH);
  });

  it('keeps every other drip, bead included, inside the card top padding so text is never covered', () => {
    for (const id of SLOP) {
      for (const d of dripShape(id)!.drips) {
        expect(d.len + d.r).toBeLessThanOrEqual(TEXT_DEPTH + 1e-9);
        expect(d.x).toBeGreaterThan(0);
        expect(d.x).toBeLessThan(100);
        expect(d.r - OUTLINE).toBeGreaterThan(0);
        expect(d.w - OUTLINE * 2).toBeGreaterThan(0);
      }
    }
  });

  it('is the design spec, only shortening drips that would reach past the top padding', () => {
    for (const id of SLOP) {
      const design = DRIP_DESIGN[id]!;
      const real = DRIP_SHAPES[id]!;
      expect({ ...real, drips: [] }).toEqual({ ...design, drips: [] });
      expect(real.drips).toHaveLength(design.drips.length);
      real.drips.forEach((d, i) => {
        const src = design.drips[i]!;
        expect({ ...d, len: 0 }).toEqual({ ...src, len: 0 });
        expect(d.len).toBe(src.len + src.r > TEXT_DEPTH ? shortLen(src) : src.len);
      });
    }
  });
});
