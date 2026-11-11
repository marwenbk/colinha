// Colinha's card art: a software shader that paints one continuous gradient
// over the whole card, in saturated Brazilian colours, with folds lit like
// fabric and a warm light low on the card. Each card type has its own
// palette (CPF green and blue, Pix teal, Address royal blue); each card gets
// its own angle, light and folds from its id.
//
// The art is the pass's background image (Wallet's event ticket style), so
// the gradient covers the whole pass in Wallet too. Wallet draws the fields
// across the middle of the pass; there, contrast is done by tone mapping,
// not by dimming everything: each pixel's light is lowered in linear space,
// hue and saturation kept, until white text on it reaches 4.5:1. The top
// and bottom stay bright, and the warm light sits at the bottom.

/** Wallet's background image size for event tickets, in points. */
export const BG_W = 180;
export const BG_H = 220;

export type RGB = [number, number, number];

export type Tone = 'docs' | 'pix' | 'address';

interface Palette {
  /** The body of the art, from the bottom left to the top right. */
  stops: [number, RGB][];
  /** The warm light low on the card: its core, and its rim. */
  glow: RGB;
  rim: RGB;
}

export const PALETTES: Record<Tone, Palette> = {
  // CPF: royal blue into green, gold light.
  docs: {
    stops: [[0.0, [0, 39, 118]], [0.4, [0, 104, 128]], [0.72, [0, 156, 59]], [1.0, [52, 186, 64]]],
    glow: [255, 214, 0],
    rim: [150, 205, 20],
  },
  // Pix: deep teal into turquoise, a lemon light.
  pix: {
    stops: [[0.0, [0, 48, 92]], [0.4, [0, 112, 136]], [0.72, [0, 164, 148]], [1.0, [56, 200, 170]]],
    glow: [236, 232, 60],
    rim: [96, 214, 120],
  },
  // Address: indigo into royal blue and teal-green, an amber light.
  address: {
    stops: [[0.0, [28, 24, 110]], [0.4, [0, 62, 170]], [0.72, [0, 128, 120]], [1.0, [40, 170, 96]]],
    glow: [255, 178, 20],
    rim: [214, 196, 40],
  },
};

/** Highest relative luminance under white text: (1.05 / 4.5) - 0.05, with margin. */
export const TEXT_MAX_L = 0.17;

function ramp(stops: [number, RGB][], t: number): RGB {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    if (t <= t1) {
      const [t0, c0] = stops[i - 1];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

const mix = (a: readonly number[], b: readonly number[], k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const toLinear = (c: number) => {
  const s = Math.min(255, Math.max(0, c)) / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) =>
  255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055);

/**
 * Lowers a colour's relative luminance to at most `maxL`, scaling it in
 * linear light so its hue and saturation stay the same.
 */
export function fitLuminance(c: readonly number[], maxL: number): RGB {
  const lin = [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])];
  const l = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  if (l <= maxL) return [c[0], c[1], c[2]];
  const k = maxL / l;
  return [toSrgb(lin[0] * k), toSrgb(lin[1] * k), toSrgb(lin[2] * k)];
}

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Two octaves of value noise, centered on 0. */
const fbm = (x: number, y: number, seed: number) =>
  noise(x, y, seed) * 0.67 + noise(x * 2.1, y * 2.1, seed + 7) * 0.33 - 0.5;

/** A stable per-card seed from its 32-hex id. */
export function seedOf(id: string): number {
  return parseInt(id.slice(0, 8), 16) >>> 0 || 1;
}

/** Per-card choices, all from the seed. */
function params(seed: number) {
  const r = (k: number) => hash(seed, k, 99);
  const angle = (-0.3 - r(1) * 0.6) * Math.PI * 0.5; // the flow leans up to the right
  return {
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    glowX: 0.55 + r(2) * 0.5, // the warm light, low on the card, toward the right
    glowR: 0.42 + r(3) * 0.18,
    freq: 1.2 + r(4) * 1.0,
    phase: r(5) * 6.283,
  };
}

