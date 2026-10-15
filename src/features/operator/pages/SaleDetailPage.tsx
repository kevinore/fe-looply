import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { errorMessage } from '@/api/errors';
import type { CardPrize, ClaimResult, Sale } from '@/api/types';
import { keys } from '@/app/keys';
import { Mascot } from '@/brand/Mascot';
import { shortDate, timeHM } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  ErrorState,
  Eyebrow,
  Icon,
  LoadingState,
  Pill,
  ProgressSegments,
  Screen,
  TextButton,
  toast,
} from '@/ui';
import { customerQuery, displayProgress, saleQuery, unlinkSale } from '../api';
import { useCart } from '../cart';
import { isDeliverable, paymentLabel, prizeUsage } from '../labels';
import { savedOptionsText } from '../options';
import { opMeQuery } from '../queries';
import { RedeemPrizeSheet } from '../RedeemPrizeSheet';
import { VoidSaleSheet } from '../VoidSaleSheet';

type NavState = { confirmed?: boolean; prizeName?: string; card?: ClaimResult['card']; foundBy?: string } | null;

/** 05 — Ficha de venta vinculada, or R4 — confirmation right after charging a customer. */
export default function SaleDetailPage() {
  const { saleId = '' } = useParams();
  const state = useLocation().state as NavState;
  const sale = useQuery(saleQuery(saleId));

  if (sale.isPending || (sale.isFetching && sale.data?.status === 'paid'))
    return (
      <Screen tone="secondary">
        <LoadingState />
      </Screen>
    );
  if (sale.isError)
    return (
      <Screen>
        <ErrorState error={sale.error} onRetry={() => void sale.refetch()} />
        <ButtonLink to="/op" variant="dark">
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
        <ButtonLink to="/op" variant="dark">
          Siguiente venta
        </ButtonLink>
      </Screen>
    );
  if (s.status === 'paid' || !s.customer)
    return (
      <Screen className="items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">Venta sin cliente</h1>
        <p className="text-brand-muted">Esta venta todavía no está vinculada a un cliente.</p>
        <ButtonLink to={`/op/sale/${s.id}/qr`} variant="dark">
          Mostrar QR
        </ButtonLink>
      </Screen>
    );
  return state?.confirmed ? <Confirmation sale={s} prizeName={state.prizeName} /> : <LinkedSale sale={s} card={state?.card} foundBy={state?.foundBy} />;
}

