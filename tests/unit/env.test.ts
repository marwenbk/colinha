import { describe, expect, it } from 'vitest';
import { detectEnv } from '../../src/env/detect';
import { UA } from '../../e2e/user-agents';

describe('detectEnv', () => {
  const cases: [name: string, ua: string, touch: number, platform: string, inApp: boolean][] = [
    ['iOS Safari', UA.iosSafari, 5, 'ios', false],
    ['iOS Chrome (CriOS)', UA.iosChrome, 5, 'ios', false],
    ['Instagram', UA.instagram, 5, 'ios', true],
    ['Facebook (FBAN)', UA.facebook, 5, 'ios', true],
    ['Messenger (FBAN/MessengerForiOS)', UA.messenger, 5, 'ios', true],
    ['TikTok', UA.tiktok, 5, 'ios', true],
    ['Android Chrome', UA.androidChrome, 5, 'android', false],
    ['macOS Safari', UA.macSafari, 0, 'desktop', false],
    ['iPadOS (Macintosh, 5 touch points)', UA.macSafari, 5, 'desktop', false],
  ];

  for (const [name, ua, touch, platform, inApp] of cases) {
    it(`${name} -> ${platform}${inApp ? ', in-app' : ''}`, () => {
      const env = detectEnv(ua, touch);
      expect(env.platform).toBe(platform);
      expect(env.inApp !== null).toBe(inApp);
    });
  }

  it('names the in-app browser', () => {
    expect(detectEnv(UA.instagram, 5).inApp).toBe('instagram');
    expect(detectEnv(UA.facebook, 5).inApp).toBe('facebook');
    expect(detectEnv(UA.messenger, 5).inApp).toBe('messenger');
    expect(detectEnv(UA.tiktok, 5).inApp).toBe('tiktok');
  });
});
