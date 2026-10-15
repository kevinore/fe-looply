import { useRef } from 'react';
import { formatCop } from '@/lib/money';
import { cn } from './cn';

const LONG_PRESS_MS = 500;

/**
 * Product tile (02). Tap: +1 (or the caller opens its options). Long press 500 ms: −1.
 * Uses pointer events so it behaves the same with touch, mouse and pen.
 */
export function ProductTile({
  name,
  price,
  photoUrl,
  note,
  qty,
  onAdd,
  onRemove,
}: {
  name: string;
  price: number;
  photoUrl: string | null;
  /** Short fixed detail under the name (e.g. the fruit of a drink). */
  note?: string | null;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      aria-label={`${name}, ${formatCop(price)}${qty ? `, ${qty} en el carrito` : ''}`}
      onPointerDown={() => {
        longPressed.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          longPressed.current = true;
          if (qty > 0) onRemove();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (longPressed.current) return;
        onAdd();
      }}
      className={cn(
        'relative flex select-none flex-col overflow-hidden rounded-2xl bg-white p-2 text-left shadow-card',
        'transition-transform duration-100 active:scale-[0.97] [-webkit-touch-callout:none]',
        qty > 0 && 'ring-2 ring-brand-ink',
      )}
    >
      {photoUrl ? (
        // Whole product, never cropped (photos are usually cut-outs of a cup or plate).
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[16/10] w-full rounded-xl bg-brand-primary-soft object-contain py-1.5"
        />
      ) : (
        <span className="stripes flex aspect-[16/10] w-full items-end rounded-xl p-2">
          <span className="truncate font-mono text-[0.625rem] text-brand-primary-strong/80">foto · {name.toLowerCase()}</span>
        </span>
      )}
      <span className="mt-2 px-1 text-[0.9375rem] leading-tight font-semibold">{name}</span>
      {note && <span className="truncate px-1 text-xs text-brand-muted">{note}</span>}
      <span className="tabular px-1 pb-1 text-sm text-brand-muted">{formatCop(price)}</span>
      {qty > 0 && (
        <span className="tabular absolute top-0 right-0 flex h-8 min-w-9 animate-pop items-center justify-center rounded-bl-xl bg-brand-ink px-2 text-sm font-bold text-white">
          ×{qty}
        </span>
      )}
    </button>
  );
}
