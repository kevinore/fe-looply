import { cn } from './cn';

/** Pill-shaped segmented control (R5 filters). */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors',
            o.value === value ? 'bg-brand-ink text-white' : 'bg-white text-brand-ink shadow-card',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
