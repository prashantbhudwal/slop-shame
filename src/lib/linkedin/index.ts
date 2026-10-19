import type { FeedPost, FeedWatcher, PostAuthor, WatchFeedOptions } from './types';
import { postSelector, selectors } from './selectors';

const marker = 'data-slop-shame-processed';
const urnPattern = /urn:li:(?:activity|share|ugcPost):[\w-]+/;
const blockTags = new Set(['DIV', 'P', 'LI', 'SECTION', 'BLOCKQUOTE']);
const cooldownMs = 750;
const identityAttributes = new Set(['data-urn', 'data-id', 'componentkey', 'data-sdui-anchor-id']);
const ignoredMutations = [selectors.mount, ...selectors.comments, selectors.controls].join(',');
const mutationContentSelector = selectors.mutationContent.join(',');
const structuralBodySelector = selectors.structuralBody.join(',');
const hydrationSelector = [...selectors.mutationContent, ...selectors.media, ...selectors.poll].join(',');
const structuralHydrationSelector = `${hydrationSelector},${structuralBodySelector}`;
const textStructureSelector = ['BR', ...blockTags].join(',');
const cardRemovalSelector = `${postSelector},${selectors.processed}`;

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
  const text = Array.from(node.childNodes, textOf).join('');
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
  for (const element of [root, ...root.querySelectorAll(selectors.identity.join(','))]) {
    // An embedded original post must not supply the outer reshare's identity.
    if (element !== root && element.closest([...selectors.nestedPost, ...selectors.comments, selectors.mount].join(','))) continue;
    const anchorUrn = element.getAttribute('data-sdui-anchor-id')?.match(/urn:li:(?:activity|share|ugcPost):\d+/)?.[0];
    if (anchorUrn) return anchorUrn;
    for (const attr of ['data-urn', 'data-id', 'componentkey']) {
      const urn = element.getAttribute(attr)?.match(urnPattern)?.[0];
      if (urn) return urn;
    }
  }
  const key = root.getAttribute('componentkey')?.match(/^(?:expanded|update-card-focus)(.+)FeedType_MAIN_FEED_RELEVANCE$/)?.[1];
  if (key) return `sdui:${key}`;
  return undefined;
}

function actorBlock(root: HTMLElement): HTMLElement | null {
  const actor = first(root, selectors.actor);
  if (!actor?.matches(selectors.actorLink.join(','))) return actor;
  const avatar = first(root, selectors.actorImage);
  for (let parent = actor.parentElement; parent && parent !== root; parent = parent.parentElement) {
    if (avatar && parent.contains(avatar)) return parent;
    if (!avatar && Array.from(parent.querySelectorAll(selectors.actorParagraph.join(','))).some(p => !actor.contains(p))) return parent;
  }
  return actor.parentElement;
}

interface AuthorDetails {
  author: PostAuthor;
  profile: HTMLElement;
  name: HTMLElement;
  headline: HTMLElement | null;
  avatar: HTMLElement | null;
}

