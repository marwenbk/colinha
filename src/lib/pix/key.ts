import { isValidCnpj, normalizeCnpj } from '../br/cnpj';
import { isValidCpf, normalizeCpf } from '../br/cpf';
import { digitsOnly } from '../br/digits';
import { normalizeBrMobile } from '../br/phone';

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'evp';
export type PixKeyCandidate = { type: PixKeyType; value: string };

const EMAIL = /^[!-?A-~]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_MASK = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

function phoneOnly(s: string): PixKeyCandidate[] {
  const v = normalizeBrMobile(s);
  return v ? [{ type: 'phone', value: v }] : [];
}

export function detectPixKey(input: string): PixKeyCandidate[] {
  const s = input.trim();
  if (!s) return [];
  if (s.includes('@')) return EMAIL.test(s) ? [{ type: 'email', value: s.toLowerCase() }] : [];
  if (UUID.test(s)) return [{ type: 'evp', value: s.toLowerCase() }];

  const digits = digitsOnly(s);
  if (/[+()]/.test(s) || ((digits.length === 12 || digits.length === 13) && digits.startsWith('55'))) {
    return phoneOnly(s);
  }
  if (CPF_MASK.test(s)) {
    const cpf = normalizeCpf(s);
    return isValidCpf(cpf) ? [{ type: 'cpf', value: cpf }] : [];
  }
  if (/^[0-9A-Za-z./\- ]+$/.test(s)) {
    const cnpj = normalizeCnpj(s);
    if (cnpj.length === 14 && isValidCnpj(cnpj)) return [{ type: 'cnpj', value: cnpj }];
  }
  if (/^\d{11}$/.test(s)) {
    const out: PixKeyCandidate[] = [];
    if (isValidCpf(s)) out.push({ type: 'cpf', value: s });
    out.push(...phoneOnly(s));
    return out;
  }
  if (/^[\d\s-]+$/.test(s)) return phoneOnly(s);
  return [];
}
