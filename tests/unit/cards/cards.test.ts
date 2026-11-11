import { describe, expect, it } from 'vitest';
import { createT } from '../../../src/i18n';
import { toLayout } from '../../../src/cards/layout';
import { contrast, passColors } from '../../../src/cards/palette';
import { FIELDS, firstInvalid, newCard } from '../../../src/cards/templates';
import type { AddressCard, Card, DocsCard, PixCard } from '../../../src/cards/types';
import { buildPixPayload } from '../../../src/lib/pix/brcode';
import { newSerial } from '../../../src/lib/random';

const t = createT('pt');
const URL = 'https://x.test/#/edit/1';
const rgbOf = (s: string) => s.match(/\d+/g)!.map(Number);

const docs = (o: Partial<DocsCard> = {}): DocsCard => ({
  ...(newCard('docs') as DocsCard), cpf: '52998224725', name: 'Ana Souza',
  rg: '12.345.678-9', rnm: 'V123456-7', passport: 'FZ123456', ...o,
});
const addr = (o: Partial<AddressCard> = {}): AddressCard => ({
  ...(newCard('address') as AddressCard), cep: '01310100', line1: 'Rua Augusta, 1500',
  line2: 'Apto 42', district: 'Consolação', city: 'São Paulo', uf: 'SP', reference: 'Perto do metrô', ...o,
});
const pix = (o: Partial<PixCard> = {}): PixCard => ({
  ...(newCard('pix') as PixCard), key: 'ana@example.com', keyType: 'email',
  name: 'Ana Souza', city: 'São Paulo', ...o,
});

const keys = (l: ReturnType<typeof toLayout>) =>
  [...l.primary, ...l.secondary, ...l.auxiliary, ...l.back].map((f) => f.key);

describe('docs layout', () => {
  it('places fields and barcodes', () => {
    const l = toLayout(docs(), t, URL);
    expect(l.primary).toMatchObject([{ key: 'cpf', value: '529.982.247-25' }]);
    expect(l.secondary).toMatchObject([{ key: 'name', value: 'Ana Souza' }]);
    expect(l.auxiliary.map((f) => f.key)).toEqual(['rg', 'rnm', 'passport']);
    expect(l.barcodes).toEqual([
      { format: 'PKBarcodeFormatCode128', message: '52998224725', altText: '529.982.247-25' },
      { format: 'PKBarcodeFormatQR', message: '52998224725', altText: '529.982.247-25' },
    ]);
    expect(l.description).toBe('Documentos');
    expect(l.logoText).toBe('\u{1F1E7}\u{1F1F7}');
    expect(l.colors.fg).toBe('rgb(255,255,255)');
  });
  it('skips empty aux fields and barcode off', () => {
    const l = toLayout(docs({ rg: '', passport: '', barcode: false }), t, URL);
    expect(l.auxiliary.map((f) => f.key)).toEqual(['rnm']);
    expect(l.barcodes).toEqual([]);
  });
  it('back ends with edit link then disclaimer; keys unique', () => {
    const l = toLayout(docs(), t, URL);
    const [edit, dis] = l.back.slice(-2);
    expect(edit.key).toBe('edit');
    expect(edit.link).toEqual({ href: URL, text: 'Editar este cartão' });
    expect(edit.detect).toBeUndefined();
    expect(dis).toMatchObject({ key: 'disclaimer', value: 'Não é documento oficial.', detect: false });
    expect(l.back.filter((f) => f.key !== 'edit').every((f) => f.detect === false)).toBe(true);
    expect(new Set(keys(l)).size).toBe(keys(l).length);
  });
});

describe('address layout', () => {
  it('writes the full block first', () => {
    const l = toLayout(addr(), t, URL);
    expect(l.back[0].value).toBe('Rua Augusta, 1500, Apto 42\nConsolação, São Paulo - SP\n01310-100');
    expect(l.back[1]).toMatchObject({ key: 'back_reference', value: 'Perto do metrô' });
    expect(l.auxiliary.map((f) => f.key)).toEqual(['line2', 'district', 'cityUf']);
    expect(l.auxiliary[2].value).toBe('São Paulo - SP');
  });
  it('drops missing parts', () => {
    const l = toLayout(addr({ line1: 'Rua Augusta, 1500', line2: '', district: '' }), t, URL);
    expect(l.back[0].value).toBe('Rua Augusta, 1500\nSão Paulo - SP\n01310-100');
  });
});

