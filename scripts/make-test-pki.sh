#!/usr/bin/env bash
# Generates TEST-ONLY PKI fixtures for the CMS signer tests.
# These are throwaway keys and certificates. They are not Apple certificates
# and must never be used to sign real passes.
#
# Writes worker/test/fixtures/{ca.pem,leaf.der,leaf.pk8.pem,manifest.json}.
# Usage: scripts/make-test-pki.sh   (set OPENSSL=/path/to/openssl to override)
set -euo pipefail

OPENSSL="${OPENSSL:-openssl}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/worker/test/fixtures"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

cat > "$TMP/leaf.ext" <<'EXT'
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid
EXT

# Test CA (stands in for Apple WWDR in tests).
"$OPENSSL" genrsa -out "$TMP/ca.key" 2048 2>/dev/null
"$OPENSSL" req -new -x509 -sha256 -days 3650 -key "$TMP/ca.key" \
  -subj "/O=Colinha TEST ONLY/CN=Colinha Test CA (NOT APPLE)" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -out "$OUT/ca.pem"

# Test leaf (stands in for the Pass Type ID certificate in tests).
"$OPENSSL" genrsa -out "$TMP/leaf.key" 2048 2>/dev/null
"$OPENSSL" req -new -sha256 -key "$TMP/leaf.key" \
  -subj "/UID=pass.test.colinha/O=Colinha TEST ONLY/CN=Colinha Test Leaf (NOT APPLE)" \
  -out "$TMP/leaf.csr"
"$OPENSSL" x509 -req -sha256 -days 3650 -in "$TMP/leaf.csr" \
  -CA "$OUT/ca.pem" -CAkey "$TMP/ca.key" -CAcreateserial -CAserial "$TMP/ca.srl" \
  -extfile "$TMP/leaf.ext" -outform DER -out "$OUT/leaf.der" 2>/dev/null

"$OPENSSL" pkcs8 -topk8 -nocrypt -in "$TMP/leaf.key" -out "$OUT/leaf.pk8.pem"

printf '%s' '{"pass.json":"da39a3ee5e6b4b0d3255bfef95601890afd80709"}' > "$OUT/manifest.json"

echo "Wrote TEST-ONLY fixtures to $OUT"
