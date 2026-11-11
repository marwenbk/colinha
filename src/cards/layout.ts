import type { T } from '../i18n';
import { formatCep } from '../lib/br/cep';
import { formatCnpj } from '../lib/br/cnpj';
import { formatCpf } from '../lib/br/cpf';
import { formatBrMobile } from '../lib/br/phone';
import { buildPixPayload } from '../lib/pix/brcode';
import type { PixKeyType } from '../lib/pix/key';
import { PALETTE } from './palette';
import { firstInvalid } from './templates';
import type { AddressCard, Card, DocsCard, PassField, PassLayout, PixCard } from './types';

export const f = (key: string, label: string, value: string): PassField => ({ key, label, value });
const back = (key: string, label: string, value: string): PassField => ({
  key: `back_${key}`, label, value, detect: false,
});
export const present = (fields: PassField[]) => fields.filter((x) => x.value !== '');

function formatPixKey(type: PixKeyType, v: string): string {
  switch (type) {
    case 'cpf': return formatCpf(v);
    case 'cnpj': return formatCnpj(v);
    case 'phone': return formatBrMobile(v);
    default: return v;
  }
}

function addressBlock(c: AddressCard): string {
  const street = [c.line1, c.line2].filter(Boolean).join(', ');
  const cityUf = [c.city, c.uf].filter(Boolean).join(' - ');
  const second = [c.district, cityUf].filter(Boolean).join(', ');
  return [street, second, formatCep(c.cep)].filter(Boolean).join('\n');
}

function docs(c: DocsCard, t: T) {
  const cpf = formatCpf(c.cpf);
  return {
    primary: [f('cpf', t('field.cpf'), cpf)],
    secondary: [f('name', t('field.name'), c.name)],
    auxiliary: present([
      f('rg', t('field.rg'), c.rg),
      f('rnm', t('field.rnm'), c.rnm),
      f('passport', t('field.passport'), c.passport),
    ]),
    back: present([
      back('cpf', t('field.cpf'), cpf),
      back('name', t('field.name'), c.name),
      back('rg', t('field.rg'), c.rg),
      back('rnm', t('field.rnm'), c.rnm),
      back('passport', t('field.passport'), c.passport),
    ]),
    barcodes: c.barcode
      ? [
          { format: 'PKBarcodeFormatCode128' as const, message: c.cpf },
          { format: 'PKBarcodeFormatQR' as const, message: c.cpf },
        ]
      : [],
  };
}

function address(c: AddressCard, t: T) {
  return {
    primary: [f('cep', t('field.cep'), formatCep(c.cep))],
    secondary: [f('line1', t('field.line1'), c.line1)],
    auxiliary: present([
      f('line2', t('field.line2'), c.line2),
      f('district', t('field.district'), c.district),
      f('cityUf', t('field.city'), `${c.city} - ${c.uf}`),
    ]),
    back: present([
      back('address', t('card.address'), addressBlock(c)),
      back('reference', t('field.reference'), c.reference),
    ]),
    barcodes: [],
  };
}

function pix(c: PixCard, t: T) {
  const payload = buildPixPayload({ key: c.key, name: c.name, city: c.city });
  return {
    primary: [f('key', t('field.pixKey'), formatPixKey(c.keyType!, c.key))],
    secondary: [f('name', t('field.name'), c.name)],
    auxiliary: [],
    back: present([
      back('key', t('field.pixKey'), formatPixKey(c.keyType!, c.key)),
      back('name', t('field.name'), c.name),
      back('city', t('field.city'), c.city),
      back('copyPaste', t('pass.copyPaste'), payload),
    ]),
    barcodes: [{ format: 'PKBarcodeFormatQR' as const, message: payload }],
  };
}

export const colorsOf = (card: Card) => {
  const p = PALETTE[card.color];
  return { bg: p.bg, fg: 'rgb(255,255,255)', label: p.label };
};

/** Assumes firstInvalid(card) === null; throws otherwise. */
export function toLayout(card: Card, t: T, editUrl: string): PassLayout {
  const bad = firstInvalid(card);
  if (bad !== null) throw new Error(`Invalid card: ${bad}`);
  const body =
    card.type === 'docs' ? docs(card, t) : card.type === 'address' ? address(card, t) : pix(card, t);
  const name = t(`card.${card.type}`);
  return {
    description: name,
    logoText: name,
    ...body,
    back: [
      ...body.back,
      { key: 'edit', label: '', value: '', link: { href: editUrl, text: t('pass.edit') } },
      { key: 'disclaimer', label: '', value: t('pass.disclaimer'), detect: false as const },
    ],
    colors: colorsOf(card),
  };
}
