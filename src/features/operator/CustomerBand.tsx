import { Avatar, Icon } from '@/ui';
import type { CartCustomer } from './cart';
import { displayProgress } from './api';

/** Green band with the attached customer (R1 / M4). */
export function CustomerBand({ customer, onRemove }: { customer: CartCustomer; onRemove: () => void }) {
  const p = displayProgress(customer.purchases, customer.milestone_every);
  const sub = customer.foundBy
    ? `Buscada por ${customer.foundBy}`
    : p
      ? `${p.progress} de ${p.every} compras`
      : `${customer.purchases} compras`;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-brand-secondary p-2 pr-1 text-brand-ink">
      <Avatar name={customer.alias} className="size-9 text-lg" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-semibold">
          {customer.alias} · 3•• ••• {customer.phone_last4}
        </p>
        <p className="truncate text-xs">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar a ${customer.alias} de la venta`}
        className="flex size-11 items-center justify-center rounded-full active:bg-black/10"
      >
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
