import { useEffect, useState } from 'react';
import { cn } from '@/ui';

/**
 * QR for the claim URL: SVG, error correction M, pure white background with a
 * wide quiet zone. No center logo: it hurts scanning in sunlight (plan §8.5).
 */
export function SaleQr({ value, className }: { value: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode').then(({ default: QRCode }) =>
      QRCode.toString(value, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 4,
        color: { dark: '#000000', light: '#FFFFFF' },
      }).then((s) => {
        if (alive) setSvg(s);
      }),
    );
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label="Código QR de la compra"
      className={cn(className, svg && 'animate-fade-in')}
      style={{ background: '#fff' }}
      // qrcode output is generated locally from our own URL.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
