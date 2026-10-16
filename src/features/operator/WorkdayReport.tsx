import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { WorkdaySale, WorkdayStats } from '@/api/types';
import { parseLocalDate, shortWeekdayDate, timeHM } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { Button, Card, cn, ErrorState, Eyebrow, Icon, LoadingState, Money, Pill, Spinner } from '@/ui';
import { workdaySalesQuery } from './api';
import { HourlyChart } from './HourlyChart';
import { dayTypeLabel, paymentLabel, weatherText } from './labels';
import { savedOptionsText } from './options';

const GOAL_PCT = 40;

/** Date, hours, status and revenue of a workday ("jornada"). */
export function WorkdayHeader({ stats, right }: { stats: WorkdayStats; right?: ReactNode }) {
  const s = stats.summary;
  const weather = weatherText(s.weather_temp_c, s.weather_code);
  return (
    <header className="flex items-start justify-between gap-3 pt-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-sans text-base font-semibold">
            {shortWeekdayDate(parseLocalDate(s.local_date))}
          </h1>
          {s.status === 'open' ? (
            <Pill tone="secondary">Abierta</Pill>
          ) : (
            <Pill tone="dark">Cerrada</Pill>
          )}
        </div>
        <p className="text-sm text-brand-muted">
          {timeHM(s.opened_at)}
          {s.closed_at ? ` – ${timeHM(s.closed_at)}` : ' – ahora'} · {dayTypeLabel(s.day_type)}
          {weather ? ` · ${weather}` : ''}
        </p>
        <Money
          value={s.revenue_cop}
          className="mt-1 block font-display text-[2.6rem] leading-tight font-semibold"
        />
      </div>
      {right}
    </header>
  );
}

type OptionSales = WorkdayStats['options'];

/** Options sold (flavors, bases…) grouped by product category, most units first. */
function byCategory(options: OptionSales): Array<{ category: string | null; rows: OptionSales }> {
  const out: Array<{ category: string | null; rows: OptionSales }> = [];
  for (const o of options) {
    const last = out.at(-1);
    if (last && last.category === o.category) last.rows.push(o);
    else out.push({ category: o.category, rows: [o] });
  }
  return out;
}

