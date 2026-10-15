import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { api, unwrap } from '@/api/client';
import type { ClaimPreview, ClaimResult } from '@/api/types';
import { keys } from '@/app/keys';

export const claimApi = {
  preview: (token: string) => unwrap(api.GET('/api/c/claims/{token}', { params: { path: { token } } })),
  claim: (claim_token: string) => unwrap(api.POST('/api/c/claim', { body: { claim_token } })),
  register: (body: { phone: string; alias: string; consent: boolean; claim_token: string }) =>
    unwrap(api.POST('/api/c/register', { body })),
  confirm: (body: { phone: string; claim_token: string }) =>
    unwrap(api.POST('/api/c/identify/confirm', { body })),
  wheel: () => unwrap(api.GET('/api/c/wheel')),
  spin: (spinId: string) =>
    unwrap(api.POST('/api/c/spins/{spin_id}/spin', { params: { path: { spin_id: spinId } } })),
  prize: (id: string) =>
    unwrap(api.GET('/api/c/prizes/{prize_award_id}', { params: { path: { prize_award_id: id } } })),
  history: () => unwrap(api.GET('/api/c/history')),
};

export type PreviewSale = NonNullable<ClaimPreview['sale']>;

/** Navigation state passed from the claim flow to S2 / C3. */
export type ClaimedState = { result: ClaimResult; sale?: PreviewSale | null };

/** After a successful claim (plan §7.1 step 6): spin if unlocked, otherwise +1 compra. */
export function useClaimResultNavigation() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useCallback(
    (result: ClaimResult, sale?: PreviewSale | null) => {
      qc.setQueryData(keys.me, result.card);
      const state: ClaimedState = { result, sale };
      const first = result.new_spins[0];
      if (first) navigate(`/c/spin/${first.id}`, { replace: true, state });
      else navigate('/c/claimed', { replace: true, state });
    },
    [navigate, qc],
  );
}

/** Message screens for non-claimable previews (plan §7.1 step 3). */
export const CLAIM_STATE_COPY: Record<string, { title: string; body: string }> = {
  already_claimed: { title: 'Esta compra ya fue reclamada', body: 'Cada compra suma una sola vez.' },
  expired: {
    title: 'Este código venció',
    body: 'Pide al operador que lo busque por tus últimos 4 dígitos.',
  },
  voided: { title: 'Esta compra fue anulada', body: 'Si crees que es un error, habla con el operador.' },
  not_found: { title: 'No encontramos esa compra', body: 'Revisa que escaneaste el código correcto.' },
};

/** Maps claim error codes to the preview states above. */
export function claimErrorState(code: string): string | null {
  switch (code) {
    case 'claim_already_claimed':
      return 'already_claimed';
    case 'claim_expired':
      return 'expired';
    case 'claim_voided':
      return 'voided';
    case 'claim_not_found':
      return 'not_found';
    default:
      return null;
  }
}
