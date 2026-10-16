import { useState } from 'react';
import type { Product } from '@/api/types';
import { shortDate } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { BottomSheet, Button, cn, Money } from '@/ui';
import { estimateDiscount, prizeAppliesTo } from './api';
import { useCart } from './cart';
import { unitPrice } from './options';
import { prizeUsage } from './labels';

/** "Premios de {alias}" (R2): choose prize and the product it applies to. */
export function ApplyPrizeSheet({ open, onClose, products }: { open: boolean; onClose: () => void; products: Product[] }) {
  const customer = useCart((s) => s.customer);
  const lines = useCart((s) => s.lines);
  const preselected = useCart((s) => s.preselectedAwardId);
  const current = useCart((s) => s.prize);
  const setPrize = useCart((s) => s.setPrize);

  const prizes = customer?.active_prizes ?? [];
  const [awardId, setAwardId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const selectedAward = awardId ?? current?.awardId ?? preselected ?? prizes[0]?.id ?? null;
  const prize = prizes.find((p) => p.id === selectedAward);

  // Each product at the price of its most expensive line: the backend applies the
  // prize to that line when the product is in the cart with different options.
  // R17: only products that take this prize (e.g. ice creams for a free ice cream).
  const inCart = products
    .filter((p) => prize && prizeAppliesTo(prize, p))
    .flatMap((p) => {
      const units = Object.values(lines).filter((l) => l.productId === p.id);
      if (units.length === 0) return [];
      return [{ ...p, price_cop: Math.max(...units.map((l) => unitPrice(p, l.optionIds))) }];
    })
    .sort((a, b) => b.price_cop - a.price_cop);

  // Suggest the most expensive product in the cart (plan §8.9).
  const selectedProduct =
    (productId && inCart.some((p) => p.id === productId) ? productId : null) ??
    (current && inCart.some((p) => p.id === current.targetProductId) ? current.targetProductId : null) ??
    inCart[0]?.id ??
    null;

  const product = inCart.find((p) => p.id === selectedProduct);
  const estimate = prize ? estimateDiscount(prize, product) : null;
  const cap = prize?.max_value_cop ?? null;

  if (!customer) return null;

  const apply = () => {
    if (!prize || !product) return;
    setPrize({ awardId: prize.id, targetProductId: product.id, name: prize.name, type: prize.type, estimatedDiscount: estimate });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Premios de ${customer.alias}`}>
      <fieldset>
        <legend className="sr-only">Premio</legend>
        <div className="grid gap-2">
          {prizes.map((p) => (
            <label
              key={p.id}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-4 py-2.5',
                p.id === selectedAward ? 'bg-brand-primary-soft ring-2 ring-brand-ink' : 'bg-white ring-1 ring-brand-line',
              )}
            >
              <input
                type="radio"
                name="award"
                checked={p.id === selectedAward}
                onChange={() => setAwardId(p.id)}
                className="size-5 accent-[var(--brand-ink)]"
              />
              <span className="leading-tight">
                <span className="block font-semibold">{p.name}</span>
                <span className="text-xs text-brand-muted">
                  {p.type === 'percent_off' ? `Vence ${shortDate(p.expires_at)} · ganado ${shortDate(p.awarded_at)}` : `Vence ${shortDate(p.expires_at)} · ${prizeUsage(p.type).toLowerCase()}`}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-5 mb-2 text-sm font-semibold">¿A qué producto?</p>
      {inCart.length === 0 ? (
        <p className="rounded-2xl bg-brand-field p-4 text-sm text-brand-muted">Agrega al carrito un producto al que aplique este premio.</p>
      ) : (
        <div className="grid gap-2" role="radiogroup" aria-label="Producto">
          {inCart.map((p) => {
            const sel = p.id === selectedProduct;
            const est = prize ? estimateDiscount(prize, p) : null;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setProductId(p.id)}
                className={cn(
                  'flex min-h-12 items-center justify-between rounded-2xl px-4 text-left font-semibold',
                  sel ? 'bg-brand-ink text-white' : 'bg-brand-field',
                )}
              >
                <span>{p.name}</span>
                <span className="flex items-center gap-2 text-sm">
                  {sel && est ? (
                    <>
                      <Money value={p.price_cop} strike className="opacity-60" />
                      <Money value={p.price_cop - est} />
                    </>
                  ) : (
                    <Money value={p.price_cop} className={sel ? '' : 'text-brand-muted'} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-center text-xs text-brand-muted">
        Se sugiere el más caro.{cap ? ` Tope del premio: ${formatCop(cap)}.` : ''}
        {estimate === null && prize?.type !== 'extra_item' ? ' El descuento se calcula al cobrar.' : ''}
      </p>

      <Button className="mt-4" disabled={!prize || !product} onClick={apply}>
        {estimate ? `Aplicar · −${formatCop(estimate)}` : 'Aplicar'}
      </Button>
    </BottomSheet>
  );
}
