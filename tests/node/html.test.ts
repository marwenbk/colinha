import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const OUT = 'dist/client';
const ORIGIN = 'https://colinha.xyz';

const PT_TITLE = 'Colinha – CPF, endereço e Pix na Carteira do iPhone';
const PT_DESC =
  'Guarde CPF, CEP e chave Pix na Carteira do iPhone. Montado no seu aparelho; seus dados não saem dele.';
const EN_TITLE = 'Colinha – Your CPF, address and Pix in Apple Wallet';
const EN_DESC =
  'Keep your CPF, CEP and Pix key in Apple Wallet. Built on your phone; your data never leaves it.';

const read = (p: string) => readFileSync(`${OUT}/${p}`, 'utf8');

// Guide pages: [file, lang, own path, translation path].
const GUIDES = [
  { file: 'pt/cpf-na-carteira/index.html', lang: 'pt-BR', path: '/pt/cpf-na-carteira/', alt: '/en/cpf-in-apple-wallet/', h1: 'CPF na Carteira do iPhone' },
  { file: 'pt/pix-na-carteira/index.html', lang: 'pt-BR', path: '/pt/pix-na-carteira/', alt: '/en/pix-in-apple-wallet/', h1: 'Chave Pix na Carteira do iPhone' },
  { file: 'en/cpf-in-apple-wallet/index.html', lang: 'en', path: '/en/cpf-in-apple-wallet/', alt: '/pt/cpf-na-carteira/', h1: 'Your CPF in Apple Wallet' },
  { file: 'en/pix-in-apple-wallet/index.html', lang: 'en', path: '/en/pix-in-apple-wallet/', alt: '/pt/pix-na-carteira/', h1: 'Your Pix key in Apple Wallet' },
];

function fresh(): boolean {
  const idx = `${OUT}/index.html`;
  if (!existsSync(idx) || !existsSync(`${OUT}/sitemap.xml`)) return false;
  const built = statSync(idx).mtimeMs;
  const srcs = [
    'index.html', 'pt/index.html', 'en/index.html', 'vite.config.ts', 'src/config.ts',
    ...GUIDES.map((g) => g.file),
  ];
  return srcs.every((s) => statSync(s).mtimeMs <= built);
}

beforeAll(() => {
  if (!fresh()) execSync('pnpm build', { stdio: 'pipe' });
}, 180_000);

const pages = [
  { file: 'index.html', lang: 'pt-BR', canonical: `${ORIGIN}/`, forced: null, title: PT_TITLE, desc: PT_DESC, ogImage: 'og-pt.png', tagline: 'Seus números na Carteira.' },
  { file: 'pt/index.html', lang: 'pt-BR', canonical: `${ORIGIN}/pt/`, forced: 'pt', title: PT_TITLE, desc: PT_DESC, ogImage: 'og-pt.png', tagline: 'Seus números na Carteira.' },
  { file: 'en/index.html', lang: 'en', canonical: `${ORIGIN}/en/`, forced: 'en', title: EN_TITLE, desc: EN_DESC, ogImage: 'og-en.png', tagline: 'Your numbers in Apple Wallet.' },
];

