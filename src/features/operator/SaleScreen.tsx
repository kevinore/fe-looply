import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Product, Workday } from '@/api/types';
import { vibrate } from '@/lib/device';
import { formatCop } from '@/lib/money';
import { useWakeLock } from '@/lib/wakeLock';
import { buttonClass, cn, ErrorState, Icon, LiveDot, LoadingState, Money, ProductTile, Screen } from '@/ui';
import { ApplyPrizeSheet } from './ApplyPrizeSheet';
import { cartCount, productQty, useCart } from './cart';
import { CheckoutSheet } from './CheckoutSheet';
import { CustomerBand } from './CustomerBand';
import { drinks } from './labels';
import { AdminMenuButton, AdminNav } from './AdminNav';
import { latestPending, usePendingSales } from './pendingSales';
import { hasOptions, unitPrice } from './options';
import { ProductOptionsSheet } from './ProductOptionsSheet';
import { sections } from './sections';
import { productsQuery } from './queries';

/** 02 — Venta (jornada abierta). */
export function SaleScreen({ workday: _workday }: { workday: Workday }) {
  useWakeLock();
  const products = useQuery(productsQuery);
  const lines = useCart((s) => s.lines);
  const customer = useCart((s) => s.customer);
  const prize = useCart((s) => s.prize);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const setCustomer = useCart((s) => s.setCustomer);
  const [checkout, setCheckout] = useState(false);
  const [prizes, setPrizes] = useState(false);
  const [choosing, setChoosing] = useState<Product | null>(null);
  const pending = usePendingSales((s) => s.items);
  const waiting = latestPending(pending);
  const waitingCount = Object.keys(pending).length;

  const list = products.data ?? [];
  const count = cartCount(lines);
  const byId = new Map(list.map((p) => [p.id, p]));
  const subtotal = Object.values(lines).reduce((sum, l) => {
    const p = byId.get(l.productId);
    return p ? sum + unitPrice(p, l.optionIds) * l.qty : sum;
  }, 0);
  const discount = prize?.estimatedDiscount ?? 0;
  const activePrizes = customer?.active_prizes ?? [];
  const target = prize ? list.find((p) => p.id === prize.targetProductId) : undefined;

  const footer = (
    <div className="grid grid-cols-1 gap-2">
      {customer && prize && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-primary px-4 py-2.5">
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold">{prize.name} aplicado</p>
            <p className="truncate text-xs">en {target?.name}</p>
          </div>
          <span className="tabular font-semibold">
            {prize.estimatedDiscount ? `−${formatCop(prize.estimatedDiscount)}` : prize.type === 'extra_item' ? '$0' : ''}
          </span>
        </div>
      )}
      {customer && !prize && activePrizes.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-primary py-2 pr-2 pl-4">
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold">
              {customer.alias} tiene {activePrizes.length} {activePrizes.length === 1 ? 'premio' : 'premios'}
            </p>
            <p className="truncate text-xs">{activePrizes.map((p) => p.short_label).join(' · ')}</p>
          </div>
          <button type="button" onClick={() => setPrizes(true)} className={buttonClass('dark', 'md', false)}>
            Aplicar
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-ink py-2 pr-2 pl-4 text-white">
        <div className="leading-tight">
          <p className="text-xs text-white/70">{drinks(count)}</p>
          {discount > 0 && <Money value={subtotal} strike className="block text-xs text-white/60" />}
          <Money value={subtotal - discount} className="font-display text-2xl font-semibold" />
        </div>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => setCheckout(true)}
          className={cn(buttonClass('primary', 'lg', false), 'min-w-32')}
        >
          Cobrar
        </button>
      </div>
      <AdminNav />
    </div>
  );

  return (
    <Screen width="wide" footer={footer} className="gap-3">
      <header className="flex items-center justify-between gap-2 pt-1">
        {waiting ? (
          // A QR is still waiting for its scan: one tap shows it again.
          <Link
            to={`/admin/sale/${waiting.id}/qr`}
            className="flex min-h-11 items-center gap-2 rounded-full bg-brand-primary-soft px-3 text-sm font-semibold text-brand-primary-strong active:brightness-95"
          >
            <LiveDot />
            {waitingCount > 1 ? `${waitingCount} QR esperando` : 'QR esperando'}
          </Link>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="size-2 rounded-full bg-brand-secondary" aria-hidden="true" /> Jornada abierta
          </p>
        )}
        <div className="flex items-center gap-2">
          {!customer && (
            <Link to="/admin/search?mode=attach" className={cn(buttonClass('secondary', 'md', false), 'min-h-11 px-4')}>
              <Icon name="user" size={18} /> Cliente
            </Link>
          )}
          <AdminMenuButton />
        </div>
      </header>

      {customer && (
        <CustomerBand
          customer={customer}
          onRemove={() => {
            setCustomer(null);
          }}
        />
      )}

      {products.isPending ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : (
        <>
          {sections(list).map((section) => (
            <section key={section.name ?? ''} aria-label={section.name ?? undefined}>
              {section.name && <h2 className="mb-2 font-sans text-base font-semibold">{section.name}</h2>}
              {/* 2 columns on phones, 4 on tablets in portrait, 5 in landscape. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
                {section.products.map((p) => (
                  <ProductTile
                    key={p.id}
                    name={p.name}
                    price={p.price_cop}
                    photoUrl={p.photo_url}
                    note={p.description}
                    qty={productQty(lines, p.id)}
                    onAdd={() => (hasOptions(p) ? setChoosing(p) : add(p.id))}
                    onRemove={() => {
                      remove(p.id);
                      vibrate(40);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
          <p className="pb-2 text-center text-xs text-brand-muted">Toca para sumar · mantén presionado para restar</p>
        </>
      )}

      <ProductOptionsSheet
        product={choosing}
        onClose={() => setChoosing(null)}
        onAdd={(p, optionIds) => {
          add(p.id, optionIds);
          setChoosing(null);
        }}
      />
      <CheckoutSheet open={checkout} onClose={() => setCheckout(false)} products={list} />
      <ApplyPrizeSheet open={prizes} onClose={() => setPrizes(false)} products={list} />
    </Screen>
  );
}
