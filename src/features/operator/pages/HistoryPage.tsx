import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { parseLocalDate, shortWeekdayDate, todayYmd } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import {
  buttonClass,
  Card,
  cn,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pill,
  Screen,
  TopBar,
} from '@/ui';
import { historyQuery } from '../api';
import { dayTypeLabel, drinks } from '../labels';
import { adminMeQuery } from '../queries';

/** Jornadas: one per day, newest first; each opens its detail (8.13). */
export default function HistoryPage() {
  const [from, setFrom] = useState(todayYmd(-30));
  const [to, setTo] = useState(todayYmd());
  const valid = from <= to;
  const history = useQuery({ ...historyQuery(from, to), enabled: valid });
  const me = useQuery(adminMeQuery).data;
  const isOwner = me?.operator.role === 'owner';

  const dateInput = 'mt-1 min-h-12 w-full rounded-2xl bg-white px-3 font-semibold shadow-card';
  const workdays = history.data
    ? [...history.data.workdays].sort((a, b) => b.local_date.localeCompare(a.local_date))
    : [];
  const totals = workdays.reduce(
    (t, w) => ({ revenue: t.revenue + w.revenue_cop, sales: t.sales + w.sales }),
    {
      revenue: 0,
      sales: 0,
    },
  );

  return (
    <Screen width="medium" className="gap-4">
      <TopBar title="Jornadas" backTo="/admin" />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-brand-muted">
          Desde
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className={dateInput}
          />
        </label>
        <label className="text-sm text-brand-muted">
          Hasta
          <input
            type="date"
            value={to}
            min={from}
            max={todayYmd()}
            onChange={(e) => setTo(e.target.value)}
            className={dateInput}
          />
        </label>
      </div>

      {!valid ? (
        <p className="text-sm text-[#B42318]">La fecha inicial debe ser anterior a la final.</p>
      ) : history.isPending ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : workdays.length === 0 ? (
        <EmptyState icon="history" title="No hay jornadas en este rango." />
      ) : (
        <>
          <Card className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs text-brand-muted">
                {workdays.length} {workdays.length === 1 ? 'jornada' : 'jornadas'} · {totals.sales}{' '}
                ventas
              </p>
              <p className="tabular font-display text-3xl font-semibold">
                {formatCop(totals.revenue)}
              </p>
            </div>
            {isOwner && (
              <a
                href={`/api/admin/export/sales.csv?from=${from}&to=${to}`}
                className={cn(buttonClass('secondary', 'md', false), 'min-h-11 px-3')}
                download
              >
                <Icon name="download" size={18} /> CSV
              </a>
            )}
          </Card>

          <ul className="grid gap-2">
            {workdays.map((w) => (
              <li key={w.workday_id}>
                <Link
                  to={`/admin/workdays/${w.workday_id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card active:bg-brand-field"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {shortWeekdayDate(parseLocalDate(w.local_date))}
                      </p>
                      {w.status === 'open' && <Pill tone="secondary">Abierta</Pill>}
                      {w.day_type !== 'other' && (
                        <span className="text-xs text-brand-muted">{dayTypeLabel(w.day_type)}</span>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted">
                      {w.sales} {w.sales === 1 ? 'venta' : 'ventas'} · {drinks(w.drinks)} ·{' '}
                      {Math.round(w.claimed_pct * 100)}% vinculadas
                    </p>
                  </div>
                  <span className="tabular font-display text-xl font-semibold">
                    {formatCop(w.revenue_cop)}
                  </span>
                  <Icon name="chevronRight" size={18} className="text-brand-muted" />
                </Link>
              </li>
            ))}
          </ul>

          {history.data.products.length > 0 && (
            <section>
              <h2 className="mb-2 font-sans text-base font-semibold">Productos en el rango</h2>
              <Card className="p-3">
                <ol className="grid gap-1.5 text-sm">
                  {history.data.products.map((p, i) => (
                    <li key={p.product_id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {i + 1}. {p.label}
                      </span>
                      <span className="tabular shrink-0">
                        <b>{p.units}</b> · {formatCop(p.net_cop)}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          )}
        </>
      )}
    </Screen>
  );
}