describe.each(pages)('$file', (p) => {
  const html = () => read(p.file);
  it('has lang, title, description', () => {
    expect(html()).toContain(`<html lang="${p.lang}"`);
    expect(html()).toContain(`<title>${p.title}</title>`);
    expect(html()).toContain(`<meta name="description" content="${p.desc}"`);
  });
  it('has self canonical and hreflang trio', () => {
    const h = html();
    expect(h).toContain(`<link rel="canonical" href="${p.canonical}"`);
    expect(h).toContain(`hreflang="pt-BR" href="${ORIGIN}/pt/"`);
    expect(h).toContain(`hreflang="en" href="${ORIGIN}/en/"`);
    expect(h).toContain(`hreflang="x-default" href="${ORIGIN}/"`);
  });
  it('has open graph tags', () => {
    const h = html();
    expect(h).toContain(`property="og:title" content="${p.title}"`);
    expect(h).toContain(`property="og:description" content="${p.desc}"`);
    expect(h).toContain(`property="og:image" content="${ORIGIN}/${p.ogImage}"`);
    expect(h).toContain(`property="og:url" content="${p.canonical}"`);
  });
  it('forced-locale meta only on /pt/ and /en/', () => {
    const m = html().match(/<meta name="colinha-locale" content="(\w+)"/);
    expect(m?.[1] ?? null).toBe(p.forced);
  });
  it('has static hero in the mount node and links', () => {
    const h = html();
    expect(h).toMatch(/<div id="app">[\s\S]*<h1>Colinha<\/h1>[\s\S]*<\/div>/);
    expect(h).toContain(p.tagline);
    expect(h).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(h).toContain('rel="icon" href="/favicon.svg"');
    expect(h).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
  });
  it('has no unreplaced placeholders or third-party resources', () => {
    const h = html();
    expect(h).not.toContain('%SITE_ORIGIN%');
    const urls = [...h.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    for (const u of urls) expect(u.startsWith(ORIGIN)).toBe(true);
  });
});

describe.each(GUIDES)('guide $file', (g) => {
  const html = () => read(g.file);
  it('has lang, one h1, canonical and its translation', () => {
    const h = html();
    expect(h).toContain(`<html lang="${g.lang}"`);
    expect(h.match(/<h1>/g)).toHaveLength(1);
    expect(h).toContain(`<h1>${g.h1}</h1>`);
    expect(h).toContain(`<link rel="canonical" href="${ORIGIN}${g.path}"`);
    expect(h).toContain(`href="${ORIGIN}${g.alt}"`);
    expect(h).toMatch(/<meta name="description" content="[^"]{80,160}"/);
  });
  it('has valid FAQ structured data matching the visible questions', () => {
    const h = html();
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(ld['@type']).toBe('FAQPage');
    for (const q of ld.mainEntity) expect(h).toContain(`<h3>${q.name}</h3>`);
  });
  it('links into the app and loads nothing from other sites', () => {
    const h = html();
    expect(h).toContain(`class="cta" href="/${g.lang === 'en' ? 'en' : 'pt'}/"`);
    expect(h).not.toContain('%SITE_ORIGIN%');
    expect(h).not.toMatch(/<script(?![^>]*application\/ld\+json)[^>]*>/);
    const resources = [...h.matchAll(/(?:src="|<link[^>]*href=")(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    for (const u of resources) expect(u.startsWith(ORIGIN)).toBe(true);
  });
});

describe('home pages structured data', () => {
  it.each(['index.html', 'pt/index.html', 'en/index.html'])('%s describes a free WebApplication', (f) => {
    const ld = JSON.parse(read(f).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(ld).toMatchObject({ '@type': 'WebApplication', name: 'Colinha', isAccessibleForFree: true });
    expect(ld.url.startsWith(ORIGIN)).toBe(true);
  });
});

describe('static files', () => {
  it('sitemap lists every page with its translations', () => {
    const s = read('sitemap.xml');
    const paths = ['/', '/pt/', '/en/', ...GUIDES.map((g) => g.path)];
    for (const path of paths) expect(s).toContain(`<loc>${ORIGIN}${path}</loc>`);
    expect(s.match(/<url>/g)).toHaveLength(paths.length);
    // The three home pages share one group of alternates.
    expect(s.match(/hreflang="pt-BR" href="https:\/\/colinha\.xyz\/pt\/"/g)).toHaveLength(3);
    expect(s.match(/hreflang="x-default" href="https:\/\/colinha\.xyz\/"/g)).toHaveLength(3);
    // Each guide pair points at both of its pages.
    expect(s.match(/hreflang="en" href="https:\/\/colinha\.xyz\/en\/cpf-in-apple-wallet\/"/g)).toHaveLength(2);
    expect(s.match(/hreflang="pt-BR" href="https:\/\/colinha\.xyz\/pt\/pix-na-carteira\/"/g)).toHaveLength(2);
  });
  it('robots allows all and points at the sitemap', () => {
    const r = read('robots.txt');
    expect(r).toMatch(/User-agent: \*\s+Allow: \//);
    expect(r).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });
  it('manifest is valid', () => {
    const m = JSON.parse(read('manifest.webmanifest'));
    expect(m).toMatchObject({
      name: 'Colinha',
      short_name: 'Colinha',
      display: 'standalone',
      theme_color: '#F2F2F7',
      background_color: '#F2F2F7',
      lang: 'pt-BR',
      start_url: '/',
    });
    const srcs = m.icons.map((i: { src: string }) => i.src);
    expect(srcs).toContain('/apple-touch-icon.png');
    expect(srcs).toContain('/favicon.svg');
    expect(existsSync(`${OUT}/favicon.svg`)).toBe(true);
  });
});
