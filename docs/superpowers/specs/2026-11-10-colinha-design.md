## Product spec

### Decided with you
- Apple Wallet only, for now.
- A hash-only signer on the Cloudflare Workers free plan.
- Portuguese and English. The UI follows the phone's language.
- v1 cards: Documentos, Endereço and Pix.
- Name: Colinha.
- Framework: Svelte 5.
- An iOS 26 look: cards stacked like in Wallet, floating glass buttons, sheets that slide up, and as little text as possible.

### My calls (please check these)
1. Plain Vite + Svelte, without SvelteKit. One Worker serves both the assets and the API from the same origin, so the CSP can allow `connect-src 'self'` and nothing else.
2. Passes are written in the UI language at the moment they're created (no `pass.strings`). Re-issuing from a phone set to the other language switches the pass's language. This also avoids two known trouble spots: Apple requires UTF-16 strings files, and Wallet's choice of `.lproj` folder is unpredictable.
3. The UI is monochrome. The passes are the only color.
4. Saved cards live in `localStorage`. Each pass also carries an "Editar este cartão" link with the card data after the `#` in the URL, a part browsers never send to a server. That link restores the card even after Safari clears site data (it does this after 7 days without a visit).
5. No CEP lookup, since it would send the CEP to a third party. iOS AutoFill fills in the address instead.
6. `/` follows the phone's language. Static `/pt/` and `/en/` pages exist for search engines and for shared links.
7. Any language other than Portuguese or English gets English.
8. No analytics. The request count for `/api/sign` in the Cloudflare dashboard serves as the "passes made" number.
9. Six pass colors. The CPF barcode is on by default.
10. Open source, under the MIT license.
11. People can keep several cards of one type, such as two Pix keys or a child's documents. (＋) opens a floating sheet that lists the three card types.
12. iPad can't add passes to Wallet, so it gets the "Continuar no iPhone" handoff, the same as a computer.
13. A Pix name or city that folds to nothing, such as a name in a non-Latin script, is blocked with `error.latin`. Banco Central's code needs at least one character there.
14. If the browser can't open Wallet directly, the fallback is a Safari download: the person taps the downloaded file. Pass bytes never go through the Worker.

### Not in v1
The Saúde card, Google Wallet, pass push updates (`webServiceURL`), CEP lookup, accounts or sync, analytics, per-document landing pages, other languages.

### Cards

All fields are stored normalized: digits only for CPF and CEP, and the payload form for the Pix key. An empty string means "not provided". The pass style is `generic`. Header fields are not used. Every pass back ends with the edit link and the disclaimer.

Number fields on the back of the pass get `dataDetectorTypes: []`, so a CPF isn't read as a phone number. The edit link keeps link detection. Apple's limits for generic passes: 1 primary field, up to 4 secondary and up to 4 auxiliary. With a QR code, secondary and auxiliary share 4 between them.

**Documentos** (default color: Grafite)

| Field | Required | Input | Rule | On the pass |
|---|---|---|---|---|
| CPF | yes | `inputmode=numeric`, mask `000.000.000-00` | mod-11 check digits | primary |
| Nome | yes | `autocomplete=name`, max 40 | not empty | secondary |
| RG | no | max 20, uppercase | none | auxiliary |
| RNM | no | `A–Z0–9-`, max 12, uppercase | none | auxiliary |
| Passaporte | no | `A–Z0–9`, max 12, uppercase | none | auxiliary |
| Código de barras | switch, on by default | — | — | `barcodes`: Code128 of the CPF digits, then a QR of the same digits as a fallback |

**Endereço** (default color: Azul)

| Field | Required | Input | Rule | On the pass |
|---|---|---|---|---|
| CEP | yes | `inputmode=numeric`, mask `00000-000`, `autocomplete=postal-code` | 8 digits | primary |
| Rua e número | yes | `autocomplete=address-line1`, max 60 | not empty | secondary |
| Complemento | no | `autocomplete=address-line2`, max 30 | none | auxiliary |
| Bairro | no | `autocomplete=address-level3`, max 30 | none | auxiliary |
| Cidade | yes | `autocomplete=address-level2`, max 30 | not empty | auxiliary, shown as `Cidade - UF` |
| Estado | yes | native `<select>` of the 27 UFs, `autocomplete=address-level1` | one of the UFs | joined with Cidade |
| Referência | no | max 60 | none | back only |

