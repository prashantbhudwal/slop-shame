// LinkedIn's CSP allowlists Trusted Types policy names (`trusted-types default
// jSecure … dompurify …`). Svelte creates a policy named 'svelte-trusted-html'
// when its runtime loads; on linkedin.com that call throws and the whole
// content script dies before it sees a single post.
//
// This module must be imported before anything that imports Svelte. It patches
// createPolicy in our isolated world only (LinkedIn's page keeps its own
// factory) so a blocked policy becomes a pass-through. Svelte only feeds it its
// own compiled templates, never post text, so no page HTML goes through it.

interface PolicyRules {
  createHTML?: (input: string) => string;
}

const factory = (globalThis as { trustedTypes?: { createPolicy: (name: string, rules: PolicyRules) => unknown } }).trustedTypes;

if (factory) {
  const createPolicy = factory.createPolicy.bind(factory);
  factory.createPolicy = (name, rules) => {
    try {
      return createPolicy(name, rules);
    } catch {
      return { createHTML: (input: string) => rules.createHTML?.(input) ?? input };
    }
  };
}

export {};
