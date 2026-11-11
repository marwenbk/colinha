// Sends SHA-256(manifest), and only that, to the Worker; gets back the DER signature.

export type SignErrorKind = 'offline' | 'rate' | 'server';

export class SignError extends Error {
  constructor(public readonly kind: SignErrorKind, message?: string) {
    super(message ?? `sign: ${kind}`);
    this.name = 'SignError';
  }
}

export async function requestSignature(
  manifest: Uint8Array,
  f: typeof fetch = fetch,
): Promise<Uint8Array> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', manifest as Uint8Array<ArrayBuffer>),
  );
  let res: Response;
  try {
    res = await f('/api/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: digest,
    });
  } catch (e) {
    if (e instanceof TypeError) throw new SignError('offline', e.message);
    throw new SignError('server', String(e));
  }
  if (res.status === 429) throw new SignError('rate');
  if (!res.ok) throw new SignError('server', `sign: status ${res.status}`);
  let der: Uint8Array;
  try {
    der = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    throw new SignError(e instanceof TypeError ? 'offline' : 'server', String(e));
  }
  // A CMS ContentInfo is a DER SEQUENCE (0x30) and never this small.
  if (der.length < 32 || der[0] !== 0x30) throw new SignError('server', 'sign: not DER');
  return der;
}
