# Colinha

Colinha turns the numbers you keep in your notes (CPF, Pix key, loyalty cards) into Apple Wallet passes. Everything runs in the browser. There are no accounts and no database, and the server keeps no logs.

## How signing works (hash-only)

Wallet only accepts passes signed with an Apple Pass Type ID certificate, and that private key can't live in the browser. So:

1. The page builds the pass and its `manifest.json` locally.
2. It sends the Worker only `SHA-256(manifest.json)`: 32 bytes, `POST /api/sign`.
3. The Worker returns the detached CMS signature. The page zips the `.pkpass` itself.

The Worker never sees your name, CPF, Pix key or the pass file. The pass serial number is a random 128-bit value, so the manifest, and therefore its hash, contains 128 bits of randomness the server never sees. The hash can't be brute-forced back into the card data, even for low-entropy fields like a CPF.

## Check it yourself

Open Safari Web Inspector (Develop > your iPhone or Mac > Network), build a pass, and add it to Wallet. You should see only same-origin static files and `POST /api/sign` requests with 32-byte bodies. Nothing else leaves the page.

## Self-hosting

Requires Node, pnpm, a Cloudflare account, and an Apple Developer account with a Pass Type ID certificate.

```sh
pnpm install
pnpm dev          # needs .dev.vars, see below
pnpm test && pnpm check
```

**Dev with the test PKI.** `scripts/make-test-pki.sh` writes throwaway keys and certificates to `worker/test/fixtures`. Copy `.dev.vars.example` to `.dev.vars` and fill `PASS_KEY_PKCS8`, `PASS_CERT_B64` and `WWDR_CERT_B64` from them. Wallet rejects passes signed this way; it is only for development and tests.

**Load the real certificate.** Export the Pass Type ID certificate and key from Keychain as a `.p12`, and download Apple's WWDR intermediate certificate. Then:

```sh
scripts/prepare-cert.sh Certificates.p12 preview WWDR.cer     # or: production
```

It converts the key and certificates and runs `wrangler secret put` for `PASS_KEY_PKCS8`, `PASS_CERT_B64` and `WWDR_CERT_B64`. You can also set a single secret by hand: `pnpm wrangler secret put <NAME> --env <env>`.

**Deploy.** Environments are `preview` (on `workers.dev`) and `production` (custom domain `colinha.app`, set in `wrangler.jsonc`):

```sh
CLOUDFLARE_ENV=<env> pnpm build && pnpm wrangler deploy
```

Check a deployed pass with `scripts/verify-pass.sh pass.pkpass WWDR.pem`, and sign a minimal one with `node scripts/smoke-pass.mjs <origin>`.

## Renewing the certificate

Pass Type ID certificates expire. `/api/health` shows `certNotAfter`; renew before that date. Create the new certificate under the same Pass Type ID (`pass.app.colinha.card`), so passes people already added stay updatable. Then run `scripts/prepare-cert.sh` again for each environment and redeploy.

## Before launch

Replace the placeholders:

- the Apple "Add to Apple Wallet" badges in `public/badges` with the official artwork;
- `TEAM_ID` and `GITHUB_URL` in `src/config.ts`;
- the domain in `wrangler.jsonc` and `SITE_ORIGIN` in `src/config.ts`, if you don't use `colinha.app`.

Launch checks:

- [ ] Workers Logs in the Cloudflare dashboard show no entries for the Worker.
- [ ] `/api/health` reports `"rateLimit": true`. If it reports `false`, add the Free plan's one WAF rate-limiting rule: path `/api/sign`, counted by IP, 10 requests per 10 s.
- [ ] `curl -sI https://colinha.app/` shows the `Content-Security-Policy` header.
- [ ] Device QA (iPhone on current iOS, Safari, light and dark mode):
  - [ ] Each card type opens the Wallet sheet and looks right.
  - [ ] Editing and re-adding updates the same pass, with no duplicate.
  - [ ] "Editar este cartão" on the back of a pass opens the Editor, prefilled.
  - [ ] In airplane mode, the pass still opens in Wallet.
  - [ ] On Apple Watch, the pass appears and shows a barcode.
  - [ ] The Pix QR, scanned by three bank apps, shows the right name and key. Stop on the confirmation screen; don't pay.
  - [ ] The CPF barcode scans in a barcode-reader app, and at a pharmacy if you can.
  - [ ] The largest Dynamic Type size doesn't break the layout. VoiceOver reads every field and button.
  - [ ] Instagram's in-app browser shows the guard. Chrome on iOS behaves as recorded in decision 0001.

[Decision 0001](docs/decisions/0001-pass-delivery.md) (how the pass reaches Wallet) is still **provisional** until the iPhone spike has run.

## License

[MIT](LICENSE)
