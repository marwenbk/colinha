import { zipSync, strToU8 } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SERIAL } from './fixtures';

const blobOf = (serial: string) =>
  new Blob([zipSync({ 'pass.json': strToU8(JSON.stringify({ serialNumber: serial })) })], {
    type: 'application/vnd.apple.pkpass',
  });

function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    keys: vi.fn(async () => [...store.keys()].map((k) => new Request(k))),
    delete: vi.fn(async (k: Request | string) => store.delete(typeof k === 'string' ? k : k.url)),
    put: vi.fn(async (k: string, r: Response) => { store.set(new URL(k, location.href).href, r); }),
  };
  return {
    store,
    api: { open: vi.fn(async () => cache), delete: vi.fn(async () => true) },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('deliverPass', () => {
  it('caches the pass under /__pass/<serial>.pkpass and navigates there', async () => {
    const { store, api } = fakeCaches();
    store.set(new URL('/__pass/old.pkpass', location.href).href, new Response('old'));
    vi.stubGlobal('caches', api);
    const register = vi.fn(async () => ({}));
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({}), register } });
    const { deliverPass, passNavigation } = await import('../../../src/pass/deliver');
    const go = vi.spyOn(passNavigation, 'go').mockImplementation(() => {});
    await deliverPass(blobOf(SERIAL));
    expect(api.open).toHaveBeenCalledWith('colinha-pass');
    const keys = [...store.keys()];
    expect(keys).toEqual([new URL(`/__pass/${SERIAL}.pkpass`, location.href).href]);
    const res = store.get(keys[0])!;
    expect(res.headers.get('Content-Type')).toBe('application/vnd.apple.pkpass');
    expect(go).toHaveBeenCalledWith(`/__pass/${SERIAL}.pkpass`);
  });

  it('hands the blob to window.__lastPass under VITE_E2E', async () => {
    vi.stubEnv('VITE_E2E', '1');
    const { deliverPass } = await import('../../../src/pass/deliver');
    const blob = blobOf(SERIAL);
    await deliverPass(blob);
    expect((window as unknown as { __lastPass: Blob }).__lastPass).toBe(blob);
  });

  it('registers /sw.js at scope / and clears the cache', async () => {
    const { api } = fakeCaches();
    vi.stubGlobal('caches', api);
    const register = vi.fn(async () => ({}));
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({}), register } });
    const { registerPassWorker, clearPassCache } = await import('../../../src/pass/deliver');
    await registerPassWorker();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    await clearPassCache();
    expect(api.delete).toHaveBeenCalledWith('colinha-pass');
  });
});
