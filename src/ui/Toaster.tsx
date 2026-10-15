import { cn } from './cn';
import { useToasts } from './toast';

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(var(--safe-top),0.75rem)]"
    >
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto w-full max-w-md animate-fade-in rounded-2xl px-4 py-3 text-left text-[0.9375rem] font-medium shadow-sheet',
            t.tone === 'error' && 'bg-[#B42318] text-white',
            t.tone === 'success' && 'bg-brand-secondary text-brand-ink',
            t.tone === 'default' && 'bg-brand-ink text-white',
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
