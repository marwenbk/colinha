import { FIELDS } from '../cards/templates';
import type { Card, CardType } from '../cards/types';

const TYPES: CardType[] = ['docs', 'address', 'pix'];
const KEY_TYPES = ['cpf', 'cnpj', 'phone', 'email', 'evp'];
const BASE_KEYS = ['v', 'id', 'type', 'updatedAt'];
const EXTRA_KEYS: Record<CardType, string[]> = {
  docs: ['barcode'],
  address: [],
  pix: ['keyType'],
};
const MAX_HASH = 4096;

export function parseCard(x: unknown): Card | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  // Cards saved before colors were removed carry a `color` key; drop it.
  const { color: _legacy, ...o } = x as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.id !== 'string' || !/^[0-9a-f]{32}$/.test(o.id)) return null;
  if (typeof o.type !== 'string' || !TYPES.includes(o.type as CardType)) return null;
  const type = o.type as CardType;
  if (typeof o.updatedAt !== 'number' || !Number.isFinite(o.updatedAt)) return null;

  const specs = FIELDS[type];
  const expected = [...BASE_KEYS, ...EXTRA_KEYS[type], ...specs.map((f) => f.id)];
  const keys = Object.keys(o);
  if (keys.length !== expected.length || !keys.every((k) => expected.includes(k))) return null;

  for (const f of specs) {
    const val = o[f.id];
    if (typeof val !== 'string' || val.length > f.maxLength) return null;
  }
  if (type === 'docs' && typeof o.barcode !== 'boolean') return null;
  if (type === 'pix' && o.keyType !== null && !KEY_TYPES.includes(o.keyType as string)) return null;
  return o as unknown as Card;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(s)) throw new Error('bad base64url');
  const b64 = s.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function encodeEditLink(card: Card, origin: string): string {
  return `${origin}/#c=${toBase64Url(JSON.stringify(card))}`;
}

export function decodeEditLink(hash: string): Card | null {
  if (!hash.startsWith('#c=') || hash.length > MAX_HASH) return null;
  try {
    return parseCard(JSON.parse(fromBase64Url(hash.slice(3))));
  } catch {
    return null;
  }
}
