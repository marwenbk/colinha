// End to end in node: buildPkpass, signed by signDetached with the TEST-ONLY PKI,
// checked by scripts/verify-pass.sh (manifest SHA-1s + openssl cms -verify).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync } from 'fflate';
import { afterAll, expect, test } from 'vitest';
import type { DocsCard } from '../../src/cards/types';
import { createT } from '../../src/i18n';
import { buildPkpass } from '../../src/pass/pkpass';
import { signDetached } from '../../worker/cms';
import { importSigningKey } from '../../worker/key';
import { caDer, fixturesDir, leafDer, leafKeyPem } from './fixtures';

function findOpenssl(): string | undefined {
  const candidates = [
    process.env.OPENSSL,
    '/opt/homebrew/opt/openssl@3/bin/openssl',
    '/usr/local/opt/openssl@3/bin/openssl',
    'openssl',
  ].filter((c): c is string => !!c);
  for (const bin of candidates) {
    const r = spawnSync(bin, ['cms', '-help'], { encoding: 'utf8' });
    if (!r.error && /-verify/.test((r.stdout ?? '') + (r.stderr ?? ''))) return bin;
  }
  return undefined;
}

const openssl = findOpenssl();
if (!openssl)
  console.warn(
    'pipeline: no openssl with `cms` support found; set OPENSSL=/path/to/openssl. Skipping.',
  );

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'colinha-pipeline-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const card: DocsCard = {
  v: 1, id: '0123456789abcdef0123456789abcdef', type: 'docs', color: 'graphite',
  updatedAt: 1762732800000, cpf: '52998224725', name: 'Ana Souza', rg: '', rnm: '',
  passport: '', barcode: true,
};

async function build() {
  const key = await importSigningKey(leafKeyPem);
  const signer = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const digest = new Uint8Array(init!.body as Uint8Array);
    return new Response(await signDetached(digest, { key, cert: leafDer, chain: [caDer] }, new Date()));
  }) as typeof fetch;
  const loader = async (p: string) => new Uint8Array(readFileSync(join(root, 'public', p)));
  return buildPkpass(card, createT('pt'), 'https://colinha.app', { fetch: signer, loader });
}

test('buildPkpass produces a typed blob with the pass files', async () => {
  const blob = await build();
  expect(blob.type).toBe('application/vnd.apple.pkpass');
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(Object.keys(files).sort()).toEqual([
    'icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png', 'logo@3x.png',
    'manifest.json', 'pass.json', 'signature',
  ]);
  const pass = JSON.parse(new TextDecoder().decode(files['pass.json']));
  expect(pass.serialNumber).toBe(card.id);
  expect(pass.generic.primaryFields[0].value).toBe('529.982.247-25');
});

test.skipIf(!openssl)(`verify-pass.sh accepts the pass (${openssl})`, async () => {
  const out = join(dir, 'out.pkpass');
  writeFileSync(out, new Uint8Array(await (await build()).arrayBuffer()));
  const r = spawnSync(
    'bash',
    [join(root, 'scripts/verify-pass.sh'), out, join(fixturesDir, 'ca.pem')],
    { encoding: 'utf8', env: { ...process.env, OPENSSL: openssl } },
  );
  console.log(`verify-pass.sh exit ${r.status}\n${r.stdout}${r.stderr}`);
  expect(r.status).toBe(0);
});

test.skipIf(!openssl)('verify-pass.sh rejects a tampered pass', async () => {
  const files = unzipSync(new Uint8Array(await (await build()).arrayBuffer()));
  files['pass.json'] = new TextEncoder().encode('{"tampered":true}');
  const out = join(dir, 'bad.pkpass');
  writeFileSync(out, zipSync(files));
  const r = spawnSync(
    'bash',
    [join(root, 'scripts/verify-pass.sh'), out, join(fixturesDir, 'ca.pem')],
    { encoding: 'utf8', env: { ...process.env, OPENSSL: openssl } },
  );
  expect(r.status).not.toBe(0);
});
