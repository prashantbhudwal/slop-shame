// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://www.linkedin.com/feed/"}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchFeed } from '../../../src/lib/linkedin';
import type { FeedPost, FeedWatcher } from '../../../src/lib/linkedin/types';
import { selectors } from '../../../src/lib/linkedin/selectors';

const fixtures = new Map(['sdui', 'classic', 'hashed'].map(name => [name,
  readFileSync(resolve('tests/fixtures/feed', `${name}.html`), 'utf8'),
]));
let watcher: FeedWatcher | undefined;
const pause = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));
const eventually = (assertion: () => void) => vi.waitFor(assertion, { interval: 20, timeout: 2500 });

function load(name = 'classic') {
  document.documentElement.innerHTML = new DOMParser().parseFromString(fixtures.get(name)!, 'text/html').documentElement.innerHTML;
}

function start() {
  const onPost = vi.fn<(post: FeedPost) => void>();
  const onRemove = vi.fn<(id: string) => void>();
  watcher = watchFeed({ onPost, onRemove });
  const byId = (id: string) => onPost.mock.calls.map(([post]) => post).filter(post => post.id === id).at(-1)!;
  return { onPost, onRemove, byId };
}

beforeEach(() => { history.replaceState(null, '', '/feed/'); });
afterEach(() => { watcher?.disconnect(); watcher = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(['classic', 'hashed'])('%s LinkedIn feed', variant => {
  it('detects 12 whole cards, skips suggestions/jobs/empty modules, and dedupes inner URNs', async () => {
    load(variant);
    const { onPost } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const posts = onPost.mock.calls.map(([post]) => post);
    expect(new Set(posts.map(post => post.id)).size).toBe(12);
    expect(posts.every(post => post.root.tagName === 'ARTICLE')).toBe(true);
    expect(posts.map(post => post.id)).toEqual(expect.arrayContaining([
      'urn:li:activity:1001', 'urn:li:share:1002', 'urn:li:ugcPost:1003', 'urn:li:activity:1012',
    ]));
    expect(posts.find(post => post.author?.id === 'in/jules-martin')?.id).toMatch(/^fallback:/);
  });

  it('extracts normalized author identity, name, headline, avatar, hashtags and flags', async () => {
    load(variant);
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    expect(byId('urn:li:activity:1001').author).toMatchObject({
      id: 'in/ada-patel', name: 'Ada Patel', headline: 'Database engineer',
      profileUrl: 'https://www.linkedin.com/in/ada-patel', kind: 'person',
    });
    expect(byId('urn:li:activity:1001').author?.avatarUrl).toMatch(/^data:image/);
    expect(byId('urn:li:activity:1006').author).toMatchObject({ id: 'company/acme', name: 'Acme Tools', kind: 'company' });
    expect(byId('urn:li:activity:1006').input.isAd).toBe(true);
    expect(onPost.mock.calls.filter(([post]) => post.input.isAd)).toHaveLength(1);
    expect(byId('urn:li:activity:1001').input.hasMedia).toBe(false); // avatar is not post media
    expect(byId('urn:li:activity:1009').input.hasPoll).toBe(true);
    expect(byId('urn:li:activity:1010').input).toMatchObject({ hasMedia: true, hashtags: ['#Photography', '#मराठी'] });
    expect(byId('urn:li:activity:1007').input).toMatchObject({ isBareRepost: true, hashtags: ['#Accessibility'] });
    expect(byId('urn:li:activity:1007').author?.id).toBe('in/farah-khan');
    expect(byId('urn:li:activity:1004').input.text).toContain('I failed.\n\nI listened.');
  });

  it('reads the full hidden text, strips more controls, and keeps text outside of UI', async () => {
    load(variant);
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const full = byId('urn:li:activity:1008');
    expect(full.input.text).toBe('I missed a train yesterday. It taught me more about leadership than my MBA ever did. The lesson: show up before the doors close. #Leadership');
    expect(byId('urn:li:activity:1012').input.text).toBe('Nobody talks about the real cost of building a company. Here are three things I wish I knew');
    expect(full.input.text).not.toMatch(/Like|Comment|reactions|Grace Chen/);
    const body = full.root.querySelector<HTMLElement>(selectors.body.join(','))!;
    body.textContent = 'Expanded with another sentence. #Growth';
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(byId(full.id)).toMatchObject({ id: full.id, mount: full.mount, input: { text: 'Expanded with another sentence. #Growth', hashtags: ['#Growth'] } });
  });

  it('inserts one mount after the header and ignores own UI mutations', async () => {
    load(variant);
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    expect(post.mount.parentElement).toBe(post.root);
    expect(post.mount.previousElementSibling?.matches(selectors.actor.join(','))).toBe(true);
    post.mount.innerHTML = '<span>Injected Slop Index UI #Fake</span><img alt="UI icon">';
    post.root.classList.add('hydrated');
    await pause();
    expect(onPost).toHaveBeenCalledTimes(12);
    expect(post.root.querySelectorAll(selectors.mount)).toHaveLength(1);
    expect(post.root.hasAttribute('data-slop-shame-processed')).toBe(true);
  });
});

describe('SDUI LinkedIn feed (structure checked against a live capture)', () => {
  it('detects whole expanded cards, reads activity anchors and opaque component IDs', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    expect(new Set(onPost.mock.calls.map(([post]) => post.id)).size).toBe(12);
    expect(byId('urn:li:activity:1001').root.id).toBe('expandedsyntheticPost01_opaqueFeedType_MAIN_FEED_RELEVANCE');
    expect(byId('sdui:syntheticPost02_opaque').author?.id).toBe('in/ben-okafor');
    expect(byId('urn:li:activity:1003').id).not.toContain('-0');
    expect(onPost.mock.calls.every(([post]) => post.root.contains(post.mount))).toBe(true);
  });

  it('takes names/headlines from the actor row, excluding social proof and connection badges', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    expect(byId('urn:li:activity:1001').author).toMatchObject({
      id: 'in/ada-patel', name: 'Ada Patel', headline: 'Database engineer',
      profileUrl: 'https://www.linkedin.com/in/ada-patel', kind: 'person',
    });
    expect(byId('sdui:syntheticPost06_opaque').author).toMatchObject({ id: 'company/acme', name: 'Acme Tools', headline: 'Software for distributed teams', kind: 'company' });
    expect(byId('urn:li:activity:1001').input.authorHeadline).toBe('Database engineer');
    expect(byId('urn:li:activity:1001').mount.previousElementSibling?.contains(
      byId('urn:li:activity:1001').root.querySelector(selectors.actorLink[0]!),
    )).toBe(true);
  });

  it('reads commentary paragraphs in full, ignores inline commentary links and comment threads', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1008');
    expect(post.input.text).toBe('I missed a train yesterday. It taught me more about leadership than my MBA ever did. The lesson: show up before the doors close. #Leadership');
    expect(post.input.hashtags).toEqual(['#Leadership']);
    expect(onPost.mock.calls.every(([p]) => !p.input.text.includes('IgnoreComment'))).toBe(true);
    post.root.querySelector(selectors.comments[0]!)!.append(' Another comment. #Fake');
    await pause();
    expect(onPost).toHaveBeenCalledTimes(12);
    post.root.querySelector(selectors.body[0]!)!.append(' New post text.');
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(byId(post.id).mount).toBe(post.mount);
  });

  it('distinguishes promoted labels, polls, bare reposts, content images and account avatars', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    expect(byId('sdui:syntheticPost06_opaque').input.isAd).toBe(true);
    expect(onPost.mock.calls.filter(([post]) => post.input.isAd)).toHaveLength(1);
    expect(byId('urn:li:activity:1007').input.isBareRepost).toBe(true);
    expect(byId('urn:li:activity:1001').input.isBareRepost).toBe(false);
    expect(byId('sdui:syntheticPost09_opaque').input.hasPoll).toBe(true);
    expect(onPost.mock.calls.filter(([post]) => post.input.hasMedia)).toHaveLength(1);
    expect(byId('urn:li:activity:1010').input.hasMedia).toBe(true);
  });

  it('keeps a component-based ID through text hydration and expanded/focus key changes', async () => {
    load('sdui');
    const { onPost, onRemove, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('sdui:syntheticPost02_opaque');
    post.root.setAttribute('componentkey', 'update-card-focussyntheticPost02_opaqueFeedType_MAIN_FEED_RELEVANCE');
    post.root.querySelector(selectors.body[0]!)!.append(' Hydrated content.');
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(onPost.mock.calls.at(-1)?.[0].id).toBe(post.id);
    expect(onRemove).not.toHaveBeenCalled();
    expect(post.root.querySelectorAll(selectors.mount)).toHaveLength(1);
    post.root.remove();
    await eventually(() => expect(onRemove).toHaveBeenCalledWith(post.id));
  });
});