function LinkedSale({ sale, card, foundBy }: { sale: Sale; card?: ClaimResult['card']; foundBy?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const c = sale.customer!;
  const customer = useQuery(customerQuery(c.id));
  const [redeeming, setRedeeming] = useState<CardPrize | null>(null);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const prizeLine = sale.items.find((i) => i.prize_award_id);
  const saleHasPrize = !!prizeLine;

  const detail = customer.data;
  const progress = card
    ? { progress: card.progress, every: card.milestone_every, remaining: card.purchases_to_next_spin }
    : detail
      ? displayProgress(detail.purchases, detail.milestone_every)
      : null;

  const unlink = useMutation({
    mutationFn: () => unlinkSale(sale.id),
    onSuccess: (updated) => {
      qc.setQueryData(keys.sale(sale.id), updated);
      navigate(`/op/sale/${sale.id}/qr`, { replace: true });
    },
    onError: (e) => {
      setUnlinkOpen(false);
      toast.error(errorMessage(e));
    },
  });

  /** Discounts apply on a new sale with the prize preselected (8.10). */
  const startDiscountSale = (prize: CardPrize) => {
    if (!detail) return;
    useCart.getState().reset();
    useCart.getState().setCustomer(
      {
        id: detail.id,
        alias: detail.alias,
        phone_last4: detail.phone_last4,
        purchases: detail.purchases,
        milestone_every: detail.milestone_every,
        active_prizes: detail.active_prizes,
        foundBy,
      },
      prize.id,
    );
    navigate('/op');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <section className="bg-brand-secondary">
        <div className="mx-auto w-full max-w-lg px-safe pt-safe pb-5">
          <Pill tone="dark" className="mt-1">
            <Icon name="check" size={14} strokeWidth={3} /> Vinculada por {sale.claim_method === 'manual' ? 'búsqueda' : 'QR'}
            {sale.claimed_at ? ` · ${timeHM(sale.claimed_at)}` : ''}
          </Pill>
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={c.alias} className="size-14 text-3xl" />
            <div>
              <h1 className="text-4xl leading-none font-semibold">{c.alias}</h1>
              <p className="mt-1 text-sm tabular">3•• ••• {c.phone_last4}</p>
            </div>
          </div>
          {progress && (
            <>
              <div className="mt-4 mb-2 flex justify-between text-xs font-semibold">
                <span>
                  {progress.progress} de {progress.every} compras
                </span>
                <span>
                  {progress.remaining} para el próximo giro
                </span>
              </div>
              <ProgressSegments total={progress.every} progress={progress.progress} tone="onColor" />
            </>
          )}
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-safe py-4">
        {prizeLine && (
          // R16: one prize per sale. Make it obvious it was delivered here.
          <div role="status" className="flex items-center gap-3 rounded-2xl bg-brand-secondary-soft p-3">
            <span className="flex size-9 shrink-0 animate-pop items-center justify-center rounded-full bg-brand-ink text-white">
              <Icon name="check" size={18} strokeWidth={3} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-semibold">
                {prizeLine.label}
                {prizeLine.options.length > 0 && (
                  <span className="font-normal text-brand-muted"> · {savedOptionsText(prizeLine.options)}</span>
                )}
              </p>
              <p className="text-xs text-brand-muted">
                Premio entregado en esta compra
                {prizeLine.discount_cop > 0 ? ` · −${formatCop(prizeLine.discount_cop)}` : ' · $0'}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <h2 className="font-sans text-base font-semibold">Premios activos</h2>
          <span className="text-xs text-brand-muted">máx. 1 por venta</span>
        </div>
        {customer.isPending ? (
          <LoadingState />
        ) : customer.isError ? (
          <ErrorState error={customer.error} onRetry={() => void customer.refetch()} />
        ) : detail!.active_prizes.length === 0 ? (
          <p className="rounded-2xl bg-brand-field p-4 text-sm text-brand-muted">Sin premios activos.</p>
        ) : (
          <ul className="grid gap-2">
            {detail!.active_prizes.map((p, i) => {
              const deliverable = isDeliverable(p.type);
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${i === 0 && deliverable && !saleHasPrize ? 'ring-2 ring-brand-ink' : 'ring-1 ring-brand-line'}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-brand-muted">
                      {prizeUsage(p.type)} · vence {shortDate(p.expires_at)}
                    </p>
                  </div>
                  {(!deliverable || !saleHasPrize) && (
                    <Button
                      size="md"
                      block={false}
                      variant={deliverable ? 'primary' : 'secondary'}
                      onClick={() => (deliverable ? setRedeeming(p) : startDiscountSale(p))}
                    >
                      Redimir
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {saleHasPrize && detail && detail.active_prizes.length > 0 && (
          <p className="text-sm text-brand-muted">Máximo un premio por compra: los demás se usan en otra venta.</p>
        )}
        <p className="rounded-xl bg-brand-primary-soft px-3 py-2 text-xs italic">Confirma el nombre en persona antes de redimir.</p>

        <div className="mt-auto grid gap-1 pt-4 pb-safe">
          <ButtonLink to="/op" variant="dark">
            Siguiente venta
          </ButtonLink>
          <TextButton className="text-brand-primary-strong" onClick={() => setUnlinkOpen(true)}>
            Desvincular (no es {c.alias})
          </TextButton>
        </div>
      </main>

      <RedeemPrizeSheet
        sale={sale}
        prize={redeeming}
        foundBy={foundBy}
        onClose={() => setRedeeming(null)}
        onNeedsNewSale={(p) => {
          setRedeeming(null);
          startDiscountSale(p);
        }}
      />
      <ConfirmDialog
        open={unlinkOpen}
        title={`¿Desvincular a ${c.alias}?`}
        confirmLabel="Sí, desvincular"
        danger
        loading={unlink.isPending}
        onConfirm={() => unlink.mutate()}
        onClose={() => setUnlinkOpen(false)}
      >
        La venta vuelve a quedar sin cliente y se muestra otra vez el QR.
      </ConfirmDialog>
    </div>
  );
}

/** R4 — Cobrada. */
function Confirmation({ sale, prizeName }: { sale: Sale; prizeName?: string }) {
  const navigate = useNavigate();
  const me = useQuery(opMeQuery).data;
  const [voidOpen, setVoidOpen] = useState(false);
  const prizeLine = sale.items.find((i) => i.prize_award_id);
  const c = sale.customer!;
  const customer = useQuery(customerQuery(c.id)).data;

  return (
    <Screen
      tone="secondary"
      className="gap-4"
      footer={
        <div className="grid gap-1">
          <ButtonLink to="/op" variant="dark">
            Siguiente venta
          </ButtonLink>
          <TextButton className="underline" onClick={() => setVoidOpen(true)}>
            Anular venta
          </TextButton>
        </div>
      }
    >
      <div className="flex flex-col items-center pt-6 text-center">
        <span className="flex size-12 animate-pop items-center justify-center rounded-full bg-brand-ink text-white">
          <Icon name="check" strokeWidth={3} />
        </span>
        <h1 className="mt-3 text-4xl font-semibold">Cobrada · {formatCop(sale.total_cop)}</h1>
        <p className="mt-1 text-sm">
          {paymentLabel(sale.payment_method)} · {c.alias}
        </p>
      </div>

      {prizeLine && (
        <Card>
          <Eyebrow className="text-brand-primary-strong">Registro del premio</Eyebrow>
          <p className="mt-1 font-semibold">{prizeName ?? 'Premio'} · redimido</p>
          <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
            <dt className="text-brand-muted">Venta</dt>
            <dd>
              {prizeLine.qty} {prizeLine.label}
              {prizeLine.options.length > 0 && ` · ${savedOptionsText(prizeLine.options)}`}
            </dd>
            <dt className="text-brand-muted">Descuento</dt>
            <dd className="tabular">{formatCop(prizeLine.discount_cop)}</dd>
            <dt className="text-brand-muted">Operador</dt>
            <dd>{me?.operator.name}</dd>
            <dt className="text-brand-muted">Hora</dt>
            <dd>
              {shortDate(sale.paid_at)} · {timeHM(sale.paid_at)}
            </dd>
          </dl>
        </Card>
      )}

      <div className="flex items-center gap-3 rounded-card bg-brand-ink p-4 text-white">
        <div className="min-w-0 flex-1">
          <Eyebrow className="text-brand-primary">Compra registrada</Eyebrow>
          <p className="mt-1 font-semibold">
            {c.alias}
            {customer ? ` · ${customer.purchases} ${customer.purchases === 1 ? 'compra' : 'compras'}` : ''}
          </p>
          <p className="text-xs text-white/70">Si desbloqueó un giro, lo gira desde su tarjeta.</p>
        </div>
        <Mascot pose="drink" className="size-16 object-contain" sizes="64px" />
      </div>

      <VoidSaleSheet saleId={sale.id} open={voidOpen} onClose={() => setVoidOpen(false)} onVoided={() => navigate('/op', { replace: true })} />
    </Screen>
  );
}
