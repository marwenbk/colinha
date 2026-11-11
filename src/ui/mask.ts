/** Applies a digit mask such as `000.000.000-00` progressively: `529982` → `529.982`. */
export function applyMask(mask: string, digits: string): string {
  let out = '';
  let i = 0;
  for (const ch of mask) {
    if (i >= digits.length) break;
    if (ch === '0') out += digits[i++];
    else out += ch;
  }
  return out;
}

/** Caret position in `masked` just after the `n`th digit. */
export function caretAfterDigits(masked: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) seen++;
    if (seen === n) return i + 1;
  }
  return masked.length;
}
