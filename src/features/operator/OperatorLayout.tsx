import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { isApiError } from '@/api/errors';
import type { Branding } from '@/api/types';
import { BrandProvider } from '@/brand/BrandProvider';
import { ErrorState, LoadingState, Screen } from '@/ui';
import { ClaimNotices } from './ClaimNotices';
import { opMeQuery } from './queries';
import { SaleWatcher } from './SaleWatcher';

/** Swaps the manifest so "Add to home screen" from /op opens the operator app. */
export function useOperatorManifest() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const prev = link.getAttribute('href');
    link.setAttribute('href', '/manifest-op.webmanifest');
    return () => {
      if (prev) link.setAttribute('href', prev);
    };
  }, []);
}

/** Guard for /op/* (except login): requires GET /api/op/auth/me. */
export function OperatorLayout() {
  useOperatorManifest();
  const location = useLocation();
  const me = useQuery(opMeQuery);

  if (me.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (me.isError) {
    if (isApiError(me.error, 'not_authenticated')) {
      const next = encodeURIComponent(location.pathname + location.search);
      return <Navigate to={`/op/login?next=${next}`} replace />;
    }
    return (
      <Screen>
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }
  const business = me.data.business;
  return (
    <BrandProvider branding={business.branding as Branding} name={business.name}>
      <Outlet />
      {/* Pending QR scans are watched from every screen, so selling never waits. */}
      <SaleWatcher />
      <ClaimNotices />
    </BrandProvider>
  );
}
