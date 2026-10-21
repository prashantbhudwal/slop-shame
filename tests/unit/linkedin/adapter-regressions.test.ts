// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://www.linkedin.com/feed/"}
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { slotRoom, watchFeed } from '../../../src/lib/linkedin';
import type { FeedPost, FeedWatcher } from '../../../src/lib/linkedin/types';
let watcher: FeedWatcher | undefined;
const author = (id = 'original') => `<header><a data-view-name="feed-actor-image" href="/in/${id}/"><figure data-view-name="feed-actor-image"><img src="data:image/png,${id}"></figure></a><div><a data-view-name="feed-actor" href="/in/${id}/"><div style="display:flex"><div><p>${id}</p></div><span>2nd</span></div></a><p>Engineer</p></div></header>`;
const actions = '<div id="bar" style="display:flex"><button>Like</button><button data-view-name="feed-comment-button">Comment</button><button data-view-name="feed-share-button">Repost</button><a data-view-name="feed-send-as-message-button">Send</a><div></div><a>Reactions</a></div>';
const pause = () => new Promise(r => setTimeout(r, 1100));

function load(html: string, attrs = 'data-urn="urn:li:activity:9001"') {
  document.body.innerHTML = `<main><div role="feed"><article ${attrs}>${html}</article></div></main>`;
  return document.querySelector('article')!;
}

async function start() {
  const posts: FeedPost[] = [];
  const removed: string[] = [];
  watcher = watchFeed({ onPost: p => posts.push(p), onRemove: id => removed.push(id) });
  await vi.waitFor(() => expect(posts.length).toBeGreaterThan(0));
  return { posts, removed, last: () => posts.at(-1)! };
}

beforeEach(() => history.replaceState(null, '', '/feed/'));
afterEach(() => {
  watcher?.disconnect();
  watcher = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('R1 social-context name under a profile link must not become the author', async () => {
  load('<div><a href="/in/liker/"><span data-view-name="feed-header-text">Liker Example</span></a> likes this</div>' + author().replaceAll('data-view-name="feed-actor"', '') + '<p data-view-name="feed-commentary">Original post body</p>');
  const s = await start();
  expect(s.last().author?.id).toBe('in/original');
});

it('R2 late ad-label paragraph must update isAd', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary">Post body</p>' + actions);
  const s = await start();
  root.querySelector('header')!.insertAdjacentHTML('beforeend', '<p class="update-components-actor__sub-description">Promoted</p>');
  await pause();
  expect(s.last().input.isAd).toBe(true);
});

it.each(['flex', 'inline-flex'])('R3 control-only %s action-bar hydration must relocate the same chip', async display => {
  const root = load(author() + '<p data-view-name="feed-commentary">Post body</p>');
  const s = await start();
  const mount = s.last().mount;
  root.insertAdjacentHTML('beforeend', actions.replace('display:flex', `display:${display}`).replace('<div></div><a>Reactions</a>', ''));
  await pause();
  expect(s.last().mount.getAttribute('data-slot')).toBe('bar');
  expect(s.last().mount).toBe(mount);
  expect(s.posts).toHaveLength(2);
});

it('R4 wholesale same-author card recycling must change fallback ID', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary">First post</p>', '');
  const s = await start();
  const old = s.last().id;
  root.innerHTML = author() + '<p data-view-name="feed-commentary">Second unrelated post</p>';
  await pause();
  expect(s.last().input.text).toBe('Second unrelated post');
  expect(s.last().id).not.toBe(old);
  expect(s.removed).toEqual([old]);
});

it('R5 replacing profile link while preserving name must keep tagHost usable', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary">Post body</p>' + actions);
  const s = await start();
  const link = root.querySelector('a[data-view-name="feed-actor"]')!;
  const clone = link.cloneNode(false) as HTMLElement;
  while (link.firstChild)
    clone.append(link.firstChild);
  link.replaceWith(clone);
  await pause();
  expect(s.last().tagHost()).not.toBeNull();
});

