import type { ReactNode } from 'react';
import { errorMessage } from '@/api/errors';
import { Button } from './Button';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

export function LoadingState({ label = 'Cargando…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-1 flex-col items-center justify-center gap-3 p-8 text-brand-muted', className)}>
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  title = 'No pudimos cargar esto',
  onRetry,
  className,
  children,
}: {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="alert" className={cn('flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center', className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
        <Icon name="refresh" />
      </span>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-brand-muted">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="dark" block={false} onClick={onRetry}>
          Reintentar
        </Button>
      )}
      {children}
    </div>
  );
}

export function EmptyState({
  icon = 'bag',
  title,
  children,
  className,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-8 text-center', className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-field text-brand-muted">
        <Icon name={icon} />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-brand-muted">{children}</div>}
    </div>
  );
}
