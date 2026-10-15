import { createContext, use, useLayoutEffect, type ReactNode } from 'react';
import type { Branding } from '@/api/types';
import { applyBranding } from './brand';

type BrandValue = { branding: Branding; name: string };

const BrandContext = createContext<BrandValue>({ branding: {}, name: '' });

/**
 * Applies `branding` as CSS variables on :root. Each zone passes its own source:
 * the client zone uses GET /api/c/business, the operator zone /api/op/auth/me.
 */
export function BrandProvider({
  branding,
  name,
  children,
}: {
  branding: Branding | undefined;
  name?: string;
  children: ReactNode;
}) {
  const value: BrandValue = { branding: branding ?? {}, name: branding?.display_name ?? name ?? '' };
  useLayoutEffect(() => {
    applyBranding(branding, name);
  }, [branding, name]);
  return <BrandContext value={value}>{children}</BrandContext>;
}

export function useBrand(): BrandValue {
  return use(BrandContext);
}
