import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflare } from '@cloudflare/vite-plugin';
import { SITE_ORIGIN } from './src/config';

/**
 * Every public page, grouped with its translations: [pt-BR, en, x-default].
 * Each page is listed in the sitemap with the alternates of its group.
 */
const GROUPS: [string, string, string][] = [
  ['/pt/', '/en/', '/'],
  ['/pt/cpf-na-carteira/', '/en/cpf-in-apple-wallet/', '/pt/cpf-na-carteira/'],
  ['/pt/pix-na-carteira/', '/en/pix-in-apple-wallet/', '/pt/pix-na-carteira/'],
];
const PAGES = [...new Set(GROUPS.flat())];

// SITE_ORIGIN (src/config.ts) is the single source for absolute URLs: it fills
// %SITE_ORIGIN% in the HTML pages and generates robots.txt and sitemap.xml.
function siteOrigin(): Plugin {
  const alt = (group: [string, string, string], indent: string) =>
    (['pt-BR', 'en', 'x-default'] as const)
      .map(
        (l, i) =>
          `${indent}<xhtml:link rel="alternate" hreflang="${l}" href="${SITE_ORIGIN}${group[i]}"/>`,
      )
      .join('\n');
  return {
    name: 'colinha-site-origin',
    transformIndexHtml: (html) => html.replaceAll('%SITE_ORIGIN%', SITE_ORIGIN),
    generateBundle() {
      if (this.environment?.name !== 'client') return;
      const urls = PAGES.map((p) => {
        const group = GROUPS.find((g) => g.includes(p))!;
        return `  <url>\n    <loc>${SITE_ORIGIN}${p}</loc>\n${alt(group, '    ')}\n  </url>`;
      }).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      });
    },
  };
}

// The e2e bundle never delivers passes; refuse to build it for production.
if (process.env.VITE_E2E && process.env.CLOUDFLARE_ENV === 'production')
  throw new Error('VITE_E2E must not be set when building for production');

export default defineConfig({
  plugins: [svelte(), cloudflare(), siteOrigin()],
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
            ptCpf: 'pt/cpf-na-carteira/index.html',
            ptPix: 'pt/pix-na-carteira/index.html',
            enCpf: 'en/cpf-in-apple-wallet/index.html',
            enPix: 'en/pix-in-apple-wallet/index.html',
          },
        },
      },
    },
  },
});
