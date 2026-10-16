import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { ApiError, errorMessage } from '@/api/errors';
import type { ClaimPreview } from '@/api/types';
import { Mascot } from '@/brand/Mascot';
import { sendEvent } from '@/lib/events';
import { useHoldUpdates } from '@/lib/swUpdate';
import { Button, ButtonLink, Eyebrow, Screen, toast } from '@/ui';
import { CLAIM_STATE_COPY, claimApi, claimErrorState, useClaimResultNavigation } from '../api';
import { MessageScreen } from '../components/MessageScreen';
import type { RegisterState } from './RegisterPage';

export type ConfirmState = {
  phone: string;
  digits: string;
  alias: string;
  last4: string;
  typedAlias: string;
  preview?: ClaimPreview;
};

/** C2 · ¿Eres …? */
export default function ConfirmPage() {
  const { token = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const goToResult = useClaimResultNavigation();
  const state = location.state as ConfirmState | null;
  const [loading, setLoading] = useState(false);
  const [claimState, setClaimState] = useState<string | null>(null);
  useHoldUpdates('confirm', loading);

  // Entered without state (reload): restart the flow from the QR entry.
  if (!state?.phone) return <Navigate to={`/client/claim/${token}`} replace />;

  if (claimState) {
    const copy = CLAIM_STATE_COPY[claimState] ?? CLAIM_STATE_COPY.not_found!;
    return (
      <MessageScreen
        title={copy.title}
        body={copy.body}
        actions={
          <ButtonLink to="/client" replace variant="secondary">
            Ir al inicio
          </ButtonLink>
        }
      />
    );
  }

  const confirm = async () => {
    setLoading(true);
    try {
      const result = await claimApi.confirm({ phone: state.phone, claim_token: token });
      goToResult(result, state.preview?.sale);
    } catch (e) {
      setLoading(false);
      const cs = e instanceof ApiError ? claimErrorState(e.code) : null;
      if (cs) setClaimState(cs);
      else toast.error(errorMessage(e));
    }
  };

  const reject = () => {
    sendEvent('identity_rejected');
    const back: RegisterState = {
      preview: state.preview,
      phone: state.digits,
      alias: state.typedAlias,
      focusPhone: true,
    };
    navigate(`/client/register/${token}`, { replace: true, state: back });
  };

  const [a, b] = [state.digits.slice(0, 3) || '3••', state.last4];

  return (
    <Screen
      tone="white"
      footer={
        <div className="grid gap-2">
          <Button variant="success" loading={loading} onClick={confirm}>
            Sí, soy yo
          </Button>
          <Button variant="secondary" disabled={loading} onClick={reject}>
            No, corregir número
          </Button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
        <div className="size-48 overflow-hidden rounded-full bg-brand-primary-soft sm:size-56">
          <Mascot pose="matcha" priority sizes="224px" className="size-full object-cover" />
        </div>
        <div>
          <Eyebrow className="text-brand-secondary-strong">Ya tienes tarjeta</Eyebrow>
          <h1 className="mt-2 text-[2.5rem] leading-tight font-semibold">¿Eres {state.alias}?</h1>
          <p className="mx-auto mt-3 max-w-[19rem] text-brand-muted">
            El número{' '}
            <strong className="tabular whitespace-nowrap text-brand-ink">
              {a} ••• {b}
            </strong>{' '}
            ya está registrado. Confirma y sumamos la compra de hoy a tu tarjeta.
          </p>
        </div>
      </div>
    </Screen>
  );
}
