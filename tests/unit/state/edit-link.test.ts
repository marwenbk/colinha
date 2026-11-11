import { describe, expect, it } from 'vitest';
import { decodeEditLink, encodeEditLink, parseCard } from '../../../src/state/edit-link';
import type { Card } from '../../../src/cards/types';

const base = { v: 1 as const, id: 'a'.repeat(32), updatedAt: 1700000000000 };
const samples: Card[] = [
  { ...base, type: 'docs', cpf: '52998224725', name: 'Conceição', rg: '1', rnm: '', passport: '', barcode: true },
  { ...base, type: 'address', cep: '01310100', line1: 'Av Paulista 1', line2: '', district: 'Bela Vista',
    city: 'São Paulo', uf: 'SP', reference: '' },
  { ...base, type: 'pix', key: 'a@b.com', keyType: 'email', name: 'Ana', city: 'Rio' },
];
const b64u = (o: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('edit link', () => {
  for (const c of samples) {
    it(`round-trips ${c.type}`, () => {
      const url = encodeEditLink(c, 'https://x.test');
      expect(url.startsWith('https://x.test/#c=')).toBe(true);
      expect(url.split('#c=')[1]).not.toMatch(/[+/=]/);
      const out = decodeEditLink(url.slice('https://x.test/'.length));
      expect(out).toEqual(c);
      expect(out?.id).toBe(c.id);
    });
  }
  it('accepts padded input', () => {
    const p = b64u(samples[2]);
    const padded = p + '='.repeat((4 - (p.length % 4)) % 4);
    expect(decodeEditLink('#c=' + padded)).toEqual(samples[2]);
  });
  it('rejects bad input', () => {
    const h = encodeEditLink(samples[0], '').slice(1);
    expect(decodeEditLink('#x=1')).toBeNull();
    expect(decodeEditLink(h.slice(0, 10) + '!' + h.slice(11))).toBeNull();
    expect(decodeEditLink('#c=' + b64u({ ...samples[0], v: 2 }))).toBeNull();
    expect(decodeEditLink('#c=' + b64u({ ...samples[0], id: 'abc' }))).toBeNull();
    expect(decodeEditLink('#c=' + b64u({ ...samples[0], extra: 1 }))).toBeNull();
    expect(decodeEditLink('#c=' + 'A'.repeat(5000))).toBeNull();
  });
});

describe('parseCard', () => {
  it('drops the legacy color key', () => {
    expect(parseCard({ ...samples[0], color: 'blue' })).toEqual(samples[0]);
  });
  it('rejects bad type, long strings, bad types of fields', () => {
    expect(parseCard({ ...samples[0], type: 'zzz' })).toBeNull();
    expect(parseCard({ ...samples[0], name: 'x'.repeat(41) })).toBeNull();
    expect(parseCard({ ...samples[0], barcode: 'yes' })).toBeNull();
    expect(parseCard({ ...samples[0], updatedAt: NaN })).toBeNull();
    expect(parseCard({ ...samples[2], keyType: 'nope' })).toBeNull();
    expect(parseCard({ ...samples[2], keyType: null })).not.toBeNull();
    expect(parseCard({ ...samples[2], key: 'x'.repeat(78) })).toBeNull();
    expect(parseCard(null)).toBeNull();
    expect(parseCard([])).toBeNull();
    const { cpf: _c, ...missing } = samples[0] as unknown as Record<string, unknown>;
    expect(parseCard(missing)).toBeNull();
  });
});
