import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BottomNav, BottomSheet, Button, buttonClass, Icon, toast } from '@/ui';
import { errorMessage } from '@/api/errors';
import { canInstall } from '@/lib/device';
import { useCart } from './cart';
import { useClaimNotices } from './notifications';
import { usePendingSales } from './pendingSales';
import { logout } from './api';
import { adminMeQuery } from './queries';

const ITEMS = [
  { to: '/admin', label: 'Venta', icon: 'bag' as const, end: true },
  { to: '/admin/search', label: 'Buscar', icon: 'search' as const },
  { to: '/admin/prizes', label: 'Premios', icon: 'gift' as const },
  { to: '/admin/summary', label: 'Resumen', icon: 'chart' as const },
];

/** Operator bottom bar (8.14): Venta · Buscar · Premios · Resumen. */
export function AdminNav({ className }: { className?: string }) {
  return <BottomNav items={ITEMS} className={className} />;
}

/** Header menu button with Jornadas, Ruleta de premios (owner) and Cerrar sesión. */
export function AdminMenuButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isOwner = useQuery(adminMeQuery).data?.operator.role === 'owner';

  const doLogout = async () => {
    setBusy(true);
    try {
      await logout();
      useCart.getState().reset();
      usePendingSales.setState({ items: {} });
      useClaimNotices.setState({ items: [] });
      qc.removeQueries({ queryKey: ['admin'] });
      navigate('/admin/login', { replace: true });
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
          <Link to="/admin/history" className={buttonClass('secondary')} onClick={() => setOpen(false)}>
            <Icon name="history" size={20} /> Jornadas
          </Link>
          {isOwner && (
            <Link to="/admin/wheel" className={buttonClass('secondary')} onClick={() => setOpen(false)}>
              <Icon name="gift" size={20} /> Ruleta de premios
            </Link>
          )}
          {canInstall() && (
            <Link to="/admin/install" className={buttonClass('secondary')} onClick={() => setOpen(false)}>
              <Icon name="plusSquare" size={20} /> Acceso directo en este dispositivo
            </Link>
          )}
          <Button variant="ghost" loading={busy} onClick={doLogout}>
            <Icon name="logout" size={20} /> Cerrar sesión
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
