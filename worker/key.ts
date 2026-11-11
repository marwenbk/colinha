// Imports the pass-signing private key (PKCS#8 PEM) once per isolate.

const cache = new Map<string, Promise<CryptoKey>>();

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const m = pem.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/,
  );
  if (!m)
    throw new Error('key: expected an unencrypted PKCS#8 "PRIVATE KEY" PEM');
  const bin = atob(m[1].replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function importSigningKey(pkcs8Pem: string): Promise<CryptoKey> {
  let p = cache.get(pkcs8Pem);
  if (!p) {
    p = (async () =>
      crypto.subtle.importKey(
        'pkcs8',
        pemToDer(pkcs8Pem),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign'],
      ))();
    cache.set(pkcs8Pem, p);
    p.catch(() => cache.delete(pkcs8Pem));
  }
  return p;
}
