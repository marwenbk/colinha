import { expect, test } from 'vitest';
import { formatBrMobile, normalizeBrMobile } from '../../../src/lib/br/phone';
import { UFS } from '../../../src/lib/br/uf';

test('mobile', () => {
  expect(normalizeBrMobile('(11) 91234-5684')).toBe('+5511912345684');
  expect(normalizeBrMobile('+55 11 91234-5684')).toBe('+5511912345684');
  expect(normalizeBrMobile('5511912345684')).toBe('+5511912345684');
  expect(normalizeBrMobile('1131234567')).toBeNull();
  expect(normalizeBrMobile('10912345684')).toBeNull();
  expect(normalizeBrMobile('20912345684')).toBeNull();
  expect(normalizeBrMobile('0912345684')).toBeNull();
  expect(formatBrMobile('+5511912345684')).toBe('(11) 91234-5684');
});
test('UFS', () => {
  expect(UFS).toHaveLength(27);
  expect(UFS).toContain('SP');
});
