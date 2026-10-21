// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://www.linkedin.com/feed/"}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchFeed } from '../../../src/lib/linkedin';
import type { FeedPost, FeedWatcher } from '../../../src/lib/linkedin/types';
import { selectors } from '../../../src/lib/linkedin/selectors';

const fixtures = new Map(['sdui', 'classic', 'hashed', 'author-context', 'activity'].map(name => [name,
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

describe('activity pages', () => {
  it('treats a no-commentary repost as bare, so its unidentified original stays out of the Hall', async () => {
    history.replaceState(null, '', '/in/jane-doe/recent-activity/all/');
    load('activity');
    const { onPost, byId } = start();
    await eventually(() => expect(byId('urn:li:activity:7004')).toBeDefined());
    const repost = byId('urn:li:activity:7004');
    expect(repost.author?.id).toBe('in/rowan-example');
    expect(repost.input.isBareRepost).toBe(true);
    expect(repost.sourceId).toBeUndefined();
    const own = onPost.mock.calls.map(([post]) => post).filter(post => post.author?.id === 'in/jane-doe');
    expect(own.length).toBeGreaterThan(0);
    expect(own.every(post => !post.input.isBareRepost)).toBe(true);
  });
});

describe('author of the scored text', () => {
  function expectAuthor(post: FeedPost, id: string, name: string) {
    expect(post.author).toMatchObject({ id, name, profileUrl: `https://www.linkedin.com/${id}` });
  }

  function setSocialAction(action: string) {
    const label = document.getElementById('social-action')!;
    label.textContent = action === 'Followed by' ? 'Followed by ' : ` ${action}`;
    if (action === 'Followed by') label.parentElement!.prepend(label);
  }

  it.each([
    'likes this', 'reposted this', 'celebrates this', 'commented on this', 'loves this',
    'supports this', 'finds this insightful', 'finds this funny', 'follows', 'Followed by', 'is hiring',
  ])('ignores the "%s" social-context person', async action => {
    load('author-context');
    setSocialAction(action);
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expectAuthor(byId('urn:li:activity:8101'), 'in/mira-example', 'Mira Example');
  });

  it.each(['likes this', 'reposted this', 'celebrates this', 'commented on this', 'Followed by'])
  ('excludes "%s" profile links when the author-link hook is absent', async action => {
    load('author-context');
    setSocialAction(action);
    document.getElementById('likes-author')!.querySelectorAll(selectors.actorLink.join(',')).forEach(link => link.removeAttribute('data-view-name'));
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expectAuthor(byId('urn:li:activity:8101'), 'in/mira-example', 'Mira Example');
  });

  it('uses the original company author for a bare repost with an outer reposter header', async () => {
    load('author-context');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    const post = byId('urn:li:activity:8102');
    expect(post.input).toMatchObject({ text: 'Our new seed library opens on Saturday.', isBareRepost: true });
    expectAuthor(post, 'company/cedar-workshop', 'Cedar Workshop');
    expect(post.author?.headline).toBe('Tools for community gardens');
  });

  it.each([false, true])('uses the commentary writer for a repost (author hook absent: %s)', async missingHook => {
    load('author-context');
    if (missingHook) document.getElementById('commentary-author')!.querySelectorAll(selectors.actorLink.join(',')).forEach(link => link.removeAttribute('data-view-name'));
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    const post = byId('urn:li:activity:8103');
    expect(post.input).toMatchObject({ text: 'I helped build these shelves and will bring some seeds.', isBareRepost: false });
    expectAuthor(post, 'in/mira-example', 'Mira Example');
    expect(post.author?.headline).toBe('Community gardener');
  });

  it('uses the post author below a celebration header', async () => {
    load('author-context');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expectAuthor(byId('urn:li:activity:8104'), 'in/mira-example', 'Mira Example');
  });

  it('preserves the author of a plain company post', async () => {
    load('author-context');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expectAuthor(byId('urn:li:activity:8105'), 'company/cedar-workshop', 'Cedar Workshop');
  });

  it('excludes a hiring company in social context when the author-link hook is absent', async () => {
    load('author-context');
    setSocialAction('is hiring');
    document.getElementById('social-header')!.querySelectorAll(selectors.profile.join(',')).forEach(link => link.setAttribute('href', '/company/harbor-example/'));
    document.getElementById('social-header')!.querySelector(selectors.socialHeader.join(','))!.textContent = 'Harbor Example';
    document.getElementById('likes-author')!.querySelectorAll(selectors.actorLink.join(',')).forEach(link => link.removeAttribute('data-view-name'));
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expectAuthor(byId('urn:li:activity:8101'), 'in/mira-example', 'Mira Example');
  });

  it('skips an empty duplicate actor anchor before the named actor', async () => {
    load('author-context');
    const row = document.getElementById('likes-author')!;
    row.prepend(row.querySelectorAll(selectors.actorLink.join(','))[1]!.cloneNode(true));
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expectAuthor(byId('urn:li:activity:8101'), 'in/mira-example', 'Mira Example');
  });

  it('leaves an unidentified author null instead of using context or commentary links', async () => {
    load('author-context');
    document.getElementById('likes-author')!.remove();
    document.getElementById('likes-body')!.innerHTML = 'Thanks to <a href="/in/rowan-example/">Rowan Example</a> for the seeds.';
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    expect(byId('urn:li:activity:8101').author).toBeNull();
  });

  it('updates the scored original author after bare-repost hydration', async () => {
    load('author-context');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(5));
    document.getElementById('bare-author')!.querySelector(selectors.actorLink.join(','))!.querySelector('p')!.textContent = 'Cedar Workshop Updated';
    await eventually(() => expectAuthor(byId('urn:li:activity:8102'), 'company/cedar-workshop', 'Cedar Workshop Updated'));
    expect(onPost).toHaveBeenCalledTimes(6);
  });
});

describe('review regressions', () => {
  it('discovers structural descendants inside a newly hydrated wrapper', async () => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="opaque-wrapper"><p>Hydrated structural body</p></div>';
    document.querySelector('[data-urn="urn:li:activity:9999"]')!.append(wrapper);
    await eventually(() => expect(byId('urn:li:activity:9999')?.input.text).toBe('Hydrated structural body'));
  });

  it.each([
    ['media', '<figure><img src="data:image/png,fixture" alt="Post image"></figure>', 'hasMedia'],
    ['poll', '<div><div role="group" aria-label="Community poll">Choices</div></div>', 'hasPoll'],
  ] as const)('discovers a %s-only card after lazy hydration', async (_name, html, flag) => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.querySelector('[data-urn="urn:li:activity:9999"]')!.append(wrapper);
    await eventually(() => expect(byId('urn:li:activity:9999')?.input[flag]).toBe(true));
  });

  it('updates media and poll flags when their subtrees are added and removed', async () => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<figure><img src="data:image/png,fixture" alt="Post image"></figure><div role="group" aria-label="Community poll">Choices</div>';
    post.root.append(wrapper);
    await eventually(() => expect(byId(post.id).input).toMatchObject({ hasMedia: true, hasPoll: true }));
    wrapper.remove();
    await eventually(() => expect(byId(post.id).input).toMatchObject({ hasMedia: false, hasPoll: false }));
    expect(onPost).toHaveBeenCalledTimes(14);
  });

  it.each([
    ['line break', '<span>Alpha<br>Beta</span>', 'Alpha\nBeta'],
    ['blocks', '<span><p>Alpha</p><p>Beta</p></span>', 'Alpha\n\nBeta'],
  ])('notices nested %s changes with identical textContent', async (_name, html, expected) => {
    load('hashed');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const body = post.root.querySelector<HTMLElement>(selectors.body.join(','))!;
    body.innerHTML = '<span>AlphaBeta</span>';
    await eventually(() => expect(byId(post.id).input.text).toBe('AlphaBeta'));
    body.firstElementChild!.outerHTML = html!;
    expect(body.textContent).toBe('AlphaBeta');
    await eventually(() => expect(byId(post.id).input.text).toBe(expected));
    expect(onPost).toHaveBeenCalledTimes(14);
  });
});

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

  it('keeps 12 cards at 0 re-extractions during 20 rounds of counter/class churn (240 card updates)', async () => {
    load('sdui');
    const { onPost } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const cards = onPost.mock.calls.map(([post]) => {
      const counter = document.createElement('span');
      counter.textContent = '0 reactions';
      post.root.append(counter);
      return { root: post.root, counter };
    });
    await pause();
    const extractions = cards.map(({ root }) => watchExtractions(root));
    for (let frame = 0; frame < 20; frame++) {
      for (const { root, counter } of cards) {
        root.classList.toggle('measurement-hover');
        counter.firstChild!.textContent = `${frame} reactions`;
      }
      await pause(50);
    }
    await pause(850);
    expect(extractions.reduce((sum, count) => sum + count(), 0)).toBe(0);
    expect(onPost).toHaveBeenCalledTimes(12);
  });

  it('does not re-extract for classes, reaction counts, video controls or non-actor image sources', async () => {
    load('sdui');
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const body = post.root.querySelector<HTMLElement>(selectors.body[0]!)!;
    const counter = document.createElement('a');
    counter.setAttribute('data-view-name', 'view-likers');
    const count = document.createElement('span');
    counter.append(count);
    const player = document.createElement('button');
    const image = document.createElement('img');
    post.root.append(counter, player, image);
    // A new image is real media hydration; measure only the subsequent churn.
    await eventually(() => expect(byId(post.id).input.hasMedia).toBe(true));
    const extractions = watchExtractions(post.root);
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
    expect(onPost).toHaveBeenCalledTimes(13);
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

describe('UI slots: action bar chip, name-line tag, avatar frame', () => {
  const bar = (root: Element) => root.querySelector<HTMLElement>('.r7ya')!;
  const flexBars = () => document.querySelectorAll<HTMLElement>('.r7ya').forEach(row => { row.style.display = 'flex'; });

  it('puts the chip host in the action bar, right after Send', async () => {
    load('sdui');
    flexBars();
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    expect(post.mount.getAttribute('data-slot')).toBe('bar');
    expect(post.mount.parentElement).toBe(bar(post.root));
    expect(post.mount.previousElementSibling?.matches(selectors.actionBarAnchor[0]!)).toBe(true);
    expect(post.root.querySelectorAll(selectors.chipMount)).toHaveLength(1);
  });

  it('moves the chip into the action bar when the bar hydrates after the text', async () => {
    load('sdui');
    const late = document.querySelector('#expandedsyntheticPost01_opaqueFeedType_MAIN_FEED_RELEVANCE .r7ya')!;
    const parent = late.parentElement!;
    late.remove();
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const before = byId('urn:li:activity:1001');
    expect(before.mount.hasAttribute('data-slot')).toBe(false);
    (late as HTMLElement).style.display = 'flex';
    parent.append(late);
    await eventually(() => expect(byId('urn:li:activity:1001').mount.getAttribute('data-slot')).toBe('bar'));
    const after = byId('urn:li:activity:1001');
    expect(after.mount).toBe(before.mount);
    expect(after.mount.parentElement).toBe(late);
    expect(after.root.querySelectorAll(selectors.chipMount)).toHaveLength(1);
  });

  it('creates the name-line tag host on demand, once, and removes it with the post', async () => {
    load('sdui');
    document.querySelectorAll<HTMLElement>('[data-view-name="feed-actor"] > div[aria-label]').forEach(line => { line.style.display = 'flex'; });
    const { onPost, onRemove, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    expect(post.root.querySelector(selectors.tagMount)).toBeNull();
    const host = post.tagHost()!;
    expect(host.getAttribute('data-slot')).toBe('name');
    expect(host.previousElementSibling?.textContent).toContain('2nd');
    expect(post.tagHost()).toBe(host);
    await pause();
    expect(onPost).toHaveBeenCalledTimes(12); // our own host never re-triggers extraction
    post.root.remove();
    await eventually(() => expect(onRemove).toHaveBeenCalledWith(post.id));
    expect(post.root.contains(host)).toBe(false); // a recycled card element keeps no host of ours
  });

  it('rings the element that clips the photo, not the clipped image', async () => {
    load('sdui');
    const figure = document.querySelector<HTMLElement>('#expandedsyntheticPost01_opaqueFeedType_MAIN_FEED_RELEVANCE figure[data-view-name="feed-actor-image"]')!;
    Object.assign(figure.style, { overflow: 'hidden', borderRadius: '999px' });
    const { onPost, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    expect(byId('urn:li:activity:1001').avatarFrame()).toBe(figure);
  });

  it('keeps exactly one decoration host, inside the current card frame, and removes it with the post', async () => {
    load('sdui');
    const { onPost, onRemove, byId } = start();
    await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
    const post = byId('urn:li:activity:1001');
    const frame = post.cardFrame!();
    const host = post.decorationHost!()!;
    expect(host.parentElement).toBe(frame);
    expect(frame.lastElementChild).toBe(host);
    expect(post.decorationHost!()).toBe(host);
    // A stale host left elsewhere by a re-render is dropped, never duplicated.
    const stale = host.cloneNode() as HTMLElement;
    frame.firstElementChild!.append(stale);
    expect(post.decorationHost!()).toBe(host);
    expect(stale.isConnected).toBe(false);
    await pause();
    expect(onPost).toHaveBeenCalledTimes(12); // our own host never re-triggers extraction
    post.root.remove();
    expect(post.decorationHost!()).toBeNull();
    await eventually(() => expect(onRemove).toHaveBeenCalledWith(post.id));
    expect(post.root.contains(host)).toBe(false); // a recycled card element keeps no host of ours
  });
});


it('scores posts on any author recent-activity page', async () => {
  history.replaceState(null, '', '/in/synthetic-author/recent-activity/all/');
  load('sdui');
  document.body.innerHTML = document.body.innerHTML.replaceAll('FeedType_MAIN_FEED_RELEVANCE', 'FeedType_CREATOR_PROFILE_ALL_CONTENT_VIEW');
  document.querySelectorAll('[data-view-name]').forEach(el => el.removeAttribute('data-view-name'));
  const { onPost } = start();
  await eventually(() => expect(onPost).toHaveBeenCalledTimes(12));
});
