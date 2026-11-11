import { unzipSync } from 'fflate';
import { expect, it } from 'vitest';
import { zipPass } from '../../../src/pass/zip';
import { fakeImages, utf8 } from './fixtures';

const files = () => ({
  'pass.json': utf8('{"formatVersion":1}'),
  'manifest.json': utf8('{}'),
  signature: new Uint8Array([0x30, 0x03, 1, 2, 3]),
  ...fakeImages(),
});

it('unzips to exactly the pass files', () => {
  const out = unzipSync(zipPass(files()));
  expect(Object.keys(out).sort()).toEqual(
    ['background.png', 'background@2x.png', 'background@3x.png', 'icon.png', 'icon@2x.png',
      'icon@3x.png', 'manifest.json', 'pass.json', 'signature'],
  );
  // Array.from: jsdom and node hand out Uint8Arrays from different realms.
  for (const [k, v] of Object.entries(files())) expect(Array.from(out[k])).toEqual(Array.from(v));
});

it('is deterministic', () => {
  expect(zipPass(files())).toEqual(zipPass(files()));
});

it('stores PNGs and deflates JSON', () => {
  const zip = zipPass(files());
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const methods: Record<string, number> = {};
  // Walk the local file headers (signature 0x04034b50).
  for (let at = 0; view.getUint32(at, true) === 0x04034b50;) {
    const method = view.getUint16(at + 8, true);
    const size = view.getUint32(at + 18, true);
    const nameLen = view.getUint16(at + 26, true);
    const extraLen = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(zip.subarray(at + 30, at + 30 + nameLen));
    methods[name] = method;
    at += 30 + nameLen + extraLen + size;
  }
  expect(methods['icon.png']).toBe(0);
  expect(methods['background@3x.png']).toBe(0);
  expect(methods['pass.json']).toBe(8);
  expect(methods['manifest.json']).toBe(8);
});
