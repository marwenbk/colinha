import type { ColorId } from './types';

const BG: Record<ColorId, [number, number, number]> = {
  graphite: [28, 28, 30],
  blue: [0, 64, 221],
  green: [30, 120, 52],
  teal: [0, 118, 140],
  purple: [137, 68, 171],
  orange: [201, 52, 0],
};

export function luminance([r, g, b]: readonly number[]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: readonly number[], b: readonly number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

function labelFor(bg: readonly number[]): number[] {
  let p = 70;
  for (;;) {
    const mix = bg.map((c) => Math.round((255 * p + c * (100 - p)) / 100));
    if (contrast(mix, bg) >= 4.5 || p >= 100) return mix;
    p += 5;
  }
}

export const PALETTE = Object.fromEntries(
  (Object.keys(BG) as ColorId[]).map((id) => [id, { bg: rgb(BG[id]), label: rgb(labelFor(BG[id])) }]),
) as Record<ColorId, { bg: string; label: string }>;
