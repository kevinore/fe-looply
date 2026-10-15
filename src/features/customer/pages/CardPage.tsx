import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useBrand } from '@/brand/BrandProvider';
import { Logo, Mascot } from '@/brand/Mascot';
import { shortWeekdayDate } from '@/lib/dates';
import { sendEvent } from '@/lib/events';
import { EmptyState, ErrorState, Eyebrow, Icon, LoadingState, ProgressSegments, Screen } from '@/ui';
import { CustomerNav } from '../components/CustomerNav';
import { NoSession } from '../components/NoSession';
import { PrizeRow } from '../components/PrizeRow';
import { meQuery } from '../queries';

/** C5 · Mi tarjeta. */
export default function CardPage() {
  const me = useQuery(meQuery);
  const { name } = useBrand();
  const viewed = useRef(false);

  useEffect(() => {
    if (me.data && !viewed.current) {
      viewed.current = true;
      sendEvent('card_viewed');
    }
  }, [me.data]);

  if (me.isPending) {
    return (
      <Screen tone="white">
        <LoadingState />
      </Screen>
    );
  }
  if (me.isError) {
    return (
      <Screen tone="white">
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }
  if (me.data === null) return <NoSession />;

  const card = me.data;
  const spins = card.available_spins;
  const firstSpin = spins[0];

  return (
    <Screen tone="white" footer={<CustomerNav />}>
      <header className="flex items-center justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-sm text-brand-muted">{shortWeekdayDate()}</p>
          <h1 className="truncate text-[2rem] leading-tight font-semibold">Hola, {card.customer.alias}</h1>
        </div>
        <div className="size-12 shrink-0 overflow-hidden rounded-full bg-brand-primary-soft">
          <Mascot pose="drink" sizes="48px" className="size-full translate-y-1 scale-125 object-contain" />
        </div>
      </header>

      <section
        aria-label="Tu tarjeta"
        className="relative mt-5 overflow-hidden rounded-card bg-brand-primary p-4 pb-5 text-brand-ink shadow-card"
      >
        <Logo size={96} className="pointer-events-none absolute -top-3 -right-4 size-28 opacity-25" />
        <Eyebrow className="relative">Tarjeta {name}</Eyebrow>
        <p className="relative mt-2 mb-4 flex items-baseline gap-2">
          <span className="font-display text-6xl leading-none font-semibold">{card.progress}</span>
          <span className="font-medium">de {card.milestone_every} compras</span>
        </p>
        <ProgressSegments total={card.milestone_every} progress={card.progress} variant="boxes" className="relative" />
        {card.progress === card.milestone_every && spins.length === 0 && (
          // Full card whose spin was already used: say what happens next.
          <p className="relative mt-3 text-sm font-medium">¡Tarjeta completa! Tu próxima compra empieza una nueva.</p>
        )}
      </section>

      {firstSpin && (
        <Link
          to={`/c/spin/${firstSpin.id}`}
          className="mt-3 flex min-h-16 animate-pop items-center gap-3 rounded-2xl bg-brand-secondary p-4 font-semibold text-brand-ink shadow-card active:brightness-95"
        >
          <Icon name="gift" />
          <span className="flex-1">
            Tienes {spins.length} {spins.length === 1 ? 'giro esperándote' : 'giros esperándote'}
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      )}

      <Link
        to="/c/scan"
        className="mt-3 flex min-h-16 items-center gap-3 rounded-2xl bg-brand-ink p-4 text-white active:bg-brand-ink/85"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Escanear mi compra</span>
          <span className="block text-sm text-white/70">Apunta al QR que te muestra el operador</span>
        </span>
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-primary text-brand-ink">
          <Icon name="scan" size={20} />
        </span>
      </Link>

      <section className="mt-6 pb-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-sans text-base font-semibold">Premios activos</h2>
          <span className="text-sm font-semibold text-brand-primary-strong">{card.active_prizes.length}</span>
        </div>
        {card.active_prizes.length === 0 ? (
          <EmptyState icon="gift" title="Aún no tienes premios" className="rounded-2xl bg-brand-field">
            Cada {card.milestone_every} compras giras la ruleta.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {card.active_prizes.map((p) => (
              <li key={p.id}>
                <PrizeRow id={p.id} name={p.name} type={p.type} shortLabel={p.short_label} expiresAt={p.expires_at} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Screen>
  );
}
