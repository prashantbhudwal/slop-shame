import type { RulePack } from '../../src/lib/engine/rule-types';

export function digest(value: string | Uint8Array): string;
export function normalize(value: string): string;
export function weightForRatio(ratio: number): number;
export const categories: string[];
export function csv(text: string): string[][];
export function yamlTokens(text: string): { value: string; line: number; posTagged: boolean }[];
export function expandFinite(source: string, limit?: number): string[] | null;
export function assertSafeRegex(source: string): string;
export function boundRegex(source: string, multiline?: boolean): string;
export function adversarialInputs(): string[];
export function timeRegex(source: string, trials?: number): number;
export function firstPartyInventory(root: string): {
  phrases: Map<string, string[]>;
  patterns: Map<string, string[]>;
  files: { path: string; sha256: string }[];
};
export function validatePacks(packs: readonly RulePack[]): { rules: number; matchers: number };
