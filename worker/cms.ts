// CMS SignedData, detached, for the pkpass `signature` file (RFC 5652).
import {
  type Bytes,
  ctx,
  int,
  nul,
  octets,
  oid,
  seq,
  set,
  setOf,
  utcTime,
} from './der';
import { readSigner } from './cert';

const ID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const ID_DATA = '1.2.840.113549.1.7.1';
const ID_SHA256 = '2.16.840.1.101.3.4.2.1';
const ID_RSA_ENCRYPTION = '1.2.840.113549.1.1.1';
const ID_CONTENT_TYPE = '1.2.840.113549.1.9.3';
const ID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4';
const ID_SIGNING_TIME = '1.2.840.113549.1.9.5';

/** The signed attributes as a SET (tag 0x31): the exact bytes that get signed. */
export function signedAttributes(digest: Uint8Array, at: Date): Bytes {
  if (digest.length !== 32)
    throw new Error(
      `cms: expected a 32-byte SHA-256 digest, got ${digest.length}`,
    );
  return setOf([
    seq(oid(ID_CONTENT_TYPE), set(oid(ID_DATA))),
    seq(oid(ID_SIGNING_TIME), set(utcTime(at))),
    seq(oid(ID_MESSAGE_DIGEST), set(octets(digest))),
  ]);
}

export async function signDetached(
  digest: Uint8Array,
  s: { key: CryptoKey; cert: Uint8Array; chain: Uint8Array[] },
  at: Date,
): Promise<Bytes> {
  const attrs = signedAttributes(digest, at);
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', s.key, attrs),
  );
  const { issuer, serial } = readSigner(s.cert);

  // Same bytes as `attrs`, re-tagged [0] IMPLICIT.
  const embeddedAttrs = attrs.slice();
  embeddedAttrs[0] = 0xa0;

  const signerInfo = seq(
    int(1),
    seq(issuer, serial),
    seq(oid(ID_SHA256)),
    embeddedAttrs,
    seq(oid(ID_RSA_ENCRYPTION), nul()),
    octets(signature),
  );
  const signedData = seq(
    int(1),
    set(seq(oid(ID_SHA256))),
    seq(oid(ID_DATA)),
    ctx(0, s.cert, ...s.chain),
    set(signerInfo),
  );
  return seq(oid(ID_SIGNED_DATA), ctx(0, signedData));
}