describe('watcher lifecycle', () => {
  it('re-extracts character data and full-text attributes after lazy hydration', async () => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const body = post.root.querySelector<HTMLElement>(selectors.body.join(','))!;
    body.firstChild!.textContent = 'Text changed in place. #Fresh';
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(byId(post.id).input.text).toBe('Text changed in place. #Fresh');
    body.setAttribute('data-full-text', 'Full server text beyond the clipped preview. #Complete');
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(14));
    expect(byId(post.id).input).toMatchObject({ text: 'Full server text beyond the clipped preview. #Complete', hashtags: ['#Complete'] });
  });

  it('calls onRemove and removes mount/marker when a post is removed', async () => {
    load();
    const { onPost, onRemove, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    post.root.remove();
    await eventually(() => expect(onRemove).toHaveBeenCalledWith(post.id));
    expect(post.root.querySelector(selectors.mount)).toBeNull();
    expect(post.root.hasAttribute('data-slop-shame-processed')).toBe(false);
  });

  it('removes a still-connected card when LinkedIn moves it outside the feed', async () => {
    load();
    const { onPost, onRemove, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    document.body.append(post.root);
    await eventually(() => expect(onRemove).toHaveBeenCalledWith(post.id));
    expect(post.root.isConnected).toBe(true);
    expect(post.root.querySelector(selectors.mount)).toBeNull();
  });

  it('handles dynamic insertion, hydration, recycled identity, and reinsertion', async () => {
    document.body.innerHTML = '<main><div role="feed"></div></main>';
    const { onPost, onRemove } = start();
    const source = new DOMParser().parseFromString(fixtures.get('hashed')!, 'text/html').querySelector('article')!;
    const root = document.importNode(source, true);
    document.querySelector('[role="feed"]')!.append(root);
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(1));
    root.setAttribute('data-urn', 'urn:li:activity:2001');
    await eventually(() => expect(onRemove).toHaveBeenCalledWith('urn:li:activity:1001'));
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(2));
    expect(onPost.mock.calls[1]?.[0].id).toBe('urn:li:activity:2001');
    root.remove();
    await eventually(() => expect(onRemove).toHaveBeenCalledWith('urn:li:activity:2001'));
    document.querySelector('[role="feed"]')!.append(root);
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(3));
    expect(root.querySelectorAll(selectors.mount)).toHaveLength(1);
  });

  it('preserves a fallback id when text expands', async () => {
    load();
    const { onPost } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const fallback = onPost.mock.calls.map(([post]) => post).find(post => post.id.startsWith('fallback:'))!;
    fallback.root.querySelector(selectors.body.join(','))!.append(' More content.');
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(onPost.mock.calls.at(-1)?.[0].id).toBe(fallback.id);
  });

  it('activates only on the feed and observes pushState and popstate without patching history', async () => {
    load();
    history.replaceState(null, '', '/in/somebody/');
    const originalPushState = history.pushState;
    const { onPost, onRemove } = start();
    await pause();
    expect(onPost).not.toHaveBeenCalled();
    history.pushState(null, '', '/feed/?trk=home');
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    history.pushState(null, '', '/jobs/');
    await eventually(() => expect(onRemove).toHaveBeenCalledTimes(12));
    expect(document.querySelectorAll(selectors.mount)).toHaveLength(0);
    history.replaceState(null, '', '/feed/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(24));
    expect(document.querySelectorAll(selectors.mount)).toHaveLength(12);
    expect(history.pushState).toBe(originalPushState);
  });

  it('starts before a main/container exists and survives main replacement', async () => {
    document.body.innerHTML = '';
    const { onPost, onRemove } = start();
    load();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    await pause(550); // allow the body fallback to retarget to the feed
    const nextMain = document.querySelector('main')!.cloneNode(true) as HTMLElement;
    nextMain.querySelectorAll(selectors.mount).forEach(node => node.remove());
    document.querySelector('main')!.replaceWith(nextMain);
    await eventually(() => expect(onRemove).toHaveBeenCalledTimes(12));
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(24));
  });

  it('uses one observer, drains pending work, removes listeners, and disconnects idempotently', async () => {
    load();
    const NativeObserver = globalThis.MutationObserver;
    const observers: MutationObserver[] = [];
    vi.stubGlobal('MutationObserver', class extends NativeObserver {
      constructor(callback: MutationCallback) { super(callback); observers.push(this); }
    });
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { onPost, onRemove } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    expect(observers).toHaveLength(1);
    const disconnect = vi.spyOn(observers[0]!, 'disconnect');
    watcher!.disconnect();
    watcher!.disconnect();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(12);
    expect(document.querySelectorAll(selectors.mount)).toHaveLength(0);
    expect(document.querySelectorAll('[data-slop-shame-processed]')).toHaveLength(0);
    expect(removeListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    load('hashed');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await pause(600);
    expect(onPost).toHaveBeenCalledTimes(12);
    vi.unstubAllGlobals();
  });

  it('isolates malformed cards and subscriber exceptions', async () => {
    load();
    document.querySelector('article a')!.setAttribute('href', 'https://[bad/in/author');
    const onPost = vi.fn(() => { throw new Error('subscriber'); });
    const onRemove = vi.fn(() => { throw new Error('subscriber'); });
    watcher = watchFeed({ onPost, onRemove });
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(11));
    expect(() => watcher!.disconnect()).not.toThrow();
    expect(onRemove).toHaveBeenCalledTimes(11);
  });
});

