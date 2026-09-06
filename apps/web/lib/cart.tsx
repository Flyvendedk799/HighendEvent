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
import { clientApi } from "@/lib/client-api";

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
  /** Server cart line id when synced */
  serverItemId?: string;
};

type CartContextValue = {
  items: CartLine[];
  addItem: (line: CartLine) => void;
  removeItem: (productId: string, startDate: string) => void;
  clear: () => void;
  count: number;
  subtotalMinor: number;
  depositMinor: number;
  sessionId: string | null;
  syncing: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "rentora.cart.v1";
const SESSION_KEY = "rentora.cart.session";

type ServerCart = {
  id: string;
  sessionId: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    startDate: string | null;
    endDate: string | null;
    product?: {
      slug: string;
      name: string;
      currency: string;
      dailyPriceMinor: number;
      depositMinor: number;
    } | null;
  }>;
};

function ensureGuestSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(SESSION_KEY, id);
  return id;
}

function mapServerCart(cart: ServerCart): CartLine[] {
  return (cart.items ?? []).map((item) => {
    const startDate = item.startDate ? String(item.startDate).slice(0, 10) : "";
    const endDate = item.endDate ? String(item.endDate).slice(0, 10) : startDate;
    const days =
      startDate && endDate
        ? Math.max(
            1,
            Math.round(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
            ) + 1,
          )
        : 1;
    const unit = item.product?.dailyPriceMinor ?? 0;
    const deposit = item.product?.depositMinor ?? 0;
    return {
      productId: item.productId,
      slug: item.product?.slug ?? item.productId,
      name: item.product?.name ?? "Product",
      imageTone: "teal" as const,
      currency: item.product?.currency ?? "DKK",
      unitPriceMinor: unit,
      quantity: item.quantity,
      startDate,
      endDate,
      days,
      lineTotalMinor: unit * item.quantity * days,
      depositMinor: deposit * item.quantity,
      serverItemId: item.id,
    };
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const id = ensureGuestSessionId();
    setSessionId(id);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }

    void (async () => {
      setSyncing(true);
      try {
        const cart = await clientApi<ServerCart>(`/cart?sessionId=${encodeURIComponent(id)}`);
        const mapped = mapServerCart(cart);
        if (mapped.length > 0) {
          setItems(mapped);
        } else {
          // Push local lines up if server empty
          const local = localStorage.getItem(STORAGE_KEY);
          const localItems = local ? (JSON.parse(local) as CartLine[]) : [];
          for (const line of localItems) {
            await clientApi("/cart/items", {
              method: "POST",
              body: JSON.stringify({
                sessionId: id,
                productId: line.productId,
                quantity: line.quantity,
                startDate: line.startDate || undefined,
                endDate: line.endDate || undefined,
              }),
            });
          }
          if (localItems.length > 0) {
            const refreshed = await clientApi<ServerCart>(
              `/cart?sessionId=${encodeURIComponent(id)}`,
            );
            setItems(mapServerCart(refreshed));
          }
        }
      } catch {
        /* keep local cart if API unavailable */
      } finally {
        setSyncing(false);
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (line: CartLine) => {
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

      if (sessionId) {
        void clientApi("/cart/items", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            productId: line.productId,
            quantity: line.quantity,
            startDate: line.startDate || undefined,
            endDate: line.endDate || undefined,
          }),
        }).catch(() => {
          /* local cart remains source of truth on failure */
        });
      }
    },
    [sessionId],
  );

  const removeItem = useCallback(
    (productId: string, startDate: string) => {
      setItems((prev) => {
        const target = prev.find((p) => p.productId === productId && p.startDate === startDate);
        if (target?.serverItemId) {
          void clientApi(`/cart/items/${target.serverItemId}`, { method: "DELETE" }).catch(
            () => undefined,
          );
        }
        return prev.filter((p) => !(p.productId === productId && p.startDate === startDate));
      });
    },
    [],
  );

  const clear = useCallback(() => {
    setItems([]);
    if (sessionId) {
      void clientApi(`/cart?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }, [sessionId]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
    const depositMinor = items.reduce((sum, i) => sum + i.depositMinor, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    return {
      items,
      addItem,
      removeItem,
      clear,
      count,
      subtotalMinor,
      depositMinor,
      sessionId,
      syncing,
    };
  }, [items, addItem, removeItem, clear, sessionId, syncing]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
