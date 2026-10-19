import type { SlopTier, SlopTierId } from './types';

/** Ordered low → high. Icons live at public/assets/tiers/<id>.webp. */
export const TIERS: readonly SlopTier[] = [
  { id: 'artisanal', label: 'Artisanal Human', min: 0, blurb: 'Hand-typed by a real person. Rare. Cherish it.' },
  { id: 'whiff', label: 'Faint Whiff', min: 20, blurb: 'Something smells a little… optimized.' },
  { id: 'certified', label: 'Certified Slop', min: 40, blurb: 'Grade A, farm-raised LinkedIn slop.' },
  { id: 'swamp', label: 'Slop Swamp', min: 60, blurb: 'Wading waist-deep in thought leadership.' },
  { id: 'slopocalypse', label: 'SLOPOCALYPSE', min: 80, blurb: 'Pure, uncut, machine-grade slop. Evacuate.' },
];

export function tierFor(score: number): SlopTier {
  // The list is statically non-empty; loop bounds guarantee indexed entries.
  for (let i = TIERS.length - 1; i >= 0; i--) if (score >= TIERS[i]!.min) return TIERS[i]!;
  return TIERS[0]!;
}

export function tierById(id: SlopTierId): SlopTier {
  return TIERS.find((t) => t.id === id)!;
}
