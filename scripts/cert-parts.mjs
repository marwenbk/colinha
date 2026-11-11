// Writes worker/test/fixtures/expected.json from the TEST-ONLY leaf certificate,
// using pkijs (test-only dependency) as an independent reader to check
// worker/cert.ts against.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Certificate } from 'pkijs';

const dir = fileURLToPath(new URL('../worker/test/fixtures/', import.meta.url));
const der = readFileSync(dir + 'leaf.der');
const cert = Certificate.fromBER(
  der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength),
);

const hex = (ab) => Buffer.from(ab).toString('hex');
const expected = {
  note: 'TEST-ONLY fixture. Derived from leaf.der by scripts/cert-parts.mjs (pkijs).',
  issuer: hex(cert.issuer.toSchema().toBER()),
  serial: hex(cert.serialNumber.toBER()),
  notAfter: cert.notAfter.value.toISOString(),
};
writeFileSync(dir + 'expected.json', JSON.stringify(expected, null, 2) + '\n');
console.log(expected);