describe('pix layout', () => {
  it('has QR payload and non-detected copy-paste', () => {
    const c = pix();
    const l = toLayout(c, t, URL);
    const payload = buildPixPayload({ key: c.key, name: c.name, city: c.city });
    expect(l.barcodes).toEqual([
      { format: 'PKBarcodeFormatQR', message: payload, altText: expect.any(String) },
    ]);
    const cp = l.back.find((f) => f.key === 'back_copyPaste')!;
    expect(cp.detect).toBe(false);
    expect(cp.value).toBe(payload);
  });
  it('formats the key by type', () => {
    expect(toLayout(pix({ key: '52998224725', keyType: 'cpf' }), t, URL).primary[0].value).toBe('529.982.247-25');
    expect(toLayout(pix({ key: '+5511987654321', keyType: 'phone' }), t, URL).primary[0].value).toBe('(11) 98765-4321');
  });
  it('shows the full name while the QR carries the folded one', () => {
    const c = pix({ name: 'José Antônio da Conceição Júnior' });
    const l = toLayout(c, t, URL);
    expect(l.secondary[0].value).toBe('José Antônio da Conceição Júnior');
    expect(l.barcodes[0].message).toContain('5925Jose Antonio da Conceicao');
  });
  it('throws for an invalid card', () => {
    expect(() => toLayout(pix({ keyType: null }), t, URL)).toThrow();
  });
});

describe('firstInvalid', () => {
  it('is null for valid cards', () => {
    for (const c of [docs(), addr(), pix()]) expect(firstInvalid(c)).toBeNull();
  });
  it('flags ambiguous pix key without a chosen type', () => {
    expect(firstInvalid(pix({ key: '11987654321', keyType: null }))).toBe('key');
  });
  it('flags keys that do not detect', () => {
    expect(firstInvalid(pix({ key: 'nope', keyType: 'email' }))).toBe('key');
  });
  it('flags non-latin name and city', () => {
    expect(firstInvalid(pix({ name: 'Иван' }))).toBe('name');
    expect(firstInvalid(pix({ city: 'Москва' }))).toBe('city');
  });
  it('follows field order', () => {
    expect(firstInvalid(docs({ cpf: '1', name: '' }))).toBe('cpf');
    expect(firstInvalid(docs({ name: ' ' }))).toBe('name');
    expect(firstInvalid(addr({ uf: 'XX' }))).toBe('uf');
    expect(firstInvalid(addr({ cep: '123' }))).toBe('cep');
  });
});

describe('newCard', () => {
  it('has defaults', () => {
    expect(newCard('docs')).toMatchObject({ barcode: true, v: 1 });
    expect(newCard('pix')).toMatchObject({ keyType: null });
    for (const type of ['docs', 'address', 'pix'] as const)
      expect(newCard(type)).not.toHaveProperty('color');
  });
  it('prefills pix', () => {
    const a = newCard('pix', { name: 'Ana Souza', city: 'São Paulo' }) as PixCard;
    const b = newCard('pix');
    expect(a).toMatchObject({ name: 'Ana Souza', city: 'São Paulo' });
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.id).not.toBe(b.id);
  });
});

describe('limits', () => {
  it('respects Apple store card limits', () => {
    const cards: Card[] = [docs(), docs({ barcode: false }), addr(), pix()];
    for (const c of cards) {
      const l = toLayout(c, t, URL);
      expect(l.primary).toHaveLength(1);
      // Store cards: up to 4 secondary and auxiliary fields combined.
      expect(l.secondary.length + l.auxiliary.length).toBeLessThanOrEqual(4);
    }
  });
  it('FIELDS ids exist on cards', () => {
    for (const type of ['docs', 'address', 'pix'] as const) {
      const c = newCard(type) as unknown as Record<string, unknown>;
      for (const f of FIELDS[type]) expect(f.id in c).toBe(true);
    }
  });
});

describe('pass colors', () => {
  it('give white text and labels at least 4.5:1 on every card type', () => {
    for (const tone of ['docs', 'pix', 'address'] as const) {
      const { bg, fg, label } = passColors(tone);
      expect(fg).toBe('rgb(255,255,255)');
      expect(contrast(rgbOf(bg), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgbOf(bg), rgbOf(label))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('differ by card type', () => {
    expect(passColors('docs').bg).not.toBe(passColors('pix').bg);
    expect(passColors('address').bg).not.toBe(passColors('docs').bg);
    expect(toLayout(docs(), t, URL).colors).toEqual(passColors('docs'));
  });
});

describe('newSerial', () => {
  it('is 32 hex chars and unique', () => {
    const s = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const v = newSerial();
      expect(v).toMatch(/^[0-9a-f]{32}$/);
      s.add(v);
    }
    expect(s.size).toBe(1000);
  });
});
