import { expect, test } from 'vitest';
import { importSigningKey } from '../../worker/key';
import { signDetached } from '../../worker/cms';
import { caDer, leafDer, leafKeyPem, manifestBytes, sha256 } from './fixtures';

// Runs in node: workerd's clock only advances on I/O, so a loop there reads ~0 ms.
test('signing 100 times in a row averages under 5 ms each', async () => {
  const key = await importSigningKey(leafKeyPem);
  const digest = await sha256(manifestBytes);
  const s = { key, cert: leafDer, chain: [caDer] };
  await signDetached(digest, s, new Date()); // warm-up
  const n = 100;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) await signDetached(digest, s, new Date());
  const avg = (performance.now() - t0) / n;
  console.log(`cms-timing: ${avg.toFixed(3)} ms average over ${n} signatures`);
  expect(avg).toBeLessThan(5);
});