describe('mutation cost', () => {
  function watchExtractions(root: HTMLElement) {
    const scans = vi.spyOn(root, 'querySelectorAll');
    return () => scans.mock.calls.filter(([selector]) => selector === selectors.media.join(',')).length;
  }

  it('does not re-extract for classes, reaction counts, video controls or non-actor image sources', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const extractions = watchExtractions(post.root);
    const body = post.root.querySelector<HTMLElement>(selectors.body[0]!)!;
    const counter = document.createElement('a');
    counter.setAttribute('data-view-name', 'view-likers');
    const count = document.createElement('span');
    counter.append(count);
    const player = document.createElement('button');
    const image = document.createElement('img');
    post.root.append(counter, player, image);
    for (let index = 0; index < 12; index++) {
      post.root.classList.toggle('hovered');
      body.classList.toggle('expanded');
      count.textContent = `${index} reactions`;
      player.setAttribute('aria-label', `Video ${index}`);
      image.setAttribute('src', `data:image/png,${index}`);
      await pause(15);
    }
    await pause(850);
    expect(extractions()).toBe(0);
    expect(onPost).toHaveBeenCalledTimes(12);
  });

  it('coalesces a hydration burst into one trailing extraction per 750 ms', async () => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const body = post.root.querySelector<HTMLElement>(selectors.body.join(','))!;
    const extractions = watchExtractions(post.root);
    for (let index = 0; index < 8; index++) {
      body.firstChild!.textContent = `Hydrating version ${index}`;
      await pause(25);
    }
    expect(extractions()).toBe(0);
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(extractions()).toBe(1);
    expect(byId(post.id).input.text).toBe('Hydrating version 7');
    body.firstChild!.textContent = 'Final hydrated version';
    await pause(120);
    expect(extractions()).toBe(1);
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(14));
    expect(extractions()).toBe(2);
    expect(byId(post.id).id).toBe(post.id);
  });

  it('handles see-more text appended with a class toggle, keeping the same id', async () => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1012');
    const body = post.root.querySelector<HTMLElement>(selectors.body.join(','))!;
    const original = byId(post.id).input.text;
    const more = document.createElement('button');
    more.textContent = '…more';
    body.append(more);
    more.onclick = () => {
      more.remove();
      body.classList.add('expanded');
      body.firstChild!.textContent = original;
      body.append(' Full text arrived from hydration. #Expanded');
    };
    more.click();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(byId(post.id).input.text).toBe(`${original} Full text arrived from hydration. #Expanded`);
    expect(byId(post.id).mount).toBe(post.mount);
    expect(byId(post.id).input.hashtags).toEqual(['#Expanded']);
  });

  it('uses the fast fingerprint for timestamps and redundant body mutations without missing middle edits', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const extractions = watchExtractions(post.root);
    const actor = post.mount.previousElementSibling!;
    const timestamp = [...actor.querySelectorAll('p')].find(p => p.textContent === '2h · Edited')!;
    timestamp.firstChild!.textContent = '3h · Edited';
    const body = post.root.querySelector<HTMLElement>(selectors.body[0]!)!;
    const last = body.querySelector('a')!;
    last.firstChild!.textContent = last.firstChild!.textContent;
    await pause(850);
    expect(extractions()).toBe(0);
    body.textContent = `${'a'.repeat(40)} ORIGINAL ${'z'.repeat(40)}`;
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    body.firstChild!.textContent = `${'a'.repeat(40)} MODIFIED ${'z'.repeat(40)}`;
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(14));
    expect(byId(post.id).input.text).toContain('MODIFIED');
    expect(extractions()).toBe(2);
  });

  it('notices identity-anchor hydration and replacement of body/actor subtrees', async () => {
    load('sdui');
    const { onPost, onRemove, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('sdui:syntheticPost02_opaque');
    const body = post.root.querySelector<HTMLElement>(selectors.body[0]!)!;
    const replacement = body.cloneNode(true) as HTMLElement;
    body.replaceWith(replacement);
    replacement.textContent = 'Replaced body. #Fresh';
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(13));
    expect(byId(post.id).input.text).toBe('Replaced body. #Fresh');
    const actor = post.mount.previousElementSibling!;
    const newActor = actor.cloneNode(true) as HTMLElement;
    actor.replaceWith(newActor);
    newActor.querySelector(selectors.actorLink[0]!)!.querySelector('p')!.textContent = 'Ben Updated';
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(14));
    expect(byId(post.id).author?.name).toBe('Ben Updated');
    const anchor = document.createElement('span');
    anchor.setAttribute('data-sdui-anchor-id', 'feed-header-urn:li:activity:2002-0');
    post.root.prepend(anchor);
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(15));
    expect(onRemove).toHaveBeenCalledWith(post.id);
    expect(onPost.mock.calls.at(-1)?.[0].id).toBe('urn:li:activity:2002');
  });

  it('cancels trailing work when disconnected', async () => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const extractions = watchExtractions(post.root);
    post.root.querySelector(selectors.body.join(','))!.append(' Pending text update.');
    await pause(50);
    watcher!.disconnect();
    await pause(850);
    expect(extractions()).toBe(0);
    expect(onPost).toHaveBeenCalledTimes(12);
  });
});
