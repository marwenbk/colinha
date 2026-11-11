# TEST-ONLY fixtures

Everything in this folder is throwaway test material for the CMS signer tests.
None of it is an Apple certificate or key, and none of it may be used to sign
real passes.

- `ca.pem`: a self-signed test CA that stands in for Apple WWDR.
- `leaf.der`, `leaf.pk8.pem`: a test leaf certificate and its unencrypted
  PKCS#8 key that stand in for a Pass Type ID certificate.
- `manifest.json`: a small sample manifest. Tests sign the SHA-256 of its exact bytes.
- `expected.json`: the leaf's issuer, serial and notAfter as read by pkijs.

Regenerate with `scripts/make-test-pki.sh` then `node scripts/cert-parts.mjs`.
