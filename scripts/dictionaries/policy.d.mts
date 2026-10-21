export const zeroCategories: Record<string, string>;
export const valeCategories: Record<string, string>;
export const professionalWords: Set<string>;
export const commonPhrases: Set<string>;
export function dropReason(
  entry: {
    source: string; value: string; kind: string; category: string;
    name?: string; upstreamCategory?: string; original?: string; posTagged?: boolean;
  },
  evidence: Map<string, { ratio: number; baseline: number }>,
  humanSamples: { id: string; text: string; normalized: string }[],
): string | null;
