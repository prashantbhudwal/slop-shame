import type { FeedPost, FeedWatcher, PostAuthor, WatchFeedOptions } from './types';
import { postSelector, selectors } from './selectors';

const marker = 'data-slop-shame-processed';
const urnPattern = /urn:li:(?:activity|share|ugcPost):[\w-]+/;
const blockTags = new Set(['DIV', 'P', 'LI', 'SECTION', 'BLOCKQUOTE']);

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

function extractAuthor(root: HTMLElement, actor: HTMLElement | null): PostAuthor | null {
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
    return {
      id, name,
      headline: cleanText(headlineNode) || undefined,
      profileUrl: `https://www.linkedin.com/${id}`,
      avatarUrl: image?.getAttribute('src') ? new URL(image.getAttribute('src')!, location.href).href : undefined,
      kind: id.startsWith('company/') ? 'company' : 'person',
    };
  }
  return null;
}

function extract(root: HTMLElement): Omit<FeedPost, 'id' | 'mount'> | null {
  const modules = selectors.module.join(',');
  if (root.matches(modules) || root.closest(modules) || root.querySelector(modules)) return null;
  const heading = cleanText(first(root, selectors.moduleHeading));
  if (/^(?:suggested follows|jobs recommended for you|add to your feed|people you may know)$/i.test(heading)) return null;
  const actor = actorBlock(root);
  const author = extractAuthor(root, actor);
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
  return {
    root, author,
    input: {
      text, hashtags: [...new Set(text.match(/#[\p{L}\p{M}\p{N}_]+/gu) ?? [])],
      hasMedia, hasPoll, isBareRepost: isRepost && (!cleanText(ownBody ?? null) || isSduiBareRepost), isAd,
      authorHeadline: author?.headline,
    },
  };
}

interface ElementState { id: string; authorId?: string; mount: WeakRef<HTMLElement> }
interface ActivePost { root: WeakRef<HTMLElement>; signature: string }

/** Observe just the home feed. No history patching (content scripts are isolated). */
export function watchFeed(opts: WatchFeedOptions): FeedWatcher {
  let callbacks: WatchFeedOptions | null = opts;
  let stopped = false;
  let active = false;
  let container: WeakRef<HTMLElement> | null = null;
  let states = new WeakMap<HTMLElement, ElementState>();
  let processed = new WeakSet<HTMLElement>();
  const posts = new Map<string, ActivePost>();
  const pending = new Set<HTMLElement>();
  let scheduled: { kind: 'idle' | 'frame' | 'timer'; id: number } | null = null;
  let needsPrune = false;

  function notifyRemove(id: string) {
    try { callbacks?.onRemove(id); } catch { /* A subscriber must not break the feed. */ }
  }

  function forget(id: string) {
    const root = posts.get(id)?.root.deref();
    posts.delete(id);
    notifyRemove(id);
    if (root) {
      states.get(root)?.mount.deref()?.remove();
      root.removeAttribute(marker);
      states.delete(root);
      processed.delete(root);
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

  function collect(node: Node) {
    if (!(node instanceof Element) || node.closest(selectors.mount)) return;
    const root = rootFor(node);
    if (root) {
      pending.add(root);
      return;
    }
    // Only newly added subtrees (or the initial feed), never a document rescan
    // for each mutation. Dedupe inner URN hooks and embedded reposts by root.
    for (const candidate of node.querySelectorAll(postSelector)) {
      const card = rootFor(candidate);
      if (card) pending.add(card);
    }
  }

  function process(root: HTMLElement) {
    try {
      const boundary = container?.deref();
      if (!root.isConnected || !boundary?.contains(root)) return;
      const value = extract(root);
      const previous = states.get(root);
      if (!value) {
        if (previous) forget(previous.id);
        return;
      }
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
      states.set(root, { id, authorId: value.author?.id, mount: new WeakRef(mount) });
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
    for (const root of pending) {
      pending.delete(root);
      process(root);
      count++;
      if (count >= 20 || performance.now() - start >= 8 || (deadline && deadline.timeRemaining() < 1)) break;
    }
    if (pending.size) schedule();
  }

  function schedule() {
    if (scheduled || !active || stopped) return;
    if (typeof requestIdleCallback === 'function') {
      scheduled = { kind: 'idle', id: requestIdleCallback(flush, { timeout: 100 }) };
    } else if (typeof requestAnimationFrame === 'function') {
      scheduled = { kind: 'frame', id: requestAnimationFrame(() => flush()) };
    } else {
      scheduled = { kind: 'timer', id: window.setTimeout(() => flush(), 16) };
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

  // Exactly one observer, re-targeted when the feed/main arrives or is replaced.
  const observer = new MutationObserver(records => {
    if (!active || stopped) return;
    for (const record of records) {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      if (element?.closest(selectors.mount)) continue;
      const changed = [...record.addedNodes, ...record.removedNodes];
      if (record.type === 'childList' && changed.length && changed.every(node => node instanceof Element && node.matches(selectors.mount))) continue;
      if (element) {
        const card = rootFor(element);
        if (card) pending.add(card);
      }
      for (const added of record.addedNodes) collect(added);
      if (record.removedNodes.length) needsPrune = true;
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
      attributeFilter: ['data-urn', 'data-id', 'componentkey', 'data-full-text', 'aria-label', 'class', 'hidden', 'href', 'src'],
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
