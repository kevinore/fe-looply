import { cn } from './cn';

/** Large numeric keypad (06). */
export function Keypad({
  onDigit,
  onDelete,
  onDone,
  doneLabel = 'Listo',
  className,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onDone?: () => void;
  doneLabel?: string;
  className?: string;
}) {
  const key =
    'flex min-h-14 items-center justify-center rounded-xl bg-white text-xl font-semibold shadow-[0_1px_0_rgb(0_0_0/0.08)] active:bg-brand-field select-none';
  return (
    <div className={cn('grid grid-cols-3 gap-2 bg-brand-field p-2', className)}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className={key} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" className={cn(key, 'text-base')} onClick={onDelete}>
        Borrar
      </button>
      <button type="button" className={key} onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className={cn(key, 'text-base')} onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}
