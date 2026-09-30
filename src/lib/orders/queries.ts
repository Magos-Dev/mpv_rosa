import "server-only";

import { cache } from "react";

import type { PublicOrder } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";

const TOKEN = /^[0-9a-f]{64}$/;

/** Pedido público pelo token do link de acompanhamento. */
export const getOrderByToken = cache(async (token: string): Promise<PublicOrder | null> => {
  if (!TOKEN.test(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_by_token", { p_token: token });
  if (error) {
    console.error("[orders] acompanhamento:", error.message);
    throw new Error("Não foi possível carregar o pedido.");
  }
  return (data as unknown as PublicOrder | null) ?? null;
});