function extractAuthor(root: HTMLElement, actor: HTMLElement | null): AuthorDetails | null {
  const scope = actor ?? root;
  const sduiActor = first(scope, selectors.actorLink);
  const links = sduiActor ? [sduiActor] : Array.from(scope.querySelectorAll<HTMLAnchorElement>(selectors.profile.join(',')));
  for (const link of links) {
    const url = new URL(link.getAttribute('href') ?? '', location.href);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) continue;
    const id = url.pathname.match(/^\/(in|company)\/([^/]+)/)?.slice(1).join('/');
    if (!id) continue;
    const nameNode = sduiActor ? first(link, selectors.actorParagraph) ?? link
      : first(scope, selectors.authorName) ?? first(link, selectors.visibleName) ?? link;
    const name = cleanText(nameNode).replace(/\s+/g, ' ');
    if (!name) continue; // A separate avatar link often has no text; try the next.
    const image = first(scope, selectors.avatar) as HTMLImageElement | null;
    const headlineNode = sduiActor ? Array.from(scope.querySelectorAll<HTMLElement>(selectors.actorParagraph.join(','))).find(p =>
      !p.closest(selectors.actorLink.join(',')) && !p.closest(selectors.actorCta.join(','))
      && !/^(?:(?:promoted|sponsored)\b|\d+\s*[smhdwy]\b)/i.test(cleanText(p)),
    ) ?? null : first(scope, selectors.headline);
    const author: PostAuthor = {
      id, name,
      headline: cleanText(headlineNode) || undefined,
      profileUrl: `https://www.linkedin.com/${id}`,
      avatarUrl: image?.getAttribute('src') ? new URL(image.getAttribute('src')!, location.href).href : undefined,
      kind: id.startsWith('company/') ? 'company' : 'person',
    };
    return { author, profile: link, name: nameNode, headline: headlineNode, avatar: image };
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
interface ExtractedPost { value: Omit<FeedPost, 'id' | 'mount'>; nodes: ContentNodes }

function extract(root: HTMLElement): ExtractedPost | null {
  const modules = selectors.module.join(',');
  if (root.matches(modules) || root.closest(modules) || root.querySelector(modules)) return null;
  const heading = cleanText(first(root, selectors.moduleHeading));
  if (/^(?:suggested follows|jobs recommended for you|add to your feed|people you may know)$/i.test(heading)) return null;
  const actor = actorBlock(root);
  const details = extractAuthor(root, actor);
  const author = details?.author ?? null;
  const nested = selectors.nestedPost.join(',');
  const candidates: HTMLElement[] = [];
  const sduiContent = root.matches(selectors.sduiContent.join(',')) ? root : first(root, selectors.sduiContent);
  const scope = sduiContent ?? root;
  // Stop at the first usable family to avoid selecting an inner text wrapper twice.
  for (const selector of [...selectors.body, ...selectors.structuralBody]) {
    const matches = Array.from(scope.querySelectorAll<HTMLElement>(selector)).filter(node =>
      !actor?.contains(node) && !node.closest(selectors.controls) && !node.closest(selectors.mount)
      && !node.closest(selectors.comments.join(',')),
    );
    if (matches.length) {
      candidates.push(...matches);
      // Keep looking if this family only found the embedded original.
      if (matches.some(node => !node.closest(nested))) break;
    }
  }
  const ownBody = candidates.find(node => !node.closest(nested));
  const body = ownBody ?? candidates[0] ?? null;
  const text = cleanText(body);
  const hasMedia = Array.from(root.querySelectorAll(selectors.media.join(','))).some(node =>
    !actor?.contains(node) && !node.closest(selectors.mount)
    && !node.closest(selectors.nonPostMedia.join(',')) && !node.closest(selectors.comments.join(',')),
  );
  const hasPoll = Boolean(first(root, selectors.poll));
  if (!text && !hasMedia && !hasPoll) return null;
  const repost = first(root, selectors.repost);
  const repostRow = repost?.matches(selectors.socialHeader.join(',')) ? repost.closest(selectors.actorParagraph.join(',')) : repost;
  const isRepost = Boolean(repostRow && /repost|reshar|shared/i.test(`${repostRow.textContent} ${repostRow.getAttribute('aria-label') ?? ''}`));
  const isSduiBareRepost = Boolean(sduiContent && !first(root, selectors.nestedPost));
  const ad = first(root, selectors.adLabel);
  const isAd = Boolean(ad && /^(?:promoted|sponsored)(?:\b|$)/i.test(`${ad.getAttribute('aria-label') ?? ''} ${ad.textContent ?? ''}`.trim()))
    || /(?:^|\n)\s*(?:promoted|sponsored)\s*(?:$|\n)/i.test(actor ? textOf(actor) : '');
  const value: Omit<FeedPost, 'id' | 'mount'> = {
    root, author,
    input: {
      text, hashtags: [...new Set(text.match(/#[\p{L}\p{M}\p{N}_]+/gu) ?? [])],
      hasMedia, hasPoll, isBareRepost: isRepost && (!cleanText(ownBody ?? null) || isSduiBareRepost), isAd,
      authorHeadline: author?.headline,
    },
  };
  return { value, nodes: {
    body, actor, profile: details?.profile ?? null, name: details?.name ?? null,
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
interface PendingPost { due: number; force: boolean }

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
    /\b(?:promoted|sponsored)\b/i.test(current.actor?.textContent ?? ''),
  ].join('\u0000');
}

function attributeIdentity(name: string, value: string | null): string | undefined {
  if (!value) return undefined;
  if (name === 'data-sdui-anchor-id') return value.match(/urn:li:(?:activity|share|ugcPost):\d+/)?.[0];
  const urn = value.match(urnPattern)?.[0];
  if (urn) return urn;
  if (name === 'componentkey') return value.match(/^(?:expanded|update-card-focus)(.+)FeedType_MAIN_FEED_RELEVANCE$/)?.[1];
  return undefined;
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
  const pending = new Map<HTMLElement, PendingPost>();
  let scheduled: { kind: 'idle' | 'frame' | 'timer'; id: number; due: number } | null = null;
  let needsPrune = false;

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
    const existing = pending.get(root);
    if (existing) { existing.force ||= force; return; }
    // Trailing throttle: hydrate with the latest state at the end of this
    // card's cooldown. Continuous updates cannot postpone it indefinitely.
    pending.set(root, { due: Math.max(performance.now(), (lastProcessed.get(root) ?? -cooldownMs) + cooldownMs), force });
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
      const fast = previous ? fingerprint(root, previous.nodes) : null;
      if (previous && !work.force && fast !== null && fast === previous.fingerprint
        && root.hasAttribute(marker) && root.contains(previous.mount.deref() ?? null)) return;
      const extracted = extract(root);
      if (!extracted) {
        if (previous) forget(previous.id);
        return;
      }
      const { value, nodes } = extracted;
      const knownId = identity(root);
      const sameAuthor = previous?.authorId === value.author?.id;
      // Preserve fallback IDs during hydration/expansion; identity changes on
      // recycled URN cards are handled as a removal followed by a new post.
      const id = knownId ?? (sameAuthor ? previous?.id : undefined) ?? `fallback:${hash(`${value.author?.id ?? ''}\n${value.input.text}`)}`;
      if (previous && previous.id !== id) forget(previous.id);
      const existing = posts.get(id);
      if (existing && existing.root.deref() !== root) forget(id);
      let mount = processed.has(root) && root.hasAttribute(marker) ? states.get(root)?.mount.deref() : undefined;
      mount ??= root.querySelector<HTMLElement>(selectors.mount) ?? undefined;
      const missingMount = !mount || !root.contains(mount);
      if (missingMount) {
        mount = document.createElement('div');
        mount.setAttribute('data-slop-shame-mount', '');
        const actor = actorBlock(root);
        if (actor && root.contains(actor)) actor.after(mount);
        else root.prepend(mount);
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
      const signature = JSON.stringify([value.input, value.author]);
      if (posts.get(id)?.signature === signature && !missingMount) return;
      posts.set(id, { root: new WeakRef(root), signature });
      try { callbacks?.onPost({ ...value, id, mount }); } catch { /* Isolate UI failures. */ }
    } catch { /* Incomplete/hydrating/malformed cards must never throw into LinkedIn. */ }
  }

  function prune() {
    const boundary = container?.deref();
    for (const [id, state] of posts) {
      const root = state.root.deref();
      if (!root?.isConnected || !boundary?.contains(root)) forget(id);
    }
  }

  function flush(deadline?: IdleDeadline) {
    scheduled = null;
    if (!active || stopped) return;
    if (!location.pathname.startsWith('/feed')) { deactivate(); return; }
    if (needsPrune) { needsPrune = false; prune(); }
    const start = performance.now();
    let count = 0;
    for (const [root, work] of pending) {
      if (work.due > performance.now()) continue;
      pending.delete(root);
      process(root, work);
      count++;
      if (count >= 20 || performance.now() - start >= 8 || (deadline && deadline.timeRemaining() < 1)) break;
    }
    if (pending.size) schedule();
  }

  function schedule() {
    if (!active || stopped) return;
    const now = performance.now();
    let due = needsPrune ? now : Infinity;
    for (const work of pending.values()) due = Math.min(due, work.due);
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
    needsPrune = false;
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
        if (owner?.region) queue(owner.root);
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
        if (!(node instanceof Element) || node.matches(ignoredMutations)) continue;
        const removed = removedNodes.has(node);
        if (containsCard(node)) {
          if (removed) {
            needsPrune = true;
            if (owner?.root && owner.root !== node) queue(owner.root, true);
          }
          else collect(node);
        }
        const knownRegion = regions.get(node)?.deref();
        if (knownRegion) queue(knownRegion, true);
        const structural = !owner || !states.get(owner.root)?.nodes.body;
        if (contentHydrated(node, structural) || node.matches(selectors.identityAnchor.join(','))
          || (node.childElementCount > 0 && node.querySelector(selectors.identityAnchor.join(',')))) {
          const card = owner?.root ?? rootFor(element) ?? (!removed ? rootFor(node) : null);
          if (card) queue(card, true);
        }
      }
    }
    if (pending.size || needsPrune) schedule();
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
    if (!location.pathname.startsWith('/feed')) {
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
    prune();
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
      callbacks = null;
    },
  };
}
