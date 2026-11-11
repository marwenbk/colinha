/**
 * A stylized, deliberately non-scannable barcode for the preview: bar widths
 * come from the message characters so the graphic changes as you type.
 * The real Code128 is drawn by Wallet from pass.json.
 */
export function stylizedBars(message: string, count = 44): { x: number; w: number }[] {
  const src = message === '' ? '0' : message;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const c = src.charCodeAt(i % src.length) + i * 7;
    const w = (c % 3) + 1;
    const gap = ((c >> 2) % 2) + 1;
    bars.push({ x, w });
    x += w + gap;
  }
  return bars;
}

export const barsWidth = (bars: { x: number; w: number }[]) =>
  bars.length === 0 ? 0 : bars[bars.length - 1].x + bars[bars.length - 1].w;
