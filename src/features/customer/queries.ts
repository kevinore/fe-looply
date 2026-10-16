import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import { isApiError } from '@/api/errors';
import type { Card } from '@/api/types';
import { keys } from '@/app/keys';

export const businessQuery = queryOptions({
  queryKey: keys.business,
  queryFn: () => unwrap(api.GET('/api/client/business')),
  staleTime: 10 * 60_000,
});

/**
 * Current customer's card. Resolves to `null` when there is no session (401),
 * so screens can branch without treating "not registered" as an error.
 */
export const meQuery = queryOptions({
  queryKey: keys.me,
  queryFn: async (): Promise<Card | null> => {
    try {
      return await unwrap(api.GET('/api/client/me'));
    } catch (e) {
      if (isApiError(e, 'not_authenticated')) return null;
      throw e;
    }
  },
});
