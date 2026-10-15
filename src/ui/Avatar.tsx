import { cn } from './cn';

/** Initial letter tile (05, 06, R5). */
export function Avatar({ name, className, tone = 'white' }: { name: string; className?: string; tone?: 'white' | 'soft' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl font-display text-xl',
        tone === 'white' ? 'bg-white text-brand-ink shadow-card' : 'bg-brand-primary-soft text-brand-ink',
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
