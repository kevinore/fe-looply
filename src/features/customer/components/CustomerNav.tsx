import { BottomNav } from '@/ui';

export function CustomerNav() {
  return (
    <BottomNav
      items={[
        { to: '/client', label: 'Tarjeta', icon: 'card', end: true },
        { to: '/client/prizes', label: 'Premios', icon: 'gift' },
        { to: '/client/history', label: 'Historial', icon: 'history' },
      ]}
    />
  );
}
