// Human words for each SlopCategory. Pure data: shared by the shame generator,
// the badge, the shame cards and the Hall of Slop.

import type { SlopCategory } from '../engine/types';

export interface CategoryMeta {
  /** Short UI label. */
  label: string;
  /** Reads after "Primary offense:" — fills the {category} slot. */
  offense: string;
  /** Report-card subject this category is graded under. */
  subject: string;
  /** Fallback when the category sticker hasn't loaded. */
  emoji: string;
}

export const CATEGORY_META: Readonly<Record<SlopCategory, CategoryMeta>> = {
  'ai-vocabulary': { label: 'AI vocabulary', offense: 'delve-grade AI vocabulary', subject: 'Vocabulary', emoji: '🧶' },
  'template-phrases': { label: 'Template phrases', offense: 'boilerplate template phrases', subject: 'Originality', emoji: '📋' },
  'chatbot-leak': { label: 'Chatbot leak', offense: 'leaving the chatbot’s half of the chat in', subject: 'Proofreading', emoji: '🤖' },
  'negation-pivot': { label: 'Not X, but Y', offense: 'the “it’s not X, it’s Y” maneuver', subject: 'Critical Thinking', emoji: '🔀' },
  inflation: { label: 'Hype inflation', offense: 'hype inflation', subject: 'Honesty', emoji: '🎈' },
  hedging: { label: 'Hedging', offense: 'hedge-stacking', subject: 'Conviction', emoji: '🌫️' },
  'engagement-bait': { label: 'Engagement bait', offense: 'engagement bait', subject: 'Social Studies', emoji: '🎣' },
  formatting: { label: 'Formatting crimes', offense: 'em dash and emoji formatting crimes', subject: 'Penmanship', emoji: '✨' },
  'robotic-rhythm': { label: 'Robotic rhythm', offense: 'metronome-grade sentence rhythm', subject: 'Music', emoji: '🥁' },
  'bypass-tricks': { label: 'Detector dodging', offense: 'hiding characters to fool AI detectors', subject: 'Academic Integrity', emoji: '🥷' },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as SlopCategory[];
