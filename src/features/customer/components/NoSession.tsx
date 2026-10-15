import { Logo, Mascot } from '@/brand/Mascot';
import { ButtonLink, Icon, Screen } from '@/ui';

/** No session: identity is only recovered with a real purchase (backend rule R5). */
export function NoSession() {
  return (
    <Screen
      tone="soft"
      footer={
        <ButtonLink to="/c/scan" variant="dark">
          <Icon name="scan" size={20} /> Escanear
        </ButtonLink>
      }
    >
      <header className="flex justify-center pt-2">
        <Logo size={72} className="size-18" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
        <Mascot pose="drink" priority sizes="(max-width: 480px) 60vw, 260px" className="w-[62%] max-w-[16.25rem]" />
        <h1 className="text-[2.1rem] leading-tight font-semibold">Escanea tu compra</h1>
        <p className="max-w-xs text-brand-muted">Para ver tu tarjeta, escanea el QR de tu próxima compra.</p>
      </div>
    </Screen>
  );
}
