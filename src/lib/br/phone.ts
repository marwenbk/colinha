import { digitsOnly } from './digits';

export function normalizeBrMobile(s: string): string | null {
  let d = digitsOnly(s);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (!/^[1-9][1-9]9\d{8}$/.test(d)) return null;
  return `+55${d}`;
}

export function formatBrMobile(e164: string): string {
  return e164.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
}
