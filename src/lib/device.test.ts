import { isAndroid, isIOS, isIOSChrome, isIOSSafari, isStandalone } from './device';

const setUA = (ua: string, touch = 0) => {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touch, configurable: true });
};

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

describe('device', () => {
  it('iPhone Safari', () => {
    setUA(IPHONE_SAFARI, 5);
    expect([isIOS(), isIOSSafari(), isIOSChrome(), isAndroid()]).toEqual([true, true, false, false]);
  });
  it('iPhone Chrome', () => {
    setUA(IPHONE_CHROME, 5);
    expect([isIOS(), isIOSSafari(), isIOSChrome(), isAndroid()]).toEqual([true, false, true, false]);
  });
  it('Android', () => {
    setUA(ANDROID, 5);
    expect([isIOS(), isAndroid()]).toEqual([false, true]);
  });
  it('iPadOS reports as Mac but has touch', () => {
    setUA(IPAD, 5);
    expect(isIOS()).toBe(true);
    setUA(IPAD, 0);
    expect(isIOS()).toBe(false);
  });
  it('standalone via navigator.standalone', () => {
    expect(isStandalone()).toBe(false);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isStandalone()).toBe(true);
  });
});
