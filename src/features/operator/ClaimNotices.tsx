import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatCop } from '@/lib/money';
import { cn, Icon, ProgressSegments } from '@/ui';
import { customerQuery, displayProgress } from './api';
import { useClaimNotices, type ClaimNotice } from './notifications';

const SHOW_MS = 8000;

/** Stack of "customer scanned" notifications, over every operator screen. */
export function ClaimNotices() {
  const items = useClaimNotices((s) => s.items);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex flex-col items-center gap-2 px-3 pt-[max(var(--safe-top),0.75rem)]"
    >
      {items.map((n) => (
        <NoticeCard key={n.id} notice={n} />
      ))}
    </div>
  );
}

function NoticeCard({ notice }: { notice: ClaimNotice }) {
  const dismiss = useClaimNotices((s) => s.dismiss);
  const navigate = useNavigate();
  const { customer: c } = notice;
  // Fills in milestone size and warms the cache for the sale detail.
  const detail = useQuery(customerQuery(c.id)).data;
  const p = displayProgress(c.purchases, detail?.milestone_every);
  const unlocked = p !== null && p.progress === p.every;
  const prizes = detail?.active_prizes.length ?? c.active_prizes.length;

  // Auto-dismiss; paused while the operator touches or focuses the card.
  const [paused, setPaused] = useState(false);
  const remaining = useRef(SHOW_MS);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const t = window.setTimeout(() => dismiss(notice.id), remaining.current);
    return () => {
      window.clearTimeout(t);
      remaining.current -= Date.now() - started;
    };
  }, [paused, dismiss, notice.id]);

  const open = () => {
    dismiss(notice.id);
    navigate(`/admin/sale/${notice.saleId}`);
  };

  return (
    <div
      role="status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative w-full max-w-md animate-notice-in overflow-hidden rounded-[1.4rem] bg-white shadow-sheet ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3 p-3 pr-2">
        <span className="relative">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-2xl bg-brand-secondary font-display text-2xl text-brand-ink"
          >
            {c.alias.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <span className="absolute -right-1 -bottom-1 flex size-5 animate-pop items-center justify-center rounded-full bg-brand-ink text-white ring-2 ring-white">
            <Icon name="check" size={12} strokeWidth={3.5} />
          </span>
        </span>

        <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
          <p className="text-[0.6875rem] font-bold tracking-widest text-brand-secondary-strong uppercase">
            Escaneó el QR
          </p>
          <p className="truncate text-[1.0625rem] leading-tight font-semibold">
            {c.alias} sumó su compra
          </p>
          <p className="tabular mt-0.5 truncate text-xs text-brand-muted">
            3•• ••• {c.phone_last4}
            {notice.totalCop !== null ? ` · ${formatCop(notice.totalCop)}` : ''}
          </p>

          {p ? (
            <div className="mt-2 flex items-center gap-2">
              <ProgressSegments
                total={p.every}
                progress={p.progress}
                highlightLast
                className="flex-1"
              />
              <span className="tabular shrink-0 text-xs font-semibold">
                {p.progress}/{p.every}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold">
              {c.purchases} {c.purchases === 1 ? 'compra' : 'compras'}
            </p>
          )}

          {(unlocked || prizes > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unlocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-2.5 py-1 text-xs font-semibold">
                  <Icon name="gift" size={13} /> ¡Giro desbloqueado!
                </span>
              )}
              {prizes > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary-soft px-2.5 py-1 text-xs font-semibold text-brand-primary-strong">
                  {prizes} {prizes === 1 ? 'premio' : 'premios'} · ver ficha
                </span>
              )}
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => dismiss(notice.id)}
          aria-label="Cerrar aviso"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-muted active:bg-brand-field"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 h-1 origin-left animate-countdown bg-brand-secondary motion-reduce:hidden',
          paused && '[animation-play-state:paused]',
        )}
        style={{ animationDuration: `${SHOW_MS}ms` }}
      />
    </div>
  );
}
