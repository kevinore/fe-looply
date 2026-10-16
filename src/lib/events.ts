type Zone = 'client' | 'admin';

/**
 * Fire-and-forget analytics event. Never blocks the UI and never throws.
 * sendBeacon can't set Content-Type: application/json on all browsers
 * (the backend requires it), so we use fetch keepalive instead.
 */
export function sendEvent(
  type: string,
  payload: Record<string, unknown> = {},
  saleId: string | null = null,
  zone: Zone = 'client',
): void {
  try {
    const body = JSON.stringify({ type, sale_id: saleId, payload, client_ts: new Date().toISOString() });
    void fetch(`/api/${zone}/events`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

let pageLoadedSent = false;

/** `page_loaded` once per app load, when the first screen has rendered. */
export function reportPageLoaded(): void {
  if (pageLoadedSent) return;
  pageLoadedSent = true;
  requestAnimationFrame(() => sendEvent('page_loaded', { load_ms: Math.round(performance.now()) }));
}
