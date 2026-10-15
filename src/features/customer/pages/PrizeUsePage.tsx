import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { keys } from '@/app/keys';
import { useWakeLock } from '@/lib/wakeLock';
import { ButtonLink, ErrorState, Eyebrow, Icon, LoadingState, Screen, TopBar } from '@/ui';
import { claimApi } from '../api';
import { MessageScreen } from '../components/MessageScreen';
import { prizeHow } from '../components/prize';
import { meQuery } from '../queries';

/** M2 · Quiero usar mi premio. High-contrast screen to show the operator. */
export default function PrizeUsePage() {
  const { awardId = '' } = useParams();
  const me = useQuery(meQuery);
  const prize = useQuery({
    queryKey: keys.prize(awardId),
    queryFn: () => claimApi.prize(awardId),
    // Poll every 3 s until the operator redeems it (plan §7.7).
    refetchInterval: (q) => (q.state.data && q.state.data.status !== 'active' ? false : 3000),
    refetchIntervalInBackground: false,
  });
  const status = prize.data?.status;
  useWakeLock(status === undefined || status === 'active');

  if (prize.isPending || me.isPending) {
    return (
      <Screen tone="dark">
        <LoadingState className="text-white/70" />
      </Screen>
    );
  }
  if (prize.isError && !prize.data) {
    return (
      <Screen tone="dark">
        <TopBar backTo="/c" dark />
        <ErrorState error={prize.error} onRetry={() => void prize.refetch()} className="text-white" />
      </Screen>
    );
  }

  const p = prize.data!;

  if (p.status === 'redeemed') {
    return (
      <Screen
        tone="secondary"
        footer={
          <ButtonLink to="/c" replace variant="dark">
            Listo
          </ButtonLink>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <span className="flex size-24 animate-pop items-center justify-center rounded-full bg-brand-ink text-white">
            <Icon name="check" size={48} strokeWidth={3} />
          </span>
          <h1 className="text-[2.75rem] leading-tight font-semibold">¡Premio aplicado!</h1>
          <p className="text-lg">{p.name}</p>
        </div>
      </Screen>
    );
  }
  if (p.status !== 'active') {
    return (
      <MessageScreen
        title={p.status === 'expired' ? 'Este premio venció' : 'Este premio ya no está disponible'}
        body={p.name}
        actions={
          <ButtonLink to="/c" replace variant="dark">
            Ver mi tarjeta
          </ButtonLink>
        }
      />
    );
  }

  const customer = me.data?.customer;

  return (
    <Screen
      tone="dark"
      footer={
        <Link
          to="/c"
          replace
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-white/12 font-semibold text-white active:bg-white/20"
        >
          Mejor lo guardo
        </Link>
      }
    >
      <div className="flex flex-1 flex-col pt-6">
        <Eyebrow className="text-brand-primary">Cuando te toque, dile:</Eyebrow>
        <h1 className="mt-3 text-[2.4rem] leading-[1.08] font-semibold text-white">“Quiero usar mi premio”</h1>
        <div className="mt-7 rounded-card bg-brand-primary-soft p-5 text-brand-ink">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-bold tracking-widest text-brand-muted uppercase">Nombre</p>
              <p className="truncate font-display text-3xl font-semibold">{customer?.alias ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.6875rem] font-bold tracking-widest text-brand-muted uppercase">Celular</p>
              <p className="tabular text-3xl font-bold tracking-wide">{customer?.phone_last4 ?? '—'}</p>
            </div>
          </div>
          <div className="mt-5 border-t border-brand-ink/10 pt-4">
            <p className="text-[0.6875rem] font-bold tracking-widest text-brand-muted uppercase">Premio</p>
            <p className="text-xl font-semibold">{p.name}</p>
            <p className="text-sm text-brand-muted">{prizeHow(p.type)}</p>
          </div>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/8 p-4 text-sm text-white/75" role="status">
          <Icon name="refresh" size={18} className="mt-0.5 shrink-0 text-brand-secondary" />
          Esta pantalla se actualiza sola cuando el operador lo redime.
        </p>
      </div>
    </Screen>
  );
}
