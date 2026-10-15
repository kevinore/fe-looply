import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { persistQueries } from './persist';

type AuthHandler = (error: unknown) => void;
let onAuthError: AuthHandler = () => {};

/** Registered by the router so any 401 in /op sends the operator to login. */
export function setAuthErrorHandler(fn: AuthHandler) {
  onAuthError = fn;
}

const handle = (error: unknown) => {
  if (isApiError(error, 'not_authenticated')) onAuthError(error);
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handle }),
  mutationCache: new MutationCache({ onError: handle }),
  defaultOptions: {
    queries: {
      // Reads retry twice, but only when it can help (network or server errors).
      retry: (count, error) =>
        count < 2 && (!isApiError(error) || error.code === 'network_error' || error.status >= 500),
      retryDelay: (n) => Math.min(800 * 2 ** n, 4000),
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
    // Writes never retry automatically (plan §9.4).
    mutations: { retry: false },
  },
});

// Paint the first screen with last known data; refreshed in the background.
persistQueries(queryClient);
