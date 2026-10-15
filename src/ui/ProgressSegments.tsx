import { cn } from './cn';
import { Icon } from './Icon';

/**
 * N segments (N = milestone_every), filled up to `progress`.
 * `bar`: thin bars (S2, 05). `boxes`: check boxes with the last one labeled "GIRO" (C5).
 * `highlightLast` paints the most recent purchase in brand color (S2 "+1 compra").
 */
export function ProgressSegments({
  total,
  progress,
  variant = 'bar',
  highlightLast = false,
  tone = 'default',
  className,
}: {
  total: number;
  progress: number;
  variant?: 'bar' | 'boxes';
  highlightLast?: boolean;
  tone?: 'default' | 'onColor';
  className?: string;
}) {
  const n = Math.max(1, total);
  const filled = Math.min(Math.max(0, progress), n);
  const label = `${filled} de ${n} compras`;

  if (variant === 'boxes') {
    return (
      <ol className={cn('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-label={label}>
        {Array.from({ length: n }, (_, i) => {
          const done = i < filled;
          const isSpin = i === n - 1;
          return (
            <li
              key={i}
              className={cn(
                'flex h-9 items-center justify-center rounded-lg text-[0.625rem] font-bold tracking-wider',
                done ? 'bg-brand-ink text-white' : 'bg-white/80 text-brand-ink',
                !done && isSpin && 'border-2 border-dashed border-brand-ink/40 bg-white/60',
              )}
            >
              {done ? <Icon name="check" size={16} strokeWidth={3} /> : isSpin ? 'GIRO' : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={n}
      aria-valuenow={filled}
      aria-label={label}
      className={cn('flex gap-1.5', className)}
    >
      {Array.from({ length: n }, (_, i) => {
        const done = i < filled;
        const latest = highlightLast && i === filled - 1;
        return (
          <span
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors duration-500',
              latest ? 'bg-brand-primary' : done ? 'bg-brand-ink' : tone === 'onColor' ? 'bg-white/70' : 'bg-brand-line',
            )}
          />
        );
      })}
    </div>
  );
}
