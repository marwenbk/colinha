import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '../../../src/config';
import { createT } from '../../../src/i18n';
import { sampleLayout } from '../../../src/screens/preview';

const t = createT('pt');
const values = (fs: { value: string }[]) => fs.map((f) => f.value);

describe('Home example cards', () => {
  it('CPF: every field, with zero-filled ID numbers, and the barcode', () => {
    const l = sampleLayout('docs', t);
    expect(values(l.primary)).toEqual(['000.000.000-00']);
    expect(values(l.secondary)).toEqual(['Maria da Silva']);
    expect(values(l.auxiliary)).toEqual(['00.000.000-0', 'V000000-0', 'AA000000']);
    expect(l.barcodes).toEqual([
      { format: 'PKBarcodeFormatCode128', message: '00000000000', altText: '000.000.000-00' },
    ]);
    expect(l.tone).toBe('docs');
  });

  it('Pix: key, name and a QR that is not a Pix payment', () => {
    const l = sampleLayout('pix', t);
    expect(values(l.primary)).toEqual(['maria@exemplo.com']);
    expect(values(l.secondary)).toEqual(['Maria da Silva']);
    expect(l.barcodes).toHaveLength(1);
    // A BR Code payload starts with "000201"; the example's QR is the site link.
    expect(l.barcodes[0].message).toBe(SITE_ORIGIN);
    expect(l.barcodes[0].message.startsWith('000201')).toBe(false);
    expect(l.barcodes[0].altText).toBe('maria@exemplo.com');
  });

  it('Address: CEP, street, complement, neighbourhood and city', () => {
    const l = sampleLayout('address', t);
    expect(values(l.primary)).toEqual(['01310-100']);
    expect(values(l.secondary)).toEqual(['Av. Paulista, 1000']);
    expect(values(l.auxiliary)).toEqual(['Apto 12', 'Bela Vista', 'São Paulo - SP']);
  });
});
