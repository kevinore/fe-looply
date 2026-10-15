import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { errorMessage } from '@/api/errors';
import type { CustomerDetail, CustomerSearch } from '@/api/types';
import { keys } from '@/app/keys';
import { vibrate } from '@/lib/device';
import { Avatar, BottomSheet, Button, cn, DigitBoxes, Keypad, Spinner, TopBar, toast } from '@/ui';
import { customerQuery, linkSale, saleQuery, searchQuery } from '../api';
import { useCart } from '../cart';
import { usePendingSales } from '../pendingSales';
import { workdayQuery } from '../queries';

type Mode = 'link' | 'attach' | 'redeem';

/** 06 — Buscar cliente por los últimos 4 dígitos. */
export default function SearchPage() {
  const [params] = useSearchParams();
  const saleId = params.get('saleId');
  const mode: Mode = saleId ? 'link' : params.get('mode') === 'attach' ? 'attach' : 'redeem';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [digits, setDigits] = useState('');
  const [noSaleFor, setNoSaleFor] = useState<CustomerDetail | null>(null);
  const results = useQuery(searchQuery(digits));

  const type = (d: string) => setDigits((v) => (v.length < 4 ? v + d : v));
  const del = () => setDigits((v) => v.slice(0, -1));

  // Physical keyboard support (tablets, desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') del();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toCartCustomer = (d: CustomerDetail) => ({
    id: d.id,
    alias: d.alias,
    phone_last4: d.phone_last4,
    purchases: d.purchases,
    milestone_every: d.milestone_every,
    active_prizes: d.active_prizes,
    foundBy: digits,
  });

  const act = useMutation({
    mutationFn: async (c: CustomerSearch) => {
      if (mode === 'link') {
        const result = await linkSale(saleId!, c.id);
        return { kind: 'linked' as const, result };
      }
      const detail = await qc.fetchQuery({ ...customerQuery(c.id), staleTime: 0 });
      if (mode === 'attach') return { kind: 'attach' as const, detail };
      // Redeem: the customer's most recent sale in the current workday.
      const workday = await qc.fetchQuery(workdayQuery);
      const recent = detail.sales.find((s) => s.status === 'claimed');
      if (workday && recent) {
        const sale = await qc.fetchQuery(saleQuery(recent.id));
        if (sale.workday_id === workday.id) return { kind: 'redeem' as const, detail, saleId: sale.id };
      }
      return { kind: 'noSale' as const, detail };
    },
    onSuccess: (r) => {
      vibrate(40);
      if (r.kind === 'linked') {
        // Linked by hand: no "scanned" notification for it.
        usePendingSales.getState().forget(saleId!);
        void qc.invalidateQueries({ queryKey: keys.sale(saleId!) });
        navigate(`/op/sale/${saleId}`, { replace: true, state: { card: r.result.card, foundBy: digits } });
      } else if (r.kind === 'attach') {
        useCart.getState().setCustomer(toCartCustomer(r.detail));
        navigate('/op');
      } else if (r.kind === 'redeem') {
        navigate(`/op/sale/${r.saleId}`, { state: { foundBy: digits } });
      } else {
        setNoSaleFor(r.detail);
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const actionLabel = mode === 'link' ? 'Vincular' : 'Elegir';
  const title = mode === 'link' ? 'Vincular cliente' : 'Buscar cliente';

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-safe pt-safe">
        <TopBar />
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-brand-muted">Últimos 4 dígitos del celular</p>
        </div>
        <DigitBoxes value={digits} />

        <section aria-live="polite" className="flex-1">
          {digits.length < 4 ? null : results.isPending ? (
            <div className="flex justify-center p-6">
              <Spinner label="Buscando" />
            </div>
          ) : results.isError ? (
            <p className="p-4 text-center text-sm text-[#B42318]">{errorMessage(results.error)}</p>
          ) : results.data.length === 0 ? (
            <p className="p-6 text-center font-semibold">Nadie con esos 4 dígitos.</p>
          ) : (
            <ul className="grid gap-2">
              {results.data.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={act.isPending}
                    onClick={() => act.mutate(c)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-brand-line active:bg-brand-field',
                      i === 0 && 'bg-brand-secondary-soft ring-0',
                    )}
                  >
                    <Avatar name={c.alias} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block font-semibold">{c.alias}</span>
                      <span className="text-xs text-brand-muted">
                        3•• ••• {c.phone_last4} · {c.purchases} {c.purchases === 1 ? 'compra' : 'compras'}
                        {c.active_prizes_count > 0 &&
                          ` · ${c.active_prizes_count} ${c.active_prizes_count === 1 ? 'premio' : 'premios'}`}
                      </span>
                    </span>
                    <span className="rounded-lg px-2 py-2 text-sm font-semibold text-brand-secondary-strong">
                      {act.isPending && act.variables?.id === c.id ? <Spinner /> : actionLabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <div className="sticky bottom-0 mx-auto w-full max-w-lg pb-[var(--safe-bottom)]">
        <Keypad onDigit={type} onDelete={del} onDone={() => navigate(-1)} className="sm:rounded-t-2xl" />
      </div>

      <BottomSheet open={!!noSaleFor} onClose={() => setNoSaleFor(null)} title={noSaleFor ? `${noSaleFor.alias} no tiene compras hoy` : ''}>
        <p className="mb-5 text-brand-muted">Para usar un premio, arma una venta nueva con este cliente.</p>
        <div className="grid gap-2">
          <Button
            variant="dark"
            onClick={() => {
              if (!noSaleFor) return;
              useCart.getState().setCustomer(toCartCustomer(noSaleFor));
              navigate('/op');
            }}
          >
            Nueva venta con {noSaleFor?.alias}
          </Button>
          <Button variant="ghost" onClick={() => setNoSaleFor(null)}>
            Cancelar
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
