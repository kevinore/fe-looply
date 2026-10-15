import { useEffect } from 'react';

type Sentinel = { release: () => Promise<void>; released: boolean };

/**
 * Keeps the screen on while `active`. Re-acquires when the page becomes visible
 * again and releases on unmount. No-op where unsupported (iOS < 16.4).
 */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: Sentinel | null = null;
    let disposed = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = (await navigator.wakeLock.request('screen')) as Sentinel;
        if (disposed) void s.release();
        else sentinel = s;
      } catch {
        // Denied (battery saver, not visible…): continue without it.
      }
    };

    const onVisibility = () => void request();
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
