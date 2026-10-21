// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://www.linkedin.com/feed/"}
// Activity pages: which posts belong to the profile owner, and the summary
// host's lifecycle across LinkedIn's SPA navigation. Placement in the real
// card layout is covered by the profile-activity e2e test (happy-dom has no layout).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activityOwner, sameAuthorId, watchFeed } from '../../../src/lib/linkedin';
import type { FeedWatcher, PostAuthor, ProfilePage } from '../../../src/lib/linkedin/types';

let watcher: FeedWatcher | undefined;
const author = (id: string): PostAuthor => ({ id, name: 'Someone', kind: 'person' });
const go = (path: string) => {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

beforeEach(() => history.replaceState(null, '', '/feed/'));
afterEach(() => { watcher?.disconnect(); watcher = undefined; document.body.innerHTML = ''; });

describe('activityOwner', () => {
  it.each([
    ['/in/jane-doe/recent-activity/all/', 'in/jane-doe'],
    ['/in/jane-doe/recent-activity/comments/', 'in/jane-doe'],
    ['/in/jane-doe/recent-activity', 'in/jane-doe'],
    ['/in/%E5%BC%A0%E4%BC%9F/recent-activity/all/', 'in/张伟'],
    ['/in/Jane-Doe/recent-activity/all/', 'in/jane-doe'],
  ])('reads the owner of %s', (path, id) => expect(activityOwner(path)).toBe(id));

  it.each(['/feed/', '/in/jane-doe/', '/in/jane-doe/details/experience/', '/company/acme/posts/', '/in/recent-activity/'])
  ('is null on %s', (path) => expect(activityOwner(path)).toBeNull());
});

describe('sameAuthorId', () => {
  it('ignores case and percent-encoding, nothing else', () => {
    expect(sameAuthorId('in/Jane-Doe', 'in/jane-doe')).toBe(true);
    expect(sameAuthorId('in/%E5%BC%A0%E4%BC%9F', 'in/张伟')).toBe(true);
    expect(sameAuthorId('in/jane-doe', 'in/jane-doe-2')).toBe(false);
    expect(sameAuthorId('in/jane-doe', 'company/jane-doe')).toBe(false);
    expect(sameAuthorId('in/%E5%BC', 'in/%e5%bc')).toBe(true); // malformed escapes still compare
  });
});

describe('ProfilePage lifecycle', () => {
  function start() {
    const onProfile = vi.fn<(page: ProfilePage | null) => void>();
    watcher = watchFeed({ onPost: vi.fn(), onRemove: vi.fn(), onProfile });
    const pages = () => onProfile.mock.calls.map(([page]) => page);
    return { onProfile, pages };
  }

  it('never opens on the feed', () => {
    const { onProfile } = start();
    expect(onProfile).not.toHaveBeenCalled();
  });

  it('opens once per visit, owns only the owner\'s posts, and closes on every way out', () => {
    history.replaceState(null, '', '/in/jane-doe/recent-activity/all/');
    const { pages } = start();
    expect(pages()).toHaveLength(1);
    const page = pages()[0]!;
    expect(page).toMatchObject({ ownerId: 'in/jane-doe' });
    expect(page.summaryHost.getAttribute('data-slop-shame-mount')).toBe('summary');
    // Their posts, as their links spell them; never a reposted original, a commenter's or a liker's.
    expect(page.owns(author('in/jane-doe'))).toBe(true);
    expect(page.owns(author('in/Jane-Doe'))).toBe(true);
    expect(page.owns(author('in/rowan-example'))).toBe(false);
    expect(page.owns(author('company/jane-doe'))).toBe(false);
    expect(page.owns(null)).toBe(false);

    // Same page, later ticks: no new page.
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(pages()).toHaveLength(1);

    // Their other tabs (and the address bar's spelling) keep the visit and its tally.
    go('/in/jane-doe/recent-activity/comments/');
    go('/in/Jane-Doe/recent-activity/shares/');
    expect(pages()).toHaveLength(1);

    // Another person ends it.
    go('/in/rowan-example/recent-activity/all/');
    expect(pages()).toHaveLength(3);
    expect(pages()[1]).toBeNull();
    expect(pages()[2]).toMatchObject({ ownerId: 'in/rowan-example' });
    expect(pages()[2]!.summaryHost).not.toBe(page.summaryHost);

    // Leaving for the feed or their main profile closes it and removes the host.
    const last = pages().at(-1)!;
    document.body.append(last.summaryHost);
    go('/in/rowan-example/');
    expect(pages().at(-1)).toBeNull();
    expect(last.summaryHost.isConnected).toBe(false);
  });

  it('closes on disconnect (extension disabled)', () => {
    history.replaceState(null, '', '/in/jane-doe/recent-activity/all/');
    const { pages } = start();
    const host = pages()[0]!.summaryHost;
    document.body.append(host);
    watcher!.disconnect();
    watcher = undefined;
    expect(pages()).toEqual([expect.anything(), null]);
    expect(host.isConnected).toBe(false);
  });

  it('keeps the host detached while there is no profile card', () => {
    history.replaceState(null, '', '/in/jane-doe/recent-activity/all/');
    document.body.innerHTML = '<main><section aria-label="Primary content"></section></main>';
    const { pages } = start();
    expect(pages()[0]!.summaryHost.isConnected).toBe(false);
    expect(document.querySelectorAll('[data-slop-shame-mount="summary"]')).toHaveLength(0);
  });
});
