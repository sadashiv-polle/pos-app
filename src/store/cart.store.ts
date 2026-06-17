import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  item_code: string;
  item_name: string;
  rate: number;
  qty: number;
  uom?: string;
}

interface CartState {
  items: CartItem[];
  customer: string | null;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  updateQty: (item_code: string, qty: number) => void;
  removeItem: (item_code: string) => void;
  setCustomer: (customer: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      addItem: (item) => {
        const existing = get().items.find(i => i.item_code === item.item_code);
        if (existing) {
          get().updateQty(item.item_code, existing.qty + 1);
        } else {
          set({ items: [...get().items, { ...item, qty: 1 }] });
        }
      },
      updateQty: (item_code, qty) => {
        if (qty <= 0) {
          get().removeItem(item_code);
          return;
        }
        set({
          items: get().items.map(i =>
            i.item_code === item_code ? { ...i, qty } : i
          ),
        });
      },
      removeItem: (item_code) => {
        set({ items: get().items.filter(i => i.item_code !== item_code) });
      },
      setCustomer: (customer) => set({ customer }),
      clearCart: () => set({ items: [], customer: null }),
      total: () => get().items.reduce((sum, i) => sum + i.rate * i.qty, 0),
    }),
    { name: 'pos-cart' }
  )
);