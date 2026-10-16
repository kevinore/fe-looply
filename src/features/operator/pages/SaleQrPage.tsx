import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { keys } from '@/app/keys';
import { sendEvent } from '@/lib/events';
import { formatCop } from '@/lib/money';
import { useWakeLock } from '@/lib/wakeLock';
import { Button, ButtonLink, ErrorState, LiveDot, LoadingState, Pill, Screen, TextButton } from '@/ui';
import { saleQuery } from '../api';
import { paymentLabel } from '../labels';
import { SaleQr } from '../SaleQr';
import { usePendingSales } from '../pendingSales';
import { VoidSaleSheet } from '../VoidSaleSheet';

/**
 * 04 — QR de venta. The customer scans it; SaleWatcher (in the layout) watches
 * the sale from any screen, so "Siguiente venta" never loses the scan: when it
 * comes, a notification appears, and if this screen is open it returns to Venta.
 */
export default function SaleQrPage() {
  const { saleId = '' } = useParams();
  const navigate = useNavigate();
  useWakeLock();
  const qc = useQueryClient();
  const sale = useQuery(saleQuery(saleId));
  const [voidOpen, setVoidOpen] = useState(false);
  const watch = usePendingSales((s) => s.watch);
  const forget = usePendingSales((s) => s.forget);
  const watching = usePendingSales((s) => !!s.items[saleId]);
  const paid = sale.data?.status === 'paid';

  // Showing the QR (again) starts watching for its scan. Old status data is
  // dropped first: after an unlink it would still say "claimed".
  useEffect(() => {
    if (!sale.data || sale.data.status !== 'paid') return;
    qc.removeQueries({ queryKey: keys.saleStatus(saleId), exact: true });
    watch(sale.data);
  }, [sale.data, saleId, qc, watch]);

  // Already claimed (e.g. opened from history): show the linked sale instead.
  useEffect(() => {
    if (sale.data?.status === 'claimed') navigate(`/admin/sale/${saleId}`, { replace: true });
  }, [sale.data?.status, navigate, saleId]);

  const shown = useRef(false);
  useEffect(() => {
    if (paid && !shown.current) {
      shown.current = true;
      sendEvent('sale_qr_shown', {}, saleId, 'admin');
    }
  }, [paid, saleId]);

  if (sale.isPending)
    return (
      <Screen tone="primary">
        <LoadingState />
      </Screen>
    );
  if (sale.isError)
    return (
      <Screen>
        <ErrorState error={sale.error} onRetry={() => void sale.refetch()} />
        <ButtonLink to="/admin" variant="dark">
          Volver a la venta
        </ButtonLink>
      </Screen>

    );
  const s = sale.data;

  if (s.status === 'void')
    return (
      <Screen className="items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">Venta anulada</h1>
        <p className="text-brand-muted">{s.void_reason}</p>
        <ButtonLink to="/admin" variant="dark">
          Siguiente venta
        </ButtonLink>
      </Screen>

    );
  return (
    <Screen
      tone="primary"
      className="items-center justify-center gap-4 text-center"
      footer={
        <div className="grid gap-1">
          <div className="grid grid-cols-2 gap-2 whitespace-nowrap">
            <ButtonLink to={`/admin/search?saleId=${saleId}`} variant="light" className="px-3">
              Buscar cliente
            </ButtonLink>
            <Button
              variant="dark"
              className="px-3"
              onClick={() => {
                sendEvent('sale_skipped', {}, saleId, 'admin');
                navigate('/admin');
              }}
            >
              Siguiente venta
            </Button>
          </div>
          <TextButton className="underline" onClick={() => setVoidOpen(true)}>
            Anular venta
          </TextButton>
        </div>
      }
    >
      <p className="animate-rise pt-2 text-sm font-semibold">
        {formatCop(s.total_cop)} · {paymentLabel(s.payment_method)}
      </p>
      <h1 className="animate-rise text-[2rem] leading-tight font-semibold [animation-delay:40ms]">
        Escanea y gira la ruleta
      </h1>
      <div className="w-full max-w-[22rem] animate-rise rounded-3xl bg-white p-3 shadow-sheet [animation-delay:80ms]">
        <SaleQr value={s.claim_url} className="aspect-square w-full min-w-[16.25rem] [&>svg]:h-full [&>svg]:w-full" />
      </div>
      <Pill tone="light" className="py-1.5 text-sm">
        {!watching ? (
          'Ya no se consulta el escaneo'
        ) : (
          <>
            <LiveDot className="text-brand-primary-strong" /> Esperando escaneo…
          </>
        )}
      </Pill>
      {watching && (
        <p className="max-w-xs text-sm">Puedes seguir vendiendo: te avisamos apenas lo escanee.</p>
      )}
      <VoidSaleSheet
        saleId={saleId}
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onVoided={() => {
          forget(saleId);
          navigate('/admin', { replace: true });
        }}
      />
    </Screen>
  );
}
