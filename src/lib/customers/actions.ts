"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };

async function isStaff() {
  const profile = await getCurrentProfile();
  return Boolean(profile?.active && (profile.role === "admin" || profile.role === "operator"));
}

function fromDb(context: string, error: { code?: string; message: string }): Result {
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return DENIED;
  console.error(`[customers] ${context}:`, error.code, error.message);
  return { ok: false, error: "Não foi possível salvar. Tente novamente." };
}

export async function saveCustomerNotes(customerId: string, notes: string): Promise<Result> {
  if (!(await isStaff())) return DENIED;
  if (!UUID.test(customerId)) return { ok: false, error: "Cliente inválido." };
  if (notes.length > 1000) return { ok: false, error: "Observação muito longa (máx. 1000 caracteres)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_customer_notes", { p_customer_id: customerId, p_notes: notes });
  revalidatePath(`/admin/clientes/${customerId}`);
  return error ? fromDb("observações", error) : { ok: true };
}

/** LGPD: remove o consentimento de marketing a pedido do cliente. */
export async function revokeConsent(customerId: string): Promise<Result> {
  if (!(await isStaff())) return DENIED;
  if (!UUID.test(customerId)) return { ok: false, error: "Cliente inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_marketing_consent", { p_customer_id: customerId });
  revalidatePath(`/admin/clientes/${customerId}`);
  revalidatePath("/admin/clientes");
  return error ? fromDb("consentimento", error) : { ok: true };
}
