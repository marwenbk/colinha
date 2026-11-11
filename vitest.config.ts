import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [svelte()],
        resolve: { conditions: ['browser'] },
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
          }),
        ],
        test: {
          name: 'worker',
          include: ['worker/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
        },
      },
    ],
  },
});
