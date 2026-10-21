// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://www.linkedin.com/feed/"}
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { watchFeed } from '../../../src/lib/linkedin';
import type { FeedWatcher } from '../../../src/lib/linkedin/types';
let watcher: FeedWatcher | undefined;
let mutation: MutationCallback;
let idle: IdleRequestCallback[];
beforeEach(() => {
  history.replaceState(null, '', '/feed/');
  idle = [];
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: MutationCallback) { mutation = callback; }
    observe() { }
    disconnect() { }
  });
  vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => idle.push(callback));
  vi.stubGlobal('cancelIdleCallback', () => { });
});
afterEach(() => {
  watcher?.disconnect();
  watcher = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function load(count: number) {
  document.body.innerHTML = '<main><div role="feed"></div></main>';
  const feed = document.querySelector<HTMLElement>('[role="feed"]')!;
  feed.innerHTML = Array.from({ length: count }, (_, i) => `<article data-urn="urn:li:activity:${i}"><header><a href="/in/author-${i}/"><strong>Author ${i}</strong></a><p>Engineer</p></header><p data-view-name="feed-commentary">Post body ${i}</p><span class="counter">0 reactions</span></article>`).join('');
  return feed;
}
function tick() { idle.shift()!({ timeRemaining: () => 0, didTimeout: true }); }
function drain() {
  let remaining = 1000;
  while (idle.length && remaining-- > 0) tick();
  expect(remaining).toBeGreaterThan(0);
}
function remove(feed: Element, node: Element) {
  node.remove();
  mutation([{ type: 'childList', target: feed, addedNodes: [], removedNodes: [node] } as unknown as MutationRecord], {} as MutationObserver);
}
it('rechecks only removed roots when one card leaves a large retained feed', () => {
  const feed = load(100);
  const onRemove = vi.fn();
  watcher = watchFeed({ onPost: () => { }, onRemove });
  drain();
  const contains = vi.spyOn(feed, 'contains');
  remove(feed, feed.lastElementChild!);
  drain();
  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(contains.mock.calls.length).toBeLessThan(5);
});

it('budgets removal cleanup and releases all hosts over successive idle slices', () => {
  const feed = load(30);
  const cards = Array.from(feed.children);
  const onRemove = vi.fn();
  watcher = watchFeed({ onPost: () => { }, onRemove });
  drain();
  const group = document.createElement('div');
  feed.append(group);
  group.append(...cards);
  remove(feed, group);
  tick();
  expect(onRemove).toHaveBeenCalledTimes(1);
  drain();
  expect(onRemove).toHaveBeenCalledTimes(30);
  expect(group.querySelectorAll('[data-slop-shame-mount]')).toHaveLength(0);
});

it('keeps a synchronously reinserted card mounted and does not remove it', () => {
  const feed = load(3);
  const onRemove = vi.fn();
  watcher = watchFeed({ onPost: () => { }, onRemove });
  drain();
  const card = feed.lastElementChild!;
  remove(feed, card);
  feed.prepend(card);
  drain();
  expect(onRemove).not.toHaveBeenCalled();
  expect(card.querySelector('[data-slop-shame-mount]')).not.toBeNull();
});

it('charges removal callbacks to the eight millisecond slice budget', () => {
  let now = 100;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const feed = load(30);
  const cards = Array.from(feed.children);
  const onRemove = vi.fn(() => { now += 3; });
  watcher = watchFeed({ onPost: () => {}, onRemove });
  drain();
  const group = document.createElement('div');
  feed.append(group);
  group.append(...cards);
  remove(feed, group);
  idle.shift()!({ timeRemaining: () => 100, didTimeout: false });
  expect(onRemove).toHaveBeenCalledTimes(3);
  drain();
  expect(onRemove).toHaveBeenCalledTimes(30);
});

it('releases tracked IDs when a replaced feed was already garbage collected', () => {
  const NativeWeakRef = WeakRef;
  vi.stubGlobal('WeakRef', class<T extends object> extends NativeWeakRef<T> {
    override deref() {
      const value = super.deref();
      return value instanceof HTMLElement && value.tagName === 'ARTICLE' && !value.isConnected ? undefined : value;
    }
  });
  load(3);
  const onRemove = vi.fn();
  watcher = watchFeed({ onPost: () => {}, onRemove });
  drain();
  document.body.innerHTML = '<main><div role="feed"></div></main>';
  window.dispatchEvent(new PopStateEvent('popstate'));
  drain();
  expect(onRemove).toHaveBeenCalledTimes(3);
});

it('preempts a cooldown timer for new cards and still drains the delayed update', () => {
  let now = 100;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  let nextTimer = 0;
  const timers = new Map<number, () => void>();
  vi.spyOn(window, 'setTimeout').mockImplementation(callback => {
    timers.set(++nextTimer, callback);
    return nextTimer as unknown as ReturnType<typeof window.setTimeout>;
  });
  const clear = vi.spyOn(window, 'clearTimeout').mockImplementation(id => {
    if (typeof id === 'number') timers.delete(id);
  });
  const feed = load(3);
  const onPost = vi.fn();
  watcher = watchFeed({ onPost, onRemove: () => {} });
  drain();
  const body = feed.querySelector('[data-view-name="feed-commentary"]')!;
  body.textContent = 'Updated body';
  mutation([{ type: 'characterData', target: body.firstChild } as unknown as MutationRecord], {} as MutationObserver);
  expect(idle).toHaveLength(0);
  expect(timers.size).toBe(1);
  const card = feed.lastElementChild!.cloneNode(true) as HTMLElement;
  card.setAttribute('data-urn', 'urn:li:activity:9000');
  card.querySelectorAll('[data-slop-shame-mount]').forEach(host => host.remove());
  feed.append(card);
  mutation([{ type: 'childList', target: feed, addedNodes: [card], removedNodes: [] } as unknown as MutationRecord], {} as MutationObserver);
  expect(clear).toHaveBeenCalledTimes(1);
  drain();
  expect(onPost).toHaveBeenCalledTimes(4);
  expect(onPost.mock.calls.at(-1)![0].id).toBe('urn:li:activity:9000');
  expect(timers.size).toBe(1);
  now = 850;
  const [id, callback] = timers.entries().next().value!;
  timers.delete(id);
  callback();
  drain();
  expect(onPost).toHaveBeenCalledTimes(5);
  expect(onPost.mock.calls.at(-1)![0].input.text).toBe('Updated body');
  expect(timers.size).toBe(0);
});

it.each([30, 100, 300])('does not repeatedly enumerate the pending backlog of %i cards', count => {
  const feed = load(count);
  const onPost = vi.fn();
  // Count actual Map entries visited; this catches the previous N(N+1)/2
  // scheduler while allowing a queue/heap or an incrementally maintained due time.
  const originalValues = Map.prototype.values;
  const originalEntries = Map.prototype[Symbol.iterator];
  let visits = 0;
  const wrap = (iterator: MapIterator<unknown>) => (function* () {
    for (const entry of iterator) {
      const value = Array.isArray(entry) ? entry[1] : entry;
      if (value && typeof value === 'object' && 'due' in value && 'force' in value)
        visits++;
      yield entry;
    }
  })();
  vi.spyOn(Map.prototype, 'values').mockImplementation(function (this: Map<unknown, unknown>) {
    return wrap(originalValues.call(this)) as MapIterator<unknown>;
  });
  vi.spyOn(Map.prototype, Symbol.iterator).mockImplementation(function (this: Map<unknown, unknown>) {
    return wrap(originalEntries.call(this)) as MapIterator<[unknown, unknown]>;
  });
  watcher = watchFeed({ onPost, onRemove: () => { } });
  const before = visits;
  mutation([{ type: 'characterData', target: feed.querySelector('.counter')!.firstChild } as unknown as MutationRecord], {} as MutationObserver);
  expect(visits - before).toBe(0);
  drain();
  expect(onPost).toHaveBeenCalledTimes(count);
  expect(visits).toBeLessThan(count * 5);
});
