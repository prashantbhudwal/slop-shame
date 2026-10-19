import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sighting } from './helpers';

let sendMessage: ReturnType<typeof vi.fn>;
let resetListener: (message: unknown) => unknown;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  sendMessage = vi.fn().mockResolvedValue({ ok: true, pendingActions: [] });
  vi.stubGlobal('browser', { runtime: { sendMessage, onMessage: { addListener: (fn: typeof resetListener) => { resetListener = fn; } } } });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('content store client', () => {
  it('buffers for two seconds and dedupes repeated postId + score', async () => {
    const { reportSighting } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    reportSighting(sighting());
    expect(sendMessage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0]![0].sightings).toHaveLength(1);
    reportSighting(sighting());
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('flushes 25 distinct posts immediately and coalesces pending hydration', async () => {
    const { reportSighting, flushSightings } = await import('../../../src/lib/store/client');
    reportSighting(sighting('post-0', 40));
    reportSighting(sighting('post-0', 80));
    for (let i = 1; i < 25; i++) reportSighting(sighting(`post-${i}`));
    await flushSightings();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0]![0].sightings).toHaveLength(25);
    expect(sendMessage.mock.calls[0]![0].sightings[0].score).toBe(80);
    reportSighting(sighting('post-0', 40));
    await flushSightings();
    expect(sendMessage.mock.calls[1]![0].sightings[0].score).toBe(40);
  });

  it('batches buffered sightings with actions and queries authors through messaging', async () => {
    const { reportSighting, reportAction, getAuthor } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    await reportAction('post-1', 'in/alice', 'destroyed');
    expect(sendMessage.mock.calls.map(([m]) => m.type)).toEqual(['store/sightings']);
    expect(sendMessage.mock.calls[0]![0].actions).toEqual([{ postId: 'post-1', authorId: 'in/alice', action: 'destroyed' }]);
    sendMessage.mockResolvedValueOnce({ id: 'in/alice', postsSeen: 1 });
    expect(await getAuthor('in/alice')).toMatchObject({ id: 'in/alice' });
  });

  it('keeps newer sightings that arrive while a batch is in flight', async () => {
    let release!: () => void;
    sendMessage.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const { reportSighting, flushSightings } = await import('../../../src/lib/store/client');
    reportSighting(sighting('a', 40));
    const inFlight = flushSightings();
    reportSighting(sighting('a', 80));
    release();
    await inFlight;
    expect(sendMessage.mock.calls.map(([m]) => m.sightings[0].score)).toEqual([40, 80]);
  });

  it('retries a transient failure without losing or duplicating pending sightings', async () => {
    sendMessage.mockRejectedValueOnce(new Error('Receiving end unavailable'));
    const { reportSighting, flushSightings } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    await expect(flushSightings()).rejects.toThrow('unavailable');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[1]![0].sightings).toHaveLength(1);
  });

  it('swallows invalidated context errors and permanently stops sending', async () => {
    sendMessage.mockRejectedValueOnce(new Error('Extension context invalidated.'));
    const { reportSighting, flushSightings, reportAction, getAuthor } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    await expect(flushSightings()).resolves.toBeUndefined();
    reportSighting(sighting('next'));
    await reportAction('post-1', 'in/alice', 'shamed');
    expect(await getAuthor('in/alice')).toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('gets current author data by flushing the buffered sightings first', async () => {
    const { reportSighting, getAuthor } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    await getAuthor('in/alice');
    expect(sendMessage.mock.calls.map(([m]) => m.type)).toEqual(['store/sightings', 'store/author']);
  });

  it('drops permanent sighting rejections and retains actions after a transient flush failure', async () => {
    const { reportSighting, flushSightings, reportAction } = await import('../../../src/lib/store/client');
    sendMessage.mockResolvedValueOnce({ type: 'store/error', error: 'Invalid batch', retryable: false });
    reportSighting(sighting());
    await flushSightings();
    await vi.advanceTimersByTimeAsync(4_000);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    reportSighting(sighting('b'));
    sendMessage.mockRejectedValueOnce(new Error('Temporary storage error'));
    await expect(reportAction('stored-post', 'in/alice', 'shamed')).rejects.toThrow('Temporary storage');
    await flushSightings();
    expect(sendMessage.mock.calls.at(-1)![0].actions).toEqual([{ postId: 'stored-post', authorId: 'in/alice', action: 'shamed' }]);
  });

  it('clears session dedupe on reset and can re-report an action target after clearing', async () => {
    const { reportSighting, flushSightings, reportAction } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    await flushSightings();
    resetListener({ type: 'store/reset' });
    await reportAction('post-1', 'in/alice', 'destroyed');
    expect(sendMessage.mock.calls.map(([m]) => m.type)).toEqual(['store/sightings', 'store/sightings']);
    expect(sendMessage.mock.calls[1]![0].sightings).toHaveLength(1);
    expect(sendMessage.mock.calls[1]![0].actions).toEqual([{ postId: 'post-1', authorId: 'in/alice', action: 'destroyed' }]);
  });

  it('swallows invalidation while registering the reset listener after reload', async () => {
    vi.stubGlobal('browser', { runtime: { sendMessage, onMessage: { addListener: () => { throw new Error('Extension context invalidated.'); } } } });
    const { reportSighting, flushSightings } = await import('../../../src/lib/store/client');
    expect(() => reportSighting(sighting())).not.toThrow();
    await flushSightings();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not requeue a stale failed batch after a reset', async () => {
    let rejectBatch!: (error: Error) => void;
    sendMessage.mockImplementationOnce(() => new Promise((_, reject) => { rejectBatch = reject; }));
    const { reportSighting, flushSightings } = await import('../../../src/lib/store/client');
    reportSighting(sighting());
    const inFlight = flushSightings();
    resetListener({ type: 'store/reset' });
    rejectBatch(new Error('Old batch failed'));
    await inFlight;
    await vi.advanceTimersByTimeAsync(4_000);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
