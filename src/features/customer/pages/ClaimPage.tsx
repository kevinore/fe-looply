import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { useNavigate, useParams } from 'react-router';
import { ApiError, isApiError } from '@/api/errors';
import { Logo } from '@/brand/Mascot';
import { sendEvent } from '@/lib/events';
import { ButtonLink, ErrorState, Screen, Spinner } from '@/ui';
import { CLAIM_STATE_COPY, claimApi, claimErrorState, useClaimResultNavigation } from '../api';
import { MessageScreen } from '../components/MessageScreen';
import { meQuery } from '../queries';

type View = { kind: 'loading' } | { kind: 'message'; state: string; hasSession: boolean } | { kind: 'error'; error: unknown };

/** Entry from the QR (plan §7.1). No UI of its own: decides where to go. */
export default function ClaimPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const goToResult = useClaimResultNavigation();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const started = useRef(false);

  // Most QR scans end on the register screen: fetch its hero image and code
  // while we wait for the API, so they don't start only after navigating.
  preload('/brand/mascot-drink-640.avif', {
    as: 'image',
    type: 'image/avif',
    imageSrcSet: '/brand/mascot-drink-320.avif 320w, /brand/mascot-drink-640.avif 640w, /brand/mascot-drink-960.avif 960w',
    imageSizes: '(max-width: 480px) 50vw, 240px',
    fetchPriority: 'high',
  });
  useEffect(() => {
    void import('./RegisterPage');
  }, []);

  const run = useCallback(async () => {
    setView({ kind: 'loading' });
    let hasSession = false;
    try {
      const [preview, me] = await Promise.all([claimApi.preview(token), qc.fetchQuery({ ...meQuery, staleTime: 0 })]);
      hasSession = me !== null;
      if (preview.state !== 'claimable') {
        setView({ kind: 'message', state: preview.state, hasSession });
        return;
      }
      if (!me) {
        navigate(`/client/register/${token}`, { replace: true, state: { preview } });
        return;
      }
      const result = await claimApi.claim(token);
      goToResult(result, preview.sale);
    } catch (e) {
      const state = e instanceof ApiError ? claimErrorState(e.code) : null;
      if (state) setView({ kind: 'message', state, hasSession });
      else setView({ kind: 'error', error: e });
    }
  }, [token, qc, navigate, goToResult]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sendEvent('qr_scanned', { token_prefix: token.slice(0, 6) });
    void run();
  }, [run, token]);

  if (view.kind === 'message') {
    const copy = CLAIM_STATE_COPY[view.state] ?? CLAIM_STATE_COPY.not_found!;
    return (
      <MessageScreen
        title={copy.title}
        body={copy.body}
        actions={
          view.hasSession ? (
            <ButtonLink to="/client" replace variant="dark">
              Ver mi tarjeta
            </ButtonLink>
          ) : (
            <ButtonLink to="/client" replace variant="secondary">
              Ir al inicio
            </ButtonLink>
          )
        }
      />
    );
  }

  if (view.kind === 'error') {
    return (
      <Screen tone="soft">
        <ErrorState
          error={view.error}
          title={isApiError(view.error, 'network_error') ? 'Sin conexión' : 'No pudimos abrir tu compra'}
          onRetry={() => void run()}
        />
      </Screen>
    );
  }

  return (
    <Screen tone="soft" className="items-center justify-center gap-6">
      <Logo size={112} className="size-28 animate-pop" />
      <p role="status" className="flex items-center gap-2 font-medium text-brand-muted">
        <Spinner /> Buscando tu compra…
      </p>
    </Screen>
  );
}
