"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };

async function isCourier() {
  const profile = await getCurrentProfile();
  return Boolean(profile?.active && profile.role === "courier");
}

async function call(
  fn: "accept_delivery" | "pickup_delivery" | "complete_delivery",
  deliveryId: string,
): Promise<Result> {
  if (!(await isCourier())) return DENIED;
  if (!UUID.test(deliveryId)) return { ok: false, error: "Entrega inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_delivery_id: deliveryId });
  revalidatePath("/entregador");
  revalidatePath("/entregador/historico");
  if (!error) return { ok: true };
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return DENIED;
  console.error(`[courier] ${fn}:`, error.code, error.message);
  return { ok: false, error: "Não foi possível concluir. Tente novamente." };
}

/** ACEITAR ENTREGA — a garantia de "só um motoboy aceita" está no banco. */
export async function acceptDelivery(deliveryId: string) {
  return call("accept_delivery", deliveryId);
}

export async function pickupDelivery(deliveryId: string) {
  return call("pickup_delivery", deliveryId);
}

export async function completeDelivery(deliveryId: string) {
  return call("complete_delivery", deliveryId);
}

export async function setMyStatus(status: "available" | "offline"): Promise<Result> {
  if (!(await isCourier())) return DENIED;
  if (status !== "available" && status !== "offline") return { ok: false, error: "Status inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_courier_status", { p_status: status });
  revalidatePath("/entregador");
  if (!error) return { ok: true };
  if (error.code === "P0001") return { ok: false, error: error.message };
  console.error("[courier] status:", error.code, error.message);
  return { ok: false, error: "Não foi possível mudar o status." };
}
