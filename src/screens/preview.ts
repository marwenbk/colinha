// The front of a pass as the Editor and Home show it, for complete and partial cards.
import { colorsOf, f, present, toLayout } from '../cards/layout';
import { FIELDS, firstInvalid } from '../cards/templates';
import type { Card, PassLayout } from '../cards/types';
import type { T } from '../i18n';
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
  const name = t(`card.${card.type}`);
  const base = {
    description: name,
    logoText: name,
    back: [],
    colors: colorsOf(card),
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
      barcodes: card.barcode ? [{ format: 'PKBarcodeFormatCode128', message: card.cpf }] : [],
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
