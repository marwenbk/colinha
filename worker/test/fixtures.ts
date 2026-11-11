// Loads the TEST-ONLY fixtures inside workerd. Binary DER arrives as a base64
// data URL (see `assetsInclude` in vitest.config.ts); text arrives raw.
import leafUrl from './fixtures/leaf.der?inline';
import caPem from './fixtures/ca.pem?raw';
import leafKeyPem from './fixtures/leaf.pk8.pem?raw';
import manifestText from './fixtures/manifest.json?raw';
import expected from './fixtures/expected.json';

function b64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const leafDer = b64(leafUrl.slice(leafUrl.indexOf(',') + 1));
export const caDer = b64(
  caPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''),
);
export const manifestBytes = new TextEncoder().encode(manifestText);
export { leafKeyPem, expected };

export function hex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function sha256(b: BufferSource): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', b));
}
