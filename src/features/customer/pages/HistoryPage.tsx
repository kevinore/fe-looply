import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { keys } from '@/app/keys';
import { shortWeekdayDate, timeHM } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { EmptyState, ErrorState, Icon, LoadingState, Screen } from '@/ui';
import { claimApi } from '../api';
import { CustomerNav } from '../components/CustomerNav';
import { NoSession } from '../components/NoSession';

/** C4 · Historial. */
export default function HistoryPage() {
  const history = useQuery({ queryKey: keys.history, queryFn: claimApi.history });

  if (history.isError && isApiError(history.error, 'not_authenticated')) return <NoSession />;

  return (
    <Screen tone="white" footer={<CustomerNav />}>
      <h1 className="pt-2 text-[2rem] font-semibold">Historial</h1>
      {history.isPending && <LoadingState />}
      {history.isError && <ErrorState error={history.error} onRetry={() => void history.refetch()} />}
      {history.data &&
        (history.data.length === 0 ? (
          <EmptyState title="Todavía no tienes compras." className="flex-1" />
        ) : (
          <ul className="mt-4 grid gap-3 pb-4">
            {history.data.map((s) => (
              <li key={s.id} className="rounded-2xl bg-brand-field p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">
                    {shortWeekdayDate(s.paid_at)} <span className="font-normal text-brand-muted">· {timeHM(s.paid_at)}</span>
                  </p>
                  <p className="tabular font-bold">{formatCop(s.total_cop)}</p>
                </div>
                <ul className="mt-2 grid gap-1 text-sm text-brand-muted">
                  {s.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {it.qty}× {it.label}
                        {it.options.length > 0 && (
                          <span className="block text-xs">{it.options.map((o) => o.option_name).join(' · ')}</span>
                        )}
                      </span>
                      {it.discount_cop > 0 && (
                        <span className="tabular text-brand-primary-strong">−{formatCop(it.discount_cop)}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {s.prize_used && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary-strong">
                    <Icon name="gift" size={14} /> {s.prize_used}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ))}
    </Screen>
  );
}
