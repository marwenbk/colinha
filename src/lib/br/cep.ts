import { digitsOnly } from './digits';

export function normalizeCep(s: string): string {
  return digitsOnly(s);
}
export function isValidCep(d: string): boolean {
  return /^\d{8}$/.test(d);
}
export function formatCep(d: string): string {
  return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}
