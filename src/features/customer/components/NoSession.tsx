import { Logo, Mascot } from '@/brand/Mascot';
import { ButtonLink, Icon, Screen } from '@/ui';
import type { IconName } from '@/ui/Icon';

const STEPS: { icon: IconName; label: string }[] = [
  { icon: 'bag', label: 'Compra' },
  { icon: 'scan', label: 'Escanea' },
  { icon: 'gift', label: 'Gira y gana' },
];

/** No session: identity is only recovered with a real purchase (backend rule R5). */
export function NoSession() {
  return (
    <Screen tone="soft" className="items-center justify-center py-6 text-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Scales with the screen: width- and height-bound, so short phones keep the button in view. */}
        <Logo size={136} className="aspect-square h-auto w-[clamp(4.5rem,min(26vw,14dvh),8.5rem)] animate-rise" />

        {/* <picture> is display:contents so the image itself is the sized, centered box. */}
        <div className="mt-5 flex w-[min(64vw,15rem,27dvh)] animate-rise justify-center [animation-delay:40ms] [&>picture]:contents">
          <Mascot
            pose="blender"
            priority
            sizes="(max-width: 480px) 64vw, 240px"
            className="w-[88%] object-contain drop-shadow-[0_14px_20px_rgb(0_0_0/0.08)]"
          />
        </div>

        <h1 className="mt-5 animate-rise text-[clamp(1.75rem,8.5vw,2.1rem)] leading-tight font-semibold [animation-delay:80ms]">
          Escanea tu compra
        </h1>
        <p className="mt-2 max-w-xs animate-rise text-brand-muted [animation-delay:80ms]">
          Para ver tu tarjeta, escanea el QR de tu próxima compra.
        </p>

        <ol className="mt-5 grid w-full animate-rise grid-cols-3 gap-2 [animation-delay:120ms]">
          {STEPS.map((step, i) => (
            <li key={step.label} className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 px-2 py-3 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary text-brand-ink">
                <Icon name={step.icon} size={20} />
              </span>
              <span className="text-xs leading-tight font-semibold">
                <span className="sr-only">Paso {i + 1}: </span>
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <ButtonLink to="/client/scan" variant="dark" className="mt-5 animate-rise [animation-delay:160ms]">
          <Icon name="scan" size={20} /> Escanear
        </ButtonLink>
      </div>
    </Screen>
  );
}
