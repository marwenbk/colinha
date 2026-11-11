#!/usr/bin/env bash
# Loads the Apple Pass Type ID certificate into Worker secrets.
# Usage: scripts/prepare-cert.sh <Certificates.p12> <preview|production> [WWDR.cer]
#
#   P12_PASSWORD   password of the .p12 (prompted if unset; empty is allowed)
#   WWDR_CERT      path to Apple's WWDR intermediate (.cer, DER or PEM) if not given as arg 3
#
# The private key is only ever held in a temp dir that is wiped on exit.
set -euo pipefail

P12="${1:?usage: prepare-cert.sh <Certificates.p12> <preview|production> [WWDR.cer]}"
ENV_NAME="${2:?usage: prepare-cert.sh <Certificates.p12> <preview|production> [WWDR.cer]}"
WWDR="${3:-${WWDR_CERT:-}}"
OPENSSL="${OPENSSL:-openssl}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$ENV_NAME" in preview | production) ;; *)
  echo "env must be preview or production" >&2
  exit 2
  ;;
esac
[ -f "$P12" ] || { echo "no such file: $P12" >&2; exit 2; }
[ -n "$WWDR" ] && [ -f "$WWDR" ] || { echo "pass the WWDR certificate as arg 3 or WWDR_CERT" >&2; exit 2; }

if [ -z "${P12_PASSWORD+x}" ]; then
  read -r -s -p "p12 password: " P12_PASSWORD
  echo >&2
fi
export P12_PASSWORD

TMP="$(mktemp -d)"
chmod 700 "$TMP"
trap 'rm -rf "$TMP"' EXIT

# OpenSSL 3 rejects old RC2/3DES p12 files unless -legacy is given.
p12() {
  local mode="$1"
  shift
  if "$OPENSSL" pkcs12 -in "$P12" -passin env:P12_PASSWORD "$@" 2>"$TMP/err"; then return 0; fi
  if grep -qi unsupported "$TMP/err"; then
    "$OPENSSL" pkcs12 -legacy -in "$P12" -passin env:P12_PASSWORD "$@"
  else
    cat "$TMP/err" >&2
    return 1
  fi
}

# Key -> unencrypted PKCS#8 PEM.
p12 key -nocerts -nodes | "$OPENSSL" pkcs8 -topk8 -nocrypt -out "$TMP/key.pem"
# Leaf cert -> DER -> base64 (single line).
p12 cert -clcerts -nokeys | "$OPENSSL" x509 -outform DER -out "$TMP/pass.der"
# WWDR: accept DER or PEM.
if ! "$OPENSSL" x509 -in "$WWDR" -inform DER -outform DER -out "$TMP/wwdr.der" 2>/dev/null; then
  "$OPENSSL" x509 -in "$WWDR" -inform PEM -outform DER -out "$TMP/wwdr.der"
fi

b64() { "$OPENSSL" base64 -A -in "$1"; }
b64 "$TMP/pass.der" > "$TMP/pass.b64"
b64 "$TMP/wwdr.der" > "$TMP/wwdr.b64"

cd "$ROOT"
put() { pnpm exec wrangler secret put "$1" --env "$ENV_NAME" < "$2"; }
put PASS_KEY_PKCS8 "$TMP/key.pem"
put PASS_CERT_B64 "$TMP/pass.b64"
put WWDR_CERT_B64 "$TMP/wwdr.b64"
echo "Secrets set for env: $ENV_NAME"
