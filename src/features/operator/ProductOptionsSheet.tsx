import { useState } from 'react';
import type { Product } from '@/api/types';
import { formatCop } from '@/lib/money';
import { BottomSheet, Button } from '@/ui';
import { OptionGroupsPicker } from './OptionGroupsPicker';
import { isValidSelection, unitPrice } from './options';

/**
 * Choose the options of a product before adding it (e.g. Base and Té of a
 * layered drink). Nothing is preselected, so a hurried tap can't add the wrong
 * combination. `product` null = closed.
 */
export function ProductOptionsSheet({
  product,
  onAdd,
  onClose,
}: {
  product: Product | null;
  onAdd: (product: Product, optionIds: string[]) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={!!product} onClose={onClose} labelledBy="product-options-title">
      {/* Remounted per product, so each opening starts empty. */}
      {product && <Body key={product.id} product={product} onAdd={onAdd} />}
    </BottomSheet>
  );
}

function Body({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product, optionIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const valid = isValidSelection(product.option_groups, selected);
  return (
    <>
      <div className="mb-4">
        <h2 id="product-options-title" className="text-2xl leading-tight font-semibold">
          {product.name}
        </h2>
        {product.description && <p className="text-sm text-brand-muted">{product.description}</p>}
      </div>
      <OptionGroupsPicker
        groups={product.option_groups}
        selected={selected}
        onChange={setSelected}
      />
      <Button className="mt-5" disabled={!valid} onClick={() => onAdd(product, selected)}>
        Agregar · {formatCop(unitPrice(product, selected))}
      </Button>
    </>
  );
}
