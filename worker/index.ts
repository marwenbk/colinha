import type { Env } from './env';
import { readSigner } from './cert';
import { importSigningKey } from './key';
import { signDetached } from './cms';

type Signer = {
  key: CryptoKey;
  cert: Uint8Array;
  chain: Uint8Array[];
  notAfter: Date;
};

function fromB64(s: string): Uint8Array {
  const bin = atob(s.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Parsed once per isolate, keyed on the env strings so a changed secret reloads.
let cached: { k: string; p: Promise<Signer> } | undefined;

function loadSigner(env: Env): Promise<Signer> {
  const k = [env.PASS_KEY_PKCS8, env.PASS_CERT_B64, env.WWDR_CERT_B64].join(
    '\0',
  );
  if (cached?.k === k) return cached.p;
  const p = (async () => {
    const cert = fromB64(env.PASS_CERT_B64);
    return {
      key: await importSigningKey(env.PASS_KEY_PKCS8),
      cert,
      chain: [fromB64(env.WWDR_CERT_B64)],
      notAfter: readSigner(cert).notAfter,
    };
  })();
  const entry = { k, p };
  cached = entry;
  p.catch(() => {
    if (cached === entry) cached = undefined;
  });
  return p;
}

const HARDENING = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function text(status: number, body: string, extra: HeadersInit = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      ...HARDENING,
      ...extra,
    },
  });
}

async function sign(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST')
    return text(405, 'Method not allowed', { Allow: 'POST' });

  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null && site !== 'same-origin') return text(403, 'Forbidden');

  if (env.SIGN_LIMITER) {
    const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await env.SIGN_LIMITER.limit({ key });
    if (!success) return text(429, 'Too many requests');
  }

  const declared = request.headers.get('Content-Length');
  if (declared !== null && declared !== '32') return text(400, 'Bad request');
  const digest = new Uint8Array(await request.arrayBuffer());
  if (digest.length !== 32) return text(400, 'Bad request');

  try {
    const signer = await loadSigner(env);
    const der = await signDetached(digest, signer, new Date());
    return new Response(der, {
      headers: { 'Content-Type': 'application/octet-stream', ...HARDENING },
    });
  } catch {
    return text(500, 'Signing unavailable');
  }
}

async function health(env: Env): Promise<Response> {
  try {
    const { notAfter } = await loadSigner(env);
    return Response.json(
      {
        ok: true,
        certNotAfter: notAfter.toISOString(),
        rateLimit: env.SIGN_LIMITER !== undefined,
      },
      { headers: HARDENING },
    );
  } catch {
    return Response.json(
      { ok: false, rateLimit: env.SIGN_LIMITER !== undefined },
      { status: 503, headers: HARDENING },
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/sign') return sign(request, env);
    if (pathname === '/api/health' && request.method === 'GET')
      return health(env);
    if (pathname === '/api' || pathname.startsWith('/api/'))
      return text(404, 'Not found');
    return env.ASSETS.fetch(request);
  },
} satisfies { fetch(request: Request, env: Env): Promise<Response> };
