import { useState } from 'react';
import type { WorkdayStats } from '@/api/types';
import { formatCop } from '@/lib/money';
import { cn } from '@/ui';
import { hourRange, hourShort } from './labels';

type Hourly = WorkdayStats['hourly'];

/** "9 am", "12 pm" */
function hourLabel(h: number): string {
  return `${hourShort(h)} ${h < 12 ? 'am' : 'pm'}`;
}

/** Clean axis steps (1, 2, 5, 10, 20…) with the top tick at or above `max`. */
function niceTicks(max: number): number[] {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100];
  const step = steps.find((s) => max / s <= 4) ?? Math.ceil(max / 4);
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

/**
 * Number of sales in each hour of the workday (one series, so no legend).
 * The best hour (most sales; revenue breaks ties) is highlighted and selected at
 * first, so the highlight always matches the bars. Tapping a bar shows its sales
 * and revenue in the line above. A table carries every value for screen readers.
 */
export function HourlyChart({ hourly }: { hourly: Hourly }) {
  const [picked, setPicked] = useState<number | null>(null);
  if (hourly.length === 0) return <p className="py-6 text-center text-sm text-brand-muted">Sin ventas todavía.</p>;

  const hours = hourly.map((h) => h.local_hour);
  const min = Math.min(...hours);
  // At least 6 hours wide, so one busy hour doesn't become a single huge bar.
  const max = Math.min(23, Math.max(...hours, min + 5));
  const slots = Array.from({ length: max - min + 1 }, (_, i) => {
    const h = min + i;
    const row = hourly.find((x) => x.local_hour === h);
    return { h, sales: row?.sales ?? 0, revenue: row?.revenue_cop ?? 0 };
  });
  const best = slots.reduce((a, b) =>
    b.sales > a.sales || (b.sales === a.sales && b.revenue > a.revenue) ? b : a,
  ).h;
  const ticks = niceTicks(Math.max(1, ...slots.map((s) => s.sales)));
  const top = ticks.at(-1)!;
  const selected = slots.find((s) => s.h === (picked ?? best)) ?? null;
  // Hour labels every 1, 2 or 3 bars so they never overlap on a phone.
  const every = slots.length <= 6 ? 1 : slots.length <= 12 ? 2 : 3;

  return (
    <div>
      <p role="status" className="mb-3 min-h-10 text-sm leading-tight">
        {selected ? (
          <>
            <span className="font-semibold">
              {hourRange(selected.h)}
              {selected.h === best && (
                <span className="ml-1.5 rounded-full bg-brand-primary-soft px-2 py-0.5 text-xs text-brand-primary-strong">
                  Mejor hora
                </span>
              )}
            </span>
            <span className="block text-brand-muted">
              {selected.sales} {selected.sales === 1 ? 'venta' : 'ventas'} · {formatCop(selected.revenue)}
            </span>
          </>
        ) : (
          <span className="text-brand-muted">Toca una barra para ver esa hora.</span>
        )}
      </p>

      <div className="flex" aria-hidden="true">
        {/* Y axis: number of sales */}
        <div className="relative mr-1.5 h-40 w-5 shrink-0 text-right text-[0.625rem] text-brand-muted">
          <div className="absolute inset-x-0 top-5 bottom-0">
            {ticks.map((t) => (
              <span key={t} className="tabular absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-40 flex-1">
          <div className="absolute inset-x-0 top-5 bottom-0">
            {ticks.map((t) => (
              <span
                key={t}
                className={cn('absolute inset-x-0 border-t', t === 0 ? 'border-brand-ink/25' : 'border-brand-line')}
                style={{ bottom: `${(t / top) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex">
              {slots.map((s) => {
                const on = selected?.h === s.h;
                return (
                  <button
                    key={s.h}
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPicked(s.h)}
                    className="flex h-full flex-1 flex-col items-center justify-end"
                  >
                    {s.sales > 0 && (
                      <span
                        className={cn(
                          'relative w-[70%] max-w-6 shrink-0 rounded-t transition-colors',
                          on ? 'bg-brand-primary' : 'bg-brand-ink/75',
                        )}
                        style={{ height: `${(s.sales / top) * 100}%` }}
                      >
                        {/* Value on the cap of the selected bar; positioned so it never shortens the bar. */}
                        {on && (
                          <span className="tabular absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold">
                            {s.sales}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-1 flex pl-[1.625rem] text-[0.625rem] text-brand-muted" aria-hidden="true">
        {slots.map((s, i) => (
          <span key={s.h} className="flex-1 text-center whitespace-nowrap">
            {i % every === 0 ? hourLabel(s.h) : ''}
          </span>
        ))}
      </div>

      {/* Every value, for screen readers (the bars above are hidden from them). */}
      <table className="sr-only">
        <caption>Ventas por hora</caption>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            <th scope="col">Ventas</th>
            <th scope="col">Dinero</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.h}>
              <th scope="row">{hourRange(s.h)}</th>
              <td>{s.sales}</td>
              <td>{formatCop(s.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
