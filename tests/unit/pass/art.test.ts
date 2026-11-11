import { unzlibSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { contrast } from '../../../src/cards/palette';
import { PALETTES, renderArt, seedOf, shade, type Tone } from '../../../src/pass/art';
import { encodePng } from '../../../src/pass/png';
import { backgroundImages } from '../../../src/pass/background';

const WHITE = [255, 255, 255];

describe('card art', () => {
  const TONES = Object.keys(PALETTES) as Tone[];

  it('keeps white text readable across the band where Wallet draws the fields', () => {
    for (const tone of TONES)
      for (let n = 0; n < 40; n++) {
        const seed = n * 7919 + 1;
        for (let i = 0; i <= 20; i++)
          for (let j = 0; j <= 10; j++) {
            const c = shade(i / 20, 0.18 + (j / 10) * 0.44, seed, tone);
            expect(contrast(c, WHITE)).toBeGreaterThanOrEqual(4.5);
          }
      }
  });

  it('gives each card type its own palette', () => {
    const at = (tone: Tone) => shade(0.5, 0.2, 7, tone);
    expect(at('pix')).not.toEqual(at('docs'));
    expect(at('address')).not.toEqual(at('docs'));
  });

  it('is the same for a seed and differs between seeds', () => {
    const a = renderArt(40, 16, 123);
    expect(Array.from(renderArt(40, 16, 123))).toEqual(Array.from(a));
    expect(Array.from(renderArt(40, 16, 456))).not.toEqual(Array.from(a));
  });

  it('glows warm along the bottom of the card', () => {
    for (const seed of [1, 42, seedOf('ab'.repeat(16))]) {
      const warm = Array.from({ length: 40 }, (_, i) => shade(i / 40, 0.95, seed));
      expect(warm.some(([r, g, b]) => r > b + 90 && g > b + 90)).toBe(true);
    }
  });

  it('seeds from the card id', () => {
    expect(seedOf('0000002a' + '0'.repeat(24))).toBe(42);
    expect(seedOf('0'.repeat(32))).toBe(1);
  });
});

describe('encodePng', () => {
  it('writes a valid RGBA PNG', () => {
    const rgba = renderArt(5, 3, 9);
    const png = encodePng(5, 3, rgba);
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer, png.byteOffset);
    expect(new TextDecoder().decode(png.slice(12, 16))).toBe('IHDR');
    expect([view.getUint32(16), view.getUint32(20), png[24], png[25]]).toEqual([5, 3, 8, 6]);
    // IDAT follows IHDR (8 sig + 25 IHDR chunk).
    const len = view.getUint32(33);
    expect(new TextDecoder().decode(png.slice(37, 41))).toBe('IDAT');
    const raw = unzlibSync(png.slice(41, 41 + len));
    expect(raw.length).toBe((5 * 4 + 1) * 3);
    expect(Array.from(raw.slice(1, 21))).toEqual(Array.from(rgba.slice(0, 20)));
  });
});

describe('backgroundImages', () => {
  it('makes background.png at 1x, 2x and 3x', () => {
    const imgs = backgroundImages(5);
    expect(Object.keys(imgs).sort()).toEqual([
      'background.png',
      'background@2x.png',
      'background@3x.png',
    ]);
    const size = (p: Uint8Array) => {
      const v = new DataView(p.buffer, p.byteOffset);
      return [v.getUint32(16), v.getUint32(20)];
    };
    expect(size(imgs['background@3x.png'])).toEqual([540, 660]);
  });
});
