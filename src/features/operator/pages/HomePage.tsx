import { useQuery } from '@tanstack/react-query';
import { ErrorState, LoadingState, Screen } from '@/ui';
import { OpenWorkday } from '../OpenWorkday';
import { workdayQuery } from '../queries';
import { SaleScreen } from '../SaleScreen';

/** /op — 01 (no open workday) or 02 (sale). */
export default function HomePage() {
  const workday = useQuery(workdayQuery);
  if (workday.isPending)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (workday.isError)
    return (
      <Screen>
        <ErrorState error={workday.error} onRetry={() => void workday.refetch()} />
      </Screen>
    );
  return workday.data ? <SaleScreen workday={workday.data} /> : <OpenWorkday />;
}
