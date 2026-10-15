import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { keys } from './keys';

/**
 * Instant start: a few small reads are kept in localStorage and put back in the
 * cache at boot, so the first screen paints with the last known data and is
 * refreshed silently in the background (they are marked stale on restore).
 * Only this device's own data; nothing about other customers.
 */
// Not the wheel: a stale segment order would make the wheel stop on the wrong label.
const PERSISTED: QueryKey[] = [keys.business, keys.me, keys.opMe, keys.products];
const PREFIX = 'qc:';
const VERSION = 1;
const MAX_AGE_MS = 30 * 86_400_000;

const storageKey = (key: QueryKey) => PREFIX + JSON.stringify(key);
const isPersisted = (key: QueryKey) => PERSISTED.some((k) => storageKey(k) === storageKey(key));

type Entry = { v: number; at: number; data: unknown };

function read(key: QueryKey): Entry | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (entry.v !== VERSION || Date.now() - entry.at > MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function write(key: QueryKey, data: unknown): void {
  try {
    if (data === undefined) localStorage.removeItem(storageKey(key));
    else
      localStorage.setItem(
        storageKey(key),
        JSON.stringify({ v: VERSION, at: Date.now(), data } satisfies Entry),
      );
  } catch {
    // Storage full or blocked (private mode): just don't persist.
  }
}

export function persistQueries(client: QueryClient): void {
  for (const key of PERSISTED) {
    const entry = read(key);
    // updatedAt 0 = stale: shown at once, refetched on first use.
    if (entry) client.setQueryData(key, entry.data, { updatedAt: 0 });
  }
  client.getQueryCache().subscribe((event) => {
    const { query } = event;
    if (!isPersisted(query.queryKey)) return;
    if (event.type === 'removed') write(query.queryKey, undefined);
    else if (event.type !== 'updated') return;
    else if (event.action.type === 'success') write(query.queryKey, query.state.data);
    // Session gone: forget it, so the next launch doesn't flash the old screen.
    else if (event.action.type === 'error' && isApiError(event.action.error, 'not_authenticated'))
      write(query.queryKey, undefined);
  });
}
