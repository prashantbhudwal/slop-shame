/**
 * Ordered fallbacks: stable/semantic hooks first, LinkedIn's classic classes last.
 * Keep page knowledge here so a markup change has one place to repair.
 * This file also stays valid JavaScript for the Node capture/login scripts.
 */
export const selectors = {
  feed: [
    // SDUI portals later lazy batches outside its initial role=list container,
    // sometimes outside "Primary content" too. Their common boundary is main.
    'main:has([data-view-name="feed-full-update"])',
    'main:has([componentkey="container-update-list_mainFeed-lazy-container"])',
    '[componentkey="container-update-list_mainFeed-lazy-container"]',
    'main [role="feed"]', '[role="feed"]',
    'main .scaffold-finite-scroll__content', '.scaffold-finite-scroll__content', 'main',
  ],
  // URNs can be carried by the card or an inner component. Article/class hooks
  // let the adapter walk out to the entire card, including a reshare's wrapper.
  post: [
    '[data-view-name="feed-full-update"]',
    '[componentkey^="expanded"][componentkey$="FeedType_MAIN_FEED_RELEVANCE"]',
    '[componentkey^="update-card-focus"][componentkey$="FeedType_MAIN_FEED_RELEVANCE"]',
    '[data-urn*="urn:li:activity:"]', '[data-urn*="urn:li:share:"]', '[data-urn*="urn:li:ugcPost:"]',
    '[data-id*="urn:li:activity:"]', '[data-id*="urn:li:share:"]', '[data-id*="urn:li:ugcPost:"]',
    '[componentkey*="urn:li:activity:"]', '[componentkey*="urn:li:share:"]', '[componentkey*="urn:li:ugcPost:"]',
    '[role="article"]', 'article', '.occludable-update', '.feed-shared-update-v2',
  ],
  // Some versions move the URN from the card to a descendant.
  identity: ['[data-sdui-anchor-id*="urn:li:"]', '[data-urn]', '[data-id]', '[componentkey]'],
  identityAnchor: ['[data-sdui-anchor-id*="urn:li:"]'],
  sduiContent: ['[data-view-name="feed-full-update"]'],
  // SDUI's actor hooks are anchors, not enclosing header blocks. Find their
  // common ancestor with the avatar to include the unlabelled headline row.
  actorLink: ['a[data-view-name="feed-actor"]'],
  actorImage: ['[data-view-name="feed-actor-image"]'],
  actorParagraph: ['p'],
  actorCta: ['[data-view-name="feed-actor-sub-description-cta"]'],
  actor: [
    '[data-view-name="feed-actor"]', '[data-test-id="actor"]', 'header',
    '.update-components-actor', '.feed-shared-actor',
  ],
  profile: ['a[href*="/in/"]', 'a[href*="/company/"]'],
  authorName: [
    '[data-anonymize="person-name"]', '[data-view-name="feed-actor-name"]', '[data-test-id="actor-name"]',
    '.update-components-actor__name', '.feed-shared-actor__name', 'strong',
  ],
  visibleName: ['[aria-hidden="true"]'],
  headline: [
    '[data-anonymize="headline"]', '[data-view-name="feed-actor-description"]', '[data-field="headline"]',
    '.update-components-actor__description', '.feed-shared-actor__description', 'p',
  ],
  avatar: ['img[data-anonymize="headshot-photo"]', 'img'],
  body: [
    'p[data-view-name="feed-commentary"]', '[data-full-text]', '[data-ad-preview="message"]', '[data-view-name="feed-commentary"]',
    '[data-view-name="feed-update-text"]', '[data-test-id="main-feed-activity-card__commentary"]',
    '[data-testid="expandable-text-box"]', '[data-test-id="expandable-text-box"]', '.update-components-text',
    '.feed-shared-update-v2__description', '.feed-shared-inline-show-more-text', '.feed-shared-text',
  ],
  // Text-direction wrappers survive hashed class names. Paragraphs are a final
  // structural fallback, filtered against the actor, controls and reshare.
  structuralBody: ['[dir="ltr"]', '[dir="auto"]', 'p'],
  nestedPost: [
    '[data-view-name="feed-full-update"] [data-view-name="feed-full-update"]',
    '[data-view-name="feed-reshared-update"]', '.feed-shared-update-v2__reshared-content', 'blockquote',
  ],
  repost: [
    '[data-view-name="feed-header-text"]',
    '[data-view-name="feed-reshare-context"]', '[aria-label*="reposted" i]',
    '.update-components-header__text-view', '.feed-shared-header__text-view',
  ],
  socialHeader: ['[data-view-name="feed-header-text"]'],
  adLabel: [
    '[aria-label="Promoted" i]', '[aria-label="Sponsored" i]', '[data-ad-preview="label"]',
    '.update-components-actor__sub-description', '.feed-shared-actor__sub-description',
  ],
  media: [
    '[data-view-name="feed-update-image"]', '[data-view-name="feed-article-image"]',
    'video', 'figure', 'picture', '[data-view-name="feed-image"]', '[data-view-name="feed-video"]',
    '.update-components-image', '.feed-shared-image', 'img',
  ],
  poll: ['[role="group"][aria-label*="poll" i]', '[data-view-name="feed-poll"]', '.polls-components-poll'],
  module: [
    '[data-view-name="news-module-storyline-card-click"]',
    '[data-view-name="feed-follows-module"]', '[data-view-name="feed-jobs-module"]',
    '[aria-label*="Suggested follows" i]', '[aria-label*="Jobs recommended for you" i]',
    '[aria-label*="Add to your feed" i]', '.feed-shared-actor-list', '.feed-shared-interest-package',
  ],
  moduleHeading: ['h2', 'h3'],
  nonPostMedia: [
    '[data-view-name="feed-actor-image"]', '[data-view-name="feed-header-actor-image"]',
    '[data-view-name="feed-open-identity-switcher"]',
  ],
  comments: ['[componentkey*="replaceableCommentTools"]', '[data-view-name="feed-comment-box"]', '[data-view-name="comment"]'],
  // Structural hydration signals. Generic paragraphs/direction wrappers are
  // considered only on cards without a registered body, never on live counters.
  mutationContent: [
    '[data-view-name="feed-commentary"]', '[data-view-name="feed-update-text"]',
    '[data-view-name="feed-actor"]', '[data-view-name="feed-actor-image"]',
    '[data-full-text]', '[data-ad-preview="message"]', '[data-test-id="actor"]',
    '[data-test-id="main-feed-activity-card__commentary"]', '[data-testid="expandable-text-box"]',
    'header', '.update-components-actor', '.feed-shared-actor', '.update-components-text',
    '.feed-shared-update-v2__description', '.feed-shared-inline-show-more-text', '.feed-shared-text',
  ],
  processed: '[data-slop-shame-processed]',
  // Adapter-owned markup and non-content nodes are excluded from extraction.
  mount: '[data-slop-shame-mount]',
  ignoredText: 'button, script, style, noscript, .visually-hidden, [data-slop-shame-mount]',
  controls: 'button, nav, footer, [role="button"], [data-slop-shame-mount]',
  all: '*',
  // Sanitization selectors used by capture-feed.mjs (no LinkedIn hooks in scripts).
  unsafeCapture: 'script, style, link, iframe, object, embed, form, [data-slop-shame-mount]',
  captureImages: 'img',
};

export const postSelector = selectors.post.join(',');
