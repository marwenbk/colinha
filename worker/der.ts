// Minimal DER encoder/decoder: just what the CMS signer needs.
// Single-byte tags only; definite lengths only.

/** Encoders return bytes backed by a plain ArrayBuffer, so they pass straight to WebCrypto. */
export type Bytes = Uint8Array<ArrayBuffer>;

function concat(parts: Uint8Array[]): Bytes {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function lengthBytes(n: number): Bytes {
  if (n < 0x80) return Uint8Array.of(n);
  const bytes: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) bytes.unshift(v % 256);
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

export function tlv(tag: number, ...content: Uint8Array[]): Bytes {
  const body = concat(content);
  return concat([Uint8Array.of(tag), lengthBytes(body.length), body]);
}

export const seq = (...content: Uint8Array[]): Bytes => tlv(0x30, ...content);
export const set = (...content: Uint8Array[]): Bytes => tlv(0x31, ...content);

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/** SET OF: DER requires the encoded elements in ascending byte order. */
export function setOf(items: Uint8Array[]): Bytes {
  return set(...[...items].sort(compareBytes));
}

export function oid(dotted: string): Bytes {
  const arcs = dotted.split('.').map((s) => {
    if (!/^\d+$/.test(s)) throw new Error(`bad OID: ${dotted}`);
    return Number(s);
  });
  if (arcs.length < 2 || arcs[0] > 2 || (arcs[0] < 2 && arcs[1] > 39))
    throw new Error(`bad OID: ${dotted}`);
  const out: number[] = [];
  for (const arc of [arcs[0] * 40 + arcs[1], ...arcs.slice(2)]) {
    const chunk = [arc % 128];
    for (let v = Math.floor(arc / 128); v > 0; v = Math.floor(v / 128))
      chunk.unshift(0x80 | (v % 128));
    out.push(...chunk);
  }
  return tlv(0x06, Uint8Array.from(out));
}

/** INTEGER for a non-negative safe integer. */
export function int(n: number): Bytes {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error(`int: unsupported value ${n}`);
  const bytes: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) bytes.unshift(v % 256);
  if (bytes.length === 0 || bytes[0] & 0x80) bytes.unshift(0);
  return tlv(0x02, Uint8Array.from(bytes));
}

export const octets = (b: Uint8Array): Bytes => tlv(0x04, b);
export const nul = (): Bytes => Uint8Array.of(0x05, 0x00);

/** UTCTime YYMMDDHHMMSSZ. RFC 5280/5652 allow it only for 1950..2049. */
export function utcTime(d: Date): Bytes {
  const y = d.getUTCFullYear();
  if (Number.isNaN(y) || y < 1950 || y > 2049)
    throw new Error(`utcTime: year out of range: ${y}`);
  const p = (n: number) => String(n).padStart(2, '0');
  const s =
    p(y % 100) +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds()) +
    'Z';
  return tlv(0x17, new TextEncoder().encode(s));
}

/** Context-specific constructed tag [n] (0xA0 + n). */
export const ctx = (n: number, ...content: Uint8Array[]): Bytes => {
  if (n < 0 || n > 30) throw new Error(`ctx: unsupported tag ${n}`);
  return tlv(0xa0 + n, ...content);
};

/** Reads one TLV header at `at`. Content is buf[start, end); the TLV spans buf[at, end). */
export function readTlv(
  buf: Uint8Array,
  at: number,
): { tag: number; start: number; end: number; header: number } {
  if (at + 2 > buf.length) throw new Error('DER: truncated header');
  const tag = buf[at];
  if ((tag & 0x1f) === 0x1f)
    throw new Error('DER: multi-byte tags unsupported');
  let len = buf[at + 1];
  let header = 2;
  if (len & 0x80) {
    const k = len & 0x7f;
    if (k === 0) throw new Error('DER: indefinite length');
    if (k > 4) throw new Error('DER: length too large');
    if (at + 2 + k > buf.length) throw new Error('DER: truncated length');
    len = 0;
    for (let i = 0; i < k; i++) len = len * 256 + buf[at + 2 + i];
    header += k;
  }
  const start = at + header;
  const end = start + len;
  if (end > buf.length) throw new Error('DER: content overruns buffer');
  return { tag, start, end, header };
}
