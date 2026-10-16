/** Query keys shared across features. */
export const keys = {
  business: ['client', 'business'] as const,
  me: ['client', 'me'] as const,
  wheel: ['client', 'wheel'] as const,
  history: ['client', 'history'] as const,
  prize: (id: string) => ['client', 'prize', id] as const,
  claim: (token: string) => ['client', 'claim', token] as const,

  adminMe: ['admin', 'me'] as const,
  workday: ['admin', 'workday'] as const,
  products: ['admin', 'products'] as const,
  sale: (id: string) => ['admin', 'sale', id] as const,
  saleStatus: (id: string) => ['admin', 'sale', id, 'status'] as const,
  customerSearch: (last4: string) => ['admin', 'customers', 'search', last4] as const,
  customer: (id: string) => ['admin', 'customer', id] as const,
  prizeCatalog: ['admin', 'prizes', 'catalog'] as const,
  pendingPrizes: (filter: string) => ['admin', 'prizes', 'pending', filter] as const,
  workdayStats: (id: string) => ['admin', 'stats', 'workday', id] as const,
  workdaySales: (id: string) => ['admin', 'workday', id, 'sales'] as const,
  adminHistory: (from: string, to: string) => ['admin', 'stats', 'history', from, to] as const,
};
