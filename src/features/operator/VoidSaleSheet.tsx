import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { errorMessage } from '@/api/errors';
import { keys } from '@/app/keys';
import { BottomSheet, Button, toast } from '@/ui';
import { voidSale } from './api';

/** "Anular venta" with a mandatory reason, 3–200 characters (8.5). */
export function VoidSaleSheet({
  saleId,
  open,
  onClose,
  onVoided,
}: {
  saleId: string;
  open: boolean;
  onClose: () => void;
  onVoided: () => void;
}) {
  const [reason, setReason] = useState('');
  const id = useId();
  const qc = useQueryClient();
  const trimmed = reason.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 200;
  const m = useMutation({
    mutationFn: () => voidSale(saleId, trimmed),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.sale(saleId) });
      toast.show('Venta anulada');
      onVoided();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <BottomSheet open={open} onClose={onClose} title="Anular venta" className="text-left">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand-muted">
        Motivo (obligatorio)
      </label>
      <textarea
        id={id}
        value={reason}
        maxLength={200}
        rows={3}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ej.: el cliente cambió de opinión"
        className="w-full resize-none rounded-2xl bg-brand-field p-4 outline-none focus:bg-white focus:ring-2 focus:ring-brand-ink"
      />
      <p className="mt-1 mb-4 text-right text-xs text-brand-muted tabular">{trimmed.length}/200</p>
      <div className="grid gap-2">
        <Button variant="danger" disabled={!valid} loading={m.isPending} onClick={() => m.mutate()}>
          Anular venta
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={m.isPending}>
          Cancelar
        </Button>
      </div>
    </BottomSheet>
  );
}
