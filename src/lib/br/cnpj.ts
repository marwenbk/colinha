const W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCnpj(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function check(v: string, w: number[]): number {
  let sum = 0;
  for (let i = 0; i < w.length; i++) sum += (v.charCodeAt(i) - 48) * w[i];
  const r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}

export function isValidCnpj(v: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(v) || /^(.)\1{13}$/.test(v)) return false;
  return check(v, W1) === Number(v[12]) && check(v, W2) === Number(v[13]);
}

export function formatCnpj(v: string): string {
  return v.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
}
