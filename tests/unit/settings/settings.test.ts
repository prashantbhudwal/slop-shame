import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ browser: undefined as any }));
vi.mock('@wxt-dev/browser', () => ({ browser: new Proxy({}, { get: (_, key) => state.browser[key] }) }));
let data: Record<string, any>;
let writes: Record<string, any>[];
let held: (() => void)[];
let holdLegacy: boolean;
let restartWorker: () => Promise<void>;
const clone = <T>(value: T): T => structuredClone(value);
const context = () => import('../../../src/lib/settings/index');

beforeEach(async () => {
  vi.resetModules();
  data = {}; writes = []; held = []; holdLegacy = false;
  const changes = new Set<(value: any) => void>();
  const messages = new Set<any>();
  state.browser = {
    storage: { local: {
      async get(keys: string | string[]) {
        const selected = typeof keys === 'string' ? [keys] : keys;
        const result = clone(Object.fromEntries(selected.filter(k => k in data).map(k => [k, data[k]])));
        if (holdLegacy && selected.includes('settings$') && !result['settings$']) {
          await new Promise<void>(resolve => held.push(resolve));
        }
        return result;
      },
      async set(values: Record<string, any>) {
        writes.push(clone(values));
        const delta = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { oldValue: clone(data[k]), newValue: clone(v) }]));
        Object.assign(data, clone(values));
        changes.forEach(fn => fn(delta));
      },
      onChanged: { addListener: (fn: any) => changes.add(fn), removeListener: (fn: any) => changes.delete(fn) },
    } },
    runtime: {
      id: 'test', getURL: (path: string) => `chrome-extension://test${path}`,
      onMessage: { addListener: (fn: any) => messages.add(fn) },
      sendMessage: vi.fn((message: unknown) => new Promise(resolve => {
        for (const handler of messages) if (handler(message, { id: 'test', url: 'https://www.linkedin.com/feed/' }, resolve) === true) return;
        resolve(undefined);
      })),
    },
  };
  vi.stubGlobal('browser', new Proxy({}, { get: (_, key) => state.browser[key] }));
  vi.stubGlobal('chrome', new Proxy({}, { get: (_, key) => state.browser[key] }));
  vi.stubGlobal('defineBackground', (fn: () => void) => fn());
  await import('../../../src/entrypoints/background');
  restartWorker = async () => {
    messages.clear();
    vi.resetModules();
    await import('../../../src/entrypoints/background');
  };
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('background-owned local storage', () => {
  it.each(['whiff', 'artisanal'])('migrates %s once across contexts and cannot replay a stale migration over a saved preference', async (minTier) => {
    data.settings = { enabled: true, minTier, sound: false, showClean: true };
    holdLegacy = true;
    const a = await context();
    vi.resetModules();
    const b = await context();
    const first = a.loadSettings();
    const second = b.loadSettings();
    await vi.waitFor(() => expect(held.length).toBeGreaterThan(0));
    held[0]!();
    expect(await first).toMatchObject({ minTier: 'certified' });
    await a.saveSettings({ enabled: false, minTier: 'slopocalypse', sound: true });
    held.slice(1).forEach(release => release());
    await second;
    expect(await b.loadSettings()).toMatchObject({ enabled: false, minTier: 'slopocalypse', sound: true });
    expect(data.settings).not.toHaveProperty('showClean');
    // One migration write; a settings save may also atomically tag its version.
    expect(writes.filter(w => w.settings?.minTier === 'certified')).toHaveLength(1);
    expect(data['settings$']).toEqual({ v: 2 });
    const count = writes.length;
    await restartWorker();
    expect(await a.loadSettings()).toMatchObject({ enabled: false, minTier: 'slopocalypse', sound: true });
    expect(writes.length).toBe(count);
  });

  it('composes concurrent deltas and settings patches from independent contexts', async () => {
    const a = await context();
    vi.resetModules();
    const b = await context();
    await Promise.all([a.addDailyStats({ scanned: 10, slop: 3 }), b.addDailyStats({ scanned: 20, slop: 7 })]);
    expect(await a.getDailyStats()).toMatchObject({ scanned: 30, slop: 10 });
    await Promise.all([a.saveSettings({ sound: true }), b.saveSettings({ reduceMotion: true })]);
    expect(await a.loadSettings()).toMatchObject({ sound: true, reduceMotion: true });
  });

  it('composes remembered destroys, removals and clears in request order', async () => {
    const a = await context();
    await Promise.all([a.rememberDestroyed('a', true), a.rememberDestroyed('b', true)]);
    expect([...(await a.getDestroyedPosts())]).toEqual(['a', 'b']);
    await Promise.all([a.forgetDestroyedPosts(), a.rememberDestroyed('c', true)]);
    expect([...(await a.getDestroyedPosts())]).toEqual(['c']);
    await a.rememberDestroyed('c', false);
    expect((await a.getDestroyedPosts()).size).toBe(0);
  });

  it('accepts negative corrections, clamps at zero and resets at midnight', async () => {
    const a = await context();
    data.dailyStats = { day: '2000-01-01', scanned: 100, slop: 80, destroyed: 2, shamed: 1 };
    await a.addDailyStats({ scanned: 2, slop: 1 });
    await a.addDailyStats({ slop: -1, destroyed: -9 });
    expect(await a.getDailyStats()).toEqual({ day: a.today(), scanned: 2, slop: 0, destroyed: 0, shamed: 0 });
  });

  it('keeps processing after rejected patches, invalid deltas and failed storage writes', async () => {
    const a = await context();
    await expect(a.saveSettings({ enabled: 'yes' } as any)).rejects.toThrow('Invalid');
    await expect(a.addDailyStats({ slop: Number.NaN })).rejects.toThrow('Invalid');
    vi.spyOn(state.browser.storage.local, 'set').mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(a.rememberDestroyed('failed', true)).rejects.toThrow('Storage unavailable');
    await a.addDailyStats({ scanned: 1, slop: 1 });
    expect(await a.getDailyStats()).toMatchObject({ scanned: 1, slop: 1 });
  });

  it('reads fallbacks without persisting them, watches changes, and caps remembered ids', async () => {
    const a = await context();
    expect(await a.loadSettings()).toEqual(a.DEFAULT_SETTINGS);
    expect(data.settings).toBeUndefined();
    const cb = vi.fn();
    const stop = a.watchSettings(cb);
    await a.saveSettings({ enabled: false });
    expect(cb).toHaveBeenLastCalledWith({ ...a.DEFAULT_SETTINGS, enabled: false });
    stop();
    data.destroyedPosts = Array.from({ length: 2000 }, (_, i) => `p${i}`);
    await a.rememberDestroyed('p0', true);
    await a.rememberDestroyed('new', true);
    const ids = await a.getDestroyedPosts();
    expect(ids.size).toBe(2000);
    expect(ids.has('p0')).toBe(true);
    expect(ids.has('p1')).toBe(false);
  });
});

