export type Platform = 'ios' | 'android' | 'desktop';
export type Env = { platform: Platform; inApp: string | null };

// In-app browsers that can't hand a pass to Wallet. Order matters: Messenger's
// user agent also carries Facebook's FBAN marker.
const IN_APP: [name: string, re: RegExp][] = [
  ['messenger', /FBAN\/Messenger|MessengerForiOS|FB_IAB\/MESSENGER/i],
  ['instagram', /\bInstagram\b/],
  ['facebook', /\bFBAN\/|\bFBAV\/|\bFB_IAB\//],
  ['tiktok', /musical_ly|BytedanceWebview|\bTikTok\b/i],
  ['snapchat', /\bSnapchat\b/],
  ['line', /\bLine\/\d/],
  ['linkedin', /\bLinkedInApp\b/],
  ['twitter', /\bTwitter(?:Android|for)?\b/],
];

/**
 * Where the page runs. iPadOS reports a Mac user agent, so a "Macintosh" with
 * touch points is an iPad; iPads can't add passes, so they count as desktop and
 * get the handoff QR. Chrome on iOS (`CriOS`) is treated as a normal iOS browser:
 * decision 0001 hasn't found that it can't add passes.
 */
export function detectEnv(ua: string, maxTouchPoints: number): Env {
  const inApp = IN_APP.find(([, re]) => re.test(ua))?.[0] ?? null;
  if (/\b(iPhone|iPod)\b/.test(ua)) return { platform: 'ios', inApp };
  if (/\biPad\b/.test(ua) || (/\bMacintosh\b/.test(ua) && maxTouchPoints > 1))
    return { platform: 'desktop', inApp };
  if (/\bAndroid\b/.test(ua)) return { platform: 'android', inApp };
  return { platform: 'desktop', inApp };
}
