"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  couponSchema,
  loyaltySchema,
  promotionSchema,
  type CouponInput,
  type LoyaltyInput,
  type PromotionInput,
} from "@/lib/marketing/schemas";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };

async function adminClient() {
  const profile = await getCurrentProfile();
  if (!profile?.active || profile.role !== "admin") return null;
  return createClient();
}

function invalid(error: z.ZodError): Result {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
}

function dbError(context: string, error: { code?: string; message: string }): Result {
  if (error.code === "23505") return { ok: false, error: "Já existe um registro com esse código." };
  if (error.code === "42501") return DENIED;
  console.error(`[marketing] ${context}:`, error.code, error.message);
  return { ok: false, error: "Não foi possível salvar. Tente novamente." };
}

function revalidateMarketing() {
  revalidatePath("/admin/fidelidade");
  revalidatePath("/admin/promocoes");
  revalidatePath("/admin/cupons");
  revalidatePath("/cardapio");
  revalidatePath("/produto/[slug]", "page");
}

// =====================================================================
// Fidelidade — uma regra ativa por vez (ativar uma desativa as demais)
// =====================================================================
export async function saveLoyaltyRule(id: string | null, input: LoyaltyInput): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (id && !UUID.test(id)) return { ok: false, error: "Regra inválida." };
  const parsed = loyaltySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  if (parsed.data.active) {
    let others = supabase.from("loyalty_rules").update({ active: false }).eq("active", true);
    if (id) others = others.neq("id", id);
    const { error } = await others;
    if (error) return dbError("desativar regras", error);
  }

  const { error } = id
    ? await supabase.from("loyalty_rules").update(parsed.data).eq("id", id)
    : await supabase.from("loyalty_rules").insert(parsed.data);
  if (error) return dbError("salvar regra", error);

  revalidateMarketing();
  return { ok: true };
}

export async function setLoyaltyRuleActive(id: string, active: boolean): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Regra inválida." };

  if (active) {
    const { error } = await supabase.from("loyalty_rules").update({ active: false }).eq("active", true).neq("id", id);
    if (error) return dbError("desativar regras", error);
  }
  const { error } = await supabase.from("loyalty_rules").update({ active }).eq("id", id);
  if (error) return dbError("ativar regra", error);
  revalidateMarketing();
  return { ok: true };
}

// =====================================================================
// Promoções
// =====================================================================
export async function savePromotion(id: string | null, input: PromotionInput): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (id && !UUID.test(id)) return { ok: false, error: "Promoção inválida." };
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { error } = id
    ? await supabase.from("promotions").update(parsed.data).eq("id", id)
    : await supabase.from("promotions").insert(parsed.data);
  if (error) return dbError("salvar promoção", error);
  revalidateMarketing();
  return { ok: true };
}

export async function setPromotionActive(id: string, active: boolean): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Promoção inválida." };
  const { error } = await supabase.from("promotions").update({ active }).eq("id", id);
  if (error) return dbError("ativar promoção", error);
  revalidateMarketing();
  return { ok: true };
}

export async function deletePromotion(id: string): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Promoção inválida." };
  // Os pedidos guardam o preço pago (snapshot): excluir a promoção não altera o histórico
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return dbError("excluir promoção", error);
  revalidateMarketing();
  return { ok: true };
}

// =====================================================================
// Cupons
// =====================================================================
export async function saveCoupon(id: string | null, input: CouponInput): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (id && !UUID.test(id)) return { ok: false, error: "Cupom inválido." };
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { error } = id
    ? await supabase.from("coupons").update(parsed.data).eq("id", id)
    : await supabase.from("coupons").insert(parsed.data);
  if (error?.code === "23505") {
    return { ok: false, error: "Já existe um cupom com esse código.", fieldErrors: { code: "Código já usado." } };
  }
  if (error) return dbError("salvar cupom", error);
  revalidateMarketing();
  return { ok: true };
}

export async function setCouponActive(id: string, active: boolean): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Cupom inválido." };
  const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
  if (error) return dbError("ativar cupom", error);
  revalidateMarketing();
  return { ok: true };
}

/** Só exclui cupom nunca usado; usado deve ser desativado (preserva o histórico). */
export async function deleteCoupon(id: string): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Cupom inválido." };

  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("coupon_id", id);
  if (count && count > 0) {
    return { ok: false, error: "Este cupom já foi usado em pedidos. Desative-o em vez de excluir." };
  }
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return dbError("excluir cupom", error);
  revalidateMarketing();
  return { ok: true };
}
