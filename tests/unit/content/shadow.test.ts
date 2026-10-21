// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { attachUiShadow } from '../../../src/lib/ui/shadow';
afterEach(() => vi.unstubAllGlobals());
it('production roots are closed but remain reusable through private references', () => {
  vi.stubGlobal('__SLOP_E2E__', false);
  const host = document.createElement('div');
  const root = attachUiShadow(host);
  root.innerHTML = '<b>private local rank</b>';
  expect(host.shadowRoot).toBeNull();
  expect(root.mode).toBe('closed');
  expect(attachUiShadow(host)).toBe(root);
});
it('only e2e builds expose roots for Playwright', () => {
  vi.stubGlobal('__SLOP_E2E__', true);
  const host = document.createElement('div');
  expect(attachUiShadow(host)).toBe(host.shadowRoot);
  expect(host.shadowRoot!.mode).toBe('open');
});
