import { afterEach, expect, it, vi } from 'vitest';

const NAMES = ['icon.png', 'icon@2x.png', 'icon@3x.png'];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('fetches the icons under /pass/ once and caches them', async () => {
  const f = vi.fn(async (u: string) => new Response(new TextEncoder().encode(u)));
  vi.stubGlobal('fetch', f);
  const { loadPassImages } = await import('../../../src/pass/assets');
  const a = await loadPassImages();
  expect(Object.keys(a).sort()).toEqual([...NAMES].sort());
  expect(new TextDecoder().decode(a['icon@2x.png'])).toBe('/pass/icon@2x.png');
  await loadPassImages();
  expect(f).toHaveBeenCalledTimes(3);
});

it('retries after a failed fetch', async () => {
  let fail = true;
  const f = vi.fn(async () => (fail ? new Response('', { status: 404 }) : new Response('x')));
  vi.stubGlobal('fetch', f);
  const { loadPassImages } = await import('../../../src/pass/assets');
  await expect(loadPassImages()).rejects.toThrow();
  fail = false;
  await expect(loadPassImages()).resolves.toHaveProperty('icon.png');
});

it('takes a custom loader', async () => {
  const { loadPassImages } = await import('../../../src/pass/assets');
  const seen: string[] = [];
  const imgs = await loadPassImages(async (p) => { seen.push(p); return new Uint8Array([1]); });
  expect(seen.sort()).toEqual(NAMES.map((n) => `/pass/${n}`).sort());
  expect(imgs['icon.png']).toEqual(new Uint8Array([1]));
});
