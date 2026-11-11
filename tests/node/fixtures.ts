// Reads the TEST-ONLY fixtures from disk for node-side tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const fixturesDir = fileURLToPath(
  new URL('../../worker/test/fixtures/', import.meta.url),
);
const read = (f: string) => readFileSync(fixturesDir + f);

export const leafDer = new Uint8Array(read('leaf.der'));
export const caDer = new Uint8Array(
  Buffer.from(
    read('ca.pem')
      .toString('utf8')
      .replace(/-----[^-]+-----/g, '')
      .replace(/\s+/g, ''),
    'base64',
  ),
);
export const leafKeyPem = read('leaf.pk8.pem').toString('utf8');
export const manifestBytes = new Uint8Array(read('manifest.json'));

export async function sha256(b: BufferSource): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', b));
}
