// The pass background images for one card: its art at 1x, 2x and 3x
// (Wallet's event ticket background is 180x220 points).
import { BG_H, BG_W, renderArt, type Tone } from './art';
import { encodePng } from './png';

export function backgroundImages(seed: number, tone: Tone = 'docs'): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {};
  for (const [name, k] of [['background.png', 1], ['background@2x.png', 2], ['background@3x.png', 3]] as const) {
    const w = BG_W * k, h = BG_H * k;
    out[name] = encodePng(w, h, renderArt(w, h, seed, tone));
  }
  return out;
}
