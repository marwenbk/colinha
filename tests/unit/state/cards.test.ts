import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../../../src/cards/types';

const KEY = 'colinha.cards.v1';
const mk = (id: string, name = 'Ana'): Card => ({
  v: 1, id, type: 'pix', color: 'teal', updatedAt: 1, key: 'a@b.com', keyType: 'email', name, city: 'Rio',
});
const fresh = async () => {
  vi.resetModules();
  return (await import('../../../src/state/cards.svelte')).cards;
};
const id1 = '1'.repeat(32);
const id2 = '2'.repeat(32);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('cards store', () => {
  it('saves (upsert), removes, and survives reload', async () => {
    let cards = await fresh();
    cards.save(mk(id1));
    cards.save(mk(id2));
    cards.save(mk(id1, 'Bia'));
    expect(cards.list).toHaveLength(2);
    expect(cards.list.find((c) => c.id === id1)).toMatchObject({ name: 'Bia' });
    cards = await fresh();
    expect(cards.list).toHaveLength(2);
    cards.remove(id1);
    expect(cards.list.map((c) => c.id)).toEqual([id2]);
  });
  it('clear empties', async () => {
    const cards = await fresh();
    cards.save(mk(id1));
    cards.clear();
    expect(cards.list).toEqual([]);
    expect((await fresh()).list).toEqual([]);
  });
  it('drops invalid entries and corrupt data', async () => {
    localStorage.setItem(KEY, JSON.stringify([mk(id1), { v: 1, id: 'bad' }]));
    expect((await fresh()).list).toHaveLength(1);
    localStorage.setItem(KEY, '{not json');
    expect((await fresh()).list).toEqual([]);
    localStorage.setItem(KEY, '{"a":1}');
    expect((await fresh()).list).toEqual([]);
  });
  it('works in memory when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
    const cards = await fresh();
    expect(cards.list).toEqual([]);
    cards.save(mk(id1));
    expect(cards.list).toHaveLength(1);
  });
});