The back of the pass starts with the full address, written in Brazilian format. Parts that are missing are dropped without leaving stray commas:
```
Rua Augusta, 1500, Apto 42
Consolação, São Paulo - SP
01310-100
```

**Pix** (default color: Turquesa)

| Field | Required | Input | Rule | On the pass |
|---|---|---|---|---|
| Chave Pix | yes | `autocapitalize=off`, `autocorrect=off`, `spellcheck=false` | one detected type; if the input is ambiguous, a segmented "CPF \| Celular" control the user must pick from | primary (formatted) |
| Nome | yes | prefilled from the most recently updated Documentos card | not empty after `toPixText`, otherwise `error.latin` | secondary |
| Cidade | yes | prefilled from the most recently updated Endereço card | not empty after `toPixText`, otherwise `error.latin` | back |

The barcode is a QR code of the BR Code payload. The back shows the "Pix copia e cola" payload (with data detectors off) and the city. The detected key type appears as a small word at the end of the key row (for example "E-mail" or "Celular").

### Screens (wireframes)

```
HOME, NO CARDS YET                HOME, WITH CARDS
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Colinha                      │  │ Colinha                (＋)  │ ← glass button
│ Seus números na Carteira.    │  │ ╭──────────────────────────╮ │
│ ╭──────────────────────────╮ │  │ │▣ Documentos 529.982.247-25│ │ ← 64pt strips,
│ │▣ Documentos              │ │  │ ├──────────────────────────┤ │   oldest on top
│ │  000.000.000-00  (dimmed)│ │  │ │▣ Endereço       01310-100│ │
│ ╰──────────────────────────╯ │  │ ├──────────────────────────┤ │
│ ╭──────────────────────────╮ │  │ │▣ Pix                     │ │ ← newest card
│ │▣ Endereço   00000-000    │ │  │ │  ana@exemplo.com   ▄▀▄▀  │ │   in full
│ ╰──────────────────────────╯ │  │ │  Ana Souza         ▀▄▀▄  │ │
│ ╭──────────────────────────╮ │  │ ╰──────────────────────────╯ │
│ │▣ Pix        Sua chave    │ │  │                              │
│ ╰──────────────────────────╯ │  │                              │
│  🔒 Seus dados ficam neste   │  │  🔒 Seus dados ficam neste   │ ← opens the
│     aparelho.                │  │     aparelho.                │   info sheet
└──────────────────────────────┘  └──────────────────────────────┘

EDITOR (page sheet; Home shrinks to 0.94 behind it)
┌──────────────────────────────┐
│ (✕)        Documentos        │ ← glass close button, title centered
│ ╭──────────────────────────╮ │
│ │▣ Documentos              │ │ ← live pass: fills in as you type
│ │ CPF                      │ │
│ │ 529.982.247-25           │ │
│ │ Nome          RNM        │ │
│ │ Ana Souza     V123456-7  │ │
│ │       ║│║║│║│║║│║        │ │
│ ╰──────────────────────────╯ │
│ ┌──────────────────────────┐ │
│ │ CPF    529.982.247-25  ✓ │ │ ← inset grouped list
│ │ Nome   Ana Souza         │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ RG          Opcional     │ │
│ │ RNM         Opcional     │ │
│ │ Passaporte  Opcional     │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ● ● ● ● ● ●              │ │ ← six colors, no text
│ │ Código de barras    (on) │ │ ← native iOS switch
│ └──────────────────────────┘ │
│        Apagar cartão         │ ← existing cards only
│ ░░[ Add to Apple Wallet ]░░░ │ ← official badge on a glass bar
└──────────────────────────────┘

FLOATING SHEET (info, guards, confirmations): glass, inset 8pt from the screen edges, radius 32
```

