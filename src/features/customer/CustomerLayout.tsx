import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import type { Branding } from '@/api/types';
import { BrandProvider } from '@/brand/BrandProvider';
import { reportPageLoaded } from '@/lib/events';
import { HomeScreenBar } from '@/ui/HomeScreenBar';
import { businessQuery } from './queries';

/** One-shot steps where the home-screen bar would get in the way (claim, spin, camera, …). */
const NO_HOME_SCREEN_BAR = /^\/client\/(claim|register|confirm|spin|install|scan)(\/|$)|^\/client\/prize\/[^/]+\/use/;

/** Client zone: branding from GET /api/client/business. Renders immediately with fallbacks. */
export function CustomerLayout() {
  const { data } = useQuery(businessQuery);
  const { pathname } = useLocation();
  // Route modules load before render, so this fires once the first screen is painted.
  useEffect(() => reportPageLoaded(), []);
  return (
    <BrandProvider branding={data?.branding as Branding | undefined} name={data?.name}>
      {!NO_HOME_SCREEN_BAR.test(pathname) && <HomeScreenBar zone="client" name={data?.name ?? ''} />}
      <Outlet />
    </BrandProvider>
  );
}
