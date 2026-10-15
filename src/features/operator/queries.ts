import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import { keys } from '@/app/keys';

export const opMeQuery = queryOptions({
  queryKey: keys.opMe,
  queryFn: () => unwrap(api.GET('/api/op/auth/me')),
  staleTime: 5 * 60_000,
  retry: false,
});

export const workdayQuery = queryOptions({
  queryKey: keys.workday,
  queryFn: () => unwrap(api.GET('/api/op/workdays/current')),
});

export const productsQuery = queryOptions({
  queryKey: keys.products,
  queryFn: () => unwrap(api.GET('/api/op/products')),
  staleTime: 5 * 60_000, // plan §8.3: cache products 5 minutes
});
