import { expect, test } from 'vitest';
import { toPixText } from '../../src/lib/text/ascii';

test('toPixText', () => {
  expect(toPixText('José Antônio da Conceição Júnior', 25)).toBe('Jose Antonio da Conceicao');
  expect(toPixText('São Paulo', 15)).toBe('Sao Paulo');
  expect(toPixText('a  b!@#  c', 10)).toBe('a b c');
});
