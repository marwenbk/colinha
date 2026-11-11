import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [svelte(), cloudflare()],
  environments: {
    // The Cloudflare plugin adds a separate worker environment, so the HTML
    // entries must be scoped to the client environment only.
    client: {
      build: {
        rollupOptions: {
          input: {
            index: 'index.html',
            pt: 'pt/index.html',
            en: 'en/index.html',
          },
        },
      },
    },
  },
});
