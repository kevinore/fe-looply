import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { cn } from './cn';
import { Icon } from './Icon';

/** Content width on tablets/desktop (rem, so it grows with the root font size). */
const WIDTHS = {
  // Forms, confirmations and customer screens: a comfortable reading width.
  narrow: 'max-w-lg',
  // Lists that read well in two columns.
  medium: 'max-w-3xl',
  // Operator work screens (sale grid, summaries) that use the whole tablet.
  wide: 'max-w-6xl',
} as const;

/**
 * Full-height screen. Phones use the full width; on tablets/desktop the content
 * is centered and capped at `width`. Everything scales with the root font size.
 */
export function Screen({
  children,
  className,
  tone = 'bg',
  footer,
  width = 'narrow',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'bg' | 'white' | 'soft' | 'primary' | 'secondary' | 'mint' | 'dark';
  footer?: ReactNode;
  width?: keyof typeof WIDTHS;
}) {
  const tones = {
    bg: 'bg-brand-bg',
    white: 'bg-white',
    soft: 'bg-brand-primary-soft',
    primary: 'bg-brand-primary',
    secondary: 'bg-brand-secondary',
    mint: 'bg-brand-secondary-soft',
    dark: 'bg-brand-ink text-white',
  } as const;
  return (
    <div className={cn('flex min-h-dvh flex-1 flex-col', tones[tone])}>
      <main
        className={cn('mx-auto flex w-full flex-1 flex-col px-safe pt-safe', WIDTHS[width], !footer && 'pb-safe', className)}
      >
        {children}
      </main>
      {footer && (
        <div className={cn('sticky bottom-0 z-20', tones[tone])}>
          <div className={cn('mx-auto w-full px-safe pt-3 pb-safe', WIDTHS[width])}>{footer}</div>
        </div>
      )}
    </div>
  );
}

export function TopBar({
  title,
  onBack,
  backTo,
  right,
  dark = false,
}: {
  title?: ReactNode;
  onBack?: () => void;
  backTo?: string;
  right?: ReactNode;
  dark?: boolean;
}) {
  const navigate = useNavigate();
  const back = onBack ?? (backTo ? () => navigate(backTo) : () => navigate(-1));
  return (
    <header className="flex min-h-12 items-center gap-3 py-1">
      <button
        type="button"
        onClick={back}
        aria-label="Volver"
        className={cn(
          'flex size-11 items-center justify-center rounded-full',
          dark ? 'bg-white/10 text-white active:bg-white/20' : 'bg-white text-brand-ink shadow-card active:bg-brand-field',
        )}
      >
        <Icon name="chevronLeft" size={20} />
      </button>
      {title && <h1 className="flex-1 truncate font-sans text-base font-semibold">{title}</h1>}
      {!title && <span className="flex-1" />}
      {right}
    </header>
  );
}
