import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api, unwrap } from '@/api/client';
import { errorMessage } from '@/api/errors';
import type { Branding } from '@/api/types';
import { keys } from '@/app/keys';
import { BrandProvider } from '@/brand/BrandProvider';
import { Logo } from '@/brand/Mascot';
import { businessQuery } from '@/features/customer/queries';
import { Button, Field, Screen } from '@/ui';
import { useOperatorManifest } from '../OperatorLayout';

/** Only allow internal operator paths as `next` (no open redirects). */
function safeNext(next: string | null): string {
  return next && next.startsWith('/op') && !next.startsWith('//') ? next : '/op';
}

export default function LoginPage() {
  useOperatorManifest();
  const business = useQuery(businessQuery).data;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => unwrap(api.POST('/api/op/auth/login', { body: { email: email.trim(), password } })),
    onSuccess: (me) => {
      qc.setQueryData(keys.opMe, me);
      navigate(safeNext(params.get('next')), { replace: true });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!login.isPending) login.mutate();
  };

  return (
    <BrandProvider branding={business?.branding as Branding | undefined} name={business?.name}>
      <Screen tone="soft" className="justify-center">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size={112} />
            <h1 className="mt-4 text-3xl font-semibold">Ingreso operador</h1>
            <p className="text-sm text-brand-muted">Ventas, clientes y cierre de jornada</p>
          </div>
          <form onSubmit={submit} className="grid gap-4 rounded-card bg-white p-5 shadow-card" noValidate>
            <Field
              label="Correo"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {login.isError && (
              <p role="alert" className="text-sm font-medium text-[#B42318]">
                {errorMessage(login.error)}
              </p>
            )}
            <Button type="submit" variant="dark" loading={login.isPending} disabled={!email || !password}>
              Ingresar
            </Button>
          </form>
        </div>
      </Screen>
    </BrandProvider>
  );
}
