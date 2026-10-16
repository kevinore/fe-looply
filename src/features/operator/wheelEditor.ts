import type { CatalogPrize, PrizeType, Product, WheelPrizeIn } from '@/api/types';

/**
 * Wheel editor rules, mirrored from the backend (services/prizes.save_wheel).
 * Weights are hundredths of a percent: the active prizes add up to 10 000 (100 %).
 */
export const WHEEL_TOTAL = 10_000;
export const MIN_ACTIVE = 2;
export const MAX_ACTIVE = 12;
export const LABEL_MAX = 14;

export type DraftPrize = {
  /** Stable React key: the prize id, or a temporary one for new prizes. */
  key: string;
  id: string | null;
  name: string;
  short_label: string;
  type: PrizeType;
  value: number;
  max_value_cop: number | null;
  /** Only products of this category take the prize; null = any product. */
  category_id: string | null;
  /** Hundredths of a percent (37,5 % = 3750). */
  weight: number;
  expires_days: number;
  color: string | null;
  active: boolean;
  /** Already won: type, value, max_value_cop and category_id are locked. */
  awarded: boolean;
};

export const TYPE_LABELS: Record<PrizeType, string> = {
  percent_off: '% de descuento',
  free_item: 'Producto gratis',
  extra_item: 'Extra gratis',
};

