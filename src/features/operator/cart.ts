import { create } from 'zustand';
import type { CustomerDetail } from '@/api/types';
import { holdUpdates } from '@/lib/swUpdate';
import { lineKey } from './options';

export type CartCustomer = {
  id: string;
  alias: string;
  phone_last4: string;
  purchases: number;
  milestone_every: number | null;
  active_prizes: CustomerDetail['active_prizes'];
  /** How the operator found this customer, e.g. by last 4 digits (M4 band). */
  foundBy?: string;
};

export type CartPrize = {
  awardId: string;
  targetProductId: string;
  name: string;
  type: string;
  /** Display estimate only; the backend computes the real discount. */
  estimatedDiscount: number | null;
};

/** One line per product and set of options (e.g. Berry Bliss · Avena · Matcha). */
export type CartLine = { productId: string; optionIds: string[]; qty: number };

type CartState = {
  /** By lineKey(), in the order they were first added. */
  lines: Record<string, CartLine>;
  customer: CartCustomer | null;
  prize: CartPrize | null;
  /** Prize chosen from 05 ("Próxima venta"): preselected in the prize sheet (8.10). */
  preselectedAwardId: string | null;
  idempotencyKey: string | null;
  add: (productId: string, optionIds?: string[]) => void;
  /** −1 on a line; on a product, its most recently added line. */
  remove: (productId: string, key?: string) => void;
  setCustomer: (c: CartCustomer | null, preselectedAwardId?: string | null) => void;
  setPrize: (p: CartPrize | null) => void;
  /** Creates the idempotency key once; reused until the sale succeeds. */
  ensureKey: () => string;
  reset: () => void;
};

const MAX_QTY = 20;

const empty = {
  lines: {},
  customer: null,
  prize: null,
  preselectedAwardId: null,
  idempotencyKey: null,
};

/** In-memory only: never persisted (plan §8.3). */
export const useCart = create<CartState>((set, get) => ({
  ...empty,
  add: (productId, optionIds = []) => {
    const { lines } = get();
    const key = lineKey(productId, optionIds);
    const line = lines[key] ?? { productId, optionIds, qty: 0 };
    set({
      lines: { ...lines, [key]: { ...line, qty: Math.min(line.qty + 1, MAX_QTY) } },
      idempotencyKey: null,
    });
  },
  remove: (productId, key) => {
    const { lines, prize } = get();
    const target =
      key ??
      Object.keys(lines)
        .filter((k) => lines[k]!.productId === productId)
        .at(-1);
    const line = target ? lines[target] : undefined;
    if (!target || !line) return;
    const next = { ...lines };
    if (line.qty <= 1) delete next[target];
    else next[target] = { ...line, qty: line.qty - 1 };
    const dropPrize =
      prize && prize.targetProductId === productId && productQty(next, productId) === 0;
    set({ lines: next, prize: dropPrize ? null : prize, idempotencyKey: null });
  },
  setCustomer: (customer, preselectedAwardId = null) =>
    set({ customer, prize: null, preselectedAwardId, idempotencyKey: null }),
  setPrize: (prize) => set({ prize, preselectedAwardId: null, idempotencyKey: null }),
  ensureKey: () => {
    const current = get().idempotencyKey;
    if (current) return current;
    const key = crypto.randomUUID();
    set({ idempotencyKey: key });
    return key;
  },
  reset: () => set({ ...empty }),
}));

export function cartCount(lines: Record<string, CartLine>): number {
  return Object.values(lines).reduce((a, l) => a + l.qty, 0);
}

/** Units of a product across all its lines (any options). */
export function productQty(lines: Record<string, CartLine>, productId: string): number {
  return Object.values(lines).reduce((a, l) => a + (l.productId === productId ? l.qty : 0), 0);
}

// An open cart is in memory only: never switch versions under it.
useCart.subscribe((s) => holdUpdates('cart', cartCount(s.lines) > 0 || s.customer !== null));
