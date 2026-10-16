import { Link } from 'react-router';
import { shortDate } from '@/lib/dates';
import { Icon, cn } from '@/ui';
import { prizeBadge } from './prize';

export function PrizeRow({
  id,
  name,
  type,
  shortLabel,
  expiresAt,
}: {
  id: string;
  name: string;
  type: string;
  shortLabel: string;
  expiresAt: string;
}) {
  const badge = prizeBadge(type, shortLabel);
  return (
    <Link
      to={`/client/prize/${id}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-3 shadow-card active:bg-brand-field"
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl font-bold',
          badge.length > 4 ? 'text-[0.6875rem]' : 'text-sm',
          type === 'percent_off' ? 'bg-brand-secondary-soft text-brand-secondary-strong' : 'bg-brand-primary-soft text-brand-primary-strong',
        )}
        aria-hidden="true"
      >
        {badge}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{name}</span>
        <span className="block text-sm text-brand-muted">Vence {shortDate(expiresAt)}</span>
      </span>
      <Icon name="chevronRight" size={18} className="text-brand-muted" />
    </Link>
  );
}
