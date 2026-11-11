// Real-world user agent strings (iOS 18.5 / current app builds), shared by the
// detectEnv unit matrix and the guard e2e specs.
const IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

export const UA = {
  iosSafari: `${IOS} Version/18.5 Mobile/15E148 Safari/604.1`,
  iosChrome: `${IOS} CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1`,
  instagram: `${IOS} Mobile/15E148 Instagram 389.0.0.29.87 (iPhone15,3; iOS 18_5; pt_BR; pt; scale=3.00; 1290x2796; 761853545) NW/3`,
  facebook: `${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/519.0.0.38.104;FBBV/736287409;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBID/phone;FBLC/pt_BR;FBOP/5;FBRV/740071256]`,
  messenger: `${IOS} Mobile/15E148 [FBAN/MessengerForiOS;FBAV/512.0.0.47.109;FBBV/726123553;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBCR/;FBID/phone;FBLC/pt_BR;FBOP/5;FBRV/0]`,
  tiktok: `${IOS} Mobile/15E148 musical_ly_40.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/pt Region/BR isDarkMode/0 WKWebView/1 RevealType/Dialog BytedanceWebview/d8a21c6`,
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
} as const;