it('R6 structural bare-repost body must exclude embedded actor name', async () => {
  load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><div class="feed-shared-update-v2__reshared-content">' + author() + '<p>Original unhooked post body</p></div>');
  const s = await start();
  expect(s.last().input.text).toBe('Original unhooked post body');
});

it('R7 child full-text attribute must win over clipped outer commentary text', async () => {
  load(author() + '<p data-view-name="feed-commentary"><span data-full-text="Full server post body and extra text">Truncated preview…more</span></p>');
  const s = await start();
  expect(s.last().input.text).toBe('Full server post body and extra text');
});

it('R8 classic commenter profile must not substitute for missing post author', async () => {
  load('<p data-view-name="feed-commentary">Post body</p><div class="comments-comments-list"><article class="comments-comment-item"><a href="/in/commenter/">Commenter Example</a><p>Comment body</p></article></div>');
  const s = await start();
  expect(s.last().author).toBeNull();
});

it('R9 media-only bare repost must attribute embedded original author', async () => {
  const actor = (id: string) => `<header><a href="/in/${id}/"><img src="data:image/png,${id}"><strong>${id}</strong></a><div class="update-components-actor__description">Engineer</div></header>`;
  load(actor('reposter') + '<div class="update-components-header__text-view">Reposted this</div><div class="feed-shared-update-v2__reshared-content">' + actor('original') + '<figure><img src="data:image/png,content"></figure></div>');
  const s = await start();
  expect(s.last().input.isBareRepost).toBe(true);
  expect(s.last().author?.id).toBe('in/original');
});

it('moves the same chip back under the header when its bar is removed', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary">Post body</p>' + actions);
  const s = await start();
  const mount = s.last().mount;
  root.querySelector('#bar')!.remove();
  await pause();
  expect(root.contains(mount)).toBe(true);
  expect(mount.hasAttribute('data-slot')).toBe(false);
  expect(s.posts).toHaveLength(2);
  expect(s.last().mount).toBe(mount);
});

it('moves the same chip after a late Send action in an inline-flex bar', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary">Post body</p>' + actions.replace('display:flex', 'display:inline-flex').replace('<a data-view-name="feed-send-as-message-button">Send</a>', ''));
  const s = await start();
  const mount = s.last().mount;
  expect(mount.previousElementSibling?.getAttribute('data-view-name')).toBe('feed-share-button');
  mount.insertAdjacentHTML('afterend', '<a data-view-name="feed-send-as-message-button">Send</a>');
  await pause();
  expect(mount.previousElementSibling?.getAttribute('data-view-name')).toBe('feed-send-as-message-button');
  expect(s.posts).toHaveLength(2);
  expect(s.last().mount).toBe(mount);
});

it('does not place a chip in a classic comment action bar', async () => {
  load(author() + '<p data-view-name="feed-commentary">Post body</p><div class="comments-comments-list"><article class="comments-comment-item">' + actions.replace('id="bar"', 'id="comment-bar"') + '</article></div>' + actions);
  const s = await start();
  expect(s.last().mount.parentElement?.id).toBe('bar');
});

it('subtracts every flex gap from the name slot', () => {
  document.body.innerHTML = '<div id="box"><div id="line" style="display:flex;column-gap:8px"><div><p id="name">Original</p></div><div><p id="degree">2nd</p></div><div data-slop-shame-mount="tag" data-slot="name" id="host"></div></div></div>';
  Object.defineProperty(document.querySelector('#box'), 'clientWidth', { value: 200 });
  Object.defineProperty(document.querySelector('#name'), 'scrollWidth', { value: 100 });
  Object.defineProperty(document.querySelector('#degree'), 'scrollWidth', { value: 20 });
  expect(slotRoom(document.querySelector<HTMLElement>('#host')!)).toBe(64);
});

