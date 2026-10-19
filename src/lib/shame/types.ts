import type { SlopCategory, SlopTierId } from '../engine/types';

/**
 * Slots a template may use. The generator fills every one from the real post;
 * a format whose slots can't be filled (no quotable match, no headline, …) is
 * simply not eligible for that post.
 *
 *   {author}   display name ("Jane Doe")
 *   {first}    first name, or the company name
 *   {score}    Slop Index, 0–100
 *   {tier}     tier label ("Certified Slop")
 *   {quote}    real matched phrase from the post, preferring the format's categories
 *   {quote2}   a second, different matched phrase
 *   {signal}   label of the signal {quote} came from
 *   {category} the offense, as a phrase ("hype inflation")
 *   {count}    slop posts seen from this author, including this one
 *   {ordinal}  {count} as an ordinal ("3rd")
 *   {headline} the author's LinkedIn headline (trimmed)
 *   {words}    the post's word count
 */
export const SHAME_SLOTS = [
  'author', 'first', 'score', 'tier', 'quote', 'quote2', 'signal',
  'category', 'count', 'ordinal', 'headline', 'words',
] as const;
export type ShameSlot = (typeof SHAME_SLOTS)[number];

/** A shame format: a template with slots, picked by tier and category. */
export interface ShameFormat {
  id: string;
  /** Visual layout the modal renders it with. */
  layout: 'citation' | 'certificate' | 'tabloid' | 'wanted-poster' | 'report-card' | 'eulogy';
  /** Restrict to these tiers (default: any). */
  tiers?: SlopTierId[];
  /**
   * The tells this joke is about. Eligible only when the post fired one of
   * them; strongly preferred when one is the post's top category. {quote} is
   * taken from these categories' matches.
   */
  categories?: SlopCategory[];
  /** Only when we've seen at least this many slop posts from the author. */
  minCount?: number;
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
  /** The category the joke is about (for the card's category sticker). */
  category: SlopCategory | null;
  /** The real phrase the card quotes, if any (the modal highlights it). */
  quote?: string;
}
