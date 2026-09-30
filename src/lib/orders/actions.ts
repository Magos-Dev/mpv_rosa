"use server";

import { z } from "zod";

import { checkoutSchema, type CheckoutInput } from "@/lib/orders/schemas";
import type { CartItemPayload, Quote } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const itemsSchema = z
  .array(
    z.object({
      product_id: z.uuid(),
      quantity: z.number().int().min(1).max(99),
      notes: z.string().trim().max(200).nullable(),
      option_ids: z.array(z.uuid()).max(50),
    }),
  )
  .min(1, "Seu carrinho está vazio.")
  .max(50);

const GENERIC = "Não foi possível processar seu pedido. Tente novamente.";

/** Erros de regra de negócio (P0001) vêm do banco já em português. */
function fromDb(context: string, error: { code?: string; message: string }) {
  if (error.code === "P0001") return { ok: false as const, error: error.message };
  console.error(`[orders] ${context}:`, error.code, error.message);
  return { ok: false as const, error: GENERIC };
}

/** Preços oficiais do carrinho, calculados no banco. */
const couponSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(30)
  .regex(/^[A-Z0-9_-]*$/, "Cupom inválido.")
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export async function quoteCart(
  items: CartItemPayload[],
  orderType: "delivery" | "pickup",
  couponCode?: string | null,
): Promise<Result<Quote>> {
  const parsed = itemsSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Carrinho inválido. Atualize a página." };
  const coupon = couponSchema.safeParse(couponCode);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quote_order", {
    p_items: parsed.data,
    p_order_type: orderType === "pickup" ? "pickup" : "delivery",
    p_coupon_code: coupon.success ? (coupon.data ?? undefined) : undefined,
  });
  if (error) return fromDb("cotar carrinho", error);
  const quote = data as unknown as Quote;
  // Formato inválido nem chega ao banco: cota sem cupom e informa o erro
  if (!coupon.success) quote.coupon_error = "Cupom inválido.";
  return { ok: true, data: quote };
}

export async function placeOrder(input: {
  checkout: CheckoutInput;
  items: CartItemPayload[];
  source: string | null;
  couponCode?: string | null;
  /** Campo invisível: bots costumam preencher. */
  website: string;
}): Promise<Result<{ order_number: number; public_token: string }>> {
  if (input.website) return { ok: false, error: GENERIC };

  const checkout = checkoutSchema.safeParse(input.checkout);
  if (!checkout.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of checkout.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
  }

  const items = itemsSchema.safeParse(input.items);
  if (!items.success) return { ok: false, error: "Carrinho inválido. Atualize a página." };
  const coupon = couponSchema.safeParse(input.couponCode);
  if (!coupon.success) return { ok: false, error: "Cupom inválido." };

  const c = checkout.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_payload: {
      customer: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        marketing_opt_in: c.marketing_opt_in,
      },
      order_type: c.order_type,
      address: c.address,
      payment_method: c.payment_method,
      change_for: c.change_for,
      notes: c.notes,
      source: input.source,
      coupon_code: coupon.data,
      items: items.data,
    },
  });
  if (error) return fromDb("criar pedido", error);

  const result = data as unknown as { order_number: number; public_token: string };
  return { ok: true, data: result };
}
