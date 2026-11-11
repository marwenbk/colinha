import { describe, expect, it, vi } from 'vitest';
import { SignError, requestSignature } from '../../../src/pass/sign-client';
import { utf8 } from './fixtures';

const manifest = utf8('{"pass.json":"00"}');
const der = new Uint8Array(64).fill(1);
der[0] = 0x30;
const ok = () => new Response(der, { status: 200 });
const kindOf = async (p: Promise<unknown>) => {
  const e = await p.then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(SignError);
  return (e as SignError).kind;
};

describe('requestSignature', () => {
  it('POSTs exactly SHA-256(manifest) and returns the DER', async () => {
    const f = vi.fn(async (_u: RequestInfo | URL, _i?: RequestInit) => ok());
    const sig = await requestSignature(manifest, f as typeof fetch);
    expect(sig).toEqual(der);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe('/api/sign');
    expect(init!.method).toBe('POST');
    const body = new Uint8Array(init!.body as Uint8Array);
    expect(body.length).toBe(32);
    const want = new Uint8Array(await crypto.subtle.digest('SHA-256', manifest));
    expect(Array.from(body)).toEqual(Array.from(want));
  });

  it('maps 429 to rate', async () => {
    const f = async () => new Response('slow down', { status: 429 });
    expect(await kindOf(requestSignature(manifest, f as typeof fetch))).toBe('rate');
  });

  it('maps a fetch TypeError to offline', async () => {
    const f = async () => { throw new TypeError('Load failed'); };
    expect(await kindOf(requestSignature(manifest, f as typeof fetch))).toBe('offline');
  });

  it.each([500, 400, 403])('maps %i to server', async (status) => {
    const f = async () => new Response('no', { status });
    expect(await kindOf(requestSignature(manifest, f as typeof fetch))).toBe('server');
  });

  it('rejects an ok response that is not DER', async () => {
    const short = async () => new Response(new Uint8Array([0x30, 1, 2]));
    expect(await kindOf(requestSignature(manifest, short as typeof fetch))).toBe('server');
    const html = async () => new Response('<!doctype html><html>not a signature at all</html>');
    expect(await kindOf(requestSignature(manifest, html as typeof fetch))).toBe('server');
  });
});
