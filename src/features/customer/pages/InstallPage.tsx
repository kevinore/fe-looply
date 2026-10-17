import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useBrand } from '@/brand/BrandProvider';
import { Logo } from '@/brand/Mascot';
import { canInstall, isAndroid, isIOS, isIOSChrome } from '@/lib/device';
import { sendEvent } from '@/lib/events';
import { markInstallPromptSeen, promptInstall, useInstallPrompt } from '@/lib/installPrompt';
import { Button, Screen } from '@/ui';
import { InstallSteps } from '@/ui/InstallSteps';

/** S0 · Guardar en inicio. */
export default function InstallPage() {
  const navigate = useNavigate();
  const { name } = useBrand();
  const deferred = useInstallPrompt();
  const [busy, setBusy] = useState(false);
  const shown = useRef(false);
  const ios = isIOS();
  const android = isAndroid();
  const supported = canInstall();

  useEffect(() => {
    if (!supported || shown.current) return;
    shown.current = true;
    markInstallPromptSeen();
    sendEvent('install_prompt_shown', { platform: ios ? (isIOSChrome() ? 'ios_chrome' : 'ios_safari') : 'android' });
  }, [supported, ios]);

  if (!supported) return <Navigate to="/client" replace />;

  const leave = () => navigate('/client', { replace: true });

  const install = async () => {
    setBusy(true);
    const accepted = await promptInstall().catch(() => false);
    setBusy(false);
    if (accepted) {
      sendEvent('install_prompt_accepted');
      leave();
    }
  };

  return (
    <Screen
      tone="soft"
      footer={
        <div className="grid gap-1">
          {android && deferred ? (
            <Button onClick={install} loading={busy}>
              Agregar a inicio
            </Button>
          ) : (
            <Button onClick={leave}>Listo</Button>
          )}
          <Button variant="ghost" onClick={leave}>
            Ahora no
          </Button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
        <span className="flex size-24 items-center justify-center rounded-3xl bg-white p-2 shadow-card">
          <Logo size={80} className="size-full" />
        </span>
        <h1 className="text-[2.3rem] leading-tight font-semibold">Guarda {name || 'la app'} en tu inicio</h1>
        <p className="max-w-xs text-brand-muted">
          Tu tarjeta queda abierta en este celular. En tu próxima compra abres el ícono y tocas{' '}
          <strong className="text-brand-ink">Escanear</strong>.
        </p>
        <InstallSteps hasPrompt={!!deferred} />
      </div>
    </Screen>
  );
}
