import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sighting } from './helpers';

let sendMessage: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers();
  sendMessage = vi.fn().mockRejectedValue(new Error('Transport unavailable'));
  vi.stubGlobal('browser', { runtime: { sendMessage, onMessage: { addListener: vi.fn(), removeListener: vi.fn() } } });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('caps pending sightings during an outage and drops the oldest', async () => {
  const c = await import('../../../src/lib/store/client');
  for (let i = 0; i < 6000; i++) c.reportSighting(sighting(`p${i}`));
  await c.flushSightings().catch(() => {});
  sendMessage.mockClear();
  sendMessage.mockResolvedValue({ ok: true, pendingActions: [] });
  await c.flushSightings();
  const posts = sendMessage.mock.calls.flatMap(([m]) => m.sightings);
  expect(posts.length).toBeLessThanOrEqual(2000);
  expect(posts.some(p => p.postId === 'p5999')).toBe(true);
  expect(posts.some(p => p.postId === 'p0')).toBe(false);
});

it('backs off transport retries even while new sightings arrive, with a one minute ceiling', async () => {
  const c = await import('../../../src/lib/store/client');
  c.reportSighting(sighting());
  await c.flushSightings().catch(() => {});
  for (let i = 0; i < 100; i++) {
    c.reportSighting(sighting(`p${i}`));
    await Promise.resolve();
  }
  expect(sendMessage).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(sendMessage.mock.calls.length).toBeLessThanOrEqual(7);
  const attempts = sendMessage.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(sendMessage.mock.calls.length).toBeGreaterThan(attempts);
});

it('terminates unresolved actions and permanent rejections instead of retrying forever', async () => {
  const c = await import('../../../src/lib/store/client');
  sendMessage.mockImplementation(async m => ({ ok: true, pendingActions: m.actions ?? [] }));
  await c.reportAction('missing', 'in/alice', 'destroyed');
  await vi.advanceTimersByTimeAsync(10 * 60_000);
  const attempts = sendMessage.mock.calls.length;
  expect(attempts).toBeLessThanOrEqual(6);
  await vi.advanceTimersByTimeAsync(10 * 60_000);
  expect(sendMessage).toHaveBeenCalledTimes(attempts);
  sendMessage.mockResolvedValue({ type: 'store/error', error: 'Invalid target', retryable: false });
  await c.reportAction('bad', 'in/alice', 'shamed').catch(() => {});
  const after = sendMessage.mock.calls.length;
  await vi.advanceTimersByTimeAsync(10 * 60_000);
  expect(sendMessage).toHaveBeenCalledTimes(after);
});

it('treats explicit action rejections as terminal without discarding unrelated sightings', async () => {
  const c = await import('../../../src/lib/store/client');
  const action = { postId: 'conflict', authorId: 'in/alice', action: 'destroyed' as const };
  sendMessage.mockResolvedValue({ ok: true, pendingActions: [action], rejectedActions: [action] });
  c.reportSighting(sighting('valid'));
  await c.reportAction(action.postId, action.authorId, action.action);
  expect(sendMessage.mock.calls[0]![0].sightings).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(sendMessage).toHaveBeenCalledTimes(1);
});

it('ignores an old acknowledgement after dispose and re-enable while a fresh batch is in flight', async () => {
  const c = await import('../../../src/lib/store/client');
  let oldReply!: (value: unknown) => void;
  let freshReply!: (value: unknown) => void;
  sendMessage.mockImplementationOnce(() => new Promise(resolve => { oldReply = resolve; }));
  c.reportSighting(sighting('old'));
  const oldFlight = c.flushSightings();
  c.disposeStoreClient();
  sendMessage.mockImplementationOnce(() => new Promise(resolve => { freshReply = resolve; }));
  c.reportSighting(sighting('fresh'));
  const freshFlight = c.reportAction('fresh', 'in/alice', 'destroyed');
  oldReply({ ok: true, pendingActions: [] });
  await oldFlight;
  freshReply({ ok: true, pendingActions: [] });
  await freshFlight;
  await vi.advanceTimersByTimeAsync(120_000);
  expect(sendMessage).toHaveBeenCalledTimes(2);
  expect(sendMessage.mock.calls[1]![0].sightings.map((p: any) => p.postId)).toEqual(['fresh']);
});

it('caps action queues during an outage', async () => {
  const c = await import('../../../src/lib/store/client');
  await c.reportAction('oldest', 'in/alice', 'destroyed').catch(() => {});
  for (let i = 0; i < 1000; i++) await c.reportAction(`a${i}`, 'in/alice', 'destroyed').catch(() => {});
  sendMessage.mockClear(); sendMessage.mockResolvedValue({ ok: true, pendingActions: [] });
  await c.flushSightings();
  const actions = sendMessage.mock.calls.flatMap(([m]) => m.actions ?? []);
  expect(actions.length).toBeLessThanOrEqual(500);
  expect(actions.some(a => a.postId === 'a999')).toBe(true);
  expect(actions.some(a => a.postId === 'oldest')).toBe(false);
});

it('disposes timers, queues and in-flight retries, then supports new reports after re-enable', async () => {
  const c = await import('../../../src/lib/store/client');
  let reject!: (error: Error) => void;
  sendMessage.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  c.reportSighting(sighting('old'));
  const flight = c.flushSightings();
  expect(c).toHaveProperty('disposeStoreClient');
  (c as any).disposeStoreClient();
  reject(new Error('Stale failure'));
  await flight;
  await vi.advanceTimersByTimeAsync(120_000);
  expect(sendMessage).toHaveBeenCalledTimes(1);
  sendMessage.mockResolvedValue({ ok: true, pendingActions: [] });
  c.reportSighting(sighting('fresh'));
  await c.flushSightings();
  expect(sendMessage.mock.calls.at(-1)![0].sightings.map((p: any) => p.postId)).toEqual(['fresh']);
});
