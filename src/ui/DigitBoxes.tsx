import { cn } from './cn';

/** N digit boxes; the next empty box is outlined (06). */
export function DigitBoxes({ value, length = 4, className }: { value: string; length?: number; className?: string }) {
  return (
    <div className={cn('grid gap-3', className)} style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-live="polite" aria-label={`Dígitos: ${value.split('').join(' ') || 'ninguno'}`}>
      {Array.from({ length }, (_, i) => {
        const ch = value[i];
        const active = i === value.length;
        return (
          <div
            key={i}
            className={cn(
              'flex aspect-[5/6] max-h-20 items-center justify-center rounded-xl bg-brand-field font-display text-3xl',
              active && 'bg-white ring-2 ring-brand-ink',
            )}
          >
            {ch ?? ''}
          </div>
        );
      })}
    </div>
  );
}