it('observes changes to child full-text even when the clipped text is unchanged', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary"><span data-full-text="First full body">Clipped…more</span></p>');
  const s = await start();
  root.querySelector('[data-full-text]')!.setAttribute('data-full-text', 'Updated full body');
  await pause();
  expect(s.last().input.text).toBe('Updated full body');
  expect(s.posts).toHaveLength(2);
});

it('ignores an empty outer commentary when choosing the bare original region', async () => {
  load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><p data-view-name="feed-commentary"></p><div data-view-name="feed-reshared-update">' + author() + '<p>Original body</p></div>');
  const s = await start();
  expect(s.last().input.text).toBe('Original body');
  expect(s.last().author?.id).toBe('in/original');
  expect(s.last().input.isBareRepost).toBe(true);
});

it.each(['data-urn="urn:li:activity:8000"', 'data-id="urn:li:share:8000"', 'componentkey="urn:li:ugcPost:8000"', ''])('provides only a stable embedded source ID for a bare repost: %s', async (attrs) => {
  load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><div data-view-name="feed-reshared-update" ' + attrs + '>' + author() + '<p data-view-name="feed-commentary">Original body</p></div>');
  const s = await start();
  expect(s.last().id).toBe('urn:li:activity:9001');
  expect(s.last().sourceId).toBe(attrs.match(/urn:li:[\w]+:8000/)?.[0]);
});

it('reads an embedded SDUI source anchor without using the outer ID', async () => {
  const root = load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><div data-view-name="feed-reshared-update">' + author() + '<span data-sdui-anchor-id="feed-header-urn:li:activity:8000-0"></span><p data-view-name="feed-commentary">Original body</p></div>');
  const s = await start();
  expect(s.last().sourceId).toBe('urn:li:activity:8000');
  root.querySelector('[data-sdui-anchor-id]')!.setAttribute('data-sdui-anchor-id', 'feed-header-urn:li:activity:8001-0');
  await pause();
  expect(s.last().sourceId).toBe('urn:li:activity:8001');
  expect(s.posts).toHaveLength(2);
});

it('treats a flat card under a reposted header as a bare repost without a source ID', async () => {
  load('<div class="update-components-header__text-view"><a href="/in/reposter/">Reposter</a> reposted this</div>' + author() + '<p data-view-name="feed-commentary">Original body</p>');
  const s = await start();
  expect(s.last().author?.id).toBe('in/original');
  expect(s.last().input.isBareRepost).toBe(true);
  expect(s.last().sourceId).toBeUndefined();
});

it('keys the author by canonical id and keeps the profile link as LinkedIn spells it', async () => {
  load(author('Jos%C3%A9-Diaz') + '<p data-view-name="feed-commentary">Post body</p>');
  const s = await start();
  expect(s.last().author).toMatchObject({ id: 'in/josé-diaz', profileUrl: 'https://www.linkedin.com/in/Jos%C3%A9-Diaz' });
});

it('leaves sourceId undefined for commentary reshares and ordinary posts', async () => {
  load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><p data-view-name="feed-commentary">My commentary</p><div data-view-name="feed-reshared-update" data-urn="urn:li:activity:8000">' + author() + '<p data-view-name="feed-commentary">Original body</p></div>');
  const s = await start();
  expect(s.last().sourceId).toBeUndefined();
  expect(s.last().input.isBareRepost).toBe(false);
});

it.each(['Promoted', 'Sponsored'])('detects an unhooked late %s label beside unseparated paragraphs', async label => {
  const root = load(author().replace('<p>Engineer</p>', '<p>Promoted engineer</p>') + '<p data-view-name="feed-commentary">Post body</p>');
  const s = await start();
  expect(s.last().input.isAd).toBe(false);
  root.querySelector('header')!.insertAdjacentHTML('beforeend', `<p>${label}</p>`);
  await pause();
  expect(s.last().input.isAd).toBe(true);
});