const memo = new Map<number, ReturnType<typeof params>>();
const paramsOf = (seed: number) => {
  let p = memo.get(seed);
  if (!p) memo.set(seed, (p = params(seed)));
  return p;
};

/**
 * How much of white text's contrast this point must guarantee (0..1): the
 * band across the card where Wallet draws the primary, secondary and
 * auxiliary fields, under the header row and above the barcode.
 */
export function textWeight(_u: number, v: number): number {
  return smooth(0.0, 0.18, v) * (1 - smooth(0.62, 0.88, v));
}

/**
 * The colour at (u, v) of the card art, both in 0..1 with v = 0 at the top.
 * Pure, so the canvas, the PNG and the tests all see the same pixels.
 */
export function shade(u: number, v: number, seed: number, tone: Tone = 'docs'): RGB {
  const p = paramsOf(seed);
  const pal = PALETTES[tone];
  const aspect = BG_H / BG_W;
  const x = u, y = v * aspect;

  const warp = fbm(x * 1.2 + p.phase, y * 1.2, seed);
  // Position along the flow: blue at the bottom left, green toward the top right.
  const along = (x * p.dx + (aspect - y) * -p.dy) / (p.dx + aspect * -p.dy);
  let c = ramp(pal.stops, 0.08 + along * 0.95 + warp * 0.3);

  // The warm light: an ellipse low on the card, bent by the warp.
  const gx = (x - p.glowX + warp * 0.2) / (p.glowR * 1.3);
  const gy = (y - aspect * 1.02) / p.glowR;
  const g = Math.exp(-(gx * gx + gy * gy)) * (0.95 + warp * 0.3);
  c = mix(c, mix(pal.rim, pal.glow, smooth(0.3, 0.85, g)), smooth(0.02, 0.8, g));

  // Folds: a height field across the flow; its slope sets the light, its
  // crests catch a sheen.
  const fold = (x * -p.dy + y * p.dx) * p.freq * Math.PI + warp * 4 + p.phase;
  const crest = Math.pow(Math.max(0, Math.sin(fold)), 10);
  const light = 0.8 + 0.2 * Math.cos(fold) + 0.3 * crest;
  c = [c[0] * light, c[1] * light, c[2] * light];

  // Contrast, in two soft steps so no edge shows: first a gentle shade over
  // the text band (light falls off toward the middle of the card), then a
  // tone map that caps what is still too bright there.
  const w = textWeight(u, v);
  const shadeK = 1 - 0.35 * w;
  c = [c[0] * shadeK, c[1] * shadeK, c[2] * shadeK];
  c = fitLuminance(c, TEXT_MAX_L + (1 - w) * (1 - w) * (1 - TEXT_MAX_L));

  // A light vignette for depth.
  const edge = Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v) * aspect);
  const vig = 0.9 + 0.1 * smooth(0, 0.16, edge);

  return [
    Math.round(Math.min(255, c[0] * vig)),
    Math.round(Math.min(255, c[1] * vig)),
    Math.round(Math.min(255, c[2] * vig)),
  ];
}

/** RGBA pixels of the card art at w x h. */
export function renderArt(w: number, h: number, seed: number, tone: Tone = 'docs'): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) {
    const v = (j + 0.5) / h;
    for (let i = 0; i < w; i++) {
      const [r, g, b] = shade((i + 0.5) / w, v, seed, tone);
      const o = (j * w + i) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
  }
  return out;
}

/**
 * The pass colour Wallet falls back to behind the background image: the
 * palette's middle colour, its light lowered (hue and saturation kept) to
 * what text needs.
 */
export function bodyRgb(tone: Tone): RGB {
  const stops = PALETTES[tone].stops;
  const mid = mix(stops[1][1], stops[2][1], 0.55);
  return fitLuminance(mid, TEXT_MAX_L).map(Math.round) as RGB;
}
