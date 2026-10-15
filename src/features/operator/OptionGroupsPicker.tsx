import type { OptionGroup } from '@/api/types';
import { formatCop } from '@/lib/money';
import { cn } from '@/ui';
import { groupHint, toggleOption } from './options';

/** Choices of each option group, as big touch targets (radio or checkbox per group). */
export function OptionGroupsPicker({
  groups,
  selected,
  onChange,
}: {
  groups: OptionGroup[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="grid gap-4">
      {groups.map((g) => {
        const single = g.max_select === 1;
        return (
          <fieldset key={g.id}>
            <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
              <span className="font-semibold">{g.name}</span>
              <span className="text-xs text-brand-muted">{groupHint(g)}</span>
            </legend>
            <div
              className="grid grid-cols-2 gap-2"
              role={single ? 'radiogroup' : 'group'}
              aria-label={g.name}
            >
              {g.options.map((o) => {
                const on = selected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={single ? 'radio' : 'checkbox'}
                    aria-checked={on}
                    onClick={() => onChange(toggleOption(g, selected, o.id))}
                    className={cn(
                      'flex min-h-14 flex-col justify-center rounded-2xl px-4 py-2 text-left leading-tight font-semibold',
                      on ? 'bg-brand-ink text-white' : 'bg-brand-field',
                    )}
                  >
                    <span>{o.name}</span>
                    {o.price_delta_cop > 0 && (
                      <span
                        className={cn(
                          'tabular text-xs font-normal',
                          on ? 'text-white/75' : 'text-brand-muted',
                        )}
                      >
                        +{formatCop(o.price_delta_cop)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
