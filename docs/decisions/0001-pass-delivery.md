# 0001: How the finished pass reaches Wallet

**Status: Provisional.** The iPhone spike (plan Task 0) hasn't run yet: it waits on the
Apple Pass Type ID certificate. This record picks the method Apple documents so the app can
be built now. Revisit it once the checklist below has been run on a device; any rework is
limited to `src/pass/deliver.ts` and `public/sw.js`.

## Context

The pass is built and zipped in the browser. Only `SHA-256(manifest.json)` goes to the
Worker, which returns the detached signature. The finished `.pkpass` bytes exist only in the
page, so the page must hand them to Safari in a way that opens the "Add to Apple Wallet" sheet.

The candidates from the spike plan:

- (a) `location.assign(URL.createObjectURL(blob))`. Reports contradict each other.
- (b) `<a href="blob:…">`, without and with `download`.
- (c) A same-origin URL answered by a service worker with
  `Content-Type: application/vnd.apple.pkpass`.

Apple documents one delivery path for passes on the web: a navigation to a URL whose response
has the pkpass MIME type.

## Decision

Use **(c), the service-worker response**, because it mirrors Apple's documented path.

- `registerPassWorker()` registers `/sw.js` with scope `/` on startup. The worker calls
  `skipWaiting()` and `clients.claim()`.
- `deliverPass(blob)` reads the serial from the pass, empties the Cache Storage cache
  `colinha-pass`, stores `new Response(blob, {headers: {'Content-Type': 'application/vnd.apple.pkpass'}})`
  at `/__pass/<serial>.pkpass`, waits for `navigator.serviceWorker.ready`, then calls
  `location.assign('/__pass/<serial>.pkpass')`.
- `public/sw.js` answers same-origin GET requests to `/__pass/*.pkpass` from that cache (404 if
  absent) and leaves every other request alone.
- `clearPassCache()` deletes the cache; Erase everything calls it.
- In e2e builds (`VITE_E2E=1`) the blob goes to `window.__lastPass` instead.

## Fallback

If the browser has no service worker or Cache Storage, if no worker is registered
(`getRegistration()` finds none), or if `navigator.serviceWorker.ready` takes longer than 3 seconds,
`deliverPass` clicks
`<a href="blob:…" download="colinha.pkpass">`. The file lands in Safari's downloads and tapping
it opens Wallet. If the device checks show that (c) doesn't open the sheet but (b) does, switch
`deliverPass` to this path for everyone. Either way, pass bytes never leave the device and never
go through the Worker.

## To confirm on device

Copied from the spike checks in plan Task 0. Record each result here and change the status to
**Accepted** (or pick another method).

- [ ] Which methods open the Wallet sheet: (a) `location.assign(URL.createObjectURL(blob))`,
      (b) `<a href=blob:>` without and with `download`, (c) the service-worker URL.
- [ ] Re-adding a pass with the same serial replaces the old one, and whether the sheet says
      Add or Update. (If it creates a duplicate, record it: the Editor then shows
      `note.duplicate` after a re-add.)
- [ ] The back-field link opens Safari with the `#` part intact.
- [ ] `"dataDetectorTypes": []` stops the CPF from being detected as a phone number.
- [ ] The barcode falls back to the QR code on Apple Watch.
- [ ] What happens in Chrome on iOS, and in the in-app browsers of Instagram,
      Facebook/Messenger, TikTok and WhatsApp (WhatsApp probably opens SFSafariViewController).
- [ ] Note: the latest pass stays in Cache Storage until the next delivery or until "Erase everything".
- [ ] On an iPad, if available, whether it can add passes at all. Reports say it can't.
- [ ] Also note: the edit and disclaimer back fields use an empty `label`. PassKit treats
      labels as optional; if Wallet rejects or mis-renders them, use `ORG_NAME` instead.
