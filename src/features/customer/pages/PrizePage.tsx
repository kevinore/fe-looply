import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router';
import { keys } from '@/app/keys';
import { useBrand } from '@/brand/BrandProvider';
import { Mascot } from '@/brand/Mascot';
import { daysUntil, shortDate, shortDateYear } from '@/lib/dates';
import { ButtonLink, Eyebrow, ErrorState, LiveDot, LoadingState, Screen, TopBar } from '@/ui';
import { claimApi } from '../api';
import { MessageScreen } from '../components/MessageScreen';
import { prizeBadge, prizeHow } from '../components/prize';

/** M1 · Premio ganado  /  C6 · Detalle del premio. */
export default function PrizePage() {
  const { awardId = '' } = useParams();
  const location = useLocation();
  const justWon = (location.state as { justWon?: boolean } | null)?.justWon === true;
  const { name: businessName } = useBrand();
  const prize = useQuery({ queryKey: keys.prize(awardId), queryFn: () => claimApi.prize(awardId) });

  if (prize.isPending) {
    return (
      <Screen tone={justWon ? 'mint' : 'dark'}>
        <LoadingState className={justWon ? undefined : 'text-white/70'} />
      </Screen>
    );
  }
  if (prize.isError) {
    return (
      <Screen tone="soft">
        <TopBar backTo="/client" />
        <ErrorState error={prize.error} onRetry={() => void prize.refetch()} />
      </Screen>
    );
  }

  const p = prize.data;
  const cardLink = (
    <ButtonLink to="/client" replace variant="dark">
      Ver mi tarjeta
    </ButtonLink>
  );
  if (p.status === 'redeemed') return <MessageScreen title="Ya usaste este premio" body={p.name} actions={cardLink} />;
  if (p.status === 'expired') return <MessageScreen title="Este premio venció" body={p.name} actions={cardLink} />;
  if (p.status !== 'active')
    return <MessageScreen title="Este premio ya no está disponible" body={p.name} actions={cardLink} />;

  if (justWon) {
    return (
      <Screen
        tone="mint"
        footer={
          <div className="grid gap-2">
            <ButtonLink to={`/client/prize/${p.id}/use`} variant="dark">
              Usar ahora
            </ButtonLink>
            <ButtonLink to="/client" replace variant="secondary">
              Guardar para otra visita
            </ButtonLink>
          </div>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <div className="size-52 overflow-hidden rounded-full bg-brand-primary sm:size-60">
            <Mascot pose="matcha" priority sizes="240px" className="size-full translate-y-3 object-cover" />
          </div>
          <div className="relative -mt-6 w-full max-w-sm animate-pop rounded-card bg-white px-5 py-5 shadow-card">
            <Eyebrow className="text-brand-primary-strong">¡Ganaste!</Eyebrow>
            <h1 className="mt-1 text-[2.1rem] leading-tight font-semibold">{p.name}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {prizeHow(p.type)} · vence {shortDateYear(p.expires_at)}
            </p>
          </div>
          <p className="mt-8 font-display text-2xl font-semibold">¿Lo usas ahora?</p>
        </div>
      </Screen>
    );
  }

  // C6 · detail from the card
  const days = daysUntil(p.expires_at);
  const steps = [
    businessName ? `Haz tu pedido en el punto ${businessName}.` : 'Haz tu pedido.',
    'Dile tu nombre al operador. Él lo redime desde tu ficha.',
    'Máximo un premio por compra.',
  ];
  return (
    <Screen
      tone="dark"
      footer={
        <div className="grid gap-3">
          <ButtonLink to={`/client/prize/${p.id}/use`} variant="primary">
            Usar ahora
          </ButtonLink>
          <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-medium text-white/85">
            <LiveDot className="text-brand-secondary" /> Activo · solo lo redime el operador
          </p>
        </div>
      }
    >
      <TopBar title="Premio" backTo="/client" dark />
      <div className="mt-4 rounded-card bg-brand-primary-soft p-5 text-center text-brand-ink">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-primary text-xl font-bold">
          {prizeBadge(p.type, p.short_label)}
        </span>
        <h1 className="mt-4 text-[2rem] leading-tight font-semibold">{p.name}</h1>
        <p className="mt-1 text-sm text-brand-muted">{prizeHow(p.type)}</p>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-xl bg-white p-3">
            <dt className="text-[0.6875rem] font-bold tracking-widest text-brand-muted uppercase">Ganado</dt>
            <dd className="mt-1 font-semibold">{shortDateYear(p.awarded_at)}</dd>
          </div>
          <div className="rounded-xl bg-white p-3">
            <dt className="text-[0.6875rem] font-bold tracking-widest text-brand-muted uppercase">Vence</dt>
            <dd className="mt-1 font-semibold">
              {shortDate(p.expires_at)} · {days} {days === 1 ? 'día' : 'días'}
            </dd>
          </div>
        </dl>
      </div>
      <ol className="mt-6 grid gap-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[0.9375rem] text-white/85">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-sm font-bold text-brand-ink">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </Screen>
  );
}
