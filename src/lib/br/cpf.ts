import { digitsOnly } from './digits';

export function normalizeCpf(s: string): string {
  return digitsOnly(s);
}

function check(d: string, len: number): number {
  let sum = 0;
  for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
  const r = (sum * 10) % 11;
  return r === 10 ? 0 : r;
}

export function isValidCpf(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  return check(d, 9) === Number(d[9]) && check(d, 10) === Number(d[10]);
}

export function formatCpf(d: string): string {
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
