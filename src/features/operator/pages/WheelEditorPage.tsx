import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useBlocker } from 'react-router';
import { errorMessage } from '@/api/errors';
import type { CatalogPrize, PrizeType } from '@/api/types';
import { keys } from '@/app/keys';
import { segmentColor } from '@/brand/brand';
import { Wheel } from '@/features/customer/components/Wheel';
import { useHoldUpdates } from '@/lib/swUpdate';
import { formatCop } from '@/lib/money';
import {
  BottomSheet,
  Button,
  cn,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  LoadingState,
  Pill,
  Screen,
  TextButton,
  toast,
  TopBar,
} from '@/ui';
import { prizeCatalogQuery, saveWheel } from '../api';
import { adminMeQuery, productsQuery } from '../queries';
import {
  activeTotal,
  distributeEvenly,
  formatPercent,
  LABEL_MAX,
  newDraftPrize,
  parsePercent,
  percentInput,
  prizeCategories,
  prizeProblems,
  rewardSummary,
  toDraft,
  toRequest,
  TYPE_LABELS,
  WHEEL_TOTAL,
  wheelProblems,
  type DraftPrize,
  type PrizeCategory,
} from '../wheelEditor';

/** Ruleta de premios — the owner defines the prizes and their chance of winning. */
export default function WheelEditorPage() {
  const me = useQuery(adminMeQuery);
  const isOwner = me.data?.operator.role === 'owner';
  // No refetch on focus: it would never overwrite the draft, but it isn't needed either.
  const catalog = useQuery({ ...prizeCatalogQuery, enabled: isOwner, refetchOnWindowFocus: false });

  if (me.data && !isOwner) {
    return (
      <Screen>
        <TopBar backTo="/admin/prizes" title="Ruleta de premios" />
        <EmptyState icon="gift" title="Solo el dueño puede editar la ruleta." />
      </Screen>
    );
  }
  if (catalog.isError) {
    return (
      <Screen>
        <TopBar backTo="/admin/prizes" title="Ruleta de premios" />
        <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
      </Screen>
    );
  }
  if (!catalog.data) {
    return (
      <Screen>
        <TopBar backTo="/admin/prizes" title="Ruleta de premios" />
        <LoadingState />
      </Screen>
    );
  }
  return <Editor catalog={catalog.data} />;
}

