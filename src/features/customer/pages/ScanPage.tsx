import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon, Spinner } from '@/ui';
import { meQuery } from '../queries';
import { claimTokenFromQr } from '../scan';

type CamState = 'starting' | 'scanning' | 'denied' | 'nocamera';

/** S1 · Escáner interno. */
export default function ScanPage() {
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cam, setCam] = useState<CamState>('starting');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let disposed = false;
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let invalidTimer = 0;

    (async () => {
      // Loaded only here, so the scanner never ships in other screens' chunks.
      const { default: QrScanner } = await import('qr-scanner');
      if (disposed || !videoRef.current) return;
      if (!(await QrScanner.hasCamera())) {
        if (!disposed) setCam('nocamera');
        return;
      }
      const s = new QrScanner(
        videoRef.current,
        (result) => {
          const token = claimTokenFromQr(result.data, window.location.origin);
          if (token) {
            s.stop();
            navigate(`/client/claim/${token}`, { replace: true });
          } else {
            setInvalid(true);
            window.clearTimeout(invalidTimer);
            invalidTimer = window.setTimeout(() => setInvalid(false), 2500);
          }
        },
        { preferredCamera: 'environment', returnDetailedScanResult: true, maxScansPerSecond: 8 },
      );
      scanner = s;
      if (disposed) {
        s.destroy();
        return;
      }
      try {
        await s.start();
        if (!disposed) setCam('scanning');
      } catch (e) {
        if (!disposed) setCam(String(e).toLowerCase().includes('not found') ? 'nocamera' : 'denied');
      }
    })().catch(() => {
      if (!disposed) setCam('nocamera');
    });

    return () => {
      disposed = true;
      window.clearTimeout(invalidTimer);
      // Always release the camera when leaving the screen.
      scanner?.stop();
      scanner?.destroy();
    };
  }, [navigate]);

  const card = me.data;
  const last4 = card?.customer.phone_last4;
  const failed = cam === 'denied' || cam === 'nocamera';

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-brand-ink text-white">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-safe pt-safe pb-safe">
        <header className="flex min-h-12 items-center justify-between">
          <h1 className="font-sans text-base font-semibold">Escanear compra</h1>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => navigate('/client', { replace: true })}
            className="flex size-11 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <Icon name="x" size={20} />
          </button>
        </header>

        <div className="relative mt-3 flex aspect-[3/4] max-h-[62dvh] w-full items-center justify-center overflow-hidden rounded-card bg-white/5">
          <video ref={videoRef} muted playsInline className="absolute inset-0 size-full object-cover" />
          {!failed && (
            <div aria-hidden="true" className="relative size-[62%] max-w-72">
              {['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
                <span key={c} className={`absolute size-10 border-brand-primary ${c}`} />
              ))}
              <span className="absolute inset-x-5 top-1/2 h-0.5 rounded-full bg-brand-primary/80" />
            </div>
          )}
          {cam === 'starting' && (
            <span className="absolute inset-x-0 bottom-4 flex justify-center text-sm text-white/70">
              <Spinner label="Abriendo cámara" />
            </span>
          )}
          {failed && (
            <div className="relative p-6 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/10">
                <Icon name="camera" />
              </span>
              <p className="mt-4 font-semibold">
                {cam === 'denied' ? 'No pudimos usar la cámara' : 'No encontramos una cámara'}
              </p>
              {last4 ? (
                <p className="mt-2 text-white/80">
                  Dile al operador tus últimos 4 dígitos: <strong className="tabular text-2xl text-white">{last4}</strong>
                </p>
              ) : (
                <p className="mt-2 text-white/80">Escanea el QR con la cámara normal de tu celular.</p>
              )}
            </div>
          )}
          {invalid && (
            <p role="alert" className="absolute inset-x-4 top-4 rounded-xl bg-white px-4 py-2 text-center text-sm font-semibold text-brand-ink">
              Este código no es de una compra
            </p>
          )}
        </div>

        <div className="mt-auto pt-6 text-center">
          <p className="font-display text-2xl font-semibold">Apunta al QR de tu compra</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/70">
            Se suma solo a tu tarjeta{card ? `, ${card.customer.alias}` : ''}.
            {last4 && (
              <>
                {' '}
                Si la cámara no funciona, dile al operador tus últimos 4 dígitos:{' '}
                <strong className="tabular text-white">{last4}</strong>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