Flows:
- **New card:** (＋) opens a floating sheet that lists the three card types. On an empty Home, the three dimmed cards do the same job.
- **Add:** tap the badge. If anything is invalid, focus the first invalid field and mark it. Otherwise, check the browser (see guards). Then, at the same time, play the "pocket" animation and run `buildPkpass`. Save the card, then call `deliverPass`. When the page is visible again (`visibilitychange`), close the Editor; Home shows the card.
- **Fail:** show a toast with the error copy. The preview returns to its place and nothing is lost.
- **Edit:** tap a card on Home, or open the pass's edit link. The Editor opens prefilled, and the `#` part is removed from the address bar.
- **Delete:** show a confirmation sheet, then remove the card locally. The pass stays in Wallet, and the sheet says so.
- **Erase everything:** from the info sheet, after a confirmation.
- **Guards:**
  - Inside an in-app browser (Instagram, Facebook, TikTok and so on): a banner, and an "Abrir no Safari" capsule in place of the badge that copies the link.
  - On a computer or an iPad (iPad can't add passes): a "Continuar no iPhone" capsule that opens a QR code of `encodeEditLink(card)`. The phone camera opens Safari with the card already filled in.
  - On Android: a short notice.

### Look

- **Direction:** a quiet companion to Wallet. The UI is monochrome, the passes are the only color, and content comes first.
- **The one memorable thing:** the live pass at the top of the Editor. It fills in as you type, and when you tap the badge it drops into Wallet.
- **Depth:** one fixed rule per kind of element.
  - Lists are flat, with no shadow.
  - Cards have one soft shadow.
  - Floating controls and floating sheets are glass.
- **Spacing:** a 4pt base. Side margins are 16pt. Rows and touch targets are at least 44pt. Gaps are 8, 12, 16, 24 or 32pt.
- **Type:** SF Pro through the system font stack (`-apple-system, BlinkMacSystemFont, system-ui, sans-serif`); no web fonts. Dynamic Type comes from `html { font: -apple-system-body }` (inside `@supports`), with every size set in `rem`.

  | Style | Size / line height | Weight |
  |---|---|---|
  | Large Title | 34/41 | bold |
  | Title | 22/28 | bold |
  | Headline | 17/22 | semibold |
  | Body | 17/22 | regular |
  | Footnote | 13/18 | regular |
  | Caption | 12/16 | regular |

  Numbers use `tabular-nums`. Labels are sentence case; nothing is ALL CAPS.
- **Colors:**

  | Token | Light | Dark |
  |---|---|---|
  | `--bg` | `#F2F2F7` | `#000000` |
  | `--surface` | `#FFFFFF` | `#1C1C1E` |
  | `--label` | `#000000` | `#FFFFFF` |
  | `--label-2` | `rgb(60 60 67 / .6)` | `rgb(235 235 245 / .6)` |
  | `--separator` | `rgb(60 60 67 / .29)` | `rgb(84 84 88 / .65)` |
  | `--danger` | `#FF3B30` | `#FF453A` |
  | `--ok` | `#34C759` | `#30D158` |

  Controls use `--label`. There is no accent color.
- **Glass:**
  - Background: `color-mix(in srgb, var(--surface) 60%, transparent)`.
  - `backdrop-filter: blur(16px) saturate(180%)`, with the `-webkit-` prefix too.
  - A 0.5px inner edge: `rgb(255 255 255 / .55)` in light mode, `/ .14` in dark mode.
  - Shadow: `0 8px 24px rgb(0 0 0 / .12)` in light mode, `/ .4` in dark mode.
- **Card shadow:** `0 1px 2px rgb(0 0 0 / .10), 0 10px 30px rgb(0 0 0 / .14)`.
- **Radii:** buttons are capsules. Page sheets have a 24 radius, floating sheets 32, groups 20 and cards 14.
- **Motion:**
  - Sheets: 420ms, `cubic-bezier(.32,.72,0,1)`.
  - Micro-interactions: 150ms ease-out.
  - The pocket drop: 360ms.
  - No overshoot anywhere. With `prefers-reduced-motion`, only opacity changes.
- **Pass colors:** the foreground is always `rgb(255,255,255)`. The label color is white mixed with the background, starting at 70% white and rising in 5% steps until contrast reaches at least 4.5:1. The values are precomputed in `palette.ts` and tested.

  | ColorId | pt / en | background |
  |---|---|---|
  | graphite | Grafite / Graphite | `rgb(28,28,30)` |
  | blue | Azul / Blue | `rgb(0,64,221)` |
  | green | Verde / Green | `rgb(30,120,52)` |
  | teal | Turquesa / Teal | `rgb(0,118,140)` |
  | purple | Roxo / Purple | `rgb(137,68,171)` |
  | orange | Laranja / Orange | `rgb(201,52,0)` |

- **Brand:** `brand/logo.svg` is a white folded-note glyph on a 50×50 viewBox. `brand/icon.svg` is the same glyph on a Grafite rounded square. Icons are Lucide SVGs copied in (ISC license); SF Symbols aren't licensed for the web.

### Copy (every visible string; `en` is the source of truth)

| Key | pt | en |
|---|---|---|
| app.tagline | Seus números na Carteira. | Your numbers in Apple Wallet. |
| privacy.line | Seus dados ficam neste aparelho. | Your data stays on this device. |
| card.docs / card.address / card.pix | Documentos / Endereço / Pix | Documents / Address / Pix |
| field.cpf / field.name | CPF / Nome | CPF / Name |
| field.rg / field.rnm / field.passport | RG / RNM / Passaporte | RG / RNM / Passport |
| field.cep / field.line1 / field.line2 | CEP / Rua e número / Complemento | CEP / Street and number / Apt, unit |
| field.district / field.city / field.uf | Bairro / Cidade / Estado | Neighborhood / City / State |
| field.reference / field.pixKey | Referência / Chave Pix | Landmark / Pix key |
| placeholder.optional / placeholder.pixKey | Opcional / Sua chave | Optional / Your key |
| pixType.cpf / .cnpj / .phone / .email / .evp | CPF / CNPJ / Celular / E-mail / Aleatória | CPF / CNPJ / Phone / Email / Random |
| toggle.barcode | Código de barras | Barcode |
| a11y.close / a11y.newCard | Fechar / Novo cartão | Close / New card |
| color.* | Grafite / Azul / Verde / Turquesa / Roxo / Laranja | Graphite / Blue / Green / Teal / Purple / Orange |
| action.delete / action.eraseAll | Apagar cartão / Apagar tudo | Delete card / Erase everything |
| confirm.delete / confirm.deleteNote | Apagar este cartão? / Ele continua na Carteira. | Delete this card? / It stays in Wallet. |
| confirm.eraseAll / confirm.eraseAllNote | Apagar tudo deste aparelho? / Os cartões continuam na Carteira. | Erase everything from this device? / Your cards stay in Wallet. |
| confirm.yes / confirm.no | Apagar / Cancelar | Delete / Cancel |
| error.cpf / error.cep / error.pixKey | CPF inválido / CEP inválido / Chave inválida | Invalid CPF / Invalid CEP / Invalid key |
| error.latin | Use letras latinas, como no seu banco. | Use Latin letters, as your bank does. |
| note.duplicate (only if decision 0001 finds duplicates) | Se aparecer repetido, apague o antigo na Carteira. | If it shows up twice, delete the old one in Wallet. |
| error.offline | Sem conexão. Tente de novo. | No connection. Try again. |
| error.rate | Muitas tentativas. Aguarde um minuto. | Too many tries. Wait a minute. |
| error.server | Não deu para assinar o cartão. Tente de novo. | Couldn't sign the card. Try again. |
| guard.inApp / guard.copyLink / guard.copied | Abra no Safari para adicionar à Carteira. / Copiar link / Link copiado | Open in Safari to add to Wallet. / Copy link / Link copied |
| guard.desktop / guard.desktopHint | Continuar no iPhone / Aponte a câmera do iPhone. | Continue on iPhone / Point your iPhone camera here. |
| guard.android | Por enquanto, só no iPhone. | iPhone only, for now. |
| info.built / info.signed / info.open / info.github | O cartão é montado neste aparelho. / Só uma impressão digital ilegível é enviada para assinatura. / Código aberto. / Ver no GitHub | The card is built on this device. / Only an unreadable fingerprint is sent for signing. / Open source. / View on GitHub |
| pass.edit / pass.disclaimer / pass.copyPaste | Editar este cartão / Não é documento oficial. / Pix copia e cola | Edit this card / Not an official document. / Pix copy and paste |

### Privacy and security model
- The app makes one kind of network call: `POST /api/sign` with a 32-byte body. Everything else is same-origin static files.
- `pass.json` contains the card's random 128-bit serial number. That makes the manifest hash impossible to brute-force back to a CPF, even though there are only about a billion possible CPFs.
- The Worker keeps nothing. It has no storage bindings and logs no request data. Workers Logs are on by default for new Workers, so the config turns them off, and Task 13 checks the dashboard to confirm.
- **Known risk:** `/api/sign` signs any hash it receives, so anyone could sign their own pass under our Pass Type ID. Mitigations:
  - A same-origin check (`Sec-Fetch-Site`) and a per-IP rate limit.
  - If the endpoint is abused, revoke the certificate and issue a new one. Keeping the same Pass Type ID means updates still work.
- The edit link's data ends up in the user's own Safari history. The app removes it from the address bar on load.
- The CSP is strict. There are no third-party resources and no cookies.

