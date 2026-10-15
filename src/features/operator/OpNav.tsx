import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BottomNav, BottomSheet, Button, buttonClass, Icon, toast } from '@/ui';
import { errorMessage } from '@/api/errors';
import { useCart } from './cart';
import { useClaimNotices } from './notifications';
import { usePendingSales } from './pendingSales';
import { logout } from './api';

const ITEMS = [
  { to: '/op', label: 'Venta', icon: 'bag' as const, end: true },
  { to: '/op/search', label: 'Buscar', icon: 'search' as const },
  { to: '/op/prizes', label: 'Premios', icon: 'gift' as const },
  { to: '/op/summary', label: 'Resumen', icon: 'chart' as const },
];

/** Operator bottom bar (8.14): Venta · Buscar · Premios · Resumen. */
export function OpNav({ className }: { className?: string }) {
  return <BottomNav items={ITEMS} className={className} />;
}

/** Header menu button with Jornadas and Cerrar sesión. */
export function OpMenuButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const doLogout = async () => {
    setBusy(true);
    try {
      await logout();
      useCart.getState().reset();
      usePendingSales.setState({ items: {} });
      useClaimNotices.setState({ items: [] });
      qc.removeQueries({ queryKey: ['op'] });
      navigate('/op/login', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Menú"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-full bg-white shadow-card active:bg-brand-field"
      >
        <Icon name="menu" size={20} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Menú">
        <div className="grid gap-2">
          <Link to="/op/history" className={buttonClass('secondary')} onClick={() => setOpen(false)}>
            <Icon name="history" size={20} /> Jornadas
          </Link>
          <Button variant="ghost" loading={busy} onClick={doLogout}>
            <Icon name="logout" size={20} /> Cerrar sesión
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
