import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../../../src/cards/types';

// jsdom has no ResizeObserver (Svelte's bind:offsetHeight uses it).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// The build stays pending until the test resolves it.
let resolveBuild: (b: Blob) => void = () => {};
vi.mock('../../../src/pass/pkpass', () => ({
  buildPkpass: vi.fn(() => new Promise<Blob>((r) => (resolveBuild = r))),
}));
const deliverPass = vi.fn(async (_blob: Blob) => {});
vi.mock('../../../src/pass/deliver', () => ({
  deliverPass: (b: Blob) => deliverPass(b),
  clearPassCache: async () => {},
}));

import Editor from '../../../src/screens/Editor.svelte';
import { cards } from '../../../src/state/cards.svelte';

const card: Card = {
  v: 1, id: 'a'.repeat(32), type: 'docs', color: 'graphite', updatedAt: 1,
  cpf: '52998224725', name: 'Ana Souza', rg: '', rnm: '', passport: '', barcode: true,
};
const env = { platform: 'ios' as const, inApp: null };
const badge = () => screen.getByRole('button', { name: 'Add to Apple Wallet' });
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  cards.clear();
  deliverPass.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Editor lifecycle', () => {
  it('a build that finishes after the Editor is gone saves, delivers and closes nothing', async () => {
    const onclose = vi.fn();
    const { unmount } = render(Editor, { card, env, open: true, onclose });
    await fireEvent.click(badge());
    unmount();
    resolveBuild(new Blob(['x']));
    await settle();
    vi.advanceTimersByTime(10_000);
    await settle();
    expect(cards.list).toEqual([]);
    expect(deliverPass).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  });

  it('a build that finishes after the sheet was closed does nothing', async () => {
    const onclose = vi.fn();
    const r = render(Editor, { card, env, open: true, onclose });
    await fireEvent.click(badge());
    await r.rerender({ card, env, open: false, onclose });
    resolveBuild(new Blob(['x']));
    await settle();
    vi.advanceTimersByTime(10_000);
    expect(cards.list).toEqual([]);
    expect(deliverPass).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  });

  it('hides Delete while adding', async () => {
    cards.save(card);
    render(Editor, { card, env, open: true, onclose: () => {} });
    flushSync();
    expect(screen.getByRole('button', { name: 'Delete card' })).toBeTruthy();
    await fireEvent.click(badge());
    flushSync();
    expect(screen.queryByRole('button', { name: 'Delete card' })).toBeNull();
  });

  it('leaves no portaled sheet behind when unmounted while open', () => {
    const { unmount } = render(Editor, { card, env, open: true, onclose: () => {} });
    flushSync();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    unmount();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });

  it('keeps focused rows clear of the Add bar (scroll-padding-bottom on the scroller)', () => {
    render(Editor, { card, env, open: true, onclose: () => {} });
    flushSync();
    const scroller = document.querySelector<HTMLElement>('.editor')!.parentElement!;
    expect(scroller.style.getPropertyValue('scroll-padding-bottom')).toMatch(/^\d+px$/);
  });

  it('closes after a normal delivery', async () => {
    const onclose = vi.fn();
    render(Editor, { card, env, open: true, onclose });
    await fireEvent.click(badge());
    resolveBuild(new Blob(['x']));
    await settle();
    expect(deliverPass).toHaveBeenCalledTimes(1);
    expect(cards.list).toHaveLength(1);
    vi.advanceTimersByTime(3_500);
    expect(onclose).toHaveBeenCalledTimes(1);
  });
});
