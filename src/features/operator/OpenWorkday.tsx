import { useQuery } from '@tanstack/react-query';
import { Logo, Mascot } from '@/brand/Mascot';
import { greeting, longWeekdayDate, todayYmd } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { Link } from 'react-router';
import { Button, ButtonLink, Eyebrow, Icon, Pill, Screen } from '@/ui';
import { historyQuery } from './api';
import { dayTypeLabel, drinks, weatherText } from './labels';
import { OpMenuButton } from './OpNav';
import { opMeQuery } from './queries';
import { useOpenWorkday } from './useOpenWorkday';

/** 01 — Abrir jornada. */
export function OpenWorkday() {
  const me = useQuery(opMeQuery).data;
  const history = useQuery(historyQuery(todayYmd(-60), todayYmd()));
  const workdays = history.data?.workdays ?? [];
  const last = [...workdays].sort((a, b) => b.local_date.localeCompare(a.local_date))[0];
  const today = last && last.local_date === todayYmd() ? last : undefined;

  // Today's workday was closed earlier: opening again continues the same one.
  const isClosed = today?.status === 'closed';
  const m = useOpenWorkday({ reopening: isClosed });

  const weekday = longWeekdayDate().split(' ')[0] ?? '';

  return (
    <Screen tone="white" className="gap-4">
      <header className="flex items-center justify-between pt-1">
        <Logo size={44} />
        <div className="flex items-center gap-2">
          {me && (
            <Pill tone="neutral">
              {me.operator.name} · {me.operator.role === 'owner' ? 'dueño' : 'operador'}
            </Pill>
          )}
          <OpMenuButton />
        </div>
      </header>

      <div>
        <p className="text-brand-muted">
          {greeting()}
          {me ? `, ${me.operator.name}` : ''}
        </p>
        <h1 className="text-[2.5rem] leading-[1.05] font-semibold">{longWeekdayDate()}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-brand-primary-soft p-3">
          <Eyebrow className="text-brand-primary-strong">Tipo</Eyebrow>
          <p className="mt-1 font-semibold">{today ? dayTypeLabel(today.day_type) : weekday}</p>
        </div>
        <div className="rounded-2xl bg-brand-secondary-soft p-3">
          <Eyebrow className="text-brand-secondary-strong">Clima</Eyebrow>
          <p className="mt-1 font-semibold">
            {(today && weatherText(today.weather_temp_c, today.weather_code)) ??
              'Se consulta al abrir'}
          </p>
        </div>
      </div>

      <div className="relative -mx-5 flex min-h-48 flex-1 items-center justify-center overflow-hidden">
        <Mascot
          pose="counter"
          priority
          className="h-auto max-h-[46dvh] w-auto max-w-full object-contain"
          sizes="(max-width: 480px) 90vw, 420px"
        />
      </div>

      {last && !today && (
        <Link
          to={`/op/workdays/${last.workday_id}`}
          className="mx-auto flex min-h-11 items-center gap-1 text-xs text-brand-muted underline-offset-2 active:underline"
        >
          Última jornada · {formatCop(last.revenue_cop)} · {last.sales} ventas
          <Icon name="chevronRight" size={14} />
        </Link>
      )}

      {isClosed && today ? (
        <div className="grid gap-2">
          <p role="status" className="text-center text-sm">
            <span className="font-semibold">La jornada de hoy está cerrada</span>
            <span className="block text-brand-muted">
              Lleva {formatCop(today.revenue_cop)} · {today.sales}{' '}
              {today.sales === 1 ? 'venta' : 'ventas'} · {drinks(today.drinks)}. Al reabrirla, las
              ventas nuevas se suman a la misma jornada.
            </span>
          </p>
          <Button variant="success" loading={m.isPending} onClick={() => m.mutate()}>
            Reabrir jornada
          </Button>
          <ButtonLink to={`/op/workdays/${today.workday_id}`} variant="secondary">
            Ver lo vendido hoy
          </ButtonLink>
        </div>
      ) : (
        <Button variant="success" loading={m.isPending} onClick={() => m.mutate()}>
          Abrir jornada
        </Button>
      )}
    </Screen>
  );
}
