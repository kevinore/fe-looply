import type { PrizeType } from '@/api/types';

/** Short badge text for a prize tile ("+1", "10%", "Gratis"). */
export function prizeBadge(type: string, shortLabel: string): string {
  if (type === 'extra_item') return '+1';
  if (type === 'free_item') return 'Gratis';
  return shortLabel.replace(/\s*dto\.?$/i, '');
}

/** One-line description of how the prize is used. */
export function prizeHow(type: string): string {
  return (type as PrizeType) === 'percent_off' ? 'en una bebida' : 'se entrega en el acto';
}
