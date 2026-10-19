import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Slop Shame',
    description: 'Rates every LinkedIn feed post with a Slop Index. Destroy the slop. Shame the slopper.',
    // storage: settings + today's counters. No tabs/activeTab/<all_urls>: the
    // eruption shatters DOM clones instead of screenshots.
    permissions: ['storage'],
    host_permissions: ['https://www.linkedin.com/*'],
    web_accessible_resources: [
      {
        // Only the art drawn inside linkedin.com pages. use_dynamic_url: the
        // URL carries a per-session id, so pages can't probe for the extension
        // by its static id.
        resources: [
          'assets/tiers/*',
          'assets/categories/*',
          'assets/ui/*',
          'assets/fx/*',
          'assets/shame/*',
          'assets/mascot/*',
        ],
        matches: ['https://www.linkedin.com/*'],
        use_dynamic_url: true,
      },
    ],
  },
});
