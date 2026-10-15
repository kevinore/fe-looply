import type { OptionGroup, Product, SaleItemOption } from '@/api/types';

/**
 * Product options (e.g. "Base", "Té"): each product says which groups it needs
 * and how many choices per group. Display and validation hints only; the
 * backend validates the choices and computes the price (R3).
 */

/** Cart line key: one line per product + set of options (order-independent). */
export function lineKey(productId: string, optionIds: string[] = []): string {
  return [productId, ...[...optionIds].sort()].join('|');
}

export function hasOptions(product: Pick<Product, 'option_groups'>): boolean {
  return product.option_groups.length > 0;
}

/** Choices of each group within its min/max, and nothing outside the groups. */
export function isValidSelection(groups: OptionGroup[], optionIds: string[]): boolean {
  const ids = new Set(optionIds);
  let matched = 0;
  for (const g of groups) {
    const n = g.options.filter((o) => ids.has(o.id)).length;
    if (n < g.min_select || n > g.max_select) return false;
    matched += n;
  }
  return matched === ids.size && ids.size === optionIds.length;
}

/** Toggles a choice: replaces it in single-choice groups, adds up to max otherwise. */
export function toggleOption(group: OptionGroup, selected: string[], optionId: string): string[] {
  const inGroup = new Set(group.options.map((o) => o.id));
  if (selected.includes(optionId)) {
    // Single-choice groups keep their choice (radio behavior).
    return group.max_select === 1 ? selected : selected.filter((id) => id !== optionId);
  }
  if (group.max_select === 1) return [...selected.filter((id) => !inGroup.has(id)), optionId];
  const count = selected.filter((id) => inGroup.has(id)).length;
  return count >= group.max_select ? selected : [...selected, optionId];
}

/** Product price plus the price of the chosen options (estimate). */
export function unitPrice(
  product: Pick<Product, 'price_cop' | 'option_groups'>,
  optionIds: string[],
): number {
  const ids = new Set(optionIds);
  const extra = product.option_groups
    .flatMap((g) => g.options)
    .filter((o) => ids.has(o.id))
    .reduce((sum, o) => sum + o.price_delta_cop, 0);
  return product.price_cop + extra;
}

/** Names of the chosen options, in the product's group order. */
export function optionNames(
  product: Pick<Product, 'option_groups'>,
  optionIds: string[],
): string[] {
  const ids = new Set(optionIds);
  return product.option_groups.flatMap((g) =>
    g.options.filter((o) => ids.has(o.id)).map((o) => o.name),
  );
}

/** "Avena · Matcha" from the options saved on a sale line. */
export function savedOptionsText(options: SaleItemOption[] | undefined): string {
  return (options ?? []).map((o) => o.option_name).join(' · ');
}

/** "Elige 1", "Elige hasta 2", "Elige de 1 a 3". */
export function groupHint(group: Pick<OptionGroup, 'min_select' | 'max_select'>): string {
  const { min_select: min, max_select: max } = group;
  if (min === max) return `Elige ${min}`;
  if (min === 0) return `Opcional · hasta ${max}`;
  return `Elige de ${min} a ${max}`;
}
