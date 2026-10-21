import type { FeedPost, FeedWatcher, PostAuthor, ProfilePage, WatchFeedOptions } from './types';
import { postSelector, selectors } from './selectors';
import { PendingPosts, type PendingPost } from './pending';
import { canonicalAuthorId } from './author-id';

const marker = 'data-slop-shame-processed';
const urnPattern = /urn:li:(?:activity|share|ugcPost):[\w-]+/;
const blockTags = new Set(['DIV', 'P', 'LI', 'SECTION', 'BLOCKQUOTE']);
const cooldownMs = 750;
const activityPath = /^\/in\/([^/]+)\/recent-activity(?:\/|$)/;
const supportedPage = () => /^\/feed(?:\/|$)/.test(location.pathname) || activityPath.test(location.pathname);
const identityAttributes = new Set(['data-urn', 'data-id', 'componentkey', 'data-sdui-anchor-id']);
const ignoredMutations = [selectors.mount, ...selectors.comments, selectors.controls].join(',');
const mutationContentSelector = selectors.mutationContent.join(',');
const structuralBodySelector = selectors.structuralBody.join(',');
const hydrationSelector = [...selectors.mutationContent, ...selectors.media, ...selectors.poll, ...selectors.adLabel].join(',');
const structuralHydrationSelector = `${hydrationSelector},${structuralBodySelector}`;
const textStructureSelector = ['BR', ...blockTags].join(',');
const cardRemovalSelector = `${postSelector},${selectors.processed}`;
const nestedPostSelector = selectors.nestedPost.join(',');
const socialContextSelector = selectors.socialContext.join(',');
const actorLinkSelector = selectors.actorLink.join(',');
const profileSelector = selectors.profile.join(',');
const bodySelector = selectors.body.join(',');
const nonAuthorSelector = [socialContextSelector, ...selectors.comments, ...selectors.actorCta, selectors.mount, bodySelector].join(',');
const nonAuthorDescendantSelector = [socialContextSelector, ...selectors.comments, ...selectors.actorCta, bodySelector].join(',');
const actionAnchorSelector = selectors.actionBarAnchor.join(',');
const commentSelector = selectors.comments.join(',');

function first(scope: ParentNode, fallbacks: readonly string[]): HTMLElement | null {
  for (const selector of fallbacks) {
    const match = scope.querySelector<HTMLElement>(selector);
    if (match) return match;
  }
  return null;
}

function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element) || node.matches(selectors.ignoredText)) return '';
  if (node.tagName === 'BR') return '\n';
  const full = node.getAttribute('data-full-text');
  const text = full && full !== 'true' ? full : Array.from(node.childNodes, textOf).join('');
  return blockTags.has(node.tagName) ? `\n${text}\n` : text;
}