function Editor({ catalog }: { catalog: CatalogPrize[] }) {
  const qc = useQueryClient();
  const [baseline, setBaseline] = useState(() => toDraft(catalog));
  const [rows, setRows] = useState(baseline);
  const [editing, setEditing] = useState<DraftPrize | null>(null);
  const categories = prizeCategories(useQuery(productsQuery).data ?? []);
  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? 'Otra categoría') : null;

  const dirty = JSON.stringify(toRequest(rows)) !== JSON.stringify(toRequest(baseline));
  const problems = wheelProblems(rows);
  const total = activeTotal(rows);
  const active = rows.filter((r) => r.active);

  useHoldUpdates('wheel-editor', dirty);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  const save = useMutation({
    mutationFn: () => saveWheel(toRequest(rows)),
    onSuccess: (saved) => {
      qc.setQueryData(keys.prizeCatalog, saved);
      const next = toDraft(saved);
      setBaseline(next);
      setRows(next);
      toast.success('Ruleta guardada · los próximos giros ya usan estos premios');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const update = (key: string, patch: Partial<DraftPrize>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, by: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row!);
      return next;
    });
  const applyEdit = (row: DraftPrize) => {
    setRows((rs) => (rs.some((r) => r.key === row.key) ? rs.map((r) => (r.key === row.key ? row : r)) : [...rs, row]));
    setEditing(null);
  };

  const segments = active.map((r) => ({ id: r.key, short_label: r.short_label.trim() || '…', color: r.color }));
  const activeIndex = new Map(active.map((r, i) => [r.key, i]));

  return (
    <Screen
      width="medium"
      footer={
        <div className="grid gap-2">
          {dirty && problems.length > 0 && (
            <ul className="text-sm font-medium text-[#B42318]" role="alert">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <Button
            variant="dark"
            disabled={!dirty || problems.length > 0}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {dirty ? 'Guardar ruleta' : 'Sin cambios'}
          </Button>
          {dirty && (
            <TextButton onClick={() => setRows(baseline)} disabled={save.isPending}>
              Descartar cambios
            </TextButton>
          )}
        </div>
      }
    >
      <TopBar backTo="/admin/prizes" title="Ruleta de premios" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pb-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start">
        <section aria-label="Vista previa" className="grid min-w-0 grid-cols-1 gap-3 md:sticky md:top-4">
          <div className="rounded-card bg-brand-primary-soft p-4">
            {segments.length > 0 ? (
              <Wheel segments={segments} />
            ) : (
              <p className="py-10 text-center text-sm text-brand-muted">Activa al menos dos premios.</p>
            )}
          </div>
          <p className="text-center text-xs text-brand-muted">
            En la ruleta todas las casillas se ven del mismo tamaño. La probabilidad real de ganar es el % de cada premio.
          </p>
        </section>

        <section aria-label="Premios" className="grid min-w-0 grid-cols-1 gap-3">
          <TotalBar total={total} onDistribute={() => setRows((rs) => distributeEvenly(rs))} />

          <ul className="grid min-w-0 grid-cols-1 gap-2">
            {rows.map((row, i) => (
              <PrizeRow
                key={row.key}
                row={row}
                category={categoryName(row.category_id)}
                color={row.active ? segmentColor(row.color, activeIndex.get(row.key) ?? 0) : undefined}
                hasProblems={prizeProblems(row, rows).length > 0}
                first={i === 0}
                last={i === rows.length - 1}
                onWeight={(weight) => update(row.key, { weight })}
                onToggle={() => update(row.key, { active: !row.active })}
                onMove={(by) => move(i, by)}
                onEdit={() => setEditing(row)}
              />
            ))}
          </ul>

          <Button variant="secondary" onClick={() => setEditing(newDraftPrize())}>
            <Icon name="plusSquare" size={20} /> Agregar premio
          </Button>
        </section>
      </div>

      {editing && (
        <PrizeSheet
          key={editing.key}
          row={editing}
          all={rows}
          categories={categories}
          isNew={!rows.some((r) => r.key === editing.key)}
          onApply={applyEdit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="¿Salir sin guardar?"
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        danger
        onConfirm={() => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      >
        Los cambios de la ruleta se perderán.
      </ConfirmDialog>
    </Screen>
  );
}

function TotalBar({ total, onDistribute }: { total: number; onDistribute: () => void }) {
  const ok = total === WHEEL_TOTAL;
  return (
    <div className={cn('rounded-2xl p-3', ok ? 'bg-brand-secondary-soft' : 'bg-[#FDECEA]')}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold" role="status">
          {ok ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check" size={18} /> Total 100 %
            </span>
          ) : (
            <span className="text-[#B42318]">
              Total {formatPercent(total)} · {total < WHEEL_TOTAL ? 'faltan' : 'sobran'} {formatPercent(Math.abs(WHEEL_TOTAL - total))}
            </span>
          )}
        </p>
        <button type="button" onClick={onDistribute} className="text-sm font-semibold underline underline-offset-2">
          Repartir igual
        </button>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn('h-full rounded-full transition-[width]', ok ? 'bg-brand-secondary' : 'bg-[#B42318]')}
          style={{ width: `${Math.min(100, total / 100)}%` }}
        />
      </div>
    </div>
  );
}

function PrizeRow({
  row,
  category,
  color,
  hasProblems,
  first,
  last,
  onWeight,
  onToggle,
  onMove,
  onEdit,
}: {
  row: DraftPrize;
  category: string | null;
  color: string | undefined;
  hasProblems: boolean;
  first: boolean;
  last: boolean;
  onWeight: (weight: number) => void;
  onToggle: () => void;
  onMove: (by: -1 | 1) => void;
  onEdit: () => void;
}) {
  return (
    <li className={cn('rounded-2xl bg-white p-3 shadow-card', !row.active && 'opacity-60', hasProblems && 'ring-2 ring-[#B42318]')}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-9 shrink-0 rounded-full border-2 border-white shadow-card"
          style={{ background: color ?? 'var(--color-brand-field, #eee)' }}
        />
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left leading-tight">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{row.name.trim() || 'Nuevo premio'}</span>
            {row.awarded && <Pill className="shrink-0 px-2 py-0.5 text-[0.625rem]">ganado</Pill>}
          </span>
          <span className="block truncate text-xs text-brand-muted">
            «{row.short_label.trim() || '…'}» · {rewardSummary(row, formatCop, category)}
          </span>
        </button>
        <PercentInput weight={row.weight} disabled={!row.active} label={`Probabilidad de ${row.name || 'premio'}`} onChange={onWeight} />
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-field">
        <div className="h-full rounded-full bg-brand-primary" style={{ width: row.active ? `${row.weight / 100}%` : 0 }} />
      </div>
      <div className="mt-2 flex items-center gap-1">
        <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={row.active} onChange={onToggle} className="size-5 accent-[var(--brand-secondary)]" />
          {row.active ? 'Activo' : 'Inactivo'}
        </label>
        <IconButton label="Subir" disabled={first} onClick={() => onMove(-1)}>
          <Icon name="chevronLeft" size={18} className="rotate-90" />
        </IconButton>
        <IconButton label="Bajar" disabled={last} onClick={() => onMove(1)}>
          <Icon name="chevronLeft" size={18} className="-rotate-90" />
        </IconButton>
        <button type="button" onClick={onEdit} className="ml-1 rounded-full bg-brand-field px-3 py-2 text-sm font-semibold active:brightness-95">
          Editar
        </button>
      </div>
    </li>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full bg-brand-field active:brightness-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** "37,5" ⇄ 3750. Keeps what the owner types; follows outside changes (Repartir igual). */
function PercentInput({
  weight,
  disabled,
  label,
  onChange,
  className,
}: {
  weight: number;
  disabled?: boolean;
  label: string;
  onChange: (weight: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(() => percentInput(weight));
  const [seen, setSeen] = useState(weight);
  if (weight !== seen) {
    setSeen(weight);
    if (parsePercent(text) !== weight) setText(percentInput(weight));
  }
  const parsed = parsePercent(text);
  const invalid = parsed === null || parsed === 0;
  return (
    <span
      className={cn(
        'flex h-11 w-24 shrink-0 items-center rounded-xl bg-brand-field px-2 ring-inset focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-ink',
        invalid && !disabled && 'bg-white ring-2 ring-[#B42318]',
        className,
      )}
    >
      <input
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const w = parsePercent(e.target.value);
          if (w !== null) {
            setSeen(w);
            onChange(w);
          }
        }}
        onBlur={() => parsed !== null && setText(percentInput(parsed))}
        className="w-full min-w-0 bg-transparent text-right font-semibold tabular outline-none disabled:text-brand-muted"
      />
      <span className="pl-1 text-sm text-brand-muted">%</span>
    </span>
  );
}

const TYPES: PrizeType[] = ['percent_off', 'free_item', 'extra_item'];
const COLORS: (string | null)[] = [null, 'primary', 'secondary', 'ink'];
const COLOR_NAMES: Record<string, string> = { primary: 'Principal', secondary: 'Secundario', ink: 'Oscuro' };

const digits = (s: string) => s.replace(/\D/g, '');

/** Edit (or create) one prize. Applies to the draft; "Guardar ruleta" sends everything. */
function PrizeSheet({
  row,
  all,
  categories,
  isNew,
  onApply,
  onClose,
}: {
  row: DraftPrize;
  all: DraftPrize[];
  categories: PrizeCategory[];
  isNew: boolean;
  onApply: (row: DraftPrize) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(row);
  const set = (patch: Partial<DraftPrize>) => setD((x) => ({ ...x, ...patch }));
  const problems = prizeProblems(d, isNew ? [...all, d] : all.map((r) => (r.key === d.key ? d : r)));
  const locked = d.awarded;

  return (
    <BottomSheet open onClose={onClose} title={isNew ? 'Nuevo premio' : 'Editar premio'}>
      <div className="grid gap-4">
        <Field label="Nombre" name="prize-name" value={d.name} maxLength={60} placeholder="Ej. 20% de descuento" onChange={(e) => set({ name: e.target.value })} />
        <Field
          label="Texto en la ruleta"
          name="prize-label"
          value={d.short_label}
          maxLength={LABEL_MAX}
          placeholder="Ej. 20% dto"
          hint={`${d.short_label.length}/${LABEL_MAX} caracteres`}
          onChange={(e) => set({ short_label: e.target.value })}
        />

        <fieldset disabled={locked}>
          <legend className="mb-1.5 text-sm font-medium text-brand-muted">Tipo de premio</legend>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={d.type === t}
                onClick={() => set({ type: t })}
                className={cn(
                  'min-h-12 rounded-2xl px-2 text-sm font-semibold disabled:opacity-50',
                  d.type === t ? 'bg-brand-primary ring-2 ring-brand-ink' : 'bg-brand-field',
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          {d.type === 'percent_off' && (
            <Field
              label="Descuento"
              name="prize-value"
              inputMode="numeric"
              prefix="%"
              disabled={locked}
              value={String(d.value || '')}
              onChange={(e) => set({ value: Math.min(100, Number(digits(e.target.value)) || 0) })}
            />
          )}
          {d.type !== 'extra_item' && (
            <Field
              label="Tope (opcional)"
              name="prize-cap"
              inputMode="numeric"
              prefix="$"
              disabled={locked}
              placeholder="Sin tope"
              value={d.max_value_cop ? String(d.max_value_cop) : ''}
              onChange={(e) => set({ max_value_cop: Number(digits(e.target.value)) || null })}
            />
          )}
        </div>
        {(categories.length > 0 || d.category_id) && (
          <fieldset disabled={locked}>
            <legend className="mb-1.5 text-sm font-medium text-brand-muted">Aplica a</legend>
            <div className="flex flex-wrap gap-2">
              {[{ id: null, name: 'Todos los productos' }, ...categories].map((c) => (
                <button
                  key={c.id ?? 'all'}
                  type="button"
                  aria-pressed={d.category_id === c.id}
                  onClick={() => set({ category_id: c.id })}
                  className={cn(
                    'min-h-11 rounded-2xl px-4 text-sm font-semibold disabled:opacity-50',
                    d.category_id === c.id ? 'bg-brand-primary ring-2 ring-brand-ink' : 'bg-brand-field',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {locked && (
          <p className="rounded-xl bg-brand-field p-3 text-sm text-brand-muted">
            Este premio ya fue ganado: el tipo, el descuento, el tope y a qué aplica no se pueden cambiar. Para otra recompensa, desactívalo y crea uno nuevo.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-brand-muted">Probabilidad</p>
            <PercentInput
              weight={d.weight}
              label="Probabilidad de ganar"
              onChange={(weight) => set({ weight })}
              className="h-14 w-full rounded-2xl px-4"
            />
          </div>
          <Field
            label="Vence en (días)"
            name="prize-expiry"
            inputMode="numeric"
            value={String(d.expires_days || '')}
            onChange={(e) => set({ expires_days: Math.min(365, Number(digits(e.target.value)) || 0) })}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-brand-muted">Color en la ruleta</legend>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c ?? 'auto'}
                type="button"
                aria-pressed={d.color === c}
                onClick={() => set({ color: c })}
                className={cn(
                  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-field px-2 text-xs font-semibold',
                  d.color === c && 'ring-2 ring-brand-ink',
                )}
              >
                {c && <span className="size-4 rounded-full border border-white" style={{ background: segmentColor(c, 0) }} />}
                {c ? COLOR_NAMES[c] : 'Auto'}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-3 font-medium">
          <input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked })} className="size-5 accent-[var(--brand-secondary)]" />
          Activo en la ruleta
        </label>

        {problems.length > 0 && (
          <ul className="text-sm font-medium text-[#B42318]" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <Button variant="dark" disabled={problems.length > 0} onClick={() => onApply(d)}>
          {isNew ? 'Agregar a la ruleta' : 'Aplicar cambios'}
        </Button>
        <p className="-mt-2 text-center text-xs text-brand-muted">Los cambios se guardan con «Guardar ruleta».</p>
      </div>
    </BottomSheet>
  );
}
