import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

function fail(context: string, message: string): never {
  console.error(`[marketing] ${context}:`, message);
  throw new Error(`Não foi possível carregar ${context}.`);
}

export type LoyaltyRule = Tables<"loyalty_rules"> & {
  product_name: string | null;
  rewards: { available: number; redeemed: number };
};

export async function listLoyaltyRules(): Promise<LoyaltyRule[]> {
  const supabase = await createClient();
  const [rules, rewards, products] = await Promise.all([
    supabase.from("loyalty_rules").select("*").order("active", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("loyalty_rewards").select("loyalty_rule_id, status"),
    supabase.from("products").select("id, name"),
  ]);
  if (rules.error) fail("a fidelidade", rules.error.message);
  if (rewards.error) fail("a fidelidade", rewards.error.message);
  const names = new Map((products.data ?? []).map((p) => [p.id, p.name]));

  return rules.data.map((r) => {
    const own = rewards.data.filter((x) => x.loyalty_rule_id === r.id);
    return {
      ...r,
      product_name: r.reward_product_id ? (names.get(r.reward_product_id) ?? null) : null,
      rewards: {
        available: own.filter((x) => x.status === "available").length,
        redeemed: own.filter((x) => x.status === "redeemed").length,
      },
    };
  });
}

export type Promotion = Tables<"promotions"> & { target_name: string | null };

export async function listPromotions(): Promise<Promotion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .select("*, products(name), categories(name)")
    .order("active", { ascending: false })
    .order("ends_at", { ascending: false });
  if (error) fail("as promoções", error.message);

  return data.map(({ products, categories, ...p }) => ({
    ...p,
    target_name:
      (products as unknown as { name: string } | null)?.name ??
      (categories as unknown as { name: string } | null)?.name ??
      null,
  }));
}

export type Coupon = Tables<"coupons"> & { used: number };

export async function listCoupons(): Promise<Coupon[]> {
  const supabase = await createClient();
  const [coupons, usage] = await Promise.all([
    supabase.from("coupons").select("*").order("active", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("orders").select("coupon_id").not("coupon_id", "is", null).not("status", "in", "(cancelled,refused)"),
  ]);
  if (coupons.error) fail("os cupons", coupons.error.message);
  if (usage.error) fail("os cupons", usage.error.message);

  return coupons.data.map((c) => ({ ...c, used: usage.data.filter((u) => u.coupon_id === c.id).length }));
}

/** Produtos e categorias para os seletores dos formulários. */
export async function listTargets() {
  const supabase = await createClient();
  const [products, categories] = await Promise.all([
    supabase.from("products").select("id, name, price, active").order("name"),
    supabase.from("categories").select("id, name, active").order("sort_order").order("name"),
  ]);
  if (products.error) fail("os produtos", products.error.message);
  if (categories.error) fail("as categorias", categories.error.message);
  return { products: products.data, categories: categories.data };
}

export type SourceStat = { source: string; orders: number; last_order_at: string };

export async function getSourceStats(): Promise<SourceStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_source_stats");
  if (error) fail("as origens", error.message);
  return data as unknown as SourceStat[];
}
