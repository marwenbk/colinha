// Pass colours. The background image covers the pass; backgroundColor is
// Wallet's fallback behind it: each card type's own vivid colour, as dark as
// the text band of the art (see bodyRgb in src/pass/art.ts). Labels are
// light enough to read on any part of that band.
import { bodyRgb, type Tone } from '../pass/art';

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

/** White mixed into the background, from 70% up in 5% steps, until contrast >= 4.5. */
function labelFor(bg: readonly number[]): number[] {
  let p = 70;
  for (;;) {
    const mix = bg.map((c) => Math.round((255 * p + c * (100 - p)) / 100));
    if (contrast(mix, bg) >= 4.5 || p >= 100) return mix;
    p += 5;
  }
}

export function passColors(tone: Tone = 'docs'): { bg: string; fg: string; label: string } {
  const bg = bodyRgb(tone);
  return { bg: rgb(bg), fg: 'rgb(255,255,255)', label: rgb(labelFor(bg)) };
}
