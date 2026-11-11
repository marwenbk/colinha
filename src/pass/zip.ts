// Zips the pass: PNGs and the signature stored, JSON deflated, fixed mtime.
import { type Zippable, zipSync } from 'fflate';

// Local-time fields, so the bytes are the same for a given input.
const MTIME = new Date(2020, 0, 1, 0, 0, 0);

export function zipPass(files: Record<string, Uint8Array>): Uint8Array {
  const input: Zippable = {};
  for (const [name, data] of Object.entries(files))
    input[name] = [data, { level: name.endsWith('.json') ? 6 : 0, mtime: MTIME }];
  return zipSync(input);
}
