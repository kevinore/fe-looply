import type { ReactNode } from 'react';
import { isAndroid, isIOS, isIOSChrome } from '@/lib/device';
import { Icon, type IconName } from './Icon';

type Step = { icon: IconName; text: ReactNode };

/** iPad Safari reports itself as a Mac; touch support gives it away (see lib/device). */
function isIPad(): boolean {
  return isIOS() && !/iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Manual "add to home screen" steps for this device. Empty when the browser
 * offers its own install prompt (Android `beforeinstallprompt`): use a button.
 */
function installSteps(hasPrompt: boolean): Step[] {
  if (isIOS()) {
    const where = isIOSChrome()
      ? 'en la barra de direcciones de Chrome'
      : isIPad()
        ? 'arriba, junto a la barra de direcciones'
        : 'en la barra de abajo o en el menú •••';
    return [
      {
        icon: 'share',
        text: (
          <>
            Toca <strong>Compartir</strong> {where}
          </>
        ),
      },
      {
        icon: 'plusSquare',
        text: (
          <>
            Elige <strong>Agregar a pantalla de inicio</strong> (si no aparece, desliza la lista hacia abajo)
          </>
        ),
      },
      {
        icon: 'check',
        text: (
          <>
            Toca <strong>Agregar</strong>. El ícono queda en tu pantalla de inicio.
          </>
        ),
      },
    ];
  }
  if (isAndroid() && !hasPrompt) {
    return [
      {
        icon: 'menu',
        text: (
          <>
            Toca el menú <strong>⋮</strong> del navegador
          </>
        ),
      },
      {
        icon: 'plusSquare',
        text: (
          <>
            Elige <strong>Agregar a la pantalla principal</strong> (en algunos teléfonos dice <strong>Instalar app</strong>)
          </>
        ),
      },
    ];
  }
  return [];
}

/** Numbered steps to add the app to the home screen on this device. */
export function InstallSteps({ hasPrompt }: { hasPrompt: boolean }) {
  const steps = installSteps(hasPrompt);
  if (steps.length === 0) return null;
  return (
    <ol className="mt-2 grid w-full max-w-sm gap-2 text-left">
      {steps.map((s, i) => (
        <li key={i} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-bold text-white">
            {i + 1}
          </span>
          <span className="flex-1 text-[0.9375rem]">{s.text}</span>
          <Icon name={s.icon} size={20} className="text-brand-muted" />
        </li>
      ))}
    </ol>
  );
}
