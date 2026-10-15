import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Silent updates. A new deploy installs in the background and waits; the
 * running version keeps working from its own precache. The switch happens only
 * while the app is hidden (user switched apps or locked the phone) and nothing
 * in progress would be lost, so it is never seen. If that moment never comes,
 * the new version starts on the next cold launch.
 */

const CHECK_EVERY_MS = 30 * 60_000;

/** Reasons that currently block a switch (open cart, half-filled form…). */
const holds = new Set<string>();
let updateReady = false;
let applying = false;
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

function safeToSwitch(): boolean {
  return holds.size === 0 && !document.querySelector('dialog[open]');
}

function tryApply(): void {
  if (!updateReady || applying || !applyUpdate) return;
  if (document.visibilityState !== 'hidden' || !safeToSwitch()) return;
  applying = true;
  // Reload once the new worker takes control. Done here, not by the plugin: its
  // reload is skipped when the worker was first installed during this visit.
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  });
  void applyUpdate(true);
}

export function setupSilentUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  // Registers after the load event, so precaching never competes with first paint.
  applyUpdate = registerSW({
    // We reload ourselves in tryApply().
    onNeedReload() {},
    onNeedRefresh() {
      updateReady = true;
      tryApply();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {});
      };
      // Look for a new version when the app comes back to the foreground…
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      // …and periodically for screens left open all day (operator).
      window.setInterval(check, CHECK_EVERY_MS);
    },
  });
  document.addEventListener('visibilitychange', tryApply);
}

/** Set or clear a reason that blocks the background switch. */
export function holdUpdates(key: string, active: boolean): void {
  if (active) holds.add(key);
  else holds.delete(key);
}

/** Blocks the background switch while the component is mounted and `active`. */
export function useHoldUpdates(key: string, active = true): void {
  useEffect(() => {
    holdUpdates(key, active);
    return () => holdUpdates(key, false);
  }, [key, active]);
}
