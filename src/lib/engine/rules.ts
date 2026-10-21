import type { CustomRule, PhraseRule } from './rule-types';
import type { SlopCategory } from './types';

export const ATTRIBUTION = 'Patterns adapted from avoid-ai-writing (MIT, Copyright (c) 2026 Conor Bronsdon), https://github.com/conorbronsdon/avoid-ai-writing; and humanizer (MIT, Copyright (c) 2025 Siqi Chen), https://github.com/blader/humanizer. See THIRD_PARTY_NOTICES.md.';
export function phrase(category: SlopCategory, id: string, label: string, weight: number, data: Pick<PhraseRule, 'phrases' | 'patterns' | 'repeat' | 'position' | 'evidence'>): PhraseRule {
  return { kind: 'phrase', id: `${category}.${id}`, category, label, weight, ...data };
}
export function custom(category: SlopCategory, id: string, label: string, weight: number, detect: CustomRule['detect']): CustomRule {
  return { kind: 'custom', id: `${category}.${id}`, category, label, weight, detect };
}
