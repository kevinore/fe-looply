import type { Product } from '@/api/types';

/**
 * Sections of the sale screen, in the order the API sends them (by category).
 * Without any category there is a single untitled section; products without one
 * go under "Otros" when other products have categories.
 */
export function sections(products: Product[]): Array<{ name: string | null; products: Product[] }> {
  const anyCategory = products.some((p) => p.category);
  const out: Array<{ name: string | null; products: Product[] }> = [];
  for (const p of products) {
    const name = anyCategory ? (p.category ?? 'Otros') : null;
    const last = out.at(-1);
    if (last && last.name === name) last.products.push(p);
    else out.push({ name, products: [p] });
  }
  return out;
}
