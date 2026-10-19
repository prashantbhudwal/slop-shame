// Content script for the LinkedIn feed. Wires: feed adapter → engine → UI.
// Owned by the UI workstream; see AGENTS.md.

export default defineContentScript({
  matches: ['https://www.linkedin.com/*'],
  runAt: 'document_idle',
  main() {
    // TODO(ui): watchFeed → analyzePost → mount badge per post.
  },
});
