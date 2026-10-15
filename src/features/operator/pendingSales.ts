import { create } from 'zustand';

/**
 * Sales whose QR was shown and that nobody has scanned yet. They are watched in
 * the background (SaleWatcher) so the operator can keep selling: when one is
 * claimed, a notification appears on whatever screen is open.
 *
 * Kept in sessionStorage so a reload doesn't forget them. Watching stops after
 * WATCH_MS (plan §8.5); reopening the QR starts it again.
 */
export const WATCH_MS = 10 * 60_000;
const STORAGE_KEY = 'op:pending-sales';

export type PendingSale = { id: string; totalCop: number; since: number };

type State = {
  items: Record<string, PendingSale>;
  watch: (sale: { id: string; total_cop: number }) => void;
  forget: (id: string) => void;
  dropExpired: (now?: number) => void;
};

function load(): Record<string, PendingSale> {
  try {
    const items = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      PendingSale
    >;
    const now = Date.now();
    return Object.fromEntries(Object.entries(items).filter(([, s]) => now - s.since < WATCH_MS));
  } catch {
    return {};
  }
}

export const usePendingSales = create<State>((set, get) => ({
  items: load(),
  watch: (sale) =>
    set({
      items: {
        ...get().items,
        [sale.id]: { id: sale.id, totalCop: sale.total_cop, since: Date.now() },
      },
    }),
  forget: (id) => {
    if (!get().items[id]) return;
    const items = { ...get().items };
    delete items[id];
    set({ items });
  },
  dropExpired: (now = Date.now()) => {
    const items = get().items;
    const kept = Object.fromEntries(
      Object.entries(items).filter(([, s]) => now - s.since < WATCH_MS),
    );
    if (Object.keys(kept).length !== Object.keys(items).length) set({ items: kept });
  },
}));

usePendingSales.subscribe((s) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s.items));
  } catch {
    // Storage blocked: watching still works until the next reload.
  }
});

/** Most recent sale still waiting for a scan, if any. */
export function latestPending(items: Record<string, PendingSale>): PendingSale | undefined {
  return Object.values(items).sort((a, b) => b.since - a.since)[0];
}
