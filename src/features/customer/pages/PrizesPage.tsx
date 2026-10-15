import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/ui';
import { CustomerNav } from '../components/CustomerNav';
import { NoSession } from '../components/NoSession';
import { PrizeRow } from '../components/PrizeRow';
import { meQuery } from '../queries';

/** Active prizes (bottom bar "Premios"). */
export default function PrizesPage() {
  const me = useQuery(meQuery);
  if (me.data === null) return <NoSession />;
  return (
    <Screen tone="white" footer={<CustomerNav />}>
      <h1 className="pt-2 text-[2rem] font-semibold">Tus premios</h1>
      {me.isPending && <LoadingState />}
      {me.isError && <ErrorState error={me.error} onRetry={() => void me.refetch()} />}
      {me.data &&
        (me.data.active_prizes.length === 0 ? (
          <EmptyState icon="gift" title="Aún no tienes premios" className="flex-1">
            Cada {me.data.milestone_every} compras giras la ruleta.
          </EmptyState>
        ) : (
          <ul className="mt-4 grid gap-2 pb-4">
            {me.data.active_prizes.map((p) => (
              <li key={p.id}>
                <PrizeRow id={p.id} name={p.name} type={p.type} shortLabel={p.short_label} expiresAt={p.expires_at} />
              </li>
            ))}
          </ul>
        ))}
    </Screen>
  );
}
