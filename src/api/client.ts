import createClient from 'openapi-fetch';
import { ApiError } from './errors';
import type { paths } from './schema';

/**
 * Same-origin client: always relative /api/... paths. In production Vercel
 * rewrites /api to the backend so session cookies stay first-party (Safari).
 */
export const api = createClient<paths>({
  // Same origin. Explicit so Request() can resolve /api paths outside a page (tests).
  baseUrl: globalThis.location?.origin ?? '',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  // Wrap fetch so a network failure becomes a typed ApiError.
  fetch: async (request: Request) => {
    try {
      return await fetch(request);
    } catch {
      throw new ApiError('network_error');
    }
  },
});

type ErrorBody = { error?: { code?: string; message?: string; extra?: Record<string, unknown> | null } };

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Returns `data` on success; throws ApiError otherwise. */
export async function unwrap<T>(promise: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await promise;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('network_error');
  }
  const { data, error, response } = result;
  if (response.ok) return data as T;
  const body = error as ErrorBody | undefined;
  const code = body?.error?.code ?? (response.status >= 500 ? 'internal_error' : 'validation_error');
  throw new ApiError(code, response.status, body?.error?.extra ?? {});
}
