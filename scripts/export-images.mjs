// Rasterizes brand/*.svg into the pass images, the touch icon and the OG images.
// Usage: node scripts/export-images.mjs   (then commit the PNGs)
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p);
const logo = read('brand/logo.svg');
const icon = read('brand/icon.svg');
mkdirSync(root + 'public/pass', { recursive: true });

// density scales the SVG's 50-unit box before resizing, so edges stay crisp.
const png = (svg, size) =>
  sharp(svg, { density: Math.ceil((72 * size) / 50) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 });

const jobs = [
  ['public/pass/icon.png', icon, 29],
  ['public/pass/icon@2x.png', icon, 58],
  ['public/pass/icon@3x.png', icon, 87],
  ['public/apple-touch-icon.png', icon, 180],
];
for (const [out, svg, size] of jobs) {
  await png(svg, size).toFile(root + out);
  console.log(`wrote ${out} (${size}px)`);
}

// The glyph's inner markup, reused inside the OG drawing.
const glyph = logo.toString().replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '').replace(/<!--[\s\S]*?-->/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function og(tagline) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="rgb(242,242,247)"/>
  <g transform="translate(110 125) rotate(-4 220 190)">
    <rect x="6" y="14" width="440" height="380" rx="28" fill="rgb(0,0,0)" fill-opacity="0.10"/>
    <rect width="440" height="380" rx="28" fill="rgb(28,28,30)"/>
    <g transform="translate(28 22) scale(1.1)">${glyph}</g>
    <rect x="96" y="44" width="150" height="16" rx="8" fill="rgb(255,255,255)" fill-opacity="0.9"/>
    <text x="36" y="150" font-family="sans-serif" font-size="22" font-weight="600" fill="rgb(174,174,178)">CPF</text>
    <rect x="36" y="168" width="300" height="34" rx="10" fill="rgb(255,255,255)"/>
    <rect x="36" y="238" width="90" height="14" rx="7" fill="rgb(174,174,178)"/>
    <rect x="36" y="264" width="220" height="22" rx="8" fill="rgb(255,255,255)" fill-opacity="0.9"/>
    <rect x="300" y="250" width="104" height="104" rx="12" fill="rgb(255,255,255)"/>
    <g fill="rgb(28,28,30)">
      <rect x="312" y="262" width="26" height="26" rx="4"/><rect x="366" y="262" width="26" height="26" rx="4"/>
      <rect x="312" y="316" width="26" height="26" rx="4"/><rect x="346" y="296" width="12" height="12"/>
      <rect x="366" y="316" width="10" height="10"/><rect x="382" y="330" width="10" height="12"/>
    </g>
  </g>
  <text x="640" y="300" font-family="sans-serif" font-size="56" font-weight="700" fill="rgb(28,28,30)">${wrap(tagline)}</text>
</svg>`);
}

// Two lines at most: split at the middle-most space.
function wrap(s) {
  const words = s.split(' ');
  let best = 1, diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (d < diff) { diff = d; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
    .map((l, i) => `<tspan x="640" dy="${i === 0 ? 0 : 70}">${esc(l)}</tspan>`)
    .join('');
}

for (const [lang, tagline] of [
  ['pt', 'Seus números na Carteira.'],
  ['en', 'Your numbers in Apple Wallet.'],
]) {
  const out = `public/og-${lang}.png`;
  await sharp(og(tagline)).resize(1200, 630).png({ compressionLevel: 9 }).toFile(root + out);
  console.log(`wrote ${out} (1200x630)`);
}
