import { useState } from 'react';
import { canInstall } from '@/lib/device';
import { promptInstall, useInstallPrompt } from '@/lib/installPrompt';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon } from './Icon';
import { InstallSteps } from './InstallSteps';

type Zone = 'client' | 'admin';

/** Hidden with "Ahora no" until the browser tab is closed: it comes back on the next visit. */
const HIDDEN_KEY = 'home-screen-bar:hidden';

const COPY: Record<Zone, { bar: string; title: (name: string) => string; body: string }> = {
  client: {
    bar: 'Ten tu tarjeta a un toque',
    title: (name) => `Agrega ${name || 'tu tarjeta'} a tu pantalla de inicio`,
    body: 'Abres tu tarjeta con un toque, como cualquier app, sin buscar el enlace.',
  },
  admin: {
    bar: 'Ten tu panel de admin a un toque',
    title: () => 'Crea un acceso directo en este dispositivo',
    body: 'Se abre directo en tu panel, a pantalla completa. Si te pide ingresar, hazlo una vez desde el ícono.',
  },
};

function hiddenThisVisit(): boolean {
  try {
    return sessionStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Friendly "add to home screen" bar for phones and tablets using the app in the
 * browser. Opens a short guide for this device; on Android with Chrome, the
 * browser's own dialog. Shows nothing on computers or inside the home-screen app.
 */
export function HomeScreenBar({ zone, name }: { zone: Zone; name: string }) {
  const deferred = useInstallPrompt();
  const [hidden, setHidden] = useState(hiddenThisVisit);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hidden || !canInstall()) return null;
  const copy = COPY[zone];

  const hide = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      // Storage blocked: hidden until the next reload.
    }
  };
  const addNow = async () => {
    setBusy(true);
    const accepted = await promptInstall().catch(() => false);
    setBusy(false);
    if (accepted) setOpen(false);
  };

  return (
    <>
      <div className="bg-brand-secondary-soft">
        <div className="mx-auto flex max-w-3xl items-center gap-2 py-2 pr-2 pl-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white">
            <Icon name="plusSquare" size={18} />
          </span>
          <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="block font-semibold">{copy.bar}</span>
            <span className="block text-brand-muted">Agrégala a tu pantalla de inicio</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full bg-brand-ink px-3.5 py-2 text-sm font-semibold text-white active:brightness-110"
          >
            Ver cómo
          </button>
          <button
            type="button"
            aria-label="Ahora no"
            onClick={hide}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-muted active:bg-white/60"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>

      <BottomSheet open={open} onClose={() => !busy && setOpen(false)} title={copy.title(name)}>
        <p className="text-brand-muted">{copy.body}</p>
        <p className="mt-2 flex items-start gap-2 rounded-2xl bg-brand-field p-3 text-sm">
          <Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand-secondary-strong" />
          No descargas nada de ninguna tienda: es esta misma página, guardada con su ícono. No ocupa espacio y la quitas
          cuando quieras.
        </p>
        <div className="mt-3 flex justify-center">
          <InstallSteps hasPrompt={!!deferred} />
        </div>
        <div className="mt-4 grid gap-1">
          {deferred ? (
            <Button variant="dark" onClick={addNow} loading={busy}>
              Agregar a mi pantalla de inicio
            </Button>
          ) : (
            <Button variant="dark" onClick={() => setOpen(false)}>
              Entendido
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
