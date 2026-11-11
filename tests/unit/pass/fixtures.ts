// Fixed cards for pass tests: stable ids and timestamps keep snapshots stable.
import type { AddressCard, DocsCard, PixCard } from '../../../src/cards/types';

export const SERIAL = '0123456789abcdef0123456789abcdef';

export const docsCard: DocsCard = {
  v: 1, id: SERIAL, type: 'docs', color: 'graphite', updatedAt: 1762732800000,
  cpf: '52998224725', name: 'Ana Souza', rg: '12.345.678-9', rnm: '', passport: 'FZ123456',
  barcode: true,
};
export const addressCard: AddressCard = {
  v: 1, id: SERIAL, type: 'address', color: 'blue', updatedAt: 1762732800000,
  cep: '01310100', line1: 'Rua Augusta, 1500', line2: 'Apto 42', district: 'Consolação',
  city: 'São Paulo', uf: 'SP', reference: 'Perto do metrô',
};
export const pixCard: PixCard = {
  v: 1, id: SERIAL, type: 'pix', color: 'teal', updatedAt: 1762732800000,
  key: 'ana@example.com', keyType: 'email', name: 'Ana Souza', city: 'Sao Paulo',
};

export const utf8 = (s: string) => new TextEncoder().encode(s);

/** Six tiny distinct stand-ins for the pass PNGs. */
export const fakeImages = (): Record<string, Uint8Array> =>
  Object.fromEntries(
    ['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png', 'logo@3x.png'].map(
      (n, i) => [n, new Uint8Array([0x89, 0x50, 0x4e, 0x47, i])],
    ),
  );
