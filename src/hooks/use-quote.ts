"use client";

import { useEffect, useState } from "react";

import { toPayload, type CartLine } from "@/lib/cart/store";
import { quoteCart } from "@/lib/orders/actions";
import type { Quote } from "@/lib/orders/types";

type QuoteState =
  | { status: "idle" | "loading"; quote: Quote | null; error: null }
  | { status: "ready"; quote: Quote; error: null }
  | { status: "error"; quote: null; error: string };

type Settled = { signature: string } & ({ ok: true; quote: Quote } | { ok: false; error: string });

/**
 * Busca no servidor os valores oficiais do carrinho (preços atuais,
 * promoções, disponibilidade, taxa de entrega e cupom). Refaz a cotação
 * quando algo muda.
 */
export function useQuote(
  lines: CartLine[],
  orderType: "delivery" | "pickup",
  enabled = true,
  couponCode: string | null = null,
): QuoteState {
  const [settled, setSettled] = useState<Settled | null>(null);
  const signature = JSON.stringify([toPayload(lines), orderType, couponCode]);
  const active = enabled && lines.length > 0;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const [items, type, coupon] = JSON.parse(signature) as [
      ReturnType<typeof toPayload>,
      "delivery" | "pickup",
      string | null,
    ];

    const timer = setTimeout(async () => {
      try {
        const result = await quoteCart(items, type, coupon);
        if (cancelled) return;
        setSettled(
          result.ok
            ? { signature, ok: true, quote: result.data }
            : { signature, ok: false, error: result.error },
        );
      } catch {
        if (!cancelled) {
          setSettled({ signature, ok: false, error: "Falha de conexão. Tente novamente." });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, active]);

  if (!active) return { status: "idle", quote: null, error: null };
  if (settled?.signature === signature) {
    return settled.ok
      ? { status: "ready", quote: settled.quote, error: null }
      : { status: "error", quote: null, error: settled.error };
  }
  // Recalculando: mantém a última cotação válida enquanto carrega
  return { status: "loading", quote: settled?.ok ? settled.quote : null, error: null };
}
