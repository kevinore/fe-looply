import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { Branding } from '@/api/types';
import { BrandProvider } from '@/brand/BrandProvider';
import { Logo } from '@/brand/Mascot';
import { businessQuery } from '@/features/customer/queries';
import { canInstall, isStandalone } from '@/lib/device';
import { promptInstall, useInstallPrompt } from '@/lib/installPrompt';
import { Button, Screen } from '@/ui';
import { InstallSteps } from '@/ui/InstallSteps';

/**
 * Install the operator app on this device (iPad, iPhone, Android). Outside the
 * login guard, so it works before signing in. admin.html links the operator
 * manifest, so the icon opens /admin, not the customer app.
 */
export default function InstallPage() {
  const business = useQuery(businessQuery).data;
  const navigate = useNavigate();
  const deferred = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  // Opened from the installed icon: nothing to install here.
  if (isStandalone()) return <Navigate to="/admin" replace />;

  const leave = () => navigate('/admin', { replace: true });
  const install = async () => {
    setBusy(true);
    const accepted = await promptInstall().catch(() => false);
    setBusy(false);
    if (accepted) leave();
  };
  const supported = canInstall();

  return (
    <BrandProvider branding={business?.branding as Branding | undefined} name={business?.name}>
      <Screen
        tone="soft"
        footer={
          <div className="mx-auto grid w-full max-w-sm gap-1">
            {deferred ? (
              <Button variant="dark" onClick={install} loading={busy}>
                Instalar app del operador
              </Button>
            ) : (
              <Button variant="dark" onClick={leave}>
                Listo
              </Button>
            )}
            {deferred && (
              <Button variant="ghost" onClick={leave}>
                Ahora no
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
          <span className="flex size-24 items-center justify-center rounded-3xl bg-white p-2 shadow-card">
            <Logo size={80} className="size-full" />
          </span>
          <h1 className="text-[2.3rem] leading-tight font-semibold">Instala la app del operador</h1>
          <p className="max-w-sm text-brand-muted">
            {supported || deferred
              ? 'Queda un ícono en la pantalla de inicio que abre directo en Venta, a pantalla completa. Si te pide ingresar, hazlo una vez dentro de la app.'
              : 'Abre esta página en la tablet o el celular del punto de venta para instalarla allí.'}
          </p>
          <InstallSteps hasPrompt={!!deferred} />
        </div>
      </Screen>
    </BrandProvider>
  );
}
