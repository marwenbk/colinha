import { describe, expect, test } from 'vitest';
import { Certificate, ContentInfo, SignedData } from 'pkijs';
import { importSigningKey } from '../key';
import { readSigner } from '../cert';
import { signDetached, signedAttributes } from '../cms';
import { readTlv } from '../der';
import {
  caDer,
  hex,
  leafDer,
  leafKeyPem,
  manifestBytes,
  sha256,
} from './fixtures';

const AT = new Date('2026-11-10T12:34:56Z');

function ab(b: Uint8Array): ArrayBuffer {
  return b.slice().buffer;
}

async function sign() {
  const key = await importSigningKey(leafKeyPem);
  const digest = await sha256(manifestBytes);
  const out = await signDetached(
    digest,
    { key, cert: leafDer, chain: [caDer] },
    AT,
  );
  const ci = ContentInfo.fromBER(ab(out));
  const sd = new SignedData({ schema: ci.content });
  return { key, digest, out, ci, sd };
}

describe('importSigningKey', () => {
  test('imports the fixture PKCS#8 key inside workerd', async () => {
    const key = await importSigningKey(leafKeyPem);
    expect(key.type).toBe('private');
    expect(key.algorithm.name).toBe('RSASSA-PKCS1-v1_5');
    expect((key.algorithm as RsaHashedKeyAlgorithm).hash.name).toBe('SHA-256');
    expect(key.usages).toEqual(['sign']);
  });
  test('is memoized', async () => {
    expect(await importSigningKey(leafKeyPem)).toBe(
      await importSigningKey(leafKeyPem),
    );
  });
});

describe('signDetached', () => {
  test('output is DER that parses as CMS SignedData with no eContent', async () => {
    const { out, ci, sd } = await sign();
    expect(readTlv(out, 0).end).toBe(out.length);
    expect(ci.contentType).toBe('1.2.840.113549.1.7.2');
    expect(sd.version).toBe(1);
    expect(sd.digestAlgorithms.map((a) => a.algorithmId)).toEqual([
      '2.16.840.1.101.3.4.2.1',
    ]);
    expect(sd.digestAlgorithms[0].algorithmParams).toBeUndefined();
    expect(sd.encapContentInfo.eContentType).toBe('1.2.840.113549.1.7.1');
    expect(sd.encapContentInfo.eContent).toBeUndefined();
    expect(sd.signerInfos).toHaveLength(1);
  });

  test('includes the signer cert then the chain cert', async () => {
    const { sd } = await sign();
    const certs = (sd.certificates ?? []).map((c) =>
      hex(new Uint8Array((c as Certificate).toSchema().toBER())),
    );
    expect(certs).toEqual([hex(leafDer), hex(caDer)]);
  });

  test('SignerInfo identifies the signer by issuer and serial', async () => {
    const { sd } = await sign();
    const si = sd.signerInfos[0];
    const want = readSigner(leafDer);
    expect(si.version).toBe(1);
    expect(si.digestAlgorithm.algorithmId).toBe('2.16.840.1.101.3.4.2.1');
    expect(si.signatureAlgorithm.algorithmId).toBe('1.2.840.113549.1.1.1');
    const sid = si.sid as {
      issuer: { toSchema(): { toBER(): ArrayBuffer } };
      serialNumber: { toBER(): ArrayBuffer };
    };
    expect(hex(new Uint8Array(sid.issuer.toSchema().toBER()))).toBe(
      hex(want.issuer),
    );
    expect(hex(new Uint8Array(sid.serialNumber.toBER()))).toBe(
      hex(want.serial),
    );
  });

  test('signed attributes carry contentType, signingTime and messageDigest', async () => {
    const { sd, digest } = await sign();
    const attrs = sd.signerInfos[0].signedAttrs!.attributes;
    const byType = Object.fromEntries(attrs.map((a) => [a.type, a.values]));
    expect(Object.keys(byType).sort()).toEqual([
      '1.2.840.113549.1.9.3',
      '1.2.840.113549.1.9.4',
      '1.2.840.113549.1.9.5',
    ]);
    for (const values of Object.values(byType)) expect(values).toHaveLength(1);
    const der = (v: unknown) =>
      new Uint8Array((v as { toBER(): ArrayBuffer }).toBER());
    // contentType = id-data
    expect(hex(der(byType['1.2.840.113549.1.9.3'][0]))).toBe(
      '06092a864886f70d010701',
    );
    // signingTime = UTCTime(AT)
    expect(
      (byType['1.2.840.113549.1.9.5'][0] as { toDate(): Date })
        .toDate()
        .toISOString(),
    ).toBe(AT.toISOString());
    expect(der(byType['1.2.840.113549.1.9.5'][0])[0]).toBe(0x17);
    // messageDigest = the input digest
    expect(hex(der(byType['1.2.840.113549.1.9.4'][0]))).toBe(
      '0420' + hex(digest),
    );
  });

  test('embedded signedAttrs equal signedAttributes() with tag 0xA0', async () => {
    const { sd, digest } = await sign();
    const embedded = new Uint8Array(
      sd.signerInfos[0].signedAttrs!.toSchema().toBER(),
    );
    const mine = signedAttributes(digest, AT);
    expect(mine[0]).toBe(0x31);
    expect(embedded[0]).toBe(0xa0);
    expect(hex(embedded.subarray(1))).toBe(hex(mine.subarray(1)));
  });

  test('signature verifies over the re-encoded signedAttrs', async () => {
    const { sd } = await sign();
    const si = sd.signerInfos[0];
    const attrs = new Uint8Array(si.signedAttrs!.toSchema().toBER());
    attrs[0] = 0x31;
    const leaf = Certificate.fromBER(ab(leafDer));
    const pub = await crypto.subtle.importKey(
      'spki',
      leaf.subjectPublicKeyInfo.toSchema().toBER(),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sig = new Uint8Array(si.signature.valueBlock.valueHexView);
    expect(
      await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, sig, attrs),
    ).toBe(true);
    attrs[attrs.length - 1] ^= 1;
    expect(
      await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, sig, attrs),
    ).toBe(false);
  });

  test('rejects a digest that is not 32 bytes', async () => {
    const key = await importSigningKey(leafKeyPem);
    await expect(
      signDetached(
        new Uint8Array(20),
        { key, cert: leafDer, chain: [caDer] },
        AT,
      ),
    ).rejects.toThrow();
  });
});
