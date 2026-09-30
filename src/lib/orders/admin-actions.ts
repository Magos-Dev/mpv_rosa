"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { formatBRL } from "@/lib/format";
import { PAYMENT_LABELS, type OrderStatus } from "@/lib/orders/labels";
import { sendPush } from "@/lib/push/send";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; stale?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };

async function isStaff() {
  const profile = await getCurrentProfile();
  return Boolean(profile?.active && (profile.role === "admin" || profile.role === "operator"));
}

function revalidateOrder(orderId: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/entregas");
  revalidatePath("/admin");
}

/** Regras de negócio (P0001) vêm do banco já em português. */
function fromDb(context: string, error: { code?: string; message: string }) {
  if (error.code === "P0001") {
    return { ok: false as const, error: error.message, stale: error.message.includes("outra pessoa") };
  }
  if (error.code === "42501") return DENIED;
  console.error(`[orders] ${context}:`, error.code, error.message);
  return { ok: false as const, error: "Não foi possível atualizar o pedido. Tente novamente." };
}

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
  if (!(await isStaff())) return DENIED;
  if (!UUID.test(input.orderId)) return { ok: false, error: "Pedido inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_order_status", {
    p_order_id: input.orderId,
    p_new_status: input.to,
    p_expected_status: input.expected,
    p_reason: input.reason?.trim() || undefined,
  });
  revalidateOrder(input.orderId);
  return error ? fromDb("mudar status", error) : { ok: true };
}

/** CHAMAR MOTOBOY: oferece a corrida aos motoboys disponíveis. */
export async function dispatchDelivery(
  orderId: string,
): Promise<Result<{ available_couriers: number }>> {
  if (!(await isStaff())) return DENIED;
  if (!UUID.test(orderId)) return { ok: false, error: "Pedido inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dispatch_delivery", { p_order_id: orderId });
  revalidateOrder(orderId);
  if (error) return fromDb("chamar motoboy", error);

  // Notificação "Nova entrega" para os motoboys disponíveis (7E).
  // Só bairro, valor e pagamento — sem dados pessoais do cliente (LGPD).
  after(async () => {
    const { data: order } = await supabase
      .from("orders")
      .select("order_number, total, payment_method, address_snapshot")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const hood = (order.address_snapshot as { neighborhood?: string } | null)?.neighborhood ?? "";
    await sendPush("available_couriers", {
      title: "🛵 Nova entrega disponível",
      body: `Pedido #${order.order_number}${hood ? ` · ${hood}` : ""} · ${formatBRL(order.total)} (${PAYMENT_LABELS[order.payment_method]})`,
      url: "/entregador",
      tag: `entrega-${order.order_number}`,
    });
  });

  return { ok: true, data: data as unknown as { available_couriers: number } };
}

/** Marca o brinde de fidelidade como entregue ao cliente. */
export async function redeemLoyaltyReward(rewardId: string, orderId: string): Promise<Result> {
  if (!(await isStaff())) return DENIED;
  if (!UUID.test(rewardId) || !UUID.test(orderId)) return { ok: false, error: "Brinde inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_loyalty_reward", { p_reward_id: rewardId });
  revalidateOrder(orderId);
  revalidatePath("/admin/clientes", "layout");
  return error ? fromDb("resgatar brinde", error) : { ok: true };
}

/** Cancela a chamada (antes da retirada); o pedido volta a "Pronto". */
export async function cancelDispatch(orderId: string): Promise<Result> {
  if (!(await isStaff())) return DENIED;
  if (!UUID.test(orderId)) return { ok: false, error: "Pedido inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_dispatch", { p_order_id: orderId });
  revalidateOrder(orderId);
  return error ? fromDb("cancelar chamada", error) : { ok: true };
}
