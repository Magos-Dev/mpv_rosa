"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { deliveryZoneSchema, type DeliveryZoneInput } from "@/lib/delivery-zones/schema";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };

async function adminClient() {
  const profile = await getCurrentProfile();
  if (!profile?.active || profile.role !== "admin") return null;
  return createClient();
}

function revalidate() {
  revalidatePath("/admin/taxas-entrega");
  revalidatePath("/checkout");
  revalidatePath("/carrinho");
}

function dbError(context: string, error: { code?: string; message: string }): Result {
  if (error.code === "23505") {
    return {
      ok: false,
      error: "Este bairro já está cadastrado nesta cidade.",
      fieldErrors: { neighborhood: "Bairro já cadastrado." },
    };
  }
  if (error.code === "42501") return DENIED;
  console.error(`[zones] ${context}:`, error.code, error.message);
  return { ok: false, error: "Não foi possível salvar. Tente novamente." };
}

export async function saveDeliveryZone(id: string | null, input: DeliveryZoneInput): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (id && !UUID.test(id)) return { ok: false, error: "Bairro inválido." };

  const parsed = deliveryZoneSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
  }

  const { error } = id
    ? await supabase.from("delivery_zones").update(parsed.data).eq("id", id)
    : await supabase.from("delivery_zones").insert(parsed.data);
  if (error) return dbError("salvar", error);
  revalidate();
  return { ok: true };
}

export async function setDeliveryZoneActive(id: string, active: boolean): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Bairro inválido." };
  const { error } = await supabase.from("delivery_zones").update({ active }).eq("id", id);
  if (error) return dbError("ativar", error);
  revalidate();
  return { ok: true };
}

/** Os pedidos guardam a taxa cobrada: excluir um bairro não altera o histórico. */
export async function deleteDeliveryZone(id: string): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Bairro inválido." };
  const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
  if (error) return dbError("excluir", error);
  revalidate();
  return { ok: true };
}