describe('content-script writes that must not be lost', () => {
  const outbox = () => import('../../../src/lib/settings/outbox');
  const failNextWrite = () => vi.spyOn(state.browser.storage.local, 'set').mockRejectedValueOnce(new Error('IO error'));
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 21, 12)); });
  afterEach(() => { vi.useRealTimers(); });

  it('retries a daily delta the worker could not commit, and counts it once', async () => {
    const [a, o] = [await context(), await outbox()];
    failNextWrite();
    await o.postDailyStats({ scanned: 1, slop: 1 });
    expect(await a.getDailyStats()).toMatchObject({ scanned: 0, slop: 0 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await a.getDailyStats()).toEqual({ day: a.today(), scanned: 1, slop: 1, destroyed: 0, shamed: 0 });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(writes.filter(w => w.dailyStats)).toHaveLength(1);
  });

  it('counts a committed delta once when only its acknowledgement was lost', async () => {
    const [a, o] = [await context(), await outbox()];
    const send = state.browser.runtime.sendMessage;
    const deliver = send.getMockImplementation()!;
    send.mockImplementationOnce(async (message: unknown) => {
      await deliver(message);
      throw new Error('The message port closed before a response was received.');
    });
    await o.postDailyStats({ scanned: 2 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(await a.getDailyStats()).toMatchObject({ scanned: 2 });
    await o.postDailyStats({ scanned: 1 });
    expect(await a.getDailyStats()).toMatchObject({ scanned: 3 });
  });

  it('retries a remembered destroy, but never one from before a later forget', async () => {
    const [a, o] = [await context(), await outbox()];
    failNextWrite();
    await o.postDestroyed('kept');
    await vi.advanceTimersByTimeAsync(2000);
    expect([...await a.getDestroyedPosts()]).toEqual(['kept']);
    failNextWrite();
    await o.postDestroyed('forgotten');
    await vi.advanceTimersByTimeAsync(500);
    await a.forgetDestroyedPosts();
    await vi.advanceTimersByTimeAsync(120_000);
    expect((await a.getDestroyedPosts()).size).toBe(0);
  });

  it('drops a malformed delta, and a retried delta once its day is over', async () => {
    const [a, o] = [await context(), await outbox()];
    const send = state.browser.runtime.sendMessage;
    await o.postDailyStats({ slop: Number.NaN });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(send).toHaveBeenCalledOnce();
    vi.setSystemTime(new Date(2026, 9, 21, 23, 59, 59));
    failNextWrite();
    await o.postDailyStats({ scanned: 5 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await a.getDailyStats()).toEqual({ day: a.today(), scanned: 0, slop: 0, destroyed: 0, shamed: 0 });
    expect(a.today()).toBe('2026-10-22');
  });
});

