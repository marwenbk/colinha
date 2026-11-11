import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

const fx = (n: string) => readFileSync(`./worker/test/fixtures/${n}`);
const pemToDerB64 = (pem: string) =>
  pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');

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
            // TEST-ONLY PKI from worker/test/fixtures; no limiter binding on purpose.
            miniflare: {
              bindings: {
                PASS_KEY_PKCS8: fx('leaf.pk8.pem').toString(),
                PASS_CERT_B64: fx('leaf.der').toString('base64'),
                WWDR_CERT_B64: pemToDerB64(fx('ca.pem').toString()),
              },
            },
          }),
        ],
        // Lets worker tests import binary DER fixtures as base64 data URLs (`?inline`).
        assetsInclude: ['**/*.der'],
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
