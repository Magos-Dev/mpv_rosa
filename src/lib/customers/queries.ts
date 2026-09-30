import "server-only";

import type { OrderStatus, OrderType } from "@/lib/orders/labels";
import { createClient } from "@/lib/supabase/server";

function fail(context: string, message: string): never {
  console.error(`[customers] ${context}:`, message);
  throw new Error(`Não foi possível carregar ${context}.`);
}

export type CustomerSort = "recentes" | "pedidos" | "gasto" | "nome";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  total_orders: number;
  total_spent: number;
  marketing_opt_in: boolean;
  last_order_at: string | null;
};

/** Lista de clientes (seção 12). Busca por nome, telefone ou e-mail. */
export async function listCustomers(params: { search?: string; sort: CustomerSort }): Promise<CustomerRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, name, phone, email, total_orders, total_spent, marketing_opt_in, orders(created_at)")
    .order("created_at", { referencedTable: "orders", ascending: false })
    .limit(1, { referencedTable: "orders" })
    .limit(300);

  if (params.search) {
    // Remove caracteres que têm significado no filtro do PostgREST
    const text = params.search.replace(/[%_,()*\\]/g, " ").trim();
    const digits = params.search.replace(/\D/g, "");
    const filters = [`name.ilike.%${text}%`, `email.ilike.%${text}%`];
    if (digits.length >= 3) filters.push(`phone.like.%${digits}%`);
    if (text) query = query.or(filters.join(","));
  }

  switch (params.sort) {
    case "pedidos":
      query = query.order("total_orders", { ascending: false }).order("name");
      break;
    case "gasto":
      query = query.order("total_spent", { ascending: false }).order("name");
      break;
    case "nome":
      query = query.order("name");
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) fail("os clientes", error.message);

  return data.map(({ orders, ...c }) => ({
    ...c,
    last_order_at: (orders as { created_at: string }[])[0]?.created_at ?? null,
  }));
}

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  marketing_opt_out_at: string | null;
  total_orders: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  created_at: string;
  /** Última promoção enviada pelo WhatsApp (7B). */
  last_promotion_at: string | null;
  addresses: {
    id: string;
    zip_code: string | null;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string | null;
    reference: string | null;
    is_default: boolean;
  }[];
  orders: {
    id: string;
    order_number: number;
    created_at: string;
    status: OrderStatus;
    order_type: OrderType;
    total: number;
  }[];
  rewards: {
    id: string;
    status: "available" | "redeemed" | "expired";
    reward_description: string;
    created_at: string;
    redeemed_at: string | null;
    order_id: string | null;
  }[];
  /** Progresso na regra de fidelidade ativa (seção 13). */
  loyalty: {
    rule_name: string;
    orders_required: number;
    reward_description: string;
    valid_orders: number;
    /** Pedidos ainda em andamento (contam na posição do próximo). */
    open_orders: number;
    next_position: number;
    next_is_reward: boolean;
  } | null;
};

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();
  const [customerRes, addressesRes, ordersRes, rewardsRes, ruleRes, promoRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_addresses").select("*").eq("customer_id", id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, order_number, created_at, status, order_type, total").eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("loyalty_rewards").select("id, status, reward_description, created_at, redeemed_at, order_id").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("loyalty_rules").select("name, orders_required, reward_description").eq("active", true).maybeSingle(),
    supabase
      .from("message_logs")
      .select("created_at")
      .eq("customer_id", id)
      .eq("template", "promotion")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const r of [customerRes, addressesRes, ordersRes, rewardsRes, ruleRes, promoRes]) {
    if (r.error) fail("o cliente", r.error.message);
  }
  const c = customerRes.data;
  if (!c) return null;

  const orders = ordersRes.data ?? [];
  const rule = ruleRes.data;
  // Mesma conta do banco: concluídos + em andamento + 1
  const open = orders.filter((o) => !["delivered", "picked_up", "cancelled", "refused"].includes(o.status)).length;
  const nextPosition = c.total_orders + open + 1;

  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    marketing_opt_in: c.marketing_opt_in,
    marketing_opt_in_at: c.marketing_opt_in_at,
    marketing_opt_out_at: c.marketing_opt_out_at,
    total_orders: c.total_orders,
    total_spent: c.total_spent,
    first_order_at: c.first_order_at,
    last_order_at: c.last_order_at,
    created_at: c.created_at,
    last_promotion_at: promoRes.data?.created_at ?? null,
    addresses: addressesRes.data ?? [],
    orders,
    rewards: rewardsRes.data ?? [],
    loyalty: rule
      ? {
          rule_name: rule.name,
          orders_required: rule.orders_required,
          reward_description: rule.reward_description,
          valid_orders: c.total_orders,
          open_orders: open,
          next_position: nextPosition,
          next_is_reward: nextPosition % rule.orders_required === 0,
        }
      : null,
  };
}
