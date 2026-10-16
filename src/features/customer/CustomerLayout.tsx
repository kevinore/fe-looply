import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import type { Branding } from '@/api/types';
import { BrandProvider } from '@/brand/BrandProvider';
import { reportPageLoaded } from '@/lib/events';
import { businessQuery } from './queries';

/** Client zone: branding from GET /api/client/business. Renders immediately with fallbacks. */
export function CustomerLayout() {
  const { data } = useQuery(businessQuery);
  // Route modules load before render, so this fires once the first screen is painted.
  useEffect(() => reportPageLoaded(), []);
  return (
    <BrandProvider branding={data?.branding as Branding | undefined} name={data?.name}>
      <Outlet />
    </BrandProvider>
  );
}
