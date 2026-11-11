// Reads the fields CMS needs from an X.509 certificate (DER).
import { readTlv } from './der';

function expect(buf: Uint8Array, at: number, tag: number, what: string) {
  const t = readTlv(buf, at);
  if (t.tag !== tag)
    throw new Error(
      `cert: expected ${what} (0x${tag.toString(16)}), got 0x${t.tag.toString(16)}`,
    );
  return t;
}

function parseTime(buf: Uint8Array, at: number): Date {
  const t = readTlv(buf, at);
  const s = new TextDecoder().decode(buf.subarray(t.start, t.end));
  let m: RegExpMatchArray | null;
  let year: number;
  if (
    t.tag === 0x17 &&
    (m = s.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/))
  ) {
    const yy = Number(m[1]);
    year = yy >= 50 ? 1900 + yy : 2000 + yy;
  } else if (
    t.tag === 0x18 &&
    (m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/))
  ) {
    year = Number(m[1]);
  } else {
    throw new Error(`cert: unsupported time ${s}`);
  }
  const [, , mo, d, h, mi, se] = m.map(Number);
  return new Date(Date.UTC(year, mo - 1, d, h, mi, se));
}

/** `issuer` is the whole Name TLV and `serial` the whole INTEGER TLV, as SignerInfo needs them. */
export function readSigner(certDer: Uint8Array): {
  issuer: Uint8Array;
  serial: Uint8Array;
  notAfter: Date;
} {
  const cert = expect(certDer, 0, 0x30, 'Certificate');
  const tbs = expect(certDer, cert.start, 0x30, 'TBSCertificate');
  let at = tbs.start;
  if (readTlv(certDer, at).tag === 0xa0) at = readTlv(certDer, at).end; // [0] version
  const serial = expect(certDer, at, 0x02, 'serialNumber');
  const sigAlg = expect(certDer, serial.end, 0x30, 'signature');
  const issuer = expect(certDer, sigAlg.end, 0x30, 'issuer');
  const validity = expect(certDer, issuer.end, 0x30, 'validity');
  const notBefore = readTlv(certDer, validity.start);
  return {
    issuer: certDer.slice(sigAlg.end, issuer.end),
    serial: certDer.slice(at, serial.end),
    notAfter: parseTime(certDer, notBefore.end),
  };
}
