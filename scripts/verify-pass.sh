#!/usr/bin/env bash
# Checks a .pkpass: every manifest.json SHA-1 matches, every file is listed,
# and the detached CMS signature over manifest.json verifies against <ca.pem>.
# Usage: scripts/verify-pass.sh <pass.pkpass> <ca.pem>   (OPENSSL=/path/to/openssl to pick one)
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "usage: $0 <pass.pkpass> <ca.pem>" >&2
  exit 2
fi
pkpass=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
ca=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
openssl=${OPENSSL:-openssl}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

unzip -q "$pkpass" -d "$tmp/pass"
cd "$tmp/pass"

# "<sha1>  <path>" lines for shasum -c, plus a list of manifest paths.
node -e '
  const m = JSON.parse(require("fs").readFileSync("manifest.json", "utf8"));
  for (const [p, h] of Object.entries(m)) console.log(`${h}  ${p}`);
' > "$tmp/sums"
cut -c43- "$tmp/sums" | sort > "$tmp/listed"
find . -type f ! -name manifest.json ! -name signature | sed 's#^\./##' | sort > "$tmp/present"
if ! diff -u "$tmp/listed" "$tmp/present"; then
  echo "verify-pass: manifest.json and the archive list different files" >&2
  exit 1
fi
shasum -a 1 -c "$tmp/sums"

"$openssl" cms -verify -binary -inform DER -in signature -content manifest.json \
  -CAfile "$ca" -purpose any -out /dev/null
echo "verify-pass: OK ($(wc -l < "$tmp/sums" | tr -d ' ') files)"
