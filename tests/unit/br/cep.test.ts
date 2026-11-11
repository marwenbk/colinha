import { expect, test } from 'vitest';
import { formatCep, isValidCep, normalizeCep } from '../../../src/lib/br/cep';

test('cep', () => {
  expect(formatCep('01310100')).toBe('01310-100');
  expect(isValidCep('0131010')).toBe(false);
  expect(isValidCep('01310100')).toBe(true);
  expect(normalizeCep('01310-100')).toBe('01310100');
});
