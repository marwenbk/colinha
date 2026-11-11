import type { Card } from '../cards/types';
import { parseCard } from './edit-link';

const KEY = 'colinha.cards.v1';

function load(): Card[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map(parseCard).filter((c): c is Card => c !== null);
  } catch {
    return [];
  }
}

let items = $state<Card[]>(load());

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable: keep working in memory
  }
}

export const cards = {
  get list(): Card[] {
    return items;
  },
  save(c: Card): void {
    const i = items.findIndex((x) => x.id === c.id);
    items = i === -1 ? [...items, c] : items.map((x, j) => (j === i ? c : x));
    persist();
  },
  remove(id: string): void {
    items = items.filter((c) => c.id !== id);
    persist();
  },
  clear(): void {
    items = [];
    persist();
  },
};
