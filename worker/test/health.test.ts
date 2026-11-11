import { SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';

test('GET /api/health', async () => {
  const res = await SELF.fetch('https://x/api/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
