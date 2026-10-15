import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { todayYmd } from '@/lib/dates';
import { Button, ErrorState, LoadingState, Screen, TopBar } from '@/ui';
import { workdayStatsQuery } from '../api';
import { workdayQuery } from '../queries';
import { useOpenWorkday } from '../useOpenWorkday';
import { WorkdayBody, WorkdayHeader } from '../WorkdayReport';

/** Detalle de una jornada: what was sold, how it was paid and every sale. */
export default function WorkdayDetailPage() {
  const { workdayId = '' } = useParams();
  const stats = useQuery(workdayStatsQuery(workdayId));
  const current = useQuery(workdayQuery);
  const reopen = useOpenWorkday({ reopening: true });

  if (stats.isPending)
    return (
      <Screen>
        <TopBar title="Jornada" backTo="/op/history" />
        <LoadingState />
      </Screen>
    );
  if (stats.isError)
    return (
      <Screen>
        <TopBar title="Jornada" backTo="/op/history" />
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      </Screen>
    );

  const s = stats.data.summary;
  // Only today's workday can be reopened, and only if no other is open.
  const canReopen =
    s.status === 'closed' && s.local_date === todayYmd() && current.isSuccess && !current.data;

  return (
    <Screen
      width="wide"
      className="gap-3 pb-4"
      footer={
        canReopen ? (
          <Button variant="success" loading={reopen.isPending} onClick={() => reopen.mutate()}>
            Reabrir jornada
          </Button>
        ) : undefined
      }
    >
      <TopBar title="Jornada" backTo="/op/history" />
      <WorkdayHeader stats={stats.data} />
      <WorkdayBody stats={stats.data} workdayId={workdayId} />
    </Screen>
  );
}
