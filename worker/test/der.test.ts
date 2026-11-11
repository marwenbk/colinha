import { describe, expect, test } from 'vitest';
import {
  ctx,
  int,
  nul,
  octets,
  oid,
  readTlv,
  seq,
  set,
  setOf,
  tlv,
  utcTime,
} from '../der';
import { hex } from './fixtures';

describe('length encoding', () => {
  const cases: [number, string][] = [
    [127, '047f'],
    [128, '048180'],
    [255, '0481ff'],
    [256, '04820100'],
    [65536, '0483010000'],
  ];
  for (const [n, header] of cases) {
    test(`content size ${n}`, () => {
      const enc = tlv(0x04, new Uint8Array(n));
      expect(hex(enc.subarray(0, header.length / 2))).toBe(header);
      expect(enc.length).toBe(header.length / 2 + n);
      expect(readTlv(enc, 0)).toEqual({
        tag: 0x04,
        start: header.length / 2,
        end: enc.length,
        header: header.length / 2,
      });
    });
  }

  test('tlv concatenates multiple content parts', () => {
    expect(hex(tlv(0x30, Uint8Array.of(1), Uint8Array.of(2, 3)))).toBe(
      '3003010203',
    );
  });
});

describe('primitives', () => {
  test('oid', () => {
    expect(hex(oid('1.2.840.113549.1.7.2'))).toBe('06092a864886f70d010702');
    expect(hex(oid('2.16.840.1.101.3.4.2.1'))).toBe('0609608648016503040201');
  });
  test('int', () => {
    expect(hex(int(0))).toBe('020100');
    expect(hex(int(1))).toBe('020101');
    expect(hex(int(127))).toBe('02017f');
    expect(hex(int(128))).toBe('02020080');
    expect(hex(int(256))).toBe('02020100');
  });
  test('octets, nul, seq, set, ctx', () => {
    expect(hex(octets(Uint8Array.of(0xab)))).toBe('0401ab');
    expect(hex(nul())).toBe('0500');
    expect(hex(seq(nul()))).toBe('30020500');
    expect(hex(set(nul()))).toBe('31020500');
    expect(hex(ctx(0, nul()))).toBe('a0020500');
    expect(hex(ctx(1, nul()))).toBe('a1020500');
  });
  test('utcTime', () => {
    const t = utcTime(new Date('2026-11-10T09:08:07.654Z'));
    expect(new TextDecoder().decode(t.subarray(2))).toBe('261110090807Z');
    expect(hex(t.subarray(0, 2))).toBe('170d');
  });
});

describe('setOf', () => {
  test('sorts items by encoded bytes', () => {
    const a = octets(Uint8Array.of(2));
    const b = octets(Uint8Array.of(1));
    const c = oid('1.2.3');
    const d = octets(Uint8Array.of(1, 0));
    expect(hex(setOf([a, b, c, d]))).toBe(hex(set(b, a, d, c)));
  });
  test('does not mutate its input', () => {
    const items = [octets(Uint8Array.of(2)), octets(Uint8Array.of(1))];
    const before = items.map(hex);
    setOf(items);
    expect(items.map(hex)).toEqual(before);
  });
});

describe('readTlv', () => {
  test('reads at an offset', () => {
    const buf = Uint8Array.of(0xff, 0x30, 0x02, 0x05, 0x00);
    expect(readTlv(buf, 1)).toEqual({ tag: 0x30, start: 3, end: 5, header: 2 });
  });
  test('rejects truncated input', () => {
    expect(() => readTlv(Uint8Array.of(0x04, 0x05, 0x00), 0)).toThrow();
    expect(() => readTlv(Uint8Array.of(0x04), 0)).toThrow();
  });
  test('rejects indefinite length', () => {
    expect(() => readTlv(Uint8Array.of(0x30, 0x80, 0x00, 0x00), 0)).toThrow();
  });
});
