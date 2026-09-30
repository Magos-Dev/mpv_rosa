import "server-only";

import type { OrderStatus, OrderType, PaymentMethod } from "@/lib/orders/labels";
import type { AddressSnapshot } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";

export type BoardOrder = {
  id: string;
  order_number: number;
  status: OrderStatus;
  order_type: OrderType;
  total: number;
  payment_method: PaymentMethod;
  change_for: number | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  neighborhood: string | null;
  item_count: number;
};

type CustomerSnapshot = { name: string; phone: string; email: string | null };

function fail(context: string, message: string): never {
  console.error(`[orders] ${context}:`, message);
  throw new Error(`Não foi possível carregar ${context}.`);
}

/** Início do dia de hoje no fuso de São Paulo, em ISO. */
function startOfTodaySaoPaulo() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${today}T00:00:00-03:00`;
}

/** Pedidos do painel: todos em andamento + finalizados hoje. */
export async function listBoardOrders(): Promise<BoardOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, order_type, total, payment_method, change_for, created_at, updated_at, customer_snapshot, address_snapshot, order_items(quantity)",
    )
    .or(
      `status.not.in.(delivered,picked_up,cancelled,refused),updated_at.gte.${startOfTodaySaoPaulo()}`,
    )
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) fail("os pedidos", error.message);

  return data.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    order_type: o.order_type,
    total: o.total,
    payment_method: o.payment_method,
    change_for: o.change_for,
    created_at: o.created_at,
    updated_at: o.updated_at,
    customer_name: (o.customer_snapshot as CustomerSnapshot).name,
    neighborhood: (o.address_snapshot as AddressSnapshot | null)?.neighborhood ?? null,
    item_count: (o.order_items as { quantity: number }[]).reduce((s, i) => s + i.quantity, 0),
  }));
}

export type AdminOrderDetail = {
  id: string;
  order_number: number;
  status: OrderStatus;
  order_type: OrderType;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  change_for: number | null;
  customer_notes: string | null;
  source: string | null;
  created_at: string;
  cancellation_reason: string | null;
  public_token: string;
  customer: CustomerSnapshot & { id: string };
  address: AddressSnapshot | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
    options: { id: string; group_name: string; name: string; additional_price: number }[];
  }[];
  history: {
    id: string;
    previous_status: OrderStatus | null;
    new_status: OrderStatus;
    changed_by_name: string | null;
    reason: string | null;
    created_at: string;
  }[];
};

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*, order_items(id, product_name_snapshot, quantity, unit_price, total, notes, sort_order,
         order_item_options(id, group_name_snapshot, option_name_snapshot, additional_price)),
       order_status_history(id, previous_status, new_status, changed_by_name, reason, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) fail("o pedido", error.message);
  if (!data) return null;

  const items = data.order_items as {
    id: string;
    product_name_snapshot: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
    sort_order: number;
    order_item_options: {
      id: string;
      group_name_snapshot: string;
      option_name_snapshot: string;
      additional_price: number;
    }[];
  }[];
  const history = data.order_status_history as AdminOrderDetail["history"];

  return {
    id: data.id,
    order_number: data.order_number,
    status: data.status,
    order_type: data.order_type,
    subtotal: data.subtotal,
    discount: data.discount,
    delivery_fee: data.delivery_fee,
    total: data.total,
    payment_method: data.payment_method,
    change_for: data.change_for,
    customer_notes: data.customer_notes,
    source: data.source,
    created_at: data.created_at,
    cancellation_reason: data.cancellation_reason,
    public_token: data.public_token,
    customer: { id: data.customer_id, ...(data.customer_snapshot as CustomerSnapshot) },
    address: data.address_snapshot as AddressSnapshot | null,
    items: [...items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        id: i.id,
        name: i.product_name_snapshot,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total,
        notes: i.notes,
        options: i.order_item_options.map((o) => ({
          id: o.id,
          group_name: o.group_name_snapshot,
          name: o.option_name_snapshot,
          additional_price: o.additional_price,
        })),
      })),
    history: [...history].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export type DashboardStats = {
  orders_today: number;
  orders_month: number;
  in_progress: number;
  deliveries_in_progress: number;
  new_customers_month: number;
  recurring_customers: number;
  /** null para operadores (dados financeiros só para admin) */
  revenue_today: number | null;
  revenue_month: number | null;
  average_ticket_month: number | null;
  top_products: { name: string; quantity: number }[];
  top_customers: { id: string; name: string; total_orders: number; total_spent: number | null }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) fail("os indicadores", error.message);
  return data as unknown as DashboardStats;
}
