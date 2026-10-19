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

/**
 * Families of slop. Slop = AI-written text (not LinkedIn genres). These group
 * the avoid-ai-writing detector's tell types; the shame generator and the
 * category icons (public/assets/categories/<category>.webp) key off them.
 */
export type SlopCategory =
  | 'ai-vocabulary' // delve, tapestry, testament, navigate the landscape, word clusters
  | 'template-phrases' // boilerplate, AI transitions ("Moreover,"), filler, wordiness
  | 'chatbot-leak' // "Certainly!", "As an AI", [Your Name], utm_source=chatgpt, sycophancy — smoking guns
  | 'negation-pivot' // "It's not X, it's Y", false concessions, staccato manufactured punchlines
  | 'inflation' // significance/novelty inflation, hollow intensifiers, "game-changing"
  | 'hedging' // hedge stacks, parenthetical hedges, vague attribution ("experts say")
  | 'engagement-bait' // CTA closers ("Agree?"), rhetorical/formulaic/speculative openers, generic conclusions
  | 'formatting' // em-dash storms, emoji bullets, bare noun-phrase bullets, Title Case, hashtag stuffing
  | 'robotic-rhythm' // uniform sentence lengths, low vocabulary diversity, rule-of-three cadence
  | 'bypass-tricks'; // zero-width chars / homoglyphs — someone tried to "humanize" it

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
