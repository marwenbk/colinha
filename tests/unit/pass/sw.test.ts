import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SRC = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
const ORIGIN = 'https://colinha.app';
type Handler = (e: unknown) => void;

function load(stored: Record<string, Response>) {
  const handlers: Record<string, Handler> = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Handler) => { handlers[type] = fn; },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  const cache = {
    match: vi.fn(async (req: Request | string) => {
      const url = typeof req === 'string' ? new URL(req, ORIGIN).href : req.url;
      return stored[url]?.clone();
    }),
  };
  const caches = { open: vi.fn(async (_name: string) => cache) };
  new Function('self', 'caches', SRC)(self, caches);
  const fetch = (url: string, method = 'GET') => {
    const respondWith = vi.fn();
    handlers.fetch({ request: new Request(url, { method }), respondWith });
    return respondWith;
  };
  return { handlers, self, caches, fetch };
}

describe('sw.js', () => {
  let pass: Response;
  beforeEach(() => {
    pass = new Response(new Uint8Array([1, 2, 3]), {
      headers: { 'Content-Type': 'application/vnd.apple.pkpass' },
    });
  });

  it('takes over at once', async () => {
    const { handlers, self } = load({});
    const waits: Promise<unknown>[] = [];
    const ev = { waitUntil: (p: Promise<unknown>) => waits.push(p) };
    handlers.install(ev);
    handlers.activate(ev);
    await Promise.all(waits);
    expect(self.skipWaiting).toHaveBeenCalled();
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it('answers /__pass/<id>.pkpass from the colinha-pass cache', async () => {
    const url = `${ORIGIN}/__pass/${'a'.repeat(32)}.pkpass`;
    const { fetch, caches } = load({ [url]: pass });
    const respondWith = fetch(url);
    expect(respondWith).toHaveBeenCalledTimes(1);
    const res: Response = await respondWith.mock.calls[0][0];
    expect(caches.open).toHaveBeenCalledWith('colinha-pass');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.apple.pkpass');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns 404 for a pass that is not cached', async () => {
    const { fetch } = load({});
    const respondWith = fetch(`${ORIGIN}/__pass/missing.pkpass`);
    const res: Response = await respondWith.mock.calls[0][0];
    expect(res.status).toBe(404);
  });

  it.each([
    [`${ORIGIN}/`, 'GET'],
    [`${ORIGIN}/api/sign`, 'POST'],
    [`${ORIGIN}/pass/icon.png`, 'GET'],
    [`${ORIGIN}/__pass/x.txt`, 'GET'],
    [`${ORIGIN}/__pass/x.pkpass`, 'POST'],
    [`https://evil.test/__pass/x.pkpass`, 'GET'],
  ])('leaves %s (%s) alone', (url, method) => {
    const { fetch } = load({});
    expect(fetch(url, method)).not.toHaveBeenCalled();
  });
});
