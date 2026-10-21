// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), start: vi.fn(), stop: vi.fn(), update: vi.fn(), debug: vi.fn(() => ({ entries: 0 })) }));
vi.mock('../../../src/entrypoints/linkedin.content/controller', () => ({ FeedController: class {
  constructor(...args: unknown[]) { mocks.create(...args); }
  start = mocks.start;
  stop = mocks.stop;
  updateSettings = mocks.update;
  debugCounts = mocks.debug;
} }));
vi.mock('../../../src/lib/settings', () => ({
  loadSettings: vi.fn(), getDestroyedPosts: vi.fn(), watchSettings: vi.fn(() => vi.fn()),
}));
import { getDestroyedPosts, loadSettings, watchSettings, type Settings } from '../../../src/lib/settings';

const settings = (patch: Partial<Settings> = {}) => ({ enabled: false, rememberDestroyed: false, ...patch }) as Settings;
let invalidate: (() => void) | undefined;
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('defineContentScript', (config: unknown) => config);
  vi.mocked(loadSettings).mockResolvedValue(settings());
});
afterEach(() => { invalidate?.(); invalidate = undefined; document.documentElement.removeAttribute('data-slop-shame-debug'); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
async function content(e2e = false) {
  vi.stubGlobal('__SLOP_E2E__', e2e);
  return (await import('../../../src/entrypoints/linkedin.content/index')).default as any;
}
function run(content: any) {
  return content.main({ isInvalid: false, onInvalidated: (fn: () => void) => { invalidate = fn; } });
}
async function boot(e2e: boolean) {
  await run(await content(e2e));
  document.dispatchEvent(new Event('slop-shame:debug'));
}
/** The settings watcher's callback, as registered by main(). */
const changed = (next: Settings) => vi.mocked(watchSettings).mock.calls.at(-1)![0](next);

it('production registers no debug listener even while the extension is disabled', async () => {
  const listen = vi.spyOn(document, 'addEventListener');
  await boot(false);
  expect(listen.mock.calls.some(([type]) => type === 'slop-shame:debug')).toBe(false);
  expect(document.documentElement.hasAttribute('data-slop-shame-debug')).toBe(false);
  expect(mocks.debug).not.toHaveBeenCalled();
  expect(mocks.start).not.toHaveBeenCalled();
  listen.mockRestore();
});
it('e2e alone exposes the debug counts, and removes the listener on invalidation', async () => {
  await boot(true);
  expect(document.documentElement.getAttribute('data-slop-shame-debug')).toBe('{"entries":0}');
  invalidate!(); invalidate = undefined;
  document.documentElement.removeAttribute('data-slop-shame-debug');
  document.dispatchEvent(new Event('slop-shame:debug'));
  expect(document.documentElement.hasAttribute('data-slop-shame-debug')).toBe(false);
  expect(mocks.stop).toHaveBeenCalledOnce();
});
it('opts out of WXT\'s window.postMessage, which carries the extension id to page scripts', async () => {
  expect(await content()).toMatchObject({ noScriptStartedPostMessage: true });
});
it('retries startup after a failed settings read, backing off', async () => {
  vi.useFakeTimers();
  vi.mocked(loadSettings).mockRejectedValueOnce(new Error('storage read failed')).mockRejectedValueOnce(new Error('storage read failed'));
  vi.mocked(loadSettings).mockResolvedValue(settings({ enabled: true }));
  const started = run(await content());
  await vi.advanceTimersByTimeAsync(1000);
  expect(mocks.create).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(2000);
  await started;
  expect(loadSettings).toHaveBeenCalledTimes(3);
  expect(mocks.create).toHaveBeenCalledWith(settings({ enabled: true }), new Set());
  expect(mocks.start).toHaveBeenCalledOnce();
});
it('starts as soon as a settings change arrives while startup waits to retry', async () => {
  vi.useFakeTimers();
  vi.mocked(loadSettings).mockRejectedValue(new Error('storage read failed'));
  const started = run(await content());
  await vi.advanceTimersByTimeAsync(0);
  changed(settings({ enabled: true }));
  await started;
  expect(mocks.create).toHaveBeenCalledWith(settings({ enabled: true }), new Set());
  expect(mocks.start).toHaveBeenCalledOnce();
});
it('stops retrying when the extension context goes away', async () => {
  vi.useFakeTimers();
  vi.mocked(loadSettings).mockRejectedValue(new Error('storage read failed'));
  const ctx = { isInvalid: false, onInvalidated: (fn: () => void) => { invalidate = fn; } };
  const started = (await content()).main(ctx);
  await vi.advanceTimersByTimeAsync(0);
  ctx.isInvalid = true;
  invalidate!(); invalidate = undefined;
  await started;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(loadSettings).toHaveBeenCalledOnce();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('starts from a master-switch save that lands while startup reads remembered posts', async () => {
  let release!: (ids: Set<string>) => void;
  vi.mocked(loadSettings).mockResolvedValue(settings({ enabled: true, rememberDestroyed: true }));
  vi.mocked(getDestroyedPosts).mockReturnValue(new Promise((resolve) => { release = resolve; }));
  const started = run(await content());
  await vi.waitFor(() => expect(getDestroyedPosts).toHaveBeenCalled());
  changed(settings({ enabled: false, rememberDestroyed: true }));
  release(new Set(['urn:li:activity:1']));
  await started;
  expect(mocks.create).toHaveBeenCalledWith(settings({ enabled: false, rememberDestroyed: true }), new Set(['urn:li:activity:1']));
  expect(mocks.start).not.toHaveBeenCalled();
  changed(settings({ enabled: true, rememberDestroyed: true }));
  expect(mocks.update).toHaveBeenCalledWith(settings({ enabled: true, rememberDestroyed: true }));
});
