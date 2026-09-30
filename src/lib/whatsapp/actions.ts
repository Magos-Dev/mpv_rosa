"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, type TemplateKey } from "@/lib/whatsapp/templates";

type Result = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };

/** Registra que o atendente abriu o WhatsApp com a mensagem (evita aviso repetido). */
export async function logMessage(input: {
  orderId?: string | null;
  customerId?: string | null;
  template: TemplateKey;
}): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile?.active || (profile.role !== "admin" && profile.role !== "operator")) return DENIED;
  if (!(TEMPLATE_KEYS as readonly string[]).includes(input.template)) return { ok: false, error: "Mensagem inválida." };
  const orderId = input.orderId && UUID.test(input.orderId) ? input.orderId : null;
  const customerId = input.customerId && UUID.test(input.customerId) ? input.customerId : null;
  if (!orderId && !customerId) return { ok: false, error: "Destino inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("log_message", {
    p_order_id: orderId,
    p_customer_id: customerId,
    p_template: input.template,
  });
  if (orderId) {
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
  }
  if (customerId) revalidatePath(`/admin/clientes/${customerId}`);

  if (!error) return { ok: true };
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return DENIED;
  console.error("[whatsapp] registrar:", error.code, error.message);
  return { ok: false, error: "Não foi possível registrar o aviso." };
}

/** Salva os textos personalizados (só os que diferem do padrão). Admin. */
export async function saveTemplates(input: Record<string, string>): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile?.active || profile.role !== "admin") return DENIED;

  const custom: Record<string, string> = {};
  for (const key of TEMPLATE_KEYS) {
    const value = typeof input[key] === "string" ? input[key].replace(/\r\n/g, "\n").trim() : "";
    if (value.length > 1000) return { ok: false, error: "Cada mensagem pode ter no máximo 1000 caracteres." };
    if (value && value !== DEFAULT_TEMPLATES[key]) custom[key] = value;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .update({ whatsapp_templates: custom })
    .not("id", "is", null)
    .select("id");
  if (error || !data?.length) {
    console.error("[whatsapp] salvar textos:", error?.message ?? "nenhuma linha");
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
