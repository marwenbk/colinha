# Add to Apple Wallet badges

**These SVGs are placeholders.** Before launch, replace all four files with
Apple's official "Add to Apple Wallet" artwork, downloaded from
<https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/>, and keep
the same file names:

| File | Use |
|---|---|
| `add-to-apple-wallet-pt.svg` | Portuguese (Brazil), light mode |
| `add-to-apple-wallet-en.svg` | English, light mode |
| `add-to-apple-wallet-pt-outline.svg` | Portuguese (Brazil), dark mode (Apple's outline version) |
| `add-to-apple-wallet-en-outline.svg` | English, dark mode (Apple's outline version) |

Apple's rules, which `src/ui/WalletBadge.svelte` follows: use the artwork
unmodified; never animate, shadow or dim it; keep clear space of at least
0.1 x the badge height on every side. If the official artwork's aspect ratio
differs from 160x48, update the `width`/`height` on the `<img>` in
`WalletBadge.svelte`.
