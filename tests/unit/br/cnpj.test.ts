import { expect, test } from 'vitest';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '../../../src/lib/br/cnpj';

test('cnpj valid', () => {
  expect(isValidCnpj('11222333000181')).toBe(true);
  expect(isValidCnpj('12ABC34501DE35')).toBe(true);
  expect(isValidCnpj('12ABC34501DE36')).toBe(false);
  expect(isValidCnpj('11111111111111')).toBe(false);
  expect(isValidCnpj('12ABC34501DEAB')).toBe(false);
  expect(isValidCnpj('1122233300018')).toBe(false);
});
test('cnpj normalize/format', () => {
  expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  expect(formatCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
});
