"use client";

import { useSyncExternalStore } from "react";

import type { CartItemPayload } from "@/lib/orders/types";

// Carrinho salvo no aparelho (localStorage). Os preços aqui servem só para
// exibição imediata; o valor oficial é sempre calculado no servidor.

export type CartOption = { id: string; group_name: string; name: string; price: number };

export type CartLine = {
  key: string;
  product_id: string;
  slug: string;
  name: string;
  image_url: string | null;
  /** Preço do produto (já com promoção) no momento em que foi adicionado. */
  base_price: number;
  options: CartOption[];
  quantity: number;
  notes: string | null;
};

const STORAGE_KEY = "rosaerose:cart:v1";
const EMPTY: CartLine[] = [];

let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function isLine(value: unknown): value is CartLine {
  const v = value as CartLine;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.key === "string" &&
    typeof v.product_id === "string" &&
    typeof v.name === "string" &&
    typeof v.base_price === "number" &&
    Number.isInteger(v.quantity) &&
    Array.isArray(v.options)
  );
}

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (cache === null) cache = read();
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Mantém abas diferentes sincronizadas
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Armazenamento indisponível (modo privado): o carrinho vive só na memória
  }
  listeners.forEach((l) => l());
}

function sameChoice(a: Omit<CartLine, "key" | "quantity">, b: Omit<CartLine, "key" | "quantity">) {
  const ids = (l: typeof a) => l.options.map((o) => o.id).sort().join(",");
  return a.product_id === b.product_id && ids(a) === ids(b) && (a.notes ?? "") === (b.notes ?? "");
}

export const cart = {
  add(line: Omit<CartLine, "key">) {
    const lines = getSnapshot();
    const existing = lines.find((l) => sameChoice(l, line));
    if (existing) {
      write(
        lines.map((l) =>
          l.key === existing.key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l,
        ),
      );
      return;
    }
    write([...lines, { ...line, key: crypto.randomUUID() }]);
  },
  replace(key: string, line: Omit<CartLine, "key">) {
    write(getSnapshot().map((l) => (l.key === key ? { ...line, key } : l)));
  },
  setQuantity(key: string, quantity: number) {
    if (quantity < 1) return cart.remove(key);
    write(getSnapshot().map((l) => (l.key === key ? { ...l, quantity: Math.min(99, quantity) } : l)));
  },
  remove(key: string) {
    write(getSnapshot().filter((l) => l.key !== key));
  },
  clear() {
    write([]);
  },
};

export function lineUnitPrice(line: Pick<CartLine, "base_price" | "options">) {
  return line.base_price + line.options.reduce((sum, o) => sum + o.price, 0);
}

export function toPayload(lines: CartLine[]): CartItemPayload[] {
  return lines.map((l) => ({
    product_id: l.product_id,
    quantity: l.quantity,
    notes: l.notes,
    option_ids: l.options.map((o) => o.id),
  }));
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + lineUnitPrice(l) * l.quantity, 0);
  return { lines, count, subtotal };
}

/** false durante a renderização no servidor (evita piscar "carrinho vazio"). */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
