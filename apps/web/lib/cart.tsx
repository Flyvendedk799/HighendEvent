"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  imageTone: "teal" | "amber" | "slate";
  currency: string;
  unitPriceMinor: number;
  quantity: number;
  startDate: string;
  endDate: string;
  days: number;
  lineTotalMinor: number;
  depositMinor: number;
};

type CartContextValue = {
  items: CartLine[];
  addItem: (line: CartLine) => void;
  removeItem: (productId: string, startDate: string) => void;
  clear: () => void;
  count: number;
  subtotalMinor: number;
  depositMinor: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "rentora.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((line: CartLine) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.productId === line.productId &&
          p.startDate === line.startDate &&
          p.endDate === line.endDate,
      );
      if (idx === -1) return [...prev, line];
      const next = [...prev];
      const existing = next[idx]!;
      const quantity = existing.quantity + line.quantity;
      next[idx] = {
        ...existing,
        quantity,
        lineTotalMinor: Math.round((existing.lineTotalMinor / existing.quantity) * quantity),
        depositMinor: Math.round((existing.depositMinor / existing.quantity) * quantity),
      };
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string, startDate: string) => {
    setItems((prev) =>
      prev.filter((p) => !(p.productId === productId && p.startDate === startDate)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
    const depositMinor = items.reduce((sum, i) => sum + i.depositMinor, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, addItem, removeItem, clear, count, subtotalMinor, depositMinor };
  }, [items, addItem, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
