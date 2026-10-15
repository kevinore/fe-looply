import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage } from '@/api/errors';
import type { PaymentMethod, Product } from '@/api/types';
import { keys } from '@/app/keys';
import { sendEvent } from '@/lib/events';
import { formatCop } from '@/lib/money';
import { BottomSheet, Button, cn, Money, Pill, TextButton, toast } from '@/ui';
import { createSale } from './api';
import { useCart } from './cart';
import { optionNames, unitPrice } from './options';
import { PAYMENT_METHODS } from './labels';

/** Cobrar (03) / Cobrar con cliente y premio (R3). */
export function CheckoutSheet({
  open,
  onClose,
  products,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
}) {
  const lines = useCart((s) => s.lines);
  const customer = useCart((s) => s.customer);
  const prize = useCart((s) => s.prize);
  const setPrize = useCart((s) => s.setPrize);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inFlight = useRef(false);

  // The key is created when the sheet opens and reused by every tap and retry (8.4).
  useEffect(() => {
    if (!open) return;
    useCart.getState().ensureKey();
    // Warm the QR generator now, so the QR screen paints its code at once.
    void import('qrcode');
  }, [open]);

  const byId = new Map(products.map((p) => [p.id, p]));
  const entries = Object.entries(lines).flatMap(([key, line]) => {
    const product = byId.get(line.productId);
    if (!product) return [];
    const options = optionNames(product, line.optionIds).join(' · ');
    return [{ key, line, product, options, unit: unitPrice(product, line.optionIds) }];
  });
  const subtotal = entries.reduce((sum, e) => sum + e.unit * e.line.qty, 0);
  const discount = prize?.estimatedDiscount ?? 0;
  const total = subtotal - discount;
  const target = prize ? byId.get(prize.targetProductId) : undefined;

  const m = useMutation({
    // showQr false = anonymous sale (R4): registered and counted, no QR screen.
    mutationFn: ({ key }: { key: string; showQr: boolean }) =>
      createSale(
        {
          items: entries.map(({ line }) => ({
            product_id: line.productId,
            qty: line.qty,
            option_ids: line.optionIds,
          })),
          payment_method: method,
          customer_id: customer?.id ?? null,
          prize_award_id: prize?.awardId ?? null,
          prize_target_product_id: prize?.targetProductId ?? null,
        },
        key,
      ),
    onSuccess: (sale, { showQr }) => {
      qc.setQueryData(keys.sale(sale.id), sale);
      const prizeName = useCart.getState().prize?.name;
      useCart.getState().reset();
      onClose();
      if (sale.customer) navigate(`/op/sale/${sale.id}`, { state: { confirmed: true, prizeName } });
      else if (showQr) navigate(`/op/sale/${sale.id}/qr`);
      else {
        // Stay on Venta, ready for the next order. The sale counts in the summary.
        sendEvent('sale_skipped', { reason: 'no_customer' }, sale.id, 'op');
        void qc.invalidateQueries({ queryKey: ['op', 'stats'] });
        void qc.invalidateQueries({ queryKey: keys.workdaySales(sale.workday_id) });
        toast.success(`Venta registrada sin cliente · ${formatCop(sale.total_cop)}`);
      }
    },
    // Keep the cart and the idempotency key so a retry can't duplicate the sale.
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      inFlight.current = false;
    },
  });

  // Both buttons share the idempotency key: a retry with either one can't duplicate the sale.
  const submit = (showQr = true) => {
    if (inFlight.current || entries.length === 0) return;
    inFlight.current = true;
    m.mutate({ key: useCart.getState().ensureKey(), showQr });
  };
  const pendingQr = m.isPending && m.variables?.showQr !== false;

  return (
    <BottomSheet open={open} onClose={() => !m.isPending && onClose()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-brand-muted">
            {customer ? `Cobrar a ${customer.alias}` : 'Cobrar'}
          </p>
          {!customer && <Money value={total} className="font-display text-4xl font-semibold" />}
        </div>
        {customer ? (
          <Pill tone="secondary">vinculada</Pill>
        ) : (
          <ul className="text-right text-xs text-brand-muted">
            {entries.map((e) => (
              <li key={e.key}>
                {e.line.qty} {e.product.name}
                {e.options && <span className="block text-[0.6875rem]">{e.options}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {customer && (
        <ul className="mt-3 divide-y divide-brand-line text-sm">
          {entries.map((e) => (
            <li key={e.key} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0 leading-tight">
                {e.line.qty} × {e.product.name}
                {e.options && <span className="block text-xs text-brand-muted">{e.options}</span>}
              </span>
              <Money value={e.unit * e.line.qty} />
            </li>
          ))}
          {prize && (
            <li className="-mx-2 flex justify-between gap-3 rounded-lg bg-brand-primary-soft px-2 py-1.5 font-semibold">
              <span className="truncate">
                Premio {prize.name} · {target?.name}
              </span>
              {prize.estimatedDiscount ? (
                <span className="tabular shrink-0 whitespace-nowrap text-[#B42318]">
                  −{formatCop(prize.estimatedDiscount)}
                </span>
              ) : (
                <span className="shrink-0 text-xs font-normal text-brand-muted">
                  {prize.type === 'extra_item' ? '$0' : 'se calcula al cobrar'}
                </span>
              )}
            </li>
          )}
        </ul>
      )}

      {customer && (
        <div className="mt-3 flex items-end justify-between">
          <span className="font-semibold">
            Total{prize && prize.estimatedDiscount === null ? ' antes del premio' : ''}
          </span>
          <Money value={total} className="font-display text-4xl font-semibold" />
        </div>
      )}

      <p className="mt-1 text-xs text-brand-muted">
        Total estimado · el valor final lo confirma el sistema.
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Medio de pago</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((pm, i) => (
            <label
              key={pm.value}
              className={cn(
                'flex min-h-16 min-w-0 cursor-pointer flex-col justify-center rounded-2xl px-3 py-2 transition-colors',
                method === pm.value ? 'bg-brand-primary ring-2 ring-brand-ink' : 'bg-brand-field',
              )}
            >
              <input
                type="radio"
                name="payment"
                value={pm.value}
                checked={method === pm.value}
                onChange={() => setMethod(pm.value)}
                className="sr-only"
              />
              <span className="truncate text-[0.625rem] font-semibold tracking-wider text-brand-ink/70 uppercase">
                {pm.hint} · {i + 1}
              </span>
              {/* Three in a row: sized so "Transferencia" fits on 360 px phones. */}
              <span className="text-[clamp(0.8125rem,3.6vw,1rem)] font-semibold">{pm.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button
        variant="dark"
        className="mt-4"
        loading={pendingQr}
        disabled={m.isPending && !pendingQr}
        onClick={() => submit()}
      >
        {customer ? `Cobrar ${formatCop(total)}` : 'Cobrar y mostrar QR'}
      </Button>
      {!customer && (
        <Button
          variant="secondary"
          className="mt-2"
          loading={m.isPending && !pendingQr}
          disabled={pendingQr}
          onClick={() => submit(false)}
        >
          Cobrar sin cliente
        </Button>
      )}
      {prize ? (
        <TextButton className="text-brand-primary-strong" onClick={() => setPrize(null)}>
          Quitar premio
        </TextButton>
      ) : (
        <TextButton onClick={onClose}>Volver al carrito</TextButton>
      )}
    </BottomSheet>
  );
}
