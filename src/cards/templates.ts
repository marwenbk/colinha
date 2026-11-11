import { normalizeCep, isValidCep, formatCep } from '../lib/br/cep';
import { normalizeCpf, isValidCpf, formatCpf } from '../lib/br/cpf';
import { UFS } from '../lib/br/uf';
import { detectPixKey } from '../lib/pix/key';
import { toPixText } from '../lib/text/ascii';
import { newSerial } from '../lib/random';
import type { AddressCard, Card, CardType, DocsCard, FieldSpec, PixCard } from './types';

const nonEmpty = (v: string) => v.trim() !== '';
const text = (max: number) => (s: string) => s.trim().slice(0, max);
const upper = (max: number, re: RegExp) => (s: string) =>
  s.toUpperCase().replace(re, '').slice(0, max);

export const FIELDS: Record<CardType, FieldSpec[]> = {
  docs: [
    { id: 'cpf', label: 'field.cpf', required: true, maxLength: 11, inputmode: 'numeric',
      normalize: (s) => normalizeCpf(s).slice(0, 11), mask: '000.000.000-00', valid: isValidCpf, format: formatCpf },
    { id: 'name', label: 'field.name', required: true, maxLength: 40, autocomplete: 'name',
      normalize: text(40), valid: nonEmpty },
    { id: 'rg', label: 'field.rg', required: false, maxLength: 20, uppercase: true,
      normalize: (s) => s.toUpperCase().trim().slice(0, 20) },
    { id: 'rnm', label: 'field.rnm', required: false, maxLength: 12, uppercase: true,
      normalize: upper(12, /[^A-Z0-9-]/g) },
    { id: 'passport', label: 'field.passport', required: false, maxLength: 12, uppercase: true,
      normalize: upper(12, /[^A-Z0-9]/g) },
  ],
  address: [
    { id: 'cep', label: 'field.cep', required: true, maxLength: 8, inputmode: 'numeric',
      autocomplete: 'postal-code', normalize: (s) => normalizeCep(s).slice(0, 8),
      mask: '00000-000', valid: isValidCep, format: formatCep },
    { id: 'line1', label: 'field.line1', required: true, maxLength: 60,
      autocomplete: 'address-line1', normalize: text(60), valid: nonEmpty },
    { id: 'line2', label: 'field.line2', required: false, maxLength: 30,
      autocomplete: 'address-line2', normalize: text(30) },
    { id: 'district', label: 'field.district', required: false, maxLength: 30,
      autocomplete: 'address-level3', normalize: text(30) },
    { id: 'city', label: 'field.city', required: true, maxLength: 30,
      autocomplete: 'address-level2', normalize: text(30), valid: nonEmpty },
    { id: 'uf', label: 'field.uf', required: true, maxLength: 2, autocomplete: 'address-level1',
      normalize: (s) => s.toUpperCase().slice(0, 2),
      valid: (v) => (UFS as readonly string[]).includes(v) },
    { id: 'reference', label: 'field.reference', required: false, maxLength: 60,
      normalize: text(60) },
  ],
  pix: [
    { id: 'key', label: 'field.pixKey', required: true, maxLength: 77, normalize: (s) => s.trim(),
      valid: (v) => detectPixKey(v).length > 0 },
    { id: 'name', label: 'field.name', required: true, maxLength: 40, autocomplete: 'name',
      normalize: text(40), valid: (v) => toPixText(v, 25) !== '' },
    { id: 'city', label: 'field.city', required: true, maxLength: 30,
      autocomplete: 'address-level2', normalize: text(30), valid: (v) => toPixText(v, 15) !== '' },
  ],
};

export function pixKeyOk(c: PixCard): boolean {
  return (
    c.keyType !== null &&
    detectPixKey(c.key).some((k) => k.type === c.keyType && k.value === c.key)
  );
}

export function firstInvalid(card: Card): string | null {
  const rec = card as unknown as Record<string, string>;
  for (const f of FIELDS[card.type]) {
    if (!f.required) continue;
    if (card.type === 'pix' && f.id === 'key') {
      if (!pixKeyOk(card)) return 'key';
      continue;
    }
    const v = rec[f.id] ?? '';
    if (v === '' || (f.valid && !f.valid(v))) return f.id;
  }
  return null;
}

export function newCard(type: CardType, prefill?: { name?: string; city?: string }): Card {
  const base = { v: 1 as const, id: newSerial(), updatedAt: Date.now() };
  if (type === 'docs') {
    const c: DocsCard = { ...base, type, color: 'graphite', cpf: '', name: '', rg: '', rnm: '',
      passport: '', barcode: true };
    return c;
  }
  if (type === 'address') {
    const c: AddressCard = { ...base, type, color: 'blue', cep: '', line1: '', line2: '',
      district: '', city: '', uf: '', reference: '' };
    return c;
  }
  const c: PixCard = { ...base, type, color: 'teal', key: '', keyType: null,
    name: prefill?.name ?? '', city: prefill?.city ?? '' };
  return c;
}
