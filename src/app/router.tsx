import type { ComponentType } from 'react';
import { createBrowserRouter, redirect } from 'react-router';
import { CustomerLayout } from '@/features/customer/CustomerLayout';
import { setAuthErrorHandler } from './queryClient';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

/** Route-level code splitting: each screen is its own chunk. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, loader: () => redirect('/client') },

      // Client zone — light and fast. Never imports operator code.
      {
        path: 'client',
        element: <CustomerLayout />,
        children: [
          { index: true, lazy: page(() => import('@/features/customer/pages/CardPage')) },
          { path: 'claim/:token', lazy: page(() => import('@/features/customer/pages/ClaimPage')) },
          { path: 'register/:token', lazy: page(() => import('@/features/customer/pages/RegisterPage')) },
          { path: 'confirm/:token', lazy: page(() => import('@/features/customer/pages/ConfirmPage')) },
          { path: 'claimed', lazy: page(() => import('@/features/customer/pages/ClaimedPage')) },
          { path: 'spin/:spinId', lazy: page(() => import('@/features/customer/pages/SpinPage')) },
          { path: 'prize/:awardId', lazy: page(() => import('@/features/customer/pages/PrizePage')) },
          { path: 'prize/:awardId/use', lazy: page(() => import('@/features/customer/pages/PrizeUsePage')) },
          { path: 'prizes', lazy: page(() => import('@/features/customer/pages/PrizesPage')) },
          { path: 'scan', lazy: page(() => import('@/features/customer/pages/ScanPage')) },
          { path: 'install', lazy: page(() => import('@/features/customer/pages/InstallPage')) },
          { path: 'history', lazy: page(() => import('@/features/customer/pages/HistoryPage')) },
          { path: 'privacy', lazy: page(() => import('@/features/customer/pages/PrivacyPage')) },
        ],
      },

      // Operator zone — loaded on demand only.
      { path: 'admin/login', lazy: page(() => import('@/features/operator/pages/LoginPage')) },
      { path: 'admin/install', lazy: page(() => import('@/features/operator/pages/InstallPage')) },
      {
        path: 'admin',
        lazy: async () => ({ Component: (await import('@/features/operator/OperatorLayout')).OperatorLayout }),
        children: [
          { index: true, lazy: page(() => import('@/features/operator/pages/HomePage')) },
          { path: 'sale/:saleId/qr', lazy: page(() => import('@/features/operator/pages/SaleQrPage')) },
          { path: 'sale/:saleId', lazy: page(() => import('@/features/operator/pages/SaleDetailPage')) },
          { path: 'search', lazy: page(() => import('@/features/operator/pages/SearchPage')) },
          { path: 'prizes', lazy: page(() => import('@/features/operator/pages/PrizesPage')) },
          { path: 'wheel', lazy: page(() => import('@/features/operator/pages/WheelEditorPage')) },
          { path: 'summary', lazy: page(() => import('@/features/operator/pages/SummaryPage')) },
          { path: 'history', lazy: page(() => import('@/features/operator/pages/HistoryPage')) },
          { path: 'workdays/:workdayId', lazy: page(() => import('@/features/operator/pages/WorkdayDetailPage')) },
        ],
      },

      // Component gallery, development only (stripped from production builds).
      ...(import.meta.env.DEV ? [{ path: 'dev/ui', lazy: page(() => import('@/dev/UiGallery')) }] : []),
    ],
  },
]);

setAuthErrorHandler(() => {
  const { pathname, search } = window.location;
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    void router.navigate(`/admin/login?next=${encodeURIComponent(pathname + search)}`, { replace: true });
  }
});
