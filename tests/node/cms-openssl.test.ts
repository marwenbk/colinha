import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { importSigningKey } from '../../worker/key';
import { signDetached } from '../../worker/cms';
import {
  caDer,
  fixturesDir,
  leafDer,
  leafKeyPem,
  manifestBytes,
  sha256,
} from './fixtures';

// Finds an openssl that supports `cms` (stock macOS LibreSSL may not).
function findOpenssl(): string | undefined {
  const candidates = [
    process.env.OPENSSL,
    '/opt/homebrew/opt/openssl@3/bin/openssl',
    '/usr/local/opt/openssl@3/bin/openssl',
    'openssl',
  ].filter((c): c is string => !!c);
  for (const bin of candidates) {
    const r = spawnSync(bin, ['cms', '-help'], { encoding: 'utf8' });
    if (!r.error && /-verify/.test((r.stdout ?? '') + (r.stderr ?? '')))
      return bin;
  }
  return undefined;
}

const openssl = findOpenssl();
if (!openssl)
  console.warn(
    'cms-openssl: no openssl with `cms` support found; set OPENSSL=/path/to/openssl. Skipping.',
  );

const dir = mkdtempSync(join(tmpdir(), 'colinha-cms-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test.skipIf(!openssl)(
  `openssl cms -verify accepts the detached signature (${openssl})`,
  async () => {
    const key = await importSigningKey(leafKeyPem);
    const sig = await signDetached(
      await sha256(manifestBytes),
      { key, cert: leafDer, chain: [caDer] },
      new Date(),
    );
    const sigPath = join(dir, 'sig.der');
    writeFileSync(sigPath, sig);
    const r = spawnSync(
      openssl!,
      [
        'cms',
        '-verify',
        '-binary',
        '-inform',
        'DER',
        '-in',
        sigPath,
        '-content',
        join(fixturesDir, 'manifest.json'),
        '-CAfile',
        join(fixturesDir, 'ca.pem'),
        '-purpose',
        'any',
        '-out',
        join(dir, 'out.bin'),
      ],
      { encoding: 'utf8' },
    );
    console.log(`[${openssl}] exit ${r.status}: ${r.stderr.trim()}`);
    expect(r.status).toBe(0);
  },
);
