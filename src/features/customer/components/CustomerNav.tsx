import { BottomNav } from '@/ui';

export function CustomerNav() {
  return (
    <BottomNav
      items={[
        { to: '/c', label: 'Tarjeta', icon: 'card', end: true },
        { to: '/c/prizes', label: 'Premios', icon: 'gift' },
        { to: '/c/history', label: 'Historial', icon: 'history' },
      ]}
    />
  );
}
