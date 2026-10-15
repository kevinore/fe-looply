/** Query keys shared across features. */
export const keys = {
  business: ['c', 'business'] as const,
  me: ['c', 'me'] as const,
  wheel: ['c', 'wheel'] as const,
  history: ['c', 'history'] as const,
  prize: (id: string) => ['c', 'prize', id] as const,
  claim: (token: string) => ['c', 'claim', token] as const,

  opMe: ['op', 'me'] as const,
  workday: ['op', 'workday'] as const,
  products: ['op', 'products'] as const,
  sale: (id: string) => ['op', 'sale', id] as const,
  saleStatus: (id: string) => ['op', 'sale', id, 'status'] as const,
  customerSearch: (last4: string) => ['op', 'customers', 'search', last4] as const,
  customer: (id: string) => ['op', 'customer', id] as const,
  pendingPrizes: (filter: string) => ['op', 'prizes', 'pending', filter] as const,
  workdayStats: (id: string) => ['op', 'stats', 'workday', id] as const,
  workdaySales: (id: string) => ['op', 'workday', id, 'sales'] as const,
  opHistory: (from: string, to: string) => ['op', 'stats', 'history', from, to] as const,
};
