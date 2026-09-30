"use client";

import type { AddressInput } from "@/lib/orders/schemas";

// Dados lembrados NO APARELHO do cliente (decisão da Etapa 3: nada de busca
// pública por telefone, para não expor dados de terceiros — LGPD).

const CUSTOMER_KEY = "rosaerose:customer:v1";
const SOURCE_KEY = "rosaerose:source:v1";
const SOURCE_TTL_MS = 24 * 60 * 60 * 1000;

export type RememberedCustomer = {
  name: string;
  phone: string;
  email: string;
  order_type: "delivery" | "pickup";
  payment_method: "pix" | "cash" | "card_on_delivery";
  address: AddressInput;
};

function safeGet(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignorado
  }
}

export function loadCustomer(): Partial<RememberedCustomer> | null {
  const value = safeGet(CUSTOMER_KEY);
  return value && typeof value === "object" ? (value as Partial<RememberedCustomer>) : null;
}

export function saveCustomer(customer: RememberedCustomer) {
  safeSet(CUSTOMER_KEY, customer);
}

export function forgetCustomer() {
  try {
    window.localStorage.removeItem(CUSTOMER_KEY);
  } catch {
    // ignorado
  }
}

/** Origem do acesso (?src=mesa01), válida por 24h. */
export function captureSource(src: string | null) {
  if (!src || !/^[a-z0-9_-]{1,40}$/i.test(src)) return;
  safeSet(SOURCE_KEY, { src: src.toLowerCase(), at: Date.now() });
}

export function getSource(): string | null {
  const value = safeGet(SOURCE_KEY) as { src?: string; at?: number } | null;
  if (!value?.src || !value.at || Date.now() - value.at > SOURCE_TTL_MS) return null;
  return value.src;
}
