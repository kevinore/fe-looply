import { useOnline } from '@/lib/network';
import { Icon } from './Icon';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-50 bg-brand-ink pt-[var(--safe-top)] text-white">
      <p className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold">
        <Icon name="wifiOff" size={16} /> Sin conexión
      </p>
    </div>
  );
}
