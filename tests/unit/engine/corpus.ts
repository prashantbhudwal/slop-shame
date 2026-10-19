import { readFileSync, readdirSync } from 'node:fs';
import type { PostInput, SlopTierId } from '../../../src/lib/engine/types';

export interface CalibrationPost extends PostInput {
  id: string;
  authorship: 'human' | 'ai' | 'mixed';
  synthetic: boolean;
  expectTier: SlopTierId | SlopTierId[];
}
const folder = new URL('../../fixtures/posts/', import.meta.url);
export const corpus: CalibrationPost[] = readdirSync(folder).filter((file) => file.endsWith('.json')).sort()
  .flatMap((file) => JSON.parse(readFileSync(new URL(file, folder), 'utf8')) as CalibrationPost[]);

export function allowedTiers(post: CalibrationPost): SlopTierId[] {
  return Array.isArray(post.expectTier) ? post.expectTier : [post.expectTier];
}