/** "37,5 %" from 3750. */
export function formatPercent(weight: number): string {
  return `${(weight / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
}

/** Text in the % input for a weight: "37,5". */
export function percentInput(weight: number): string {
  return (weight / 100).toLocaleString('es-CO', { maximumFractionDigits: 2, useGrouping: false });
}

/** "37,5" or "37.5" -> 3750; null when it isn't a percent with up to 2 decimals. */
export function parsePercent(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(clean)) return null;
  const weight = Math.round(Number(clean) * 100);
  return weight <= WHEEL_TOTAL ? weight : null;
}

export function activeTotal(rows: DraftPrize[]): number {
  return rows.reduce((sum, r) => sum + (r.active ? r.weight : 0), 0);
}

/**
 * Catalog -> editor rows. Older catalogs store relative weights (e.g. 40/25/…):
 * they are converted to exact percentages of the active total, rounding fixed on
 * the largest prize so the wheel opens adding up to 100 %.
 */
export function toDraft(catalog: CatalogPrize[]): DraftPrize[] {
  const active = catalog.filter((p) => p.active);
  const sum = active.reduce((s, p) => s + p.weight, 0);
  const scale = sum > 0 && sum !== WHEEL_TOTAL ? WHEEL_TOTAL / sum : 1;
  const rows = catalog.map((p) => ({
    key: p.id,
    id: p.id,
    name: p.name,
    short_label: p.short_label,
    type: p.type as PrizeType,
    value: p.value,
    max_value_cop: p.max_value_cop ?? null,
    category_id: p.category_id ?? null,
    weight: Math.min(WHEEL_TOTAL, Math.max(1, Math.round(p.weight * scale))),
    expires_days: p.expires_days,
    color: p.color ?? null,
    active: p.active,
    awarded: p.awarded,
  }));
  const actives = rows.filter((r) => r.active);
  const diff = WHEEL_TOTAL - activeTotal(rows);
  if (scale !== 1 && diff !== 0 && actives.length > 0) {
    const largest = actives.reduce((a, b) => (b.weight > a.weight ? b : a));
    largest.weight += diff;
  }
  return rows;
}

let tempId = 0;

export function newDraftPrize(): DraftPrize {
  tempId += 1;
  return {
    key: `new-${tempId}`,
    id: null,
    name: '',
    short_label: '',
    type: 'percent_off',
    value: 10,
    max_value_cop: null,
    category_id: null,
    weight: 1,
    expires_days: 90,
    color: null,
    active: true,
    awarded: false,
  };
}

/** Same chance for every active prize; the remainder goes to the first ones. */
export function distributeEvenly(rows: DraftPrize[]): DraftPrize[] {
  const n = rows.filter((r) => r.active).length;
  if (n === 0) return rows;
  const base = Math.floor(WHEEL_TOTAL / n);
  let extra = WHEEL_TOTAL - base * n;
  return rows.map((r) => {
    if (!r.active) return r;
    const weight = base + (extra > 0 ? 1 : 0);
    extra = Math.max(0, extra - 1);
    return { ...r, weight };
  });
}

/** Problems with one prize (shown in its editor), or [] when it is fine. */
export function prizeProblems(row: DraftPrize, all: DraftPrize[]): string[] {
  const out: string[] = [];
  const name = row.name.trim();
  if (name.length < 2) out.push('Escribe un nombre de al menos 2 letras.');
  else if (all.some((r) => r.key !== row.key && r.name.trim().toLowerCase() === name.toLowerCase()))
    out.push('Ya hay un premio con ese nombre.');
  const label = row.short_label.trim();
  if (label.length === 0 || label.length > LABEL_MAX)
    out.push(`El texto de la ruleta debe tener entre 1 y ${LABEL_MAX} caracteres.`);
  if (row.type === 'percent_off' && !(row.value >= 1 && row.value <= 100))
    out.push('El descuento debe estar entre 1 % y 100 %.');
  if (!(row.expires_days >= 1 && row.expires_days <= 365)) out.push('El vencimiento debe estar entre 1 y 365 días.');
  if (row.weight < 1) out.push('La probabilidad mínima es 0,01 %.');
  return out;
}

/** Everything that blocks saving, in the order the owner should fix it. */
export function wheelProblems(rows: DraftPrize[]): string[] {
  const out: string[] = [];
  const active = rows.filter((r) => r.active).length;
  if (active < MIN_ACTIVE || active > MAX_ACTIVE)
    out.push(`La ruleta necesita entre ${MIN_ACTIVE} y ${MAX_ACTIVE} premios activos.`);
  const total = activeTotal(rows);
  if (total !== WHEEL_TOTAL) {
    const diff = WHEEL_TOTAL - total;
    out.push(`${diff > 0 ? 'Faltan' : 'Sobran'} ${formatPercent(Math.abs(diff))} para llegar a 100 %.`);
  }
  const bad = rows.filter((r) => prizeProblems(r, rows).length > 0);
  if (bad.length > 0)
    out.push(`Revisa ${bad.length === 1 ? 'el premio' : 'los premios'}: ${bad.map((r) => r.name.trim() || 'sin nombre').join(', ')}.`);
  return out;
}

/** Editor rows -> PUT /api/admin/prizes/catalog body (list order = wheel order). */
export function toRequest(rows: DraftPrize[]): { prizes: WheelPrizeIn[] } {
  return {
    prizes: rows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      short_label: r.short_label.trim(),
      type: r.type,
      value: r.type === 'percent_off' ? r.value : 0,
      max_value_cop: r.type === 'extra_item' ? null : r.max_value_cop,
      category_id: r.category_id,
      weight: r.weight,
      expires_days: r.expires_days,
      color: r.color,
      active: r.active,
    })),
  };
}

/** One-line reward summary: "20 % de descuento · tope $3.000 · Bebidas", "Producto gratis", … */
export function rewardSummary(
  row: Pick<DraftPrize, 'type' | 'value' | 'max_value_cop'>,
  cop: (n: number) => string,
  category?: string | null,
): string {
  const cap = row.max_value_cop ? ` · tope ${cop(row.max_value_cop)}` : '';
  const only = category ? ` · ${category}` : '';
  if (row.type === 'percent_off') return `${row.value} % de descuento${cap}${only}`;
  if (row.type === 'free_item') return `Producto gratis${cap}${only}`;
  return `Extra gratis${only}`;
}

export type PrizeCategory = { id: string; name: string };

/** Categories a prize can be limited to: those of the products on sale, in their order. */
export function prizeCategories(products: Pick<Product, 'category_id' | 'category'>[]): PrizeCategory[] {
  const seen = new Map<string, string>();
  for (const p of products) if (p.category_id && p.category && !seen.has(p.category_id)) seen.set(p.category_id, p.category);
  return [...seen].map(([id, name]) => ({ id, name }));
}
