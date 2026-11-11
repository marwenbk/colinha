import { afterEach, describe, expect, test, vi } from 'vitest';
import { SELF } from 'cloudflare:test';
import { Certificate, ContentInfo, SignedData } from 'pkijs';
import worker from '../index';
import type { Env } from '../env';
import {
  caDer,
  hex,
  leafDer,
  leafKeyPem,
  sha256,
  manifestBytes,
} from './fixtures';

function b64(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

function makeEnv(limiter?: {
  limit: (o: { key: string }) => Promise<{ success: boolean }>;
}): Env {
  return {
    ASSETS: { fetch: async () => new Response('asset') } as Env['ASSETS'],
    PASS_KEY_PKCS8: leafKeyPem,
    PASS_CERT_B64: b64(leafDer),
    WWDR_CERT_B64: b64(caDer),
    ...(limiter ? { SIGN_LIMITER: limiter } : {}),
  };
}

const okLimiter = () => ({
  limit: vi.fn(async (_o: { key: string }) => ({ success: true })),
});

function post(body: Uint8Array | null, headers: Record<string, string> = {}) {
  return new Request('https://x/api/sign', {
    method: 'POST',
    body: body as BodyInit | null,
    headers,
  });
}
const call = (req: Request, env: Env) => worker.fetch(req, env);

afterEach(() => vi.restoreAllMocks());

describe('POST /api/sign', () => {
  test('200 with a verifying DER signature and hardening headers', async () => {
    const digest = await sha256(manifestBytes);
    const res = await call(post(digest), makeEnv(okLimiter()));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    const out = new Uint8Array(await res.arrayBuffer());
    const ci = ContentInfo.fromBER(out.slice().buffer);
    const sd = new SignedData({ schema: ci.content });
    const si = sd.signerInfos[0];
    const attrs = new Uint8Array(si.signedAttrs!.toSchema().toBER());
    attrs[0] = 0x31;
    const leaf = Certificate.fromBER(leafDer.slice().buffer);
    const pub = await crypto.subtle.importKey(
      'spki',
      leaf.subjectPublicKeyInfo.toSchema().toBER(),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sig = new Uint8Array(si.signature.valueBlock.valueHexView);
    expect(
      await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, sig, attrs),
    ).toBe(true);
    const md = si.signedAttrs!.attributes.find(
      (a) => a.type === '1.2.840.113549.1.9.4',
    )!;
    expect(
      hex(new Uint8Array((md.values[0] as { toBER(): ArrayBuffer }).toBER())),
    ).toBe('0420' + hex(digest));
  });

  test('403 when Sec-Fetch-Site is present and not same-origin', async () => {
    for (const v of ['cross-site', 'same-site', 'none']) {
      const res = await call(
        post(new Uint8Array(32), { 'sec-fetch-site': v }),
        makeEnv(),
      );
      expect(res.status).toBe(403);
    }
    const ok = await call(
      post(new Uint8Array(32), { 'sec-fetch-site': 'same-origin' }),
      makeEnv(),
    );
    expect(ok.status).toBe(200);
  });

  test('400 when the body is not exactly 32 bytes', async () => {
    for (const n of [0, 31, 33, 1000]) {
      const res = await call(post(new Uint8Array(n)), makeEnv());
      expect(res.status).toBe(400);
    }
  });

  test('429 when the limiter refuses, keyed by cf-connecting-ip', async () => {
    const limiter = {
      limit: vi.fn(async (_o: { key: string }) => ({ success: false })),
    };
    const res = await call(
      post(new Uint8Array(32), { 'cf-connecting-ip': '203.0.113.9' }),
      makeEnv(limiter),
    );
    expect(res.status).toBe(429);
    expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.9' });
  });

  test('still signs with no limiter binding', async () => {
    const res = await call(post(new Uint8Array(32)), makeEnv());
    expect(res.status).toBe(200);
  });

  test('500 without leaking details when the signer is misconfigured', async () => {
    const env = { ...makeEnv(), PASS_CERT_B64: 'bm9wZQ==' };
    const res = await call(post(new Uint8Array(32)), env);
    expect(res.status).toBe(500);
  });

  test('never logs the body or the IP', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const body = new Uint8Array(32).map((_, i) => 0xa0 + i);
    const ip = '198.51.100.77';
    await call(post(body, { 'cf-connecting-ip': ip }), makeEnv(okLimiter()));
    await call(
      post(new Uint8Array(5), { 'cf-connecting-ip': ip }),
      makeEnv(okLimiter()),
    );
    const logged = spies
      .flatMap((s) => s.mock.calls)
      .map((a) => a.map(String).join(' '))
      .join('\n');
    expect(logged).not.toContain(ip);
    expect(logged).not.toContain(hex(body));
    expect(logged).not.toContain(b64(body));
    expect(logged).not.toContain(String.fromCharCode(...body));
  });
});

describe('method and path handling', () => {
  test('405 for other methods on /api/sign', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const res = await call(
        new Request('https://x/api/sign', { method }),
        makeEnv(),
      );
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
    }
  });

  test('404 for other /api/* paths', async () => {
    for (const p of ['/api/nope', '/api/', '/api']) {
      const res = await call(new Request('https://x' + p), makeEnv());
      expect(res.status).toBe(404);
    }
  });
});

describe('GET /api/health', () => {
  test('reports certNotAfter and rateLimit:true with a binding', async () => {
    const res = await call(
      new Request('https://x/api/health'),
      makeEnv(okLimiter()),
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      ok: boolean;
      certNotAfter: string;
      rateLimit: boolean;
    };
    expect(j.ok).toBe(true);
    expect(j.rateLimit).toBe(true);
    expect(j.certNotAfter).toBe(new Date(j.certNotAfter).toISOString());
  });

  test('reports rateLimit:false with no binding', async () => {
    const res = await call(new Request('https://x/api/health'), makeEnv());
    expect(await res.json()).toMatchObject({ ok: true, rateLimit: false });
  });
});

describe('through the test worker bindings (miniflare)', () => {
  test('SELF signs using the configured test PKI and the real limiter binding', async () => {
    const res = await SELF.fetch('https://x/api/sign', {
      method: 'POST',
      body: await sha256(manifestBytes),
    });
    expect(res.status).toBe(200);
    const h = await SELF.fetch('https://x/api/health');
    expect(await h.json()).toMatchObject({ ok: true, rateLimit: true });
  });
});
