import { expect, test } from 'vitest';
import { readSigner } from '../cert';
import { expected, hex, leafDer } from './fixtures';

test('readSigner matches the independent pkijs reading', () => {
  const s = readSigner(leafDer);
  expect(hex(s.issuer)).toBe(expected.issuer);
  expect(hex(s.serial)).toBe(expected.serial);
  expect(s.notAfter.toISOString()).toBe(expected.notAfter);
});

test('readSigner rejects garbage', () => {
  expect(() => readSigner(Uint8Array.of(1, 2, 3))).toThrow();
});
