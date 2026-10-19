import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Slop Shame',
    description: 'Rates every LinkedIn feed post with a Slop Index. Destroy the slop. Shame the slopper.',
    permissions: ['storage'],
    host_permissions: ['https://www.linkedin.com/*'],
  },
});
