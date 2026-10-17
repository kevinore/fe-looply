import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { isApiError } from '@/api/errors';
import type { Branding } from '@/api/types';
import { BrandProvider } from '@/brand/BrandProvider';
import { ErrorState, LoadingState, Screen } from '@/ui';
import { HomeScreenBar } from '@/ui/HomeScreenBar';
import { ClaimNotices } from './ClaimNotices';
import { adminMeQuery } from './queries';
import { SaleWatcher } from './SaleWatcher';

/** Swaps the manifest so "Add to home screen" from /op opens the operator app. */
export function useOperatorManifest() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const prev = link.getAttribute('href');
    link.setAttribute('href', '/manifest-admin.webmanifest');
    return () => {
      if (prev) link.setAttribute('href', prev);
    };
  }, []);
}

/** Guard for /admin/* (except login): requires GET /api/admin/auth/me. */
export function OperatorLayout() {
  useOperatorManifest();
  const location = useLocation();
  const me = useQuery(adminMeQuery);

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
      return <Navigate to={`/admin/login?next=${next}`} replace />;
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
      {/* Not over the sale QR: that screen is for the customer. */}
      {!/^\/admin\/sale\/[^/]+\/qr/.test(location.pathname) && <HomeScreenBar zone="admin" name={business.name} />}
      <Outlet />
      {/* Pending QR scans are watched from every screen, so selling never waits. */}
      <SaleWatcher />
      <ClaimNotices />
    </BrandProvider>
  );
}
