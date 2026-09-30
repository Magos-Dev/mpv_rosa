"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import type { OrderStatus } from "@/lib/orders/labels";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; stale?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Muda o status de um pedido. As regras (transições, motivo obrigatório,
 * travamento contra cliques simultâneos, estatísticas) ficam no banco.
 */
export async function changeOrderStatus(input: {
  orderId: string;
  to: OrderStatus;
  expected: OrderStatus;
  reason?: string;
}): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile?.active || (profile.role !== "admin" && profile.role !== "operator")) {
    return { ok: false, error: "Você não tem permissão para esta ação." };
  }
  if (!UUID.test(input.orderId)) return { ok: false, error: "Pedido inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_order_status", {
    p_order_id: input.orderId,
    p_new_status: input.to,
    p_expected_status: input.expected,
    p_reason: input.reason?.trim() || undefined,
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${input.orderId}`);
  revalidatePath("/admin");

  if (error) {
    if (error.code === "P0001") {
      return { ok: false, error: error.message, stale: error.message.includes("outra pessoa") };
    }
    if (error.code === "42501") return { ok: false, error: "Você não tem permissão para esta ação." };
    console.error("[orders] mudar status:", error.code, error.message);
    return { ok: false, error: "Não foi possível atualizar o pedido. Tente novamente." };
  }
  return { ok: true };
}
