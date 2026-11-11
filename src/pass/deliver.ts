// Hands a finished pass to Safari. Method: docs/decisions/0001-pass-delivery.md
// (Provisional: (c) a same-origin URL answered by public/sw.js with the pkpass MIME type;
// fallback: <a download> on a blob URL). Pass bytes never leave the device.
import { unzipSync } from 'fflate';
import { PKPASS_TYPE } from './pkpass';

export const PASS_CACHE = 'colinha-pass';

/** Indirection so tests can observe the navigation (jsdom's location can't be spied on). */
export const passNavigation = {
  go(path: string): void {
    location.assign(path);
  },
};

function serialOf(zip: Uint8Array): string {
  const files = unzipSync(zip, { filter: (f) => f.name === 'pass.json' });
  const serial: unknown = JSON.parse(new TextDecoder().decode(files['pass.json'])).serialNumber;
  if (typeof serial !== 'string' || !/^[0-9a-f]{32}$/.test(serial))
    throw new Error('deliver: pass has no valid serial');
  return serial;
}

const canUseWorker = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';

export async function registerPassWorker(): Promise<void> {
  if (!canUseWorker()) return;
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function clearPassCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(PASS_CACHE);
}

function download(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'colinha.pkpass';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function deliverPass(blob: Blob): Promise<void> {
  if (import.meta.env.VITE_E2E === '1') {
    (window as unknown as { __lastPass: Blob }).__lastPass = blob;
    return;
  }
  if (!canUseWorker()) {
    download(blob);
    return;
  }
  const path = `/__pass/${serialOf(new Uint8Array(await blob.arrayBuffer()))}.pkpass`;
  const cache = await caches.open(PASS_CACHE);
  for (const req of await cache.keys()) await cache.delete(req);
  await cache.put(path, new Response(blob, { headers: { 'Content-Type': PKPASS_TYPE } }));
  await navigator.serviceWorker.ready;
  passNavigation.go(path);
}
