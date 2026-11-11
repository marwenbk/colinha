import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIELDS } from '../../../src/cards/templates';
import type { PassLayout } from '../../../src/cards/types';
import FieldRow from '../../../src/ui/FieldRow.svelte';
import PassCard from '../../../src/ui/PassCard.svelte';
import Segmented from '../../../src/ui/Segmented.svelte';
import SheetHarness from './SheetHarness.svelte';

afterEach(() => cleanup());

const cpfSpec = FIELDS.docs.find((f) => f.id === 'cpf')!;

describe('FieldRow', () => {
  it('formats the CPF as you type and reports the digits', async () => {
    const onchange = vi.fn();
    render(FieldRow, { spec: cpfSpec, value: '', invalid: false, onchange });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '529982' } });
    expect(input.value).toBe('529.982');
    expect(onchange).toHaveBeenLastCalledWith('529982');
  });

  it('shows a check for a valid CPF', () => {
    render(FieldRow, { spec: cpfSpec, value: '52998224725', invalid: false, onchange: () => {} });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('529.982.247-25');
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('shows no check for an invalid CPF and sets aria-invalid when invalid', () => {
    render(FieldRow, { spec: cpfSpec, value: '52998224700', invalid: true, onchange: () => {} });
    expect(screen.queryByText('✓')).toBeNull();
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Sheet', () => {
  it('closes on Esc and returns focus to the opener', async () => {
    render(SheetHarness);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await fireEvent.click(opener);
    flushSync();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    flushSync();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe('Segmented', () => {
  it('moves with the arrow keys', async () => {
    const onchange = vi.fn();
    const options = [
      { id: 'cpf', label: 'CPF' },
      { id: 'phone', label: 'Phone' },
    ];
    render(Segmented, { options, value: 'cpf', onchange });
    const first = screen.getByRole('radio', { name: 'CPF' });
    expect(first.getAttribute('aria-checked')).toBe('true');
    await fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('phone');
    await fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(onchange).toHaveBeenLastCalledWith('phone');
  });
});

describe('PassCard', () => {
  const layout: PassLayout = {
    description: 'Documents',
    logoText: 'Documents',
    primary: [{ key: 'cpf', label: 'CPF', value: '529.982.247-25' }],
    secondary: [{ key: 'name', label: 'Name', value: 'Ana Souza' }],
    auxiliary: [{ key: 'rnm', label: 'RNM', value: 'V123456-7' }],
    back: [],
    colors: { bg: 'rgb(28,28,30)', fg: 'rgb(255,255,255)', label: 'rgb(187,187,188)' },
    barcodes: [
      { format: 'PKBarcodeFormatCode128', message: '52998224725' },
      { format: 'PKBarcodeFormatQR', message: '52998224725' },
    ],
  };

  it('renders the primary value', () => {
    render(PassCard, { layout });
    expect(screen.getByText('529.982.247-25')).toBeTruthy();
    expect(screen.getByText('Ana Souza')).toBeTruthy();
  });

  it('renders the primary value in the compact strip', () => {
    render(PassCard, { layout, compact: true });
    expect(screen.getByText('529.982.247-25')).toBeTruthy();
    expect(screen.queryByText('Ana Souza')).toBeNull();
  });

  it('sets the pass colors through custom properties', () => {
    const { container } = render(PassCard, { layout });
    const card = container.querySelector('.pass') as HTMLElement;
    expect(card.style.getPropertyValue('--pass-bg')).toBe('rgb(28,28,30)');
  });
});

describe('no {@html} outside Qr.svelte', () => {
  it('only Qr.svelte uses {@html', () => {
    const root = join(__dirname, '../../../src');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(svelte|ts|js)$/.test(name) && readFileSync(p, 'utf8').includes('{@html')) {
          hits.push(relative(root, p));
        }
      }
    };
    walk(root);
    expect(hits).toEqual(['ui/Qr.svelte']);
  });
});
