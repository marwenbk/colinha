// The front of a pass as the Editor and Home show it, for complete and partial cards.
import { f, FLAG, present, toLayout } from '../cards/layout';
import { passColors } from '../cards/palette';
import { seedOf } from '../pass/art';
import { FIELDS, firstInvalid, newCard } from '../cards/templates';
import type { Card, CardType, PassLayout } from '../cards/types';
import type { T } from '../i18n';
import { SITE_ORIGIN } from '../config';
import { applyMask } from '../ui/mask';

const maskOf = (type: 'docs' | 'address', id: string) =>
  FIELDS[type].find((s) => s.id === id)!.mask!;

/**
 * Format hints for empty primary values. These are shapes, not words, so they
 * don't go through the copy table; the Pix key hint does.
 */
const HINT = { cpf: '000.000.000-00', cep: '00000-000' } as const;

/** A complete card gets its real pass layout; a partial one gets what's typed so far. */
export function previewLayout(card: Card, t: T): PassLayout {
  if (firstInvalid(card) === null) return toLayout(card, t, '');
  const base = {
    description: t(`card.${card.type}`),
    logoText: FLAG,
    back: [],
    colors: passColors(card.type),
    art: seedOf(card.id),
    tone: card.type,
  };
  if (card.type === 'docs') {
    return {
      ...base,
      primary: [f('cpf', t('field.cpf'), applyMask(maskOf('docs', 'cpf'), card.cpf) || HINT.cpf)],
      secondary: present([f('name', t('field.name'), card.name)]),
      auxiliary: present([
        f('rg', t('field.rg'), card.rg),
        f('rnm', t('field.rnm'), card.rnm),
        f('passport', t('field.passport'), card.passport),
      ]),
      barcodes: card.barcode
        ? [{ format: 'PKBarcodeFormatCode128', message: card.cpf, altText: applyMask(maskOf('docs', 'cpf'), card.cpf) }]
        : [],
    };
  }
  if (card.type === 'address') {
    return {
      ...base,
      primary: [f('cep', t('field.cep'), applyMask(maskOf('address', 'cep'), card.cep) || HINT.cep)],
      secondary: present([f('line1', t('field.line1'), card.line1)]),
      auxiliary: present([
        f('line2', t('field.line2'), card.line2),
        f('district', t('field.district'), card.district),
        f('cityUf', t('field.city'), [card.city, card.uf].filter(Boolean).join(' - ')),
      ]),
      barcodes: [],
    };
  }
  return {
    ...base,
    primary: [f('key', t('field.pixKey'), card.key || t('placeholder.pixKey'))],
    secondary: present([f('name', t('field.name'), card.name)]),
    auxiliary: [],
    barcodes: [],
  };
}

/**
 * The example cards Home shows for a type with nothing saved: every field
 * filled, so people see what a set-up card looks like. ID numbers are all
 * zeros in their real formats, so no example pairs a name with what could be
 * someone's real document. The Pix example's QR holds the site's address,
 * not a Pix payment: scanning it can never send money to a real key.
 */
const EXAMPLE = {
  name: 'Maria da Silva',
  docs: { cpf: '00000000000', rg: '00.000.000-0', rnm: 'V000000-0', passport: 'AA000000' },
  pixKey: 'maria@exemplo.com',
  address: {
    cep: '01310100',
    line1: 'Av. Paulista, 1000',
    line2: 'Apto 12',
    district: 'Bela Vista',
    city: 'São Paulo',
    uf: 'SP',
  },
} as const;

export function sampleLayout(type: CardType, t: T): PassLayout {
  const base = newCard(type);
  if (base.type === 'docs') {
    return previewLayout({ ...base, ...EXAMPLE.docs, name: EXAMPLE.name }, t);
  }
  if (base.type === 'address') {
    return previewLayout({ ...base, ...EXAMPLE.address, reference: '' }, t);
  }
  const layout = previewLayout({ ...base, key: EXAMPLE.pixKey, name: EXAMPLE.name, city: EXAMPLE.address.city }, t);
  return {
    ...layout,
    barcodes: [{ format: 'PKBarcodeFormatQR', message: SITE_ORIGIN, altText: EXAMPLE.pixKey }],
  };
}
