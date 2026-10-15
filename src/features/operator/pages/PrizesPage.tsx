import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { daysUntil } from '@/lib/dates';
import { Avatar, EmptyState, ErrorState, LoadingState, Screen, Tabs } from '@/ui';
import { pendingQuery, type PendingFilter } from '../api';
import { OpMenuButton, OpNav } from '../OpNav';

function expiresIn(date: string) {
  const d = daysUntil(date);
  return d === 0 ? 'vence hoy' : d === 1 ? 'vence en 1 día' : `vence en ${d} días`;
}

/** R5 — Premios pendientes. */
export default function PrizesPage() {
  const [filter, setFilter] = useState<PendingFilter>('expiring');
  const list = useQuery(pendingQuery(filter));
  const all = useQuery(pendingQuery('all')).data;
  const expiring = useQuery(pendingQuery('expiring')).data;
  const free = useQuery(pendingQuery('free')).data;
  const customers = all ? new Set(all.map((p) => p.customer_id)).size : null;

  const count = (n: number | undefined) => (n === undefined ? '' : ` · ${n}`);

  return (
    <Screen width="medium" footer={<OpNav />} className="gap-4">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-semibold">Premios pendientes</h1>
          {all && (
            <p className="text-sm text-brand-muted">
              {customers} {customers === 1 ? 'cliente' : 'clientes'} · {all.length} premios activos
            </p>
          )}
        </div>
        <OpMenuButton />
      </header>
      <Tabs
        label="Filtro de premios"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'expiring', label: `Vencen en 7 días${count(expiring?.length)}` },
          { value: 'free', label: `Gratis${count(free?.length)}` },
          { value: 'all', label: 'Todos' },
        ]}
      />
      <div role="tabpanel" className="flex flex-1 flex-col">
        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.length === 0 ? (
          <EmptyState icon="gift" title="No hay premios en esta lista." />
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {list.data.map((p) => (
              <li key={p.prize_award_id} className="flex items-center gap-3 rounded-2xl bg-brand-primary-soft p-3">
                <Avatar name={p.alias} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate font-semibold">
                    {p.alias} <span className="font-normal text-brand-muted">· {p.phone_last4}</span>
                  </p>
                  <p className="truncate text-xs text-brand-muted">{p.prize_name}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand-primary-strong">{expiresIn(p.expires_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="rounded-xl bg-brand-primary-soft px-3 py-2 text-xs text-brand-muted">
        Al buscar o vincular a un cliente con premios, el aviso aparece solo en la venta.
      </p>
    </Screen>
  );
}
