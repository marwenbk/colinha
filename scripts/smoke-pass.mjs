// Builds a minimal generic pass, has <origin>/api/sign sign it, writes smoke.pkpass.
// Usage: node scripts/smoke-pass.mjs <origin> [out.pkpass]
//   SMOKE_PASS_TYPE_ID, SMOKE_TEAM_ID: identifiers matching your Apple certificate.
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import sharp from 'sharp';

const origin = process.argv[2];
const out = process.argv[3] ?? 'smoke.pkpass';
if (!origin) {
  console.error('usage: node scripts/smoke-pass.mjs <origin> [out.pkpass]');
  process.exit(2);
}

const pass = {
  formatVersion: 1,
  passTypeIdentifier:
    process.env.SMOKE_PASS_TYPE_ID ?? 'pass.com.example.colinha',
  teamIdentifier: process.env.SMOKE_TEAM_ID ?? 'ABCDE12345',
  serialNumber: randomUUID(),
  organizationName: 'Colinha',
  description: 'Colinha smoke test',
  generic: {
    primaryFields: [{ key: 'smoke', label: 'Smoke test', value: 'It works' }],
  },
};
const icon = await sharp({
  create: {
    width: 29,
    height: 29,
    channels: 3,
    background: { r: 40, g: 120, b: 200 },
  },
})
  .png()
  .toBuffer();

const files = {
  'pass.json': strToU8(JSON.stringify(pass)),
  'icon.png': new Uint8Array(icon),
};
const manifest = {};
for (const [name, data] of Object.entries(files))
  manifest[name] = createHash('sha1').update(data).digest('hex');
const manifestBytes = strToU8(JSON.stringify(manifest));

const digest = createHash('sha256').update(manifestBytes).digest();
const res = await fetch(new URL('/api/sign', origin), {
  method: 'POST',
  body: digest,
});
if (!res.ok) {
  console.error(`sign failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const signature = new Uint8Array(await res.arrayBuffer());

writeFileSync(
  out,
  zipSync({ ...files, 'manifest.json': manifestBytes, signature }),
);
console.log(`wrote ${out} (signature ${signature.length} bytes)`);
