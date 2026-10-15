import type { ReactNode } from 'react';
import { cn } from './cn';

export type PillTone = 'primary' | 'secondary' | 'dark' | 'light' | 'neutral';

const TONES: Record<PillTone, string> = {
  primary: 'bg-brand-primary text-brand-ink',
  secondary: 'bg-brand-secondary text-brand-ink',
  dark: 'bg-brand-ink text-white',
  light: 'bg-white text-brand-ink shadow-card',
  neutral: 'bg-brand-field text-brand-ink',
};

export function Pill({ tone = 'neutral', className, children }: { tone?: PillTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Pulsing status dot, e.g. "Esperando escaneo…". */
export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('size-2 animate-pulse-dot rounded-full bg-current', className)} />;
}

/** Small uppercase label used above values (e.g. "TIPO", "CLIMA"). */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('text-[0.6875rem] font-bold uppercase tracking-[0.14em]', className)}>{children}</p>;
}
