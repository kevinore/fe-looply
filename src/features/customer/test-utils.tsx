import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import type { Card } from '@/api/types';

export function makeCard(over: Partial<Card> = {}): Card {
  return {
    customer: { id: 'c1', alias: 'Ana', phone_last4: '4567' },
    purchases: 3,
    milestone_every: 5,
    progress: 3,
    purchases_to_next_spin: 2,
    available_spins: [],
    active_prizes: [],
    ...over,
  };
}

/** Shows the current path + state so tests can assert navigation. */
export function Where() {
  const loc = useLocation();
  return (
    <div>
      <p data-testid="path">{loc.pathname}</p>
      <pre data-testid="state">{JSON.stringify(loc.state ?? null)}</pre>
    </div>
  );
}

export function renderRoutes(
  routes: Array<{ path: string; element: ReactNode }>,
  initial: { pathname: string; search?: string; state?: unknown },
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [...routes, { path: '*', element: <Where /> }],
    { initialEntries: [{ pathname: initial.pathname, search: initial.search ?? '', state: initial.state }] },
  );
  const utils = render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, qc };
}
