import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import * as z from 'zod/mini';
import { ApiError, errorMessage } from '@/api/errors';
import type { ClaimPreview } from '@/api/types';
import { keys } from '@/app/keys';
import { useBrand } from '@/brand/BrandProvider';
import { Logo, Mascot } from '@/brand/Mascot';
import { sendEvent } from '@/lib/events';
import { useHoldUpdates } from '@/lib/swUpdate';
import { formatCop } from '@/lib/money';
import { formatPhoneInput, isValidColombianMobile, phoneDigits } from '@/lib/phone';
import { Button, ButtonLink, Field, Icon, Pill, toast } from '@/ui';
import { CLAIM_STATE_COPY, claimApi, claimErrorState, useClaimResultNavigation } from '../api';
import { MessageScreen } from '../components/MessageScreen';

export type RegisterState = { preview?: ClaimPreview; phone?: string; alias?: string; focusPhone?: boolean };

const schema = z.object({
  phone: z.string().check(z.refine(isValidColombianMobile)),
  alias: z.string().check(z.trim(), z.minLength(2), z.maxLength(30)),
  consent: z.literal(true),
});

/** C1 · Registro. */
export default function RegisterPage() {
  const { token = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const goToResult = useClaimResultNavigation();
  const { branding } = useBrand();
  const incoming = (location.state ?? {}) as RegisterState;

  // Preview comes from the claim screen; after a reload, fetch it again.
  const previewQuery = useQuery({
    queryKey: keys.claim(token),
    queryFn: () => claimApi.preview(token),
    initialData: incoming.preview,
    staleTime: 60_000,
  });
  const preview = previewQuery.data;
  const sale = preview?.sale ?? null;

  const [phone, setPhone] = useState(formatPhoneInput(incoming.phone ?? ''));
  const [alias, setAlias] = useState(incoming.alias ?? '');
  const [consent, setConsent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimState, setClaimState] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const viewed = useRef(false);
  // Don't switch versions under a half-filled form.
  useHoldUpdates('register', phone !== '' || alias !== '' || consent || submitting);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    sendEvent('register_viewed');
    if (incoming.focusPhone) phoneRef.current?.focus();
  }, [incoming.focusPhone]);

  const valid = schema.safeParse({ phone, alias, consent }).success;
  const state = claimState ?? (preview && preview.state !== 'claimable' ? preview.state : null);

  if (state) {
    const copy = CLAIM_STATE_COPY[state] ?? CLAIM_STATE_COPY.not_found!;
    return (
      <MessageScreen
        title={copy.title}
        body={copy.body}
        actions={
          <ButtonLink to="/c" replace variant="secondary">
            Ir al inicio
          </ButtonLink>
        }
      />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setPhoneError(null);
    const digits = phoneDigits(phone);
    try {
      const result = await claimApi.register({
        phone: `+57${digits}`,
        alias: alias.trim(),
        consent: true,
        claim_token: token,
      });
      goToResult(result, sale);
    } catch (err) {
      setSubmitting(false);
      if (!(err instanceof ApiError)) return toast.error(errorMessage(err));
      if (err.code === 'customer_exists') {
        navigate(`/c/confirm/${token}`, {
          state: {
            phone: `+57${digits}`,
            digits,
            alias: String(err.extra.alias ?? ''),
            last4: String(err.extra.phone_last4 ?? digits.slice(-4)),
            typedAlias: alias,
            preview,
          },
        });
        return;
      }
      if (err.code === 'invalid_phone') {
        setPhoneError(err.message);
        phoneRef.current?.focus();
        return;
      }
      const cs = claimErrorState(err.code);
      if (cs) return setClaimState(cs);
      toast.error(err.message);
    }
  };

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-brand-primary-soft">
      <div className="mx-auto w-full max-w-lg px-safe pt-safe">
        <header className="flex items-center justify-between gap-3">
          <Logo size={44} className="size-11" />
          {sale && (
            <Pill tone="light" className="tabular">
              Compra · {sale.items_count} {sale.items_count === 1 ? 'bebida' : 'bebidas'} · {formatCop(sale.total_cop)}
            </Pill>
          )}
        </header>
        <div className="relative flex min-h-[13.125rem] items-end pb-5 sm:min-h-[16.25rem]">
          <div className="relative z-10 max-w-[58%] pt-4">
            <h1 className="text-[2.35rem] leading-[1.02] font-semibold sm:text-5xl">Tu compra ya cuenta.</h1>
            <p className="mt-3 text-[0.9375rem] leading-snug text-brand-muted">
              Regístrate y gira la ruleta. Todas las casillas ganan.
            </p>
          </div>
          <Mascot
            pose="drink"
            priority
            sizes="(max-width: 480px) 50vw, 240px"
            className="absolute right-[-12px] bottom-0 w-[52%] max-w-[15.625rem]"
          />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 rounded-t-sheet bg-white px-safe pt-6 pb-safe shadow-sheet sm:mb-6 sm:flex-none sm:rounded-sheet"
      >
        <Field
          ref={phoneRef}
          label="Celular"
          name="phone"
          prefix="+57"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="310 123 4567"
          value={phone}
          maxLength={12}
          error={phoneError}
          onChange={(e) => {
            setPhone(formatPhoneInput(e.target.value));
            setPhoneError(null);
          }}
          onBlur={() => {
            if (phoneDigits(phone).length > 0 && !isValidColombianMobile(phone))
              setPhoneError('Escribe un celular de 10 dígitos que empiece por 3.');
          }}
        />
        <Field
          label="¿Cómo te llamas?"
          name="alias"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="done"
          placeholder="Tu nombre"
          maxLength={30}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
        />
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-brand-muted">
          <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="peer size-6 cursor-pointer appearance-none rounded-md border-2 border-brand-ink/30 bg-white checked:border-brand-secondary checked:bg-brand-secondary"
            />
            <Icon name="check" size={16} strokeWidth={3} className="pointer-events-none absolute text-brand-ink opacity-0 peer-checked:opacity-100" />
          </span>
          <span>
            Acepto el tratamiento de mis datos según la{' '}
            {branding.privacy_policy_url ? (
              <a
                href={branding.privacy_policy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-primary-strong underline underline-offset-2"
              >
                política de privacidad
              </a>
            ) : (
              <span className="font-semibold text-brand-primary-strong">política de privacidad</span>
            )}{' '}
            (Ley 1581 de 2012).
          </span>
        </label>
        <div>
          <Button type="submit" disabled={!valid} loading={submitting}>
            Girar la ruleta
          </Button>
          <p className="mt-3 text-center text-xs text-brand-muted">Sin contraseña · sin descargas · 20 segundos</p>
        </div>
      </form>
    </main>
  );
}
