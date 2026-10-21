// The plugin surface of the slop engine. Contributors add slop detection by
// writing a RulePack; the engine never needs to change.
//
// Two kinds of rule:
//   - PhraseRule: pure data. A list of phrases/regexes. 90% of contributions
//     should be these. The engine compiles every phrase rule from every pack
//     into a few combined matchers at registration time, so adding 500 phrases
//     costs ~nothing per post.
//   - CustomRule: a function over the precomputed PostContext, for structural
//     signals (broetry line shape, emoji density, hashtag walls…).
//
// Performance contract (rules MUST honor this — the engine runs on every post
// in an infinite feed, on the main thread):
//   - Never re-split or re-lowercase the text; use PostContext.
//   - No allocation-heavy work in loops; no regex construction inside detect().
//   - O(n) in text length. Budget: the whole engine < 1ms for a 300-word post.

import type { PostInput, SlopCategory } from './types';

/** Computed once per post by the engine and shared by every rule. */
export interface PostContext {
  readonly input: PostInput;
  /** Original text, normalized (zero-width chars stripped, homoglyphs folded). */
  readonly text: string;
  /** `text` lowercased, with curly quotes/apostrophes straightened. */
  readonly lower: string;
  /** Non-empty trimmed lines. */
  readonly lines: readonly string[];
  /** Sentences, best-effort split. */
  readonly sentences: readonly string[];
  /** Lowercased word tokens (letters/digits/apostrophes). */
  readonly words: readonly string[];
  readonly wordCount: number;
  /** Count of emoji (extended pictographic) in text. */
  readonly emojiCount: number;
  /** Hashtags found in text plus PostInput.hashtags, deduped, lowercased. */
  readonly hashtags: readonly string[];
}

export interface RuleHit {
  /** Candidate snippets; the engine selects at most 3 after exclusions. */
  matches: string[];
  /** Actual occurrence ranges in ctx.text. Prefer these to snippet lookup;
   * include every candidate, even when its display snippet is shortened. */
  spans?: readonly (readonly [number, number])[];
  /** Optional multiplier on the rule's base weight (e.g. scale by count). Default 1. */
  scale?: number;
}

/** Evidence strength is separate from category and never changes on repetition. */
export type EvidenceKind = 'phrase' | 'style' | 'fingerprint';

interface RuleBase {
  /** Globally unique, namespaced by pack: "<pack>.<rule>", e.g. "bait.agree". */
  id: string;
  category: SlopCategory;
  /** Short UI label, e.g. "Ended with 'Agree?'". */
  label: string;
  /** Base points. Rough scale: 2 = faint tell, 5 = clear tell, 10 = smoking gun. */
  weight: number;
  /** Default: phrase; formatting/rhythm/bypass categories default to style.
   * Explicit assistant artifacts opt into fingerprint; a large weight alone
   * never makes a rule a fingerprint. */
  evidence?: EvidenceKind;
}

export interface PhraseRule extends RuleBase {
  kind: 'phrase';
  /** Case-insensitive literal phrases, matched on word boundaries. */
  phrases?: string[];
  /** Regex sources (no flags; engine compiles with 'gi'). Use sparingly. */
  patterns?: string[];
  /** How repeat matches add up. Default 'once'. */
  repeat?: 'once' | 'each' | 'sqrt';
  /** Opening: first two non-empty lines. Closing: last two prose lines, skipping trailing hashtag/emoji-only lines. */
  position?: 'opening' | 'closing';
}

export interface CustomRule extends RuleBase {
  kind: 'custom';
  detect(ctx: PostContext): RuleHit | null;
}

export type SlopRule = PhraseRule | CustomRule;

export interface RulePack {
  /** Namespace, e.g. "linkedin-bait". Must prefix every rule id in the pack. */
  id: string;
  name: string;
  description: string;
  /** Credit for borrowed rules, e.g. "Patterns adapted from avoid-ai-writing (MIT)". */
  attribution?: string;
  rules: SlopRule[];
}
