import { expect, test } from 'vitest';
import { crc16 } from '../../../src/lib/pix/crc16';
import { detectPixKey } from '../../../src/lib/pix/key';
import { buildPixPayload } from '../../../src/lib/pix/brcode';

test('crc16 reference', () => {
  expect(crc16('123456789')).toBe('29B1');
});

test('detectPixKey', () => {
  expect(detectPixKey('Ana@Exemplo.com ')).toEqual([{ type: 'email', value: 'ana@exemplo.com' }]);
  expect(detectPixKey('119.123.456-84')).toEqual([{ type: 'cpf', value: '11912345684' }]);
  expect(detectPixKey('(11) 91234-5684')).toEqual([{ type: 'phone', value: '+5511912345684' }]);
  expect(detectPixKey('11 91234-5684')).toEqual([{ type: 'phone', value: '+5511912345684' }]);
  expect(detectPixKey('+55 11 91234-5684')).toEqual([{ type: 'phone', value: '+5511912345684' }]);
  expect(detectPixKey('11912345684')).toEqual([
    { type: 'cpf', value: '11912345684' },
    { type: 'phone', value: '+5511912345684' },
  ]);
  expect(detectPixKey('123E4567-e89b-12d3-a456-426614174000')).toEqual([
    { type: 'evp', value: '123e4567-e89b-12d3-a456-426614174000' },
  ]);
  expect(detectPixKey('11.222.333/0001-81')).toEqual([{ type: 'cnpj', value: '11222333000181' }]);
  expect(detectPixKey('abc')).toEqual([]);
  expect(detectPixKey('')).toEqual([]);
  expect(detectPixKey('a@b')).toEqual([]);
});

test('buildPixPayload', () => {
  const p = buildPixPayload({ key: 'ana@exemplo.com', name: 'Ana Souza', city: 'São Paulo' });
  expect(p.startsWith('000201')).toBe(true);
  expect(p).toContain('26370014br.gov.bcb.pix0115ana@exemplo.com');
  expect(p).toContain('5909Ana Souza');
  expect(p).toContain('6009Sao Paulo');
  expect(p).toContain('62070503***');
  expect(p).toBe(
    '00020126370014br.gov.bcb.pix0115ana@exemplo.com5204000053039865802BR5909Ana Souza6009Sao Paulo62070503***6304D54E',
  );
  expect(p.endsWith('6304' + crc16(p.slice(0, -4)))).toBe(true);
});

test('buildPixPayload key length limit', () => {
  const k77 = 'a'.repeat(65) + '@exemplo.com';
  expect(k77.length).toBe(77);
  expect(buildPixPayload({ key: k77, name: 'A', city: 'B' }).slice(6, 10)).toBe('2699');
  expect(() => buildPixPayload({ key: 'a' + k77, name: 'A', city: 'B' })).toThrow();
});
