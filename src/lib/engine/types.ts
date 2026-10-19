// Contract between the slop engine and everything that consumes it (UI, shame
// generator, popup). Change it deliberately: other modules code against it.

/** What we know about a post, extracted from the feed DOM. */
export interface PostInput {
  /** Visible post body text, "…see more" already expanded or stripped. */
  text: string;
  /** Hashtags as written, including the leading '#'. */
  hashtags?: string[];
  hasMedia?: boolean;
  hasPoll?: boolean;
  /** True for reshares that add no commentary of their own. */
  isBareRepost?: boolean;
  /** "Promoted" posts. */
  isAd?: boolean;
  /** Author headline, e.g. "Visionary | Thought Leader | 3x Founder". */
  authorHeadline?: string;
}

/** Families of slop. The shame generator and icons key off these. */
export type SlopCategory =
  | 'ai-tells' // delve, tapestry, em-dash storms, "it's not X, it's Y"
  | 'broetry' // one. sentence. per. line.
  | 'engagement-bait' // "Agree?", "Comment YES", "Repost if…"
  | 'humblebrag' // "I'm humbled to announce…"
  | 'fake-story' // "My 5yo taught me more about B2B sales than my MBA"
  | 'thought-leadership' // "Unpopular opinion:", "Here's the thing nobody tells you"
  | 'buzzwords' // synergy, leverage, game-changer, 10x
  | 'emoji-abuse' // 🚀 bullets, ✅ lists, 👇 arrows
  | 'hashtag-spam' // #Leadership #Growth #Mindset #Hustle
  | 'listicle'; // "7 lessons I learned from…"

export interface SlopSignal {
  /** Stable rule id, e.g. "bait.agree-question". */
  ruleId: string;
  category: SlopCategory;
  /** Short human label for UI, e.g. "Asked 'Agree?'". */
  label: string;
  /** Points this signal contributed before normalization. */
  weight: number;
  /** Exact snippets that matched, for quoting in shames (max ~3). */
  matches: string[];
}

export type SlopTierId = 'artisanal' | 'whiff' | 'certified' | 'swamp' | 'slopocalypse';

export interface SlopTier {
  id: SlopTierId;
  label: string;
  /** Inclusive lower bound of the Slop Index for this tier. */
  min: number;
  blurb: string;
}

export interface SlopReport {
  /** Slop Index, integer 0–100. */
  score: number;
  tier: SlopTier;
  /** Signals sorted by weight, heaviest first. */
  signals: SlopSignal[];
  /** Category with the most total weight, null when clean. */
  topCategory: SlopCategory | null;
  /** Total weight per category (only categories that fired). */
  categoryWeights: Partial<Record<SlopCategory, number>>;
  wordCount: number;
}
