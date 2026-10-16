import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ApiError, errorMessage } from '@/api/errors';
import type { SpinResult } from '@/api/types';
import { keys } from '@/app/keys';
import { Mascot } from '@/brand/Mascot';
import { prefersReducedMotion } from '@/lib/device';
import { useHoldUpdates } from '@/lib/swUpdate';
import { createSpinner } from '@/lib/wheel';
import { Button, ButtonLink, ErrorState, Eyebrow, LoadingState, Pill, ProgressSegments, Screen, TextButton, toast } from '@/ui';
import { claimApi, type ClaimedState } from '../api';
import { MessageScreen } from '../components/MessageScreen';
import { Wheel } from '../components/Wheel';
import { meQuery } from '../queries';

const storageKey = (spinId: string) => `spin:${spinId}`;

/** C3 / S3 · Ruleta. */
export default function SpinPage() {
  const { spinId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const claimed = location.state as ClaimedState | null;

  // Always the current wheel: the owner can change prizes, and the server lands on
  // a segment index of its own list (a stale order would stop on the wrong label).
  const wheel = useQuery({ queryKey: keys.wheel, queryFn: claimApi.wheel, staleTime: 0, refetchOnMount: 'always' });
  const me = useQuery(meQuery);
  const card = claimed?.result.card ?? me.data ?? null;
  const spin =
    claimed?.result.new_spins.find((s) => s.id === spinId) ?? card?.available_spins.find((s) => s.id === spinId);
  const isMilestone = spin?.reason === 'milestone';

  const [revealed, setRevealed] = useState(false); // S3 → wheel
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [resuming, setResuming] = useState(() => sessionStorage.getItem(storageKey(spinId)) !== null);
  const resumed = useRef(false);
  const rotor = useRef<HTMLDivElement>(null);
  const spinner = useRef<ReturnType<typeof createSpinner> | null>(null);
  useHoldUpdates('spin', busy);
  useEffect(() => () => spinner.current?.stop(), []);

  /** Turns the wheel element directly on each frame (no React render per frame). */
  const getSpinner = () =>
    (spinner.current ??= createSpinner((deg) => {
      if (rotor.current) rotor.current.style.transform = `rotate(${deg}deg)`;
    }));

  const goToPrize = (r: SpinResult) => {
    navigate(`/client/prize/${r.prize_award.id}`, { replace: true, state: { justWon: true } });
  };

  const doSpin = async (): Promise<SpinResult | null> => {
    try {
      const r = await claimApi.spin(spinId);
      qc.setQueryData(keys.me, r.card);
      return r;
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'spin_not_found' || e.code === 'spin_not_available')) {
        sessionStorage.removeItem(storageKey(spinId));
        setUnavailable(e.message);
      } else {
        toast.error(errorMessage(e));
      }
      return null;
    }
  };

  // Reload mid-spin: the backend returns the same prize; show it without animating.
  useEffect(() => {
    if (!resuming || resumed.current) return;
    resumed.current = true;
    void doSpin().then((r) => {
      if (r) goToPrize(r);
      else setResuming(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resuming]);

  /**
   * The wheel starts turning on the tap itself, while the server draws the prize
   * (R12); when the answer arrives it slows down and stops on that prize.
   */
  const onSpin = async () => {
    if (busy) return;
    setBusy(true);
    const key = storageKey(spinId);
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, crypto.randomUUID());
    const n = wheel.data?.segments.length ?? 0;
    const animated = n > 0 && !prefersReducedMotion();
    if (animated) getSpinner().start();

    const r = await doSpin();
    if (!r) {
      spinner.current?.stop(); // nothing was spent: the customer can try again
      setBusy(false);
      return;
    }
    if (!animated || r.segment_index === null) {
      spinner.current?.stop();
      goToPrize(r);
      return;
    }
    getSpinner().land(r.segment_index, n, () => window.setTimeout(() => goToPrize(r), 700));
  };

  if (unavailable) {
    return (
      <MessageScreen
        title={unavailable}
        body="Si ya giraste, tu premio está guardado en tu tarjeta."
        actions={
          <ButtonLink to="/client" replace variant="dark">
            Ver mi tarjeta
          </ButtonLink>
        }
      />
    );
  }

  if (resuming) {
    return (
      <Screen tone="soft">
        <LoadingState label="Recuperando tu premio…" />
      </Screen>
    );
  }

  // S3 · ¡Giro desbloqueado!
  if (isMilestone && !revealed && card) {
    return (
      <Screen
        tone="secondary"
        footer={
          <div className="grid gap-1">
            <Button variant="dark" onClick={() => setRevealed(true)}>
              Girar ahora
            </Button>
            <TextButton onClick={() => navigate('/client', { replace: true })} className="font-medium no-underline">
              o gíralo después desde tu tarjeta
            </TextButton>
          </div>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
          <div className="size-56 overflow-hidden rounded-full bg-white/85 sm:size-64">
            <Mascot pose="counter" priority sizes="256px" className="size-full translate-y-2 object-contain" />
          </div>
          <Eyebrow className="text-brand-ink/75">
            +1 compra · {card.milestone_every} de {card.milestone_every}
          </Eyebrow>
          <h1 className="text-[2.75rem] leading-[1.02] font-semibold">¡Giro desbloqueado!</h1>
          <ProgressSegments
            total={card.milestone_every}
            progress={card.milestone_every}
            highlightLast
            tone="onColor"
            className="w-full max-w-xs"
          />
        </div>
      </Screen>
    );
  }

  const alias = card?.customer.alias;

  return (
    <Screen
      tone="soft"
      footer={
        <div>
          <Button variant="dark" onClick={onSpin} disabled={busy || !wheel.data || wheel.isFetching}>
            Girar
          </Button>
          <p className="mt-3 text-center text-xs text-brand-muted">Si cierras la app, tu premio queda guardado.</p>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center gap-6 py-4 text-center">
        <div>
          <Pill tone="light" className="text-brand-primary-strong">
            {isMilestone ? 'Giro desbloqueado' : 'Giro de bienvenida'}
          </Pill>
          <h1 className="mt-3 text-[2.6rem] leading-tight font-semibold">{alias ? `Gira, ${alias}.` : 'Gira la ruleta.'}</h1>
          <p className="text-brand-muted">Todas las casillas ganan.</p>
        </div>
        <div className="flex w-full flex-1 items-center">
          {wheel.isPending && <LoadingState />}
          {wheel.isError && <ErrorState error={wheel.error} onRetry={() => void wheel.refetch()} />}
          {wheel.data && (
            <Wheel segments={wheel.data.segments} rotorRef={rotor} />
          )}
        </div>
      </div>
    </Screen>
  );
}
