import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import type { Product, SaleCreate } from '@/api/types';
import { keys } from '@/app/keys';

export const saleQuery = (id: string) =>
  queryOptions({ queryKey: keys.sale(id), queryFn: () => unwrap(api.GET('/api/op/sales/{sale_id}', { params: { path: { sale_id: id } } })) });

export const customerQuery = (id: string) =>
  queryOptions({
    queryKey: keys.customer(id),
    queryFn: () => unwrap(api.GET('/api/op/customers/{customer_id}', { params: { path: { customer_id: id } } })),
  });

export const searchQuery = (last4: string) =>
  queryOptions({
    queryKey: keys.customerSearch(last4),
    queryFn: () => unwrap(api.GET('/api/op/customers/search', { params: { query: { last4 } } })),
    enabled: /^\d{4}$/.test(last4),
    staleTime: 5_000,
  });

export type PendingFilter = 'expiring' | 'free' | 'all';

export const pendingQuery = (filter: PendingFilter) =>
  queryOptions({
    queryKey: keys.pendingPrizes(filter),
    queryFn: () => unwrap(api.GET('/api/op/prizes/pending', { params: { query: { filter } } })),
  });

export const workdayStatsQuery = (id: string) =>
  queryOptions({
    queryKey: keys.workdayStats(id),
    queryFn: () => unwrap(api.GET('/api/op/stats/workdays/{workday_id}', { params: { path: { workday_id: id } } })),
  });

/** Sales of a workday, newest first, a page at a time (the list loads more on scroll). */
export const SALES_PAGE_SIZE = 20;
export const workdaySalesQuery = (id: string) =>
  infiniteQueryOptions({
    queryKey: keys.workdaySales(id),
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/api/op/workdays/{workday_id}/sales', {
          params: { path: { workday_id: id }, query: { limit: SALES_PAGE_SIZE, cursor: pageParam ?? undefined } },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });

export const historyQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: keys.opHistory(from, to),
    queryFn: () => unwrap(api.GET('/api/op/stats/history', { params: { query: { from, to } } })),
  });

type PrizeValue = { type: string; value: number; max_value_cop: number | null };

/**
 * Display-only estimate of a prize discount, mirroring the backend rule
 * (percent of one unit, capped by max_value_cop). The sale computes the real one.
 */
export function estimateDiscount(prize: PrizeValue, product: Pick<Product, 'price_cop'> | undefined): number | null {
  if (!product) return null;
  if (prize.type === 'extra_item') return 0;
  const cap = prize.max_value_cop ?? product.price_cop;
  if (prize.type === 'percent_off') return Math.min(Math.round((product.price_cop * prize.value) / 100), cap);
  if (prize.type === 'free_item') return Math.min(product.price_cop, cap);
  return null;
}

// ---- writes ----

export const openWorkday = () => unwrap(api.POST('/api/op/workdays/open'));
export const closeWorkday = () => unwrap(api.POST('/api/op/workdays/current/close'));

export const createSale = (body: SaleCreate, idempotencyKey: string) =>
  unwrap(api.POST('/api/op/sales', { params: { header: { 'Idempotency-Key': idempotencyKey } }, body }));

export const linkSale = (saleId: string, customerId: string) =>
  unwrap(api.POST('/api/op/sales/{sale_id}/link', { params: { path: { sale_id: saleId } }, body: { customer_id: customerId } }));

export const unlinkSale = (saleId: string) =>
  unwrap(api.POST('/api/op/sales/{sale_id}/unlink', { params: { path: { sale_id: saleId } } }));

export const voidSale = (saleId: string, reason: string) =>
  unwrap(api.POST('/api/op/sales/{sale_id}/void', { params: { path: { sale_id: saleId } }, body: { reason } }));

export const redeemPrize = (saleId: string, prizeAwardId: string, productId: string | null, optionIds: string[] = []) =>
  unwrap(
    api.POST('/api/op/sales/{sale_id}/redeem-prize', {
      params: { path: { sale_id: saleId } },
      body: { prize_award_id: prizeAwardId, product_id: productId, option_ids: optionIds },
    }),
  );

export const logout = () => unwrap(api.POST('/api/op/auth/logout'));

/**
 * Display-only progress toward the next spin from purchases/milestone_every,
 * for screens where the API doesn't return the card (see report: API gap).
 * Mirrors the backend's build_card: a just-reached milestone shows as full
 * ("5 de 5"), not empty, while `remaining` already counts toward the next one.
 */
export function displayProgress(purchases: number, every: number | null | undefined) {
  if (!every || every <= 0) return null;
  const mod = purchases % every;
  const progress = purchases > 0 && mod === 0 ? every : mod;
  return { progress, every, remaining: every - mod };
}
