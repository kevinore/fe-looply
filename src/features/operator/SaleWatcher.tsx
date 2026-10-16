import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api, unwrap } from '@/api/client';
import { keys } from '@/app/keys';
import { vibrate } from '@/lib/device';
import { useClaimNotices } from './notifications';
import { usePendingSales } from './pendingSales';

const POLL_MS = 2000;

/**
 * Watches every sale whose QR is waiting for a scan, from any operator screen.
 * When one is claimed: notification, and if its QR is the screen on display,
 * back to Venta so the operator can take the next order right away.
 */
export function SaleWatcher() {
  const items = usePendingSales((s) => s.items);
  const forget = usePendingSales((s) => s.forget);
  const dropExpired = usePendingSales((s) => s.dropExpired);
  const push = useClaimNotices((s) => s.push);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const ids = Object.keys(items);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: keys.saleStatus(id),
      queryFn: () =>
        unwrap(api.GET('/api/admin/sales/{sale_id}/status', { params: { path: { sale_id: id } } })),
      refetchInterval: POLL_MS,
      refetchIntervalInBackground: false,
      staleTime: 0,
      retry: 1,
    })),
  });

  useEffect(() => {
    results.forEach((r, i) => {
      const id = ids[i];
      const status = r.data?.status;
      if (!id || !status || status === 'paid') return;
      forget(id);
      // The cached sale is still "paid": refresh it for 05 / history.
      void qc.invalidateQueries({ queryKey: keys.sale(id), exact: true });
      if (status === 'claimed' && r.data?.customer) {
        vibrate(40);
        push({ saleId: id, customer: r.data.customer, totalCop: items[id]?.totalCop ?? null });
        if (pathname === `/admin/sale/${id}/qr`) navigate('/admin', { replace: true });
      }
    });
  });

  // Stop watching sales nobody scanned after a while (plan §8.5).
  useEffect(() => {
    const t = window.setInterval(() => dropExpired(), 15_000);
    return () => window.clearInterval(t);
  }, [dropExpired]);

  return null;
}
