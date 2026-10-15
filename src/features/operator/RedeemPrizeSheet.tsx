import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage, isApiError } from '@/api/errors';
import type { CardPrize, Sale } from '@/api/types';
import { keys } from '@/app/keys';
import { productsQuery } from './queries';
import { Avatar, BottomSheet, Button, cn, Eyebrow, Money, toast } from '@/ui';
import { redeemPrize } from './api';
import { drinks } from './labels';
import { OptionGroupsPicker } from './OptionGroupsPicker';
import { isValidSelection } from './options';

/**
 * Redeem on an already paid sale (M3, F6).
 * - free_item: the operator picks the drink given for free (sent to the API).
 * - extra_item: nothing to pick; it is added to today's purchase as a $0 line.
 */
export function RedeemPrizeSheet({
  sale,
  prize,
  foundBy,
  onClose,
  onNeedsNewSale,
}: {
  sale: Sale;
  prize: CardPrize | null;
  foundBy?: string;
  onClose: () => void;
  onNeedsNewSale: (prize: CardPrize) => void;
}) {
  const qc = useQueryClient();
  const isFree = prize?.type === 'free_item';
  const products = useQuery({ ...productsQuery, enabled: isFree }).data ?? [];
  const saleDrinks = sale.items.filter((i) => i.product_id);
  // R17: the free drink can only be a product that takes prizes.
  const options = products.filter((p) => p.prize_eligible).map((p) => ({ id: p.id, label: p.name }));
  const [choice, setChoice] = useState<string | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const selected = isFree ? (choice ?? options[0]?.id ?? null) : null;
  // A free drink with options (e.g. Base and Té) needs them chosen too.
  const groups = products.find((p) => p.id === selected)?.option_groups ?? [];
  const optionsOk = isValidSelection(groups, optionIds);
  const count = saleDrinks.reduce((a, i) => a + i.qty, 0);

  const m = useMutation({
    mutationFn: () => redeemPrize(sale.id, prize!.id, isFree ? selected : null, isFree ? optionIds : []),
    onSuccess: (updated) => {
      qc.setQueryData(keys.sale(sale.id), updated);
      if (sale.customer) void qc.invalidateQueries({ queryKey: keys.customer(sale.customer.id) });
      toast.success(`${prize?.name ?? 'Premio'} · entregado`);
      onClose();
    },
    onError: (e) => {
      if (isApiError(e, 'discount_needs_new_sale') && prize) onNeedsNewSale(prize);
      else toast.error(errorMessage(e));
    },
  });

  const c = sale.customer;
  return (
    <BottomSheet open={!!prize} onClose={() => !m.isPending && onClose()} labelledBy="redeem-title">
      {prize && (
        <>
          {c && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Avatar name={c.alias} className="size-8 bg-brand-secondary text-base" />
              <span className="font-semibold">
                {c.alias} · 3•• ••• {c.phone_last4}
                {foundBy ? ` · encontrada por ${foundBy}` : ''}
              </span>
            </div>
          )}
          <h2 id="redeem-title" className="mb-4 text-2xl leading-tight font-semibold">
            {isFree ? '¿Qué bebida le das gratis?' : `¿Entregas ${prize.name.toLowerCase()}?`}
          </h2>
          {isFree ? (
            <div
              className="grid max-h-[34dvh] gap-2 overflow-y-auto"
              role="radiogroup"
              aria-label="Bebida"
            >
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={o.id === selected}
                  onClick={() => {
                    if (o.id !== selected) setOptionIds([]);
                    setChoice(o.id);
                  }}
                  className={cn(
                    'flex min-h-12 items-center justify-between rounded-2xl px-4 text-left font-semibold',
                    o.id === selected ? 'bg-brand-ink text-white' : 'bg-brand-field',
                  )}
                >
                  <span>{o.label}</span>
                  {o.id === selected && <span className="text-xs font-normal">gratis</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-brand-primary-soft p-4 text-sm">
              Se agrega gratis a su compra de hoy
              {saleDrinks.length > 0 && (
                <>
                  {' '}
                  (<b>{saleDrinks.map((i) => `${i.qty}× ${i.label}`).join(', ')}</b>)
                </>
              )}
              . Entrégalo junto con la bebida.
            </p>
          )}
          {isFree && groups.length > 0 && (
            <div className="mt-4">
              <OptionGroupsPicker groups={groups} selected={optionIds} onChange={setOptionIds} />
            </div>
          )}
          <div className="mt-4 rounded-2xl bg-brand-field p-3 text-sm">
            <Eyebrow className="mb-2 text-brand-muted">Se registra en su venta de hoy</Eyebrow>
            <p className="flex justify-between">
              <span>{drinks(count)}</span>
              <Money value={sale.total_cop} />
            </p>
            <p className="flex justify-between font-semibold">
              <span>+ {prize.name} (premio)</span>
              <span className="text-brand-secondary-strong">$0</span>
            </p>
            <p className="mt-1 flex justify-between text-xs text-brand-muted">
              <span>No se cobra nada más</span>
              <span>
                total <Money value={sale.total_cop} />
              </span>
            </p>
          </div>
          <Button
            className="mt-4"
            loading={m.isPending}
            disabled={isFree && (!selected || !optionsOk)}
            onClick={() => m.mutate()}
          >
            {isFree ? 'Entregar bebida gratis' : `Entregar ${prize.name.toLowerCase()}`}
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
