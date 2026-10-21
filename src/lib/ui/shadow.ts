// Retain our own roots: page scripts must not be able to inspect local Hall data.
// Only fixture builds expose roots for Playwright's DOM locators.
declare const __SLOP_E2E__: boolean;
const roots = new WeakMap<HTMLElement, ShadowRoot>();

export function uiShadow(host: HTMLElement): ShadowRoot | undefined {
  return roots.get(host);
}

export function attachUiShadow(host: HTMLElement): ShadowRoot {
  let root = roots.get(host);
  if (!root) {
    root = host.attachShadow({ mode: __SLOP_E2E__ ? 'open' : 'closed' });
    roots.set(host, root);
  }
  return root;
}
