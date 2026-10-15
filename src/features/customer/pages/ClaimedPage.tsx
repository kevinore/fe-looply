import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Mascot } from '@/brand/Mascot';
import { isStandalone } from '@/lib/device';
import { installPromptSeen, markInstallPromptSeen } from '@/lib/installPrompt';
import { formatCop } from '@/lib/money';
import { Button, Card, ErrorState, LoadingState, ProgressSegments, Screen } from '@/ui';
import type { ClaimedState } from '../api';
import { meQuery } from '../queries';

/** S2 · +1 compra. */
export default function ClaimedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ClaimedState | null;
  const me = useQuery({ ...meQuery, enabled: !state });

  const card = state?.result.card ?? me.data;
  const counted = state?.result.counted ?? true;
  const sale = state?.sale ?? null;

  if (!card) {
    if (me.isError) {
      return (
        <Screen tone="soft">
          <ErrorState error={me.error} onRetry={() => void me.refetch()} />
        </Screen>
      );
    }
    if (me.isSuccess && me.data === null) return <Navigate to="/c" replace />;
    return (
      <Screen tone="soft">
        <LoadingState />
      </Screen>
    );
  }

  const done = () => {
    const firstPurchase = state !== null && counted && card.purchases === 1;
    if (firstPurchase && !isStandalone() && !installPromptSeen()) {
      markInstallPromptSeen();
      navigate('/c/install', { replace: true });
    } else {
      navigate('/c', { replace: true });
    }
  };

  const toGo = card.purchases_to_next_spin;

  return (
    <Screen
      tone="soft"
      footer={
        <Button variant="dark" onClick={done}>
          Listo
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
        <div className="size-52 overflow-hidden rounded-full bg-white sm:size-60">
          <Mascot pose="drink" priority sizes="240px" className="size-full translate-y-3 scale-110 object-contain" />
        </div>
        <p className="text-sm font-medium text-brand-muted">¡Hola, {card.customer.alias}!</p>
        {counted ? (
          <h1 className="animate-pop text-[3.25rem] leading-none font-semibold">+1 compra</h1>
        ) : state?.result.stamp_eligible === false ? (
          // e.g. only ice cream: linked to the customer, but no stamp.
          <h1 className="max-w-xs text-3xl leading-tight font-semibold">
            ¡Gracias por tu compra! Esta compra no suma a tu tarjeta.
          </h1>
        ) : (
          <h1 className="max-w-xs text-3xl leading-tight font-semibold">
            Ya sumaste tu compra de hoy. ¡Gracias por volver!
          </h1>
        )}
        <Card className="mt-2 w-full text-left">
          <div className="mb-3 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">
              {card.progress} de {card.milestone_every} compras
            </span>
            <span className="text-brand-muted">
              faltan {toGo} para girar
            </span>
          </div>
          <ProgressSegments total={card.milestone_every} progress={card.progress} highlightLast={counted} />
          {sale && (
            <div className="mt-4 flex justify-between border-t border-brand-line pt-3 text-sm">
              <span className="text-brand-muted">
                Compra de hoy · {sale.items_count} {sale.items_count === 1 ? 'bebida' : 'bebidas'}
              </span>
              <span className="tabular font-semibold">{formatCop(sale.total_cop)}</span>
            </div>
          )}
        </Card>
      </div>
    </Screen>
  );
}
