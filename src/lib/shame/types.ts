import type { SlopCategory, SlopTierId } from '../engine/types';

/**
 * A shame format: a template with slots, picked by tier and category.
 * Slots: {author} {score} {tier} {quote} {category} {count} {headline}
 */
export interface ShameFormat {
  id: string;
  /** Visual layout the modal renders it with. */
  layout: 'citation' | 'certificate' | 'tabloid' | 'wanted-poster' | 'report-card' | 'eulogy';
  /** Restrict to these tiers (default: any). */
  tiers?: SlopTierId[];
  /** Prefer when the post's top category is one of these. */
  categories?: SlopCategory[];
  title: string;
  body: string;
  /** Optional sign-off / footer line. */
  footer?: string;
}

export interface Shame {
  formatId: string;
  layout: ShameFormat['layout'];
  title: string;
  body: string;
  footer?: string;
}