it.each(['update-components-header__text-view', 'feed-shared-header__text-view'])('excludes a classic social marker inside a generic profile anchor: %s', async className => {
  load(`<div><a href="/in/liker/"><span class="${className}">Liker Example likes this</span></a></div>` + author().replaceAll('data-view-name="feed-actor"', '') + '<p data-view-name="feed-commentary">Post body</p>');
  const s = await start();
  expect(s.last().author?.id).toBe('in/original');
});

it('keeps existing tag and avatar accessors usable after profile and avatar replacement', async () => {
  const root = load(author() + '<p data-view-name="feed-commentary">Post body</p>');
  const s = await start();
  const before = s.last();
  const tag = before.tagHost();
  const link = root.querySelector('a[data-view-name="feed-actor"]')!;
  const replacement = link.cloneNode(false) as HTMLElement;
  while (link.firstChild) replacement.append(link.firstChild);
  link.replaceWith(replacement);
  const image = root.querySelector('img')!;
  const newImage = image.cloneNode(true) as HTMLElement;
  image.replaceWith(newImage);
  await pause();
  expect(s.posts).toHaveLength(2);
  expect(before.tagHost()).toBe(tag);
  expect(before.avatarFrame()).toBe(newImage);
  root.querySelector('[data-view-name="feed-commentary"]')!.append(' Changed.');
  await pause();
  expect(s.last().author?.id).toBe('in/original');
});

it('leaves sourceId undefined for a plain post', async () => {
  load(author() + '<p data-view-name="feed-commentary">Post body</p>');
  const s = await start();
  expect(s.last().sourceId).toBeUndefined();
});

it('ignores comment and deeper embedded identities when the original has no own ID', async () => {
  load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><div data-view-name="feed-reshared-update">' + author() + '<p data-view-name="feed-commentary">Original body</p><div class="comments-comment-item" data-urn="urn:li:activity:7000">Comment</div><blockquote data-urn="urn:li:activity:6000">Quoted post</blockquote></div>');
  const s = await start();
  expect(s.last().sourceId).toBeUndefined();
});

it('provides the original source ID for a media-only bare repost', async () => {
  load(author('reposter') + '<div class="update-components-header__text-view">Reposted this</div><div data-view-name="feed-reshared-update" data-urn="urn:li:activity:8000">' + author() + '<figure><img src="data:image/png,content"></figure></div>');
  const s = await start();
  expect(s.last().author?.id).toBe('in/original');
  expect(s.last().sourceId).toBe('urn:li:activity:8000');
});

it('reads the author, body and Send slot when SDUI omits every data-view-name hook', async () => {
  const root = load(`<div><a href="/in/liker/"><img src="data:image/png,liker"></a><p><a href="/in/liker/"><span data-sdui-anchor-id="feed-header-opaque-post-0">Liker Example</span></a> likes this</p></div>
    <div style="display:flex"><a href="/in/original/"><img src="data:image/png,original"></a><div><a href="/in/original/"><div aria-label="Original Author Premium Profile 2nd"><p>Original Author</p><span aria-hidden="true"></span><p>2nd</p></div></a><p>Original headline</p><p>3d</p></div></div>
    <p>Actual original post body, not the author's headline.</p>
    <div id="unhooked-bar" style="display:flex"><button aria-label="Reaction button state: no reaction">Like</button><button aria-label="Comment">Comment</button><button aria-label="Repost">Repost</button><a aria-label="Send" href="/feed/">Send</a><div></div><a>12 reactions</a></div>`);
  const s = await start();
  expect(s.last().author).toMatchObject({ id: 'in/original', name: 'Original Author', headline: 'Original headline' });
  expect(s.last().input.text).toBe("Actual original post body, not the author's headline.");
  expect(s.last().mount.getAttribute('data-slot')).toBe('bar');
  expect(s.last().mount.parentElement).toBe(root.querySelector('#unhooked-bar'));
});
