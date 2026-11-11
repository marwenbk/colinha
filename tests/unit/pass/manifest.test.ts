import { expect, it } from 'vitest';
import { buildManifest } from '../../../src/pass/manifest';
import { utf8 } from './fixtures';

it('maps each path to its SHA-1 hex', async () => {
  const m = await buildManifest({ a: utf8('abc') });
  expect(new TextDecoder().decode(m)).toBe('{"a":"a9993e364706816aba3e25717850c26c9cd0d89d"}');
});

it('lists every file', async () => {
  const m = JSON.parse(new TextDecoder().decode(await buildManifest({ a: utf8('abc'), 'b.png': utf8('') })));
  expect(m).toEqual({
    a: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    'b.png': 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
  });
});
