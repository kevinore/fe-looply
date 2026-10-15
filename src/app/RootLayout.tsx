import { Outlet, ScrollRestoration } from 'react-router';
import { OfflineBanner, Toaster } from '@/ui';

export function RootLayout() {
  return (
    <>
      <OfflineBanner />
      <Outlet />
      <Toaster />
      <ScrollRestoration />
    </>
  );
}
