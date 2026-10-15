import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';

// Literal class names so Tailwind generates them. Opening uses an iOS-like
// curve (fast start, long soft landing); closing is shorter and accelerates out.
const OPENING = 'duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]';
const CLOSING = 'duration-[220ms] ease-[cubic-bezier(0.4,0,1,1)]';
const CLOSE_MS = 220;

/**
 * Modal sheet on a native <dialog> (focus trap, Esc and top layer from the
 * browser). Phones: slides up from the bottom edge. Tablets and up: a centered
 * card that fades and rises. Both directions animate with CSS transitions on
 * translate/scale/opacity only, so they stay smooth on iPad and low-end Android, and
 * a quick close/reopen reverses mid-way instead of jumping.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // `shown` drives the visual state; the dialog stays open while it animates out.
  const [shown, setShown] = useState(false);
  // While closing, keep painting the last content: callers often clear what they
  // render as soon as they close (e.g. `{prize && …}`), which left an empty panel
  // sliding away.
  const [content, setContent] = useState({ title, children });
  if (open && (content.title !== title || content.children !== children))
    setContent({ title, children });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) {
        d.showModal();
        // The browser focuses the first control, which is still below the screen
        // while the panel slides in, and scrolls the dialog to reach it (the sheet
        // jumped and the dim layer moved away). Focus the panel itself instead.
        panel.current?.focus({ preventScroll: true });
        d.scrollTop = 0;
      }
      // Two frames: the hidden state is painted first, so the transition runs.
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    if (!d.open) return;
    const start = requestAnimationFrame(() => setShown(false));
    const done = window.setTimeout(() => d.close(), CLOSE_MS + 40);
    return () => {
      cancelAnimationFrame(start);
      window.clearTimeout(done);
    };
  }, [open]);

  // Lock page scroll behind the sheet (iOS Safari scrolls the body otherwise).
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const timing = shown ? OPENING : CLOSING;

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Explicit full-viewport box (no dvh, no UA centering). overflow: clip, not
      // hidden: a clipped box can't be scrolled by focus or scrollIntoView.
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-clip bg-transparent p-0 backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/45 transition-opacity',
          timing,
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center sm:inset-0 sm:items-center sm:p-6">
        <div
          ref={panel}
          tabIndex={-1}
          className={cn(
            'pointer-events-auto w-full max-w-lg overflow-y-auto overscroll-contain bg-white shadow-sheet will-change-[translate,opacity] outline-none',
            'pb-safe max-h-[92vh] rounded-t-sheet px-5 pt-2',
            'sm:max-h-[85vh] sm:rounded-sheet sm:px-6 sm:pt-6 sm:pb-6',
            'transition-[translate,scale,opacity]',
            timing,
            shown
              ? 'translate-y-0 opacity-100 sm:scale-100'
              : 'translate-y-full sm:translate-y-6 sm:scale-[0.97] sm:opacity-0',
            className,
          )}
        >
          <div
            aria-hidden="true"
            className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-brand-line sm:hidden"
          />
          {content.title && (
            <h2 id={titleId} className="mb-4 text-2xl font-semibold">
              {content.title}
            </h2>
          )}
          {content.children}
        </div>
      </div>
    </dialog>
  );
}
