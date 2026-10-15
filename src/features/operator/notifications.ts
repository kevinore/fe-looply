import { create } from 'zustand';
import type { SaleStatusCustomer } from '@/api/types';

/** "A customer scanned the QR of a sale" — shown on top of any operator screen. */
export type ClaimNotice = {
  id: number;
  saleId: string;
  customer: SaleStatusCustomer;
  totalCop: number | null;
};

type State = {
  items: ClaimNotice[];
  push: (n: Omit<ClaimNotice, 'id'>) => void;
  dismiss: (id: number) => void;
};

const MAX_VISIBLE = 3;
let nextId = 1;

export const useClaimNotices = create<State>((set, get) => ({
  items: [],
  push: (n) => {
    // One notice per sale, newest on top.
    const rest = get().items.filter((x) => x.saleId !== n.saleId);
    set({ items: [{ ...n, id: nextId++ }, ...rest].slice(0, MAX_VISIBLE) });
  },
  dismiss: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
}));
