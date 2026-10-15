import type { PaymentMethod } from '@/api/types';

/** The methods offered for a new sale (owner decision, 2026-10-14). */
export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; hint: string }> = [
  { value: 'transfer', label: 'Transferencia', hint: 'Nequi · Bre-B' },
  { value: 'cash', label: 'Efectivo', hint: '$' },
  { value: 'card', label: 'Datáfono', hint: 'Tarjeta' },
];

/** Sales recorded before may still say 'nequi' or 'breb': both were transfers. */
const LEGACY_LABELS: Record<string, string> = { nequi: 'Transferencia', breb: 'Transferencia' };

export function paymentLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? LEGACY_LABELS[method] ?? 'Otro medio';
}

export function dayTypeLabel(dayType: string): string {
  return dayType === 'sunday' ? 'Domingo' : dayType === 'holiday' ? 'Festivo' : 'Otro día';
}

/** WMO weather codes (Open-Meteo) → short Spanish label. */
export function weatherLabel(code: number | null | undefined): string | null {
  if (code === null || code === undefined) return null;
  if (code === 0) return 'Soleado';
  if (code <= 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (code === 45 || code === 48) return 'Niebla';
  if (code >= 51 && code <= 57) return 'Llovizna';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Lluvia';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Nieve';
  if (code >= 95) return 'Tormenta';
  return null;
}

export function weatherText(temp: number | null | undefined, code: number | null | undefined): string | null {
  const label = weatherLabel(code);
  if (temp === null || temp === undefined) return label;
  const t = `${Math.round(temp)}°`;
  return label ? `${t} · ${label}` : t;
}

/** "Se entrega ya" for deliverable prizes, "Próxima venta" for discounts (8.6). */
export function prizeUsage(type: string): string {
  return type === 'percent_off' ? 'Próxima venta' : 'Se entrega ya';
}

export function isDeliverable(type: string): boolean {
  return type === 'extra_item' || type === 'free_item';
}

/** "3 bebidas" / "1 bebida" */
export function drinks(n: number): string {
  return `${n} ${n === 1 ? 'bebida' : 'bebidas'}`;
}

/** 15 → "3–4 pm"; 11 → "11 am–12 pm" (suffix repeated only when it changes). */
export function hourRange(h: number): string {
  const end = (h + 1) % 24;
  const suffix = (x: number) => (x < 12 ? 'am' : 'pm');
  const start = suffix(h) === suffix(end) ? hourShort(h) : `${hourShort(h)} ${suffix(h)}`;
  return `${start}–${hourShort(end)} ${suffix(end)}`;
}

export function hourShort(h: number): string {
  return `${((h + 11) % 12) + 1}`;
}
