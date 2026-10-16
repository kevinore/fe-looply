import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '@/api/errors';
import { keys } from '@/app/keys';
import { todayYmd } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  toast,
} from '@/ui';
import { closeWorkday, historyQuery, workdayStatsQuery } from '../api';
import { AdminMenuButton, AdminNav } from '../AdminNav';
import { workdayQuery } from '../queries';
import { useOpenWorkday } from '../useOpenWorkday';
import { WorkdayBody, WorkdayHeader } from '../WorkdayReport';

/** 07 — Resumen y cierre. Shows the open workday, or today's closed one. */
export default function SummaryPage() {
  const workday = useQuery(workdayQuery);
  const history = useQuery({
    ...historyQuery(todayYmd(-1), todayYmd()),
    enabled: workday.isSuccess && !workday.data,
  });
  const closedToday = history.data?.workdays.find((w) => w.local_date === todayYmd());
  const id = workday.data?.id ?? closedToday?.workday_id;

  if (workday.isPending || (!workday.data && history.isPending))
    return (
      <Screen footer={<AdminNav />}>
        <LoadingState />
      </Screen>
    );
  if (workday.isError)
    return (
      <Screen footer={<AdminNav />}>
        <ErrorState error={workday.error} onRetry={() => void workday.refetch()} />
      </Screen>
    );
  if (!id)
    return (
      <Screen footer={<AdminNav />} className="justify-center gap-2">
        <EmptyState icon="chart" title="No hay jornada hoy.">
          Abre la jornada para empezar a vender.
        </EmptyState>
        <ButtonLink to="/admin" variant="success">
          Ir a abrir jornada
        </ButtonLink>
        <AllWorkdaysLink />
      </Screen>
    );
  return <Summary id={id} open={!!workday.data} />;
}

function AllWorkdaysLink() {
  return (
    <Link
      to="/admin/history"
      className="flex min-h-12 items-center justify-center gap-1 rounded-2xl text-sm font-semibold text-brand-ink active:bg-brand-field"
    >
      <Icon name="history" size={18} /> Ver todas las jornadas
    </Link>
  );
}

function Summary({ id, open }: { id: string; open: boolean }) {
  const stats = useQuery(workdayStatsQuery(id));
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const reopen = useOpenWorkday({ reopening: true });
  const close = useMutation({
    mutationFn: closeWorkday,
    onSuccess: () => {
      setConfirm(false);
      qc.setQueryData(keys.workday, null);
      void qc.invalidateQueries({ queryKey: keys.workdayStats(id) });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats', 'history'] });
      toast.success('Jornada cerrada');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (stats.isPending)
    return (
      <Screen footer={<AdminNav />}>
        <LoadingState />
      </Screen>
    );
  if (stats.isError)
    return (
      <Screen footer={<AdminNav />}>
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      </Screen>
    );

  const isOpen = open && stats.data.summary.status === 'open';
  return (
    <Screen
      width="wide"
      className="gap-3 pb-4"
      footer={
        <div className="grid gap-2">
          {isOpen ? (
            <Button variant="dark" onClick={() => setConfirm(true)}>
              Cerrar jornada
            </Button>
          ) : (
            <Button variant="success" loading={reopen.isPending} onClick={() => reopen.mutate()}>
              Reabrir jornada
            </Button>
          )}
          <AdminNav />
        </div>
      }
    >
      <WorkdayHeader stats={stats.data} right={<AdminMenuButton />} />
      <WorkdayBody stats={stats.data} workdayId={id}>
        <AllWorkdaysLink />
      </WorkdayBody>
      <ConfirmDialog
        open={confirm}
        title="¿Contaste el efectivo?"
        confirmLabel="Sí, cerrar jornada"
        loading={close.isPending}
        onConfirm={() => close.mutate()}
        onClose={() => setConfirm(false)}
      >
        Cuenta el efectivo de caja contra {formatCop(stats.data.summary.cash_cop)}. Si necesitas
        vender más hoy, puedes reabrirla: las ventas seguirán en esta misma jornada.
      </ConfirmDialog>
    </Screen>
  );
}
