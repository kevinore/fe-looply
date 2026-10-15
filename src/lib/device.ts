const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);

export function isIOS(): boolean {
  const u = ua();
  if (/iPad|iPhone|iPod/.test(u)) return true;
  // iPadOS 13+ reports itself as Mac; touch support gives it away.
  return /Macintosh/.test(u) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
}

export function isIOSChrome(): boolean {
  return isIOS() && /CriOS/.test(ua());
}

export function isIOSSafari(): boolean {
  return isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua());
}

export function isAndroid(): boolean {
  return /Android/i.test(ua());
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Short haptic tap; silently ignored where unsupported (iPhone). */
export function vibrate(ms = 40): void {
  if (canVibrate()) navigator.vibrate(ms);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
