import { NavLink } from 'react-router';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

export type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

/** Floating dark tab bar (C5, 02). */
export function BottomNav({ items, className }: { items: NavItem[]; className?: string }) {
  return (
    <nav aria-label="Navegación principal" className={cn('rounded-2xl bg-brand-ink p-1.5 shadow-sheet', className)}>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors',
                  isActive ? 'bg-brand-primary text-brand-ink' : 'text-white/80 active:bg-white/10',
                )
              }
            >
              <Icon name={it.icon} size={18} />
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