/** e.g. "Helados · lo más pedido": Coco (Sabor de leche) 5, Fresa (Sabor paleta) 3… */
function OptionsCard({ category, rows }: { category: string | null; rows: OptionSales }) {
  const top = Math.max(...rows.map((r) => r.units));
  return (
    <Card>
      <h2 className="mb-3 font-sans text-sm font-semibold">
        {category ? `${category} · lo más pedido` : 'Opciones más pedidas'}
      </h2>
      <ol className="grid grid-cols-1 gap-2.5">
        {rows.map((r, i) => (
          <li key={`${r.group_name}|${r.option_name}`} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="tabular mr-1.5 font-semibold text-brand-muted">{i + 1}.</span>
                {r.option_name} <span className="text-xs text-brand-muted">· {r.group_name}</span>
              </span>
              <b className="tabular shrink-0">{r.units}</b>
            </div>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-brand-field" aria-hidden="true">
              <span
                className={cn('block h-full rounded-full', i === 0 ? 'bg-brand-primary' : 'bg-brand-ink/70')}
                style={{ width: `${(r.units / top) * 100}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/**
 * Report and sales of a workday. Phones: one column. Tablets: the report on the
 * left and the sales list (plus `children`) on the right, using the wide screen.
 */
export function WorkdayBody({
  stats,
  workdayId,
  children,
}: {
  stats: WorkdayStats;
  workdayId: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start md:gap-4">
      <div className="grid grid-cols-1 gap-3">
        <WorkdayReport stats={stats} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <WorkdaySales workdayId={workdayId} />
        {children}
      </div>
    </div>
  );
}

/** KPIs, payment split, hourly chart, every product sold and the options chosen. */
export function WorkdayReport({ stats }: { stats: WorkdayStats }) {
  const s = stats.summary;
  const pct = Math.round(s.claimed_pct * 100);
  const total = s.cash_cop + s.digital_cop;
  const cashShare = total > 0 ? (s.cash_cop / total) * 100 : 50;
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {[
          [String(s.sales), s.sales === 1 ? 'venta' : 'ventas'],
          [String(s.drinks), s.drinks === 1 ? 'producto' : 'productos'],
          // Average amount per sale: easier to act on than items per sale.
          [s.sales > 0 ? formatCop(s.revenue_cop / s.sales) : '—', 'ticket promedio'],
        ].map(([v, l]) => (
          // Sized by the card's own width (container query), so values like
          // "$20.000" fit whether the report is full width or in a column.
          <Card key={l} className="@container p-3">
            <p className="font-display text-[clamp(1rem,17cqw,1.5rem)] leading-tight font-semibold whitespace-nowrap">{v}</p>
            <p className="text-xs text-brand-muted">{l}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-card bg-brand-primary p-4">
        <div>
          <Eyebrow>Ventas vinculadas</Eyebrow>
          <p className="text-xs">meta {GOAL_PCT}%</p>
        </div>
        <p className="tabular font-display text-4xl font-semibold">{pct}%</p>
      </div>

      <Card>
        <div className="flex justify-between text-sm font-semibold">
          <span>Efectivo {formatCop(s.cash_cop)}</span>
          <span>Digital {formatCop(s.digital_cop)}</span>
        </div>
        <div className="mt-2 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
          <span className="rounded-full bg-brand-ink" style={{ width: `${cashShare}%` }} />
          <span className="flex-1 rounded-full bg-brand-secondary" />
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          Cuadre: cuenta el efectivo de caja contra {formatCop(s.cash_cop)}
        </p>
      </Card>

      <Card>
        <div className="mb-2 flex justify-between text-sm">
          <h2 className="font-sans text-sm font-semibold">Ventas por hora</h2>
          <span className="text-xs text-brand-muted">número de ventas</span>
        </div>
        <HourlyChart hourly={stats.hourly} />
      </Card>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-sans text-sm font-semibold">Productos vendidos</h2>
          <span className="text-xs text-brand-muted">
            {s.drinks} {s.drinks === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>
        {stats.products.length === 0 ? (
          <p className="text-sm text-brand-muted">Sin ventas todavía.</p>
        ) : (
          <ol className="grid grid-cols-1 gap-2.5">
            {stats.products.map((p, i) => {
              const share = s.drinks > 0 ? (p.units / s.drinks) * 100 : 0;
              return (
                <li key={p.product_id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="tabular mr-1.5 font-semibold text-brand-muted">
                        {i + 1}.
                      </span>
                      {p.label}
                    </span>
                    <span className="tabular shrink-0">
                      <b>{p.units}</b>{' '}
                      <span className="text-brand-muted">· {formatCop(p.net_cop)}</span>
                    </span>
                  </div>
                  <span
                    className="mt-1 block h-1.5 overflow-hidden rounded-full bg-brand-field"
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        i === 0 ? 'bg-brand-primary' : 'bg-brand-ink/70',
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {byCategory(stats.options).map((g) => (
        <OptionsCard key={g.category ?? ''} category={g.category} rows={g.rows} />
      ))}
    </>
  );
}

function itemsText(sale: WorkdaySale): string {
  return sale.items
    .map((i) => {
      if (i.is_prize && i.unit_price_cop === 0) return `+ ${i.label}`;
      const options = savedOptionsText(i.options);
      return `${i.qty}× ${i.label}${options ? ` (${options})` : ''}`;
    })
    .join(' · ');
}

/**
 * Sales of the workday, newest first, 20 at a time: the next page loads when the
 * end of the list comes into view (or with the button). Tapping a sale opens it.
 */
export function WorkdaySales({ workdayId }: { workdayId: string }) {
  const sales = useInfiniteQuery(workdaySalesQuery(workdayId));
  const list = sales.data?.pages.flatMap((p) => p.items) ?? [];
  const first = sales.data?.pages[0];
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = sales;
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = end.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-sans text-base font-semibold">Ventas</h2>
        {first && (
          <span className="text-xs text-brand-muted">
            {first.total} {first.total === 1 ? 'venta' : 'ventas'}
            {first.voided > 0 ? ` · ${first.voided} ${first.voided === 1 ? 'anulada' : 'anuladas'}` : ''}
          </span>
        )}
      </div>
      {sales.isPending ? (
        <LoadingState />
      ) : sales.isError && list.length === 0 ? (
        <ErrorState error={sales.error} onRetry={() => void sales.refetch()} />
      ) : list.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-brand-muted shadow-card">
          Todavía no hay ventas en esta jornada.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2">
          {list.map((s) => {
            const isVoid = s.status === 'void';
            const prize = s.items.some((i) => i.is_prize);
            return (
              <li key={s.id}>
                <Link
                  to={`/admin/sale/${s.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card active:bg-brand-field',
                    isVoid && 'opacity-70',
                  )}
                >
                  <span className="tabular w-11 shrink-0 text-sm font-semibold">
                    {timeHM(s.paid_at)}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span
                      className={cn('line-clamp-2 text-sm font-medium', isVoid && 'line-through')}
                    >
                      {itemsText(s)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-brand-muted">
                      <span>{paymentLabel(s.payment_method)}</span>
                      <span aria-hidden="true">·</span>
                      {s.customer ? (
                        <span className="font-semibold text-brand-secondary-strong">
                          {s.customer.alias} · {s.customer.phone_last4}
                        </span>
                      ) : (
                        <span>Sin cliente</span>
                      )}
                      {prize && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-brand-primary-strong">
                          · <Icon name="gift" size={12} /> premio
                        </span>
                      )}
                    </span>
                    {isVoid && s.void_reason && (
                      <span className="mt-0.5 block truncate text-xs text-[#B42318]">
                        Anulada · {s.void_reason}
                      </span>
                    )}
                  </span>
                  <span className={cn('tabular shrink-0 font-semibold', isVoid && 'line-through')}>
                    {formatCop(s.total_cop)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {hasNextPage && (
        <div ref={end} className="mt-3 flex justify-center">
          {isFetchingNextPage ? (
            <Spinner label="Cargando más ventas" />
          ) : (
            <Button variant="secondary" size="md" block={false} onClick={() => void fetchNextPage()}>
              Ver más ventas
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
