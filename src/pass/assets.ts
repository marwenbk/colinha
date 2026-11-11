// The pass icons, loaded once from /pass/ and kept in memory. The background
// is drawn per card (see background.ts).
export const PASS_IMAGES = [
  'icon.png', 'icon@2x.png', 'icon@3x.png',
] as const;

export type ImageLoader = (path: string) => Promise<Uint8Array>;

const fetchBytes: ImageLoader = async (path) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`assets: ${path} answered ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

async function loadAll(loader: ImageLoader): Promise<Record<string, Uint8Array>> {
  const bytes = await Promise.all(PASS_IMAGES.map((n) => loader(`/pass/${n}`)));
  return Object.fromEntries(PASS_IMAGES.map((n, i) => [n, bytes[i]]));
}

let cached: Promise<Record<string, Uint8Array>> | undefined;

/** Fetches the images under /pass/ (cached), or reads them with `loader` (not cached). */
export function loadPassImages(loader?: ImageLoader): Promise<Record<string, Uint8Array>> {
  if (loader) return loadAll(loader);
  if (!cached) {
    const p = loadAll(fetchBytes);
    cached = p;
    p.catch(() => { if (cached === p) cached = undefined; });
  }
  return cached;
}