function cleanText(node: HTMLElement | null): string {
  if (!node) return '';
  const full = node.getAttribute('data-full-text');
  return (full && full !== 'true' ? full : textOf(node))
    .replace(/\u00a0/g, ' ').replace(/[\t ]+\n/g, '\n').replace(/\n[\t ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim()
    .replace(/\s*(?:(?:…|\.{3})\s*(?:see\s+)?more|see\s+(?:more|less))\s*$/i, '').trim();
}

function hash(value: string): string {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return (result >>> 0).toString(36);
}

function identity(root: HTMLElement): string | undefined {
  const region = root.closest(nestedPostSelector);
  for (const element of [root, ...root.querySelectorAll(selectors.identity.join(','))]) {
    // An embedded original post must not supply the outer reshare's identity.
    if (element !== root && (element.closest(nestedPostSelector) !== region || element.closest(`${commentSelector},${selectors.mount}`))) continue;
    const anchorUrn = element.getAttribute('data-sdui-anchor-id')?.match(/urn:li:(?:activity|share|ugcPost):\d+/)?.[0];
    if (anchorUrn) return anchorUrn;
    for (const attr of ['data-urn', 'data-id', 'componentkey']) {
      const urn = element.getAttribute(attr)?.match(urnPattern)?.[0];
      if (urn) return urn;
    }
  }
  const key = root.getAttribute('componentkey')?.match(/^(?:expanded|update-card-focus)(.+)FeedType_(?:MAIN_FEED_RELEVANCE|CREATOR_PROFILE_[A-Z_]+)$/)?.[1];
  if (key) return `sdui:${key}`;
  return undefined;
}

function actorBlock(root: HTMLElement): HTMLElement | null {
  const actor = first(root, selectors.actor);
  if (!actor) return extractAuthor(root)?.actor ?? null;
  if (!actor.matches(selectors.actorLink.join(','))) return actor;
  const avatar = first(root, selectors.actorImage);
  for (let parent = actor.parentElement; parent && parent !== root; parent = parent.parentElement) {
    if (avatar && parent.contains(avatar)) return parent;
    if (!avatar && Array.from(parent.querySelectorAll(selectors.actorParagraph.join(','))).some(p => !actor.contains(p))) return parent;
  }
  return actor.parentElement;
}

function isFlexRow(el: Element): boolean {
  const style = getComputedStyle(el);
  return style.display.endsWith('flex') && !style.flexDirection.startsWith('column');
}

/**
 * The author's name line ("Jane Doe · 2nd"): the flex row inside the profile
 * link that holds the name and the connection degree, with free space after.
 */
function nameLine(name: HTMLElement | null, link: HTMLElement | null): HTMLElement | null {
  if (!name || !link?.contains(name)) return null;
  // People: name and "• 2nd" share a flex row. Companies have no degree, so
  // their row holds only the name: either way, the first flex row up.
  for (let el = name.parentElement; el && el !== link; el = el.parentElement) {
    if (isFlexRow(el)) return el;
  }
  return null;
}

/**
 * The child of the post's own action bar that holds its last action (Send).
 * The bar is a flex row: actions, then empty space, then the reactions
 * summary. Null until the bar hydrates.
 */
function actionSlot(root: HTMLElement): HTMLElement | null {
  for (const selector of selectors.actionBarAnchor) {
    const anchor = Array.from(root.querySelectorAll<HTMLElement>(selector))
      .find(node => !node.closest(nestedPostSelector) && !node.closest(selectors.comments.join(',')));
    if (!anchor) continue;
    for (let slot = anchor, bar = anchor.parentElement; bar && bar !== root && root.contains(bar); slot = bar, bar = bar.parentElement) {
      if (bar.childElementCount >= 4 && isFlexRow(bar)) return slot;
    }
  }
  return null;
}

/** The element that draws the avatar's circle (or a company's rounded square): it clips the image. */
function avatarFrameOf(image: HTMLElement | null): HTMLElement | null {
  let el = image;
  for (let i = 0; el && i < 3; i++, el = el.parentElement) {
    const style = getComputedStyle(el);
    if (style.overflow !== 'visible' && parseFloat(style.borderTopLeftRadius) > 0) return el;
  }
  return image;
}

/** The profile owner of an activity page as a PostAuthor.id ("in/<id>"); null on any other page. */
export function activityOwner(pathname: string): string | null {
  const id = pathname.match(activityPath)?.[1];
  return id ? canonicalAuthorId(`in/${id}`) : null;
}

/** Author ids from links and from the address bar can differ in case and percent-encoding. */
export function sameAuthorId(a: string, b: string): boolean {
  return canonicalAuthorId(a) === canonicalAuthorId(b);
}

/**
 * The owner's profile card in an activity page's left rail: the rounded,
 * clipped box around the rail's round photo (or, for a member without a
 * photo, the first such box down the rail). Null while the rail is hidden.
 * A handful of style reads, only while our host is detached.
 */
function profileCard(): HTMLElement | null {
  const rail = first(document, selectors.profileRail);
  if (!rail?.isConnected || (typeof rail.checkVisibility === 'function' && !rail.checkVisibility())) return null;
  const isCard = (el: Element) => {
    const style = getComputedStyle(el);
    return style.overflow !== 'visible' && parseFloat(style.borderTopLeftRadius) > 0 && el.getBoundingClientRect().width >= 120;
  };
  for (const image of rail.querySelectorAll<HTMLElement>(selectors.profilePhoto.join(','))) {
    const frame = avatarFrameOf(image);
    const box = frame?.getBoundingClientRect();
    if (!frame || !box || box.width < 32 || Math.abs(box.width - box.height) > 2) continue;
    if (parseFloat(getComputedStyle(frame).borderTopLeftRadius) < box.width * 0.4) continue;
    for (let el = frame.parentElement; el && el !== rail; el = el.parentElement) if (isCard(el)) return el;
    break;
  }
  let depth = 0;
  for (let el = rail.firstElementChild; el && depth < 6; el = el.firstElementChild, depth++) {
    if (el instanceof HTMLElement && isCard(el)) return el;
  }
  return null;
}

/** Put the chip in the action bar, else keep the visible fallback under the header. */
function placeChip(mount: HTMLElement, root: HTMLElement, slot: HTMLElement | null): void {
  if (slot) {
    mount.setAttribute('data-slot', 'bar');
    slot.after(mount);
    return;
  }
  mount.removeAttribute('data-slot');
  const actor = actorBlock(root);
  if (actor && root.contains(actor)) actor.after(mount);
  else root.prepend(mount);
}

interface AuthorDetails {
  author: PostAuthor;
  actor: HTMLElement;
  profile: HTMLElement;
  name: HTMLElement;
  headline: HTMLElement | null;
  avatar: HTMLElement | null;
}

/** Resolve identity in the same post region as the text we score. A bare
 * repost's body belongs to its embedded original; commentary belongs outside it.
 */
function extractAuthor(scope: HTMLElement): AuthorDetails | null {
  const nested = scope.closest(nestedPostSelector);
  const belongs = (node: Element) => node.closest(nestedPostSelector) === nested
    && !node.closest(nonAuthorSelector) && !node.querySelector(nonAuthorDescendantSelector);
  // Try every named actor anchor (SDUI also emits empty duplicate anchors),
  // then profile links for classic markup or a partially hydrated actor hook.
  const links = new Set([
    ...scope.querySelectorAll<HTMLElement>(actorLinkSelector),
    ...scope.querySelectorAll<HTMLElement>(profileSelector),
  ]);
  for (const link of links) {
    if (!belongs(link)) continue;
    const url = new URL(link.getAttribute('href') ?? '', location.href);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) continue;
    const path = url.pathname.match(/^\/(in|company)\/([^/]+)/)?.slice(1).join('/');
    if (!path) continue;
    const id = canonicalAuthorId(path);
    const sduiActor = link.matches(actorLinkSelector);
    const nameNode = (sduiActor ? first(link, selectors.actorParagraph) : null)
      ?? first(link, selectors.authorName) ?? first(link, selectors.actorParagraph)
      ?? first(link, selectors.visibleName) ?? link;
    const name = cleanText(nameNode).replace(/\s+/g, ' ');
    if (!name) continue; // A separate avatar link often has no text; try the next.
    // Pair the name only with its own avatar. Searching the whole card for an
    // avatar can join an embedded actor to the outer reposter's image and make
    // their common ancestor include both posts and commentary.
    const avatar = Array.from(scope.querySelectorAll<HTMLElement>(selectors.avatar.join(','))).find(image => {
      if (!belongs(image)) return false;
      const href = image.closest(profileSelector)?.getAttribute('href');
      return href && new URL(href, location.href).pathname.replace(/\/$/, '') === url.pathname.replace(/\/$/, '');
    });
    let actor = link;
    for (let parent = link.parentElement; parent && parent !== scope; parent = parent.parentElement) {
      if (parent.querySelector(bodySelector) || parent.querySelector(socialContextSelector)) break;
      actor = parent;
      if (avatar ? parent.contains(avatar) : Array.from(parent.querySelectorAll(selectors.actorParagraph.join(','))).some(p => !link.contains(p))) break;
    }
    const image = first(actor, selectors.avatar) as HTMLImageElement | null;
    const headlineNode = sduiActor || !actor.matches(selectors.actor.join(','))
      ? Array.from(actor.querySelectorAll<HTMLElement>(selectors.actorParagraph.join(','))).find(p =>
        !link.contains(p)
        && !p.closest(selectors.actorLink.join(',')) && !p.closest(selectors.actorCta.join(','))
        && !/^(?:(?:promoted|sponsored)\b|\d+\s*[smhdwy]\b)/i.test(cleanText(p)),
      ) ?? null : first(actor, selectors.headline);
    const author: PostAuthor = {
      id, name,
      headline: cleanText(headlineNode) || undefined,
      profileUrl: `https://www.linkedin.com/${path}`,
      avatarUrl: image?.getAttribute('src') ? new URL(image.getAttribute('src')!, location.href).href : undefined,
      kind: id.startsWith('company/') ? 'company' : 'person',
    };
    return { author, actor, profile: link, name: nameNode, headline: headlineNode, avatar: image };
  }
  return null;
}

interface ContentNodes {
  body: HTMLElement | null;
  actor: HTMLElement | null;
  profile: HTMLElement | null;
  name: HTMLElement | null;
  headline: HTMLElement | null;
  avatar: HTMLElement | null;
  ad: HTMLElement | null;
}
type ObservedNodes = { [Key in keyof ContentNodes]: WeakRef<HTMLElement> | null };
interface ExtractedPost { value: Omit<FeedPost, 'id' | 'mount' | 'tagHost' | 'avatarFrame'>; nodes: ContentNodes }

/** Pick text within one post region, excluding every actor/header in it. */
function regionBody(scope: HTMLElement, actor: HTMLElement | null): HTMLElement | null {
  const region = scope.closest(nestedPostSelector);
  for (const selector of [...selectors.body, ...selectors.structuralBody]) {
    for (const node of scope.querySelectorAll<HTMLElement>(selector)) {
      if (node.closest(nestedPostSelector) !== region || actor?.contains(node) || (actor && node.contains(actor))
        || node.closest(selectors.actor.join(',')) || node.closest(profileSelector)
        || node.closest(selectors.controls) || node.closest(commentSelector)
        || node.closest(socialContextSelector) || node.querySelector(socialContextSelector)) continue;
      if (cleanText(node)) return node;
    }
  }
  return null;
}

function extract(root: HTMLElement): ExtractedPost | null {
  const modules = selectors.module.join(',');
  if (root.matches(modules) || root.closest(modules) || root.querySelector(modules)) return null;
  const heading = cleanText(first(root, selectors.moduleHeading));
  if (/^(?:suggested follows|jobs recommended for you|add to your feed|people you may know)$/i.test(heading)) return null;
  const sduiContent = root.matches(selectors.sduiContent.join(',')) ? root : first(root, selectors.sduiContent);
  const scope = sduiContent ?? root;
  const ownDetails = extractAuthor(scope);
  const actor = ownDetails?.actor ?? null;
  const ownBody = regionBody(scope, actor);
  const embedded = Array.from(scope.querySelectorAll<HTMLElement>(nestedPostSelector))
    .find(node => !node.closest(commentSelector)) ?? null;
  // Choose the original even when it contains only media, or its actor uses
  // ordinary paragraphs. The presence of an outer reposter is not commentary.
  const scoredRegion = !ownBody && embedded ? embedded : scope;
  const details = scoredRegion === scope ? ownDetails : extractAuthor(scoredRegion);
  const body = scoredRegion === scope ? ownBody : regionBody(scoredRegion, details?.actor ?? null);
  const author = details?.author ?? null;
  const scoredActor = details?.actor ?? actor;
  const text = cleanText(body);
  const hasMedia = Array.from(root.querySelectorAll(selectors.media.join(','))).some(node =>
    !actor?.contains(node) && !scoredActor?.contains(node) && !node.closest(selectors.mount)
    && !node.closest(selectors.nonPostMedia.join(',')) && !node.closest(selectors.comments.join(',')),
  );
  const hasPoll = Boolean(first(root, selectors.poll));
  if (!text && !hasMedia && !hasPoll) return null;
  const repost = first(root, selectors.repost);
  const repostRow = repost?.matches(selectors.socialHeader.join(',')) ? repost.closest(selectors.actorParagraph.join(',')) : repost;
  const isRepost = Boolean(repostRow && /repost|reshar|shared/i.test(`${repostRow.textContent} ${repostRow.getAttribute('aria-label') ?? ''}`));
  // With an embedded original, only a missing commentary makes it bare. A
  // flat card under a "reposted this" header (SDUI feed, activity pages) is
  // the original itself: the reposter added nothing.
  const isBareRepost = embedded ? !ownBody : isRepost;
  const sourceId = isBareRepost && embedded ? identity(embedded) : undefined;
  const ad = first(root, selectors.adLabel);
  const isAd = Boolean(ad && /^(?:promoted|sponsored)(?:\b|$)/i.test(`${ad.getAttribute('aria-label') ?? ''} ${ad.textContent ?? ''}`.trim()))
    || /(?:^|\n)\s*(?:promoted|sponsored)\s*(?:$|\n)/i.test(scoredActor ? textOf(scoredActor) : '');
  const value: Omit<FeedPost, 'id' | 'mount' | 'tagHost' | 'avatarFrame'> = {
    root, author, sourceId: sourceId?.startsWith('urn:li:') ? sourceId : undefined,
    input: {
      text, hashtags: [...new Set(text.match(/#[\p{L}\p{M}\p{N}_]+/gu) ?? [])],
      hasMedia, hasPoll, isBareRepost, isAd,
      authorHeadline: author?.headline,
    },
  };
  return { value, nodes: {
    body, actor: scoredActor, profile: details?.profile ?? null, name: details?.name ?? null,
    headline: details?.headline ?? null, avatar: details?.avatar ?? null, ad,
  } };
}

interface ElementState {
  id: string;
  authorId?: string;
  mount: WeakRef<HTMLElement>;
  nodes: ObservedNodes;
  fingerprint: string;
}
interface ActivePost { root: WeakRef<HTMLElement>; signature: string }

/** Native textContent + cached fields avoid selectors, recursive textOf and JSON.
 * Keep exact raw text as well as metadata: length/prefix/suffix alone would miss
 * same-length edits in the middle. Relative timestamps and counters are absent.
 */
function fingerprint(root: HTMLElement, nodes: ObservedNodes): string | null {
  const current = {} as ContentNodes;
  for (const key of Object.keys(nodes) as (keyof ContentNodes)[]) {
    const ref = nodes[key];
    const node = ref?.deref() ?? null;
    if (ref && (!node || !root.contains(node))) return null;
    current[key] = node;
  }
  return [
    current.body?.getAttribute('data-full-text'), current.body?.textContent,
    current.profile?.getAttribute('href'), current.name?.textContent, current.headline?.textContent,
    current.avatar?.getAttribute('src'),
    /^(?:promoted|sponsored)\b/i.test(`${current.ad?.getAttribute('aria-label') ?? ''} ${current.ad?.textContent ?? ''}`.trim()),
    // textContent concatenates adjacent label paragraphs (EngineerPromoted).
    // This is only an invalidation signal; extraction checks actual labels.
    current.actor?.textContent?.match(/promoted|sponsored/gi)?.map(label => label.toLowerCase()).join(','),
  ].join('\u0000');
}

function attributeIdentity(name: string, value: string | null): string | undefined {
  if (!value) return undefined;
  if (name === 'data-sdui-anchor-id') return value.match(/urn:li:(?:activity|share|ugcPost):\d+/)?.[0];
  const urn = value.match(urnPattern)?.[0];
  if (urn) return urn;
  if (name === 'componentkey') return value.match(/^(?:expanded|update-card-focus)(.+)FeedType_(?:MAIN_FEED_RELEVANCE|CREATOR_PROFILE_[A-Z_]+)$/)?.[1];
  return undefined;
}

/**
 * Pixels our UI may use in its slot without pushing LinkedIn's own content.
 * Null when the host isn't in a measured slot.
 *
 * - `name`: the end of the author's name line. LinkedIn sizes the name with
 *   flex 1 1 0%, so anything after it would take space first and truncate
 *   the name: measure the name's natural width instead.
 * - `bar`: the action bar's empty space between Send and the reactions
 *   summary. Measure with our UI at its smallest: the room is our current
 *   width plus whatever the empty spacer still holds.
 */
export function slotRoom(host: HTMLElement): number | null {
  const slot = host.getAttribute('data-slot');
  const line = host.parentElement;
  if (!line) return null;
  if (slot === 'name') {
    // The width the line may fill: its own block box (an inline ancestor,
    // like the profile link, has none).
    let box: Element | null = line;
    while (box && (!box.clientWidth || getComputedStyle(box).display.startsWith('inline'))) box = box.parentElement;
    if (!box) return null;
    let used = 0;
    for (const child of line.children) {
      if (child === host || child.matches(selectors.mount)) continue;
      // The name box may have grown into free space, so measure its text:
      // overflow-hidden text reports its full width through scrollWidth.
      const texts = child.querySelectorAll('p, span');
      let natural = texts.length ? 0 : child.getBoundingClientRect().width;
      for (const el of texts) natural = Math.max(natural, el.scrollWidth);
      used += natural;
    }
    const gap = parseFloat(getComputedStyle(line).columnGap) || 0;
    return Math.max(0, Math.floor(box.clientWidth - used - gap * Math.max(0, line.childElementCount - 1)));
  }
  if (slot === 'bar') {
    const prev = host.previousElementSibling;
    if (!prev) return null;
    // Skip the empty spacer(s) to the next real item (the reactions summary).
    let next = host.nextElementSibling;
    let items = 1;
    while (next && !next.childElementCount && !next.textContent?.trim()) {
      next = next.nextElementSibling;
      items++;
    }
    const style = getComputedStyle(line);
    const gap = parseFloat(style.columnGap) || 0;
    const right = next ? next.getBoundingClientRect().left : line.getBoundingClientRect().right - (parseFloat(style.paddingRight) || 0);
    return Math.max(0, Math.floor(right - prev.getBoundingClientRect().right - gap * (items + (next ? 1 : 0))));
  }
  return null;
}

/** Observe just the home feed. No history patching (content scripts are isolated). */
export function watchFeed(opts: WatchFeedOptions): FeedWatcher {
  let callbacks: WatchFeedOptions | null = opts;
  let stopped = false;
  let active = false;
  let container: WeakRef<HTMLElement> | null = null;
  let states = new WeakMap<HTMLElement, ElementState>();
  let processed = new WeakSet<HTMLElement>();
  let regions = new WeakMap<Element, WeakRef<HTMLElement>>();
  let lastProcessed = new WeakMap<HTMLElement, number>();
  const posts = new Map<string, ActivePost>();
  const pending = new PendingPosts();
  let scheduled: { kind: 'idle' | 'frame' | 'timer'; id: number; due: number } | null = null;
  const removals = new Set<HTMLElement | string>();
  const removalQueue: (HTMLElement | string | undefined)[] = [];
  let removalIndex = 0;
  let profile: { page: ProfilePage; card: HTMLElement | null } | null = null;

  /** Open, keep attached or close the activity page's profile summary host. */
  function syncProfile() {
    const ownerId = activityOwner(location.pathname);
    // Their other tabs keep the visit (and its tally); another person or page ends it.
    if (profile && !(ownerId && sameAuthorId(profile.page.ownerId, ownerId))) dropProfile();
    if (!ownerId) return;
    if (!profile) {
      const summaryHost = document.createElement('div');
      summaryHost.setAttribute('data-slop-shame-mount', 'summary');
      profile = {
        card: null,
        page: { ownerId, summaryHost, owns: author => Boolean(author && sameAuthorId(author.id, ownerId)) },
      };
      try { callbacks?.onProfile?.(profile.page); } catch { /* A subscriber must not break the page. */ }
    }
    // Usually one isConnected check per tick. LinkedIn may re-render the card,
    // hide the rail (narrow windows) or render it after the posts.
    const { summaryHost: host } = profile.page;
    if (profile.card?.isConnected && profile.card.firstElementChild === host) return;
    // Exactly one summary host on the page: ours, first in the card (or none while it's hidden).
    document.querySelectorAll(selectors.summaryMount).forEach(found => { if (found !== host) found.remove(); });
    const card = profileCard();
    profile.card = card;
    if (card) card.prepend(host);
    else host.remove();
  }

  function dropProfile() {
    if (!profile) return;
    profile.page.summaryHost.remove();
    profile = null;
    try { callbacks?.onProfile?.(null); } catch { /* A subscriber must not break the page. */ }
  }

  function notifyRemove(id: string) {
    try { callbacks?.onRemove(id); } catch { /* A subscriber must not break the feed. */ }
  }

  function forget(id: string) {
    const root = posts.get(id)?.root.deref();
    posts.delete(id);
    notifyRemove(id);
    if (root) {
      const state = states.get(root);
      state?.mount.deref()?.remove();
      root.querySelectorAll(`${selectors.tagMount},${selectors.decorationMount}`).forEach(host => host.remove());
      for (const ref of [state?.nodes.body, state?.nodes.actor]) {
        const node = ref?.deref();
        if (node) regions.delete(node);
      }
      root.removeAttribute(marker);
      states.delete(root);
      processed.delete(root);
      pending.delete(root);
      lastProcessed.delete(root);
    }
  }

  function rootFor(element: Element): HTMLElement | null {
    let root = element.closest<HTMLElement>(postSelector);
    const boundary = container?.deref();
    if (!root || root === boundary || !boundary?.contains(root)) return null;
    for (let parent = root.parentElement; parent && parent !== boundary; parent = parent.parentElement) {
      if (parent.matches(postSelector)) root = parent;
    }
    return root;
  }

  function queue(root: HTMLElement, force = false) {
    // Trailing throttle: hydrate with the latest state at the end of this
    // card's cooldown. Continuous updates cannot postpone it indefinitely.
    pending.add(root, Math.max(performance.now(), (lastProcessed.get(root) ?? -cooldownMs) + cooldownMs), force);
  }

  function queueRemoval(root: HTMLElement | string) {
    if (removals.has(root)) return;
    removals.add(root);
    removalQueue.push(root);
  }

  function collect(node: Node) {
    if (!(node instanceof Element) || node.closest(ignoredMutations)) return;
    if (node.matches(postSelector)) {
      const root = rootFor(node);
      if (root) { queue(root, true); return; }
    }
    // Only newly added subtrees (or the initial feed), never a document rescan
    // for each mutation. Dedupe inner URN hooks and embedded reposts by root.
    for (const candidate of node.querySelectorAll(postSelector)) {
      const card = rootFor(candidate);
      if (card) queue(card, true);
    }
  }

  function process(root: HTMLElement, work: PendingPost) {
    try {
      const boundary = container?.deref();
      if (!root.isConnected || !boundary?.contains(root)) return;
      lastProcessed.set(root, performance.now());
      const previous = states.get(root);
      // Reconcile before the text/metadata shortcut: controls can hydrate or
      // disappear without changing anything we score. Keep the live host even
      // when it left the card with a removed action bar.
      const previousMount = previous?.mount.deref();
      const slot = actionSlot(root);
      let moved = false;
      if (previousMount && (!root.contains(previousMount)
        || (slot ? previousMount.previousElementSibling !== slot || previousMount.getAttribute('data-slot') !== 'bar'
          : previousMount.getAttribute('data-slot') === 'bar'))) {
        placeChip(previousMount, root, slot);
        moved = true;
      }
      const fast = previous ? fingerprint(root, previous.nodes) : null;
      if (previous && !moved && !work.force && fast !== null && fast === previous.fingerprint
        && root.hasAttribute(marker) && root.contains(previous.mount.deref() ?? null)) return;
      const extracted = extract(root);
      if (!extracted) {
        if (previous) forget(previous.id);
        return;
      }
      const { value, nodes } = extracted;
      const knownId = identity(root);
      const sameAuthor = previous?.authorId === value.author?.id;
      const continuous = previous && (['body', 'profile', 'name', 'avatar'] as const).some(key => {
        const node = previous.nodes[key]?.deref();
        return node && root.contains(node);
      });
      // Preserve fallback IDs during hydration/expansion; identity changes on
      // recycled URN cards are handled as a removal followed by a new post.
      const id = knownId ?? (sameAuthor && continuous ? previous?.id : undefined) ?? `fallback:${hash(`${value.author?.id ?? ''}\n${value.input.text}`)}`;
      if (previous && previous.id !== id) forget(previous.id);
      const existing = posts.get(id);
      if (existing && existing.root.deref() !== root) forget(id);
      let mount = processed.has(root) && root.hasAttribute(marker) ? states.get(root)?.mount.deref() : undefined;
      mount ??= root.querySelector<HTMLElement>(selectors.chipMount) ?? undefined;
      const missingMount = !mount || !root.contains(mount);
      // The action bar's empty space hosts the chip: it adds no row and moves
      // nothing. Until the bar hydrates, the visible fallback stays under the
      // header; the chip moves into the bar as soon as it appears.
      if (missingMount) {
        mount = document.createElement('div');
        mount.setAttribute('data-slop-shame-mount', 'chip');
        placeChip(mount, root, slot);
      } else if (slot && mount && (mount.getAttribute('data-slot') !== 'bar' || mount.previousElementSibling !== slot)) {
        placeChip(mount, root, slot);
        moved = true;
      }
      if (!mount) return;
      processed.add(root);
      root.setAttribute(marker, '');
      for (const ref of [previous?.nodes.body, previous?.nodes.actor]) {
        const node = ref?.deref();
        if (node) regions.delete(node);
      }
      const observed = Object.fromEntries(Object.entries(nodes).map(([key, node]) => [key, node ? new WeakRef(node) : null])) as ObservedNodes;
      for (const node of [nodes.body, nodes.actor]) if (node) regions.set(node, new WeakRef(root));
      states.set(root, { id, authorId: value.author?.id, mount: new WeakRef(mount), nodes: observed, fingerprint: fingerprint(root, observed)! });
      lastProcessed.set(root, performance.now());
      const signature = JSON.stringify([value.input, value.author, value.sourceId]);
      const sameNodes = (['name', 'profile', 'avatar'] as const).every(key => (previous?.nodes[key]?.deref() ?? null) === nodes[key]);
      if (posts.get(id)?.signature === signature && !missingMount && !moved && sameNodes) return;
      posts.set(id, { root: new WeakRef(root), signature });
      const tagHost = () => {
        if (!root.isConnected || states.get(root)?.id !== id) return null;
        const current = states.get(root)!.nodes;
        const name = current.name?.deref() ?? null, profile = current.profile?.deref() ?? null;
        const line = nameLine(name, profile);
        if (!line || !root.contains(line)) return null;
        let host = line.querySelector<HTMLElement>(`:scope > ${selectors.tagMount}`);
        if (!host) {
          host = document.createElement('div');
          host.setAttribute('data-slop-shame-mount', 'tag');
          host.setAttribute('data-slot', 'name');
          line.append(host);
        }
        return host;
      };
      const avatarFrame = () => {
        const current = states.get(root);
        const avatar = current?.id === id ? current.nodes.avatar?.deref() : null;
        return avatar && root.contains(avatar) ? avatarFrameOf(avatar) : null;
      };
      const cardFrame = () => first(root, selectors.cardFrame) ?? root;
      const decorationHost = () => {
        if (!root.isConnected || states.get(root)?.id !== id) return null;
        const frame = cardFrame();
        let host: HTMLElement | null = null;
        // A re-rendered card can strand an old host: keep exactly one, in the current frame.
        for (const found of root.querySelectorAll<HTMLElement>(selectors.decorationMount)) {
          if (!host && found.parentElement === frame) host = found;
          else found.remove();
        }
        if (!host) {
          host = document.createElement('div');
          host.setAttribute('data-slop-shame-mount', 'decoration');
          frame.append(host);
        }
        return host;
      };
      try { callbacks?.onPost({ ...value, id, mount, tagHost, avatarFrame, cardFrame, decorationHost }); } catch { /* Isolate UI failures. */ }
    } catch { /* Incomplete/hydrating/malformed cards must never throw into LinkedIn. */ }
  }

  function prune(root: HTMLElement | string) {
    if (typeof root === 'string') {
      if (!posts.get(root)?.root.deref()) forget(root);
      return;
    }
    const boundary = container?.deref();
    if (!root.isConnected || !boundary?.contains(root)) {
      pending.delete(root);
      const state = states.get(root);
      if (state && posts.get(state.id)?.root.deref() === root) forget(state.id);
    }
  }

  function flush(deadline?: IdleDeadline) {
    scheduled = null;
    if (!active || stopped) return;
    if (!supportedPage()) { deactivate(); return; }
    const start = performance.now();
    let count = 0;
    while (removals.size || pending.size) {
      if (removals.size) {
        const root = removalQueue[removalIndex++]!;
        removalQueue[removalIndex - 1] = undefined;
        removals.delete(root);
        prune(root);
        if (!removals.size) { removalQueue.length = 0; removalIndex = 0; }
      } else {
        const work = pending.peek()!;
        if (work.due > performance.now()) break;
        pending.delete(work.root);
        process(work.root, work);
      }
      count++;
      if (count >= 20 || performance.now() - start >= 8 || (deadline && deadline.timeRemaining() < 1)) break;
    }
    if (pending.size || removals.size) schedule();
  }

  function schedule() {
    if (!active || stopped) return;
    const now = performance.now();
    const due = removals.size ? now : pending.peek()?.due ?? Infinity;
    if (!Number.isFinite(due)) return;
    if (scheduled) {
      if (scheduled.kind !== 'timer' || scheduled.due <= due) return;
      window.clearTimeout(scheduled.id);
      scheduled = null;
    }
    // One shared wakeup, preempted when a new card or removal needs attention.
    if (due > now + 1) {
      scheduled = { kind: 'timer', due, id: window.setTimeout(() => { scheduled = null; schedule(); }, Math.ceil(due - now)) };
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      scheduled = { kind: 'idle', due, id: requestIdleCallback(flush, { timeout: 100 }) };
    } else if (typeof requestAnimationFrame === 'function') {
      scheduled = { kind: 'frame', due, id: requestAnimationFrame(() => flush()) };
    } else {
      scheduled = { kind: 'timer', due, id: window.setTimeout(() => flush(), 16) };
    }
  }

  function cancelWork() {
    if (scheduled?.kind === 'idle') cancelIdleCallback(scheduled.id);
    if (scheduled?.kind === 'frame') cancelAnimationFrame(scheduled.id);
    if (scheduled?.kind === 'timer') window.clearTimeout(scheduled.id);
    scheduled = null;
    pending.clear();
    removals.clear();
    removalQueue.length = 0;
    removalIndex = 0;
  }

  function mutationOwner(element: Element): { root: HTMLElement; region: Element | null } | null {
    const boundary = container?.deref();
    for (let node: Element | null = element; node && node !== boundary; node = node.parentElement) {
      const root = regions.get(node)?.deref();
      if (root) return { root, region: node };
      if (node instanceof HTMLElement && states.has(node)) return { root: node, region: null };
    }
    return null;
  }

  function containsCard(node: Element): boolean {
    return processed.has(node as HTMLElement) || node.matches(postSelector)
      || (node.childElementCount > 0 && Boolean(node.querySelector(cardRemovalSelector)));
  }

  function contentHydrated(node: Element, structural: boolean): boolean {
    const selector = structural ? structuralHydrationSelector : hydrationSelector;
    return node.matches(selector) || (node.childElementCount > 0 && Boolean(node.querySelector(selector)));
  }

  // Exactly one observer. Cached region ownership rejects counters/players
  // without rootFor() or a card scan; only new card/content subtrees are queried.
  const observer = new MutationObserver(records => {
    if (!active || stopped) return;
    for (const record of records) {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!element || element.closest(ignoredMutations)) continue;
      if (record.type === 'attributes' && record.attributeName && identityAttributes.has(record.attributeName)) {
        const before = attributeIdentity(record.attributeName, record.oldValue);
        const after = attributeIdentity(record.attributeName, element.getAttribute(record.attributeName));
        if (before !== after) {
          const card = states.has(element as HTMLElement) ? element as HTMLElement : rootFor(element);
          if (card) queue(card, true);
        }
        continue;
      }
      const owner = mutationOwner(element);
      if (record.type !== 'childList') {
        if (owner?.region) queue(owner.root, record.attributeName === 'data-full-text');
        else if (!owner && element.closest(`${mutationContentSelector},${structuralBodySelector}`)) {
          const card = rootFor(element);
          if (card) queue(card, true);
        }
        continue;
      }
      const changed = [...record.addedNodes, ...record.removedNodes];
      const removedNodes = new Set(record.removedNodes);
      if (changed.length && changed.every(node => node instanceof Element && node.matches(selectors.mount))) continue;
      if (owner?.region) {
        // textContent does not encode line breaks/paragraph boundaries.
        const body = states.get(owner.root)?.nodes.body?.deref();
        const structureChanged = owner.region === body && changed.some(node =>
          node instanceof Element && !node.matches(ignoredMutations)
          && (node.tagName === 'BR' || blockTags.has(node.tagName)
            || (node.childElementCount > 0 && Boolean(node.querySelector(textStructureSelector)))),
        );
        queue(owner.root, structureChanged);
      }
      for (const node of changed) {
        if (!(node instanceof Element) || node.matches(`${selectors.mount},${commentSelector}`)) continue;
        const removed = removedNodes.has(node);
        if (containsCard(node)) {
          if (removed) {
            if (states.has(node as HTMLElement)) queueRemoval(node as HTMLElement);
            for (const card of node.querySelectorAll<HTMLElement>(selectors.processed)) queueRemoval(card);
            if (owner?.root && owner.root !== node) queue(owner.root, true);
          }
          else collect(node);
        }
        const knownRegion = regions.get(node)?.deref();
        if (knownRegion) queue(knownRegion, true);
        const structural = !owner || !states.get(owner.root)?.nodes.body;
        if (node.matches(actionAnchorSelector) || (node.childElementCount > 0 && node.querySelector(actionAnchorSelector))
          || contentHydrated(node, structural) || node.matches(selectors.identityAnchor.join(','))
          || (node.childElementCount > 0 && node.querySelector(selectors.identityAnchor.join(',')))) {
          const card = owner?.root ?? rootFor(element) ?? (!removed ? rootFor(node) : null);
          if (card) queue(card, true);
        }
      }
    }
    if (pending.size || removals.size) schedule();
  });

  function deactivate() {
    active = false;
    observer.disconnect();
    cancelWork();
    for (const id of posts.keys()) forget(id);
    container = null;
    states = new WeakMap();
    processed = new WeakSet();
    regions = new WeakMap();
    lastProcessed = new WeakMap();
  }

  function checkLocation() {
    if (stopped) return;
    syncProfile();
    if (!supportedPage()) {
      if (active) deactivate();
      return;
    }
    active = true;
    const previous = container?.deref();
    if (previous?.isConnected && previous !== document.body) return;
    const next = first(document, selectors.feed) ?? document.body;
    if (!next || previous === next) return;
    observer.disconnect();
    container = new WeakRef(next);
    // A replaced feed boundary invalidates every prior card; ordinary removals
    // only enqueue the affected subtree's processed roots.
    for (const [id, post] of posts) {
      const root = post.root.deref();
      queueRemoval(root ?? id);
    }
    observer.observe(next, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeOldValue: true,
      attributeFilter: ['data-urn', 'data-id', 'componentkey', 'data-sdui-anchor-id', 'data-full-text', 'aria-label', 'hidden', 'href', 'src'],
    });
    collect(next);
    schedule();
  }

  const locationTimer = window.setInterval(checkLocation, 500);
  window.addEventListener('popstate', checkLocation);
  checkLocation();
  return {
    disconnect() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(locationTimer);
      window.removeEventListener('popstate', checkLocation);
      deactivate();
      dropProfile();
      callbacks = null;
    },
  };
}
