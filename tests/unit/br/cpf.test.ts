import { expect, test } from 'vitest';
import { digitsOnly } from '../../../src/lib/br/digits';
import { formatCpf, isValidCpf, normalizeCpf } from '../../../src/lib/br/cpf';

test('digitsOnly', () => expect(digitsOnly('a1-2.3')).toBe('123'));
test('cpf valid', () => {
  expect(isValidCpf('52998224725')).toBe(true);
  expect(isValidCpf('52998224724')).toBe(false);
  expect(isValidCpf('11111111111')).toBe(false);
  expect(isValidCpf('5299822472')).toBe(false);
  expect(isValidCpf('529.982.247-25')).toBe(false);
});
test('cpf normalize/format', () => {
  expect(normalizeCpf(' 529.982.247-25 ')).toBe('52998224725');
  expect(formatCpf('52998224725')).toBe('529.982.247-25');
});
