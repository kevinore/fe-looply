import type { ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  loading = false,
  danger = false,
  confirmDisabled = false,
}: {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  danger?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {children && <div className="mb-5 text-brand-muted">{children}</div>}
      <div className="grid gap-2">
        <Button variant={danger ? 'danger' : 'dark'} loading={loading} disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
