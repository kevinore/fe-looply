import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage, isApiError } from '@/api/errors';
import { keys } from '@/app/keys';
import { toast } from '@/ui';
import { openWorkday } from './api';

/**
 * Open today's workday — or reopen it if it was closed earlier today. Either
 * way it is the same workday for the date, so the day's sales stay together.
 */
export function useOpenWorkday({ reopening = false }: { reopening?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: openWorkday,
    onSuccess: (wd) => {
      qc.setQueryData(keys.workday, wd);
      void qc.invalidateQueries({ queryKey: keys.workdayStats(wd.id) });
      void qc.invalidateQueries({ queryKey: ['op', 'stats', 'history'] });
      if (reopening) toast.success('Jornada reabierta · las ventas siguen en el mismo día');
    },
    onError: (e) => {
      if (isApiError(e, 'workday_already_open'))
        void qc.invalidateQueries({ queryKey: keys.workday });
      else toast.error(errorMessage(e));
    },
  });
}
