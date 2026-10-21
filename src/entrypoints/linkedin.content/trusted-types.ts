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

/** Svelte's policy name; linkedin.com's CSP never allowlists it. */
const SVELTE_POLICY = 'svelte-trusted-html';

if (factory) {
  const createPolicy = factory.createPolicy.bind(factory);
  const passThrough = (rules: PolicyRules) => ({ createHTML: (input: string) => rules.createHTML?.(input) ?? input });
  factory.createPolicy = (name, rules) => {
    // Don't even try Svelte's: each refusal is a CSP violation, logged in the
    // console and possibly reported to LinkedIn, announcing the extension.
    if (name === SVELTE_POLICY) return passThrough(rules);
    try {
      return createPolicy(name, rules);
    } catch {
      return passThrough(rules);
    }
  };
}

export {};
