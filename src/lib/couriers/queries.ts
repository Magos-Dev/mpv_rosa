import "server-only";

import type {
  CourierStatus,
  DeliveryStatus,
  PaymentMethod,
} from "@/lib/orders/labels";
import type { AddressSnapshot } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";

function fail(context: string, message: string): never {
  console.error(`[couriers] ${context}:`, message);
  throw new Error(`Não foi possível carregar ${context}.`);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// =====================================================================
// Loja
// =====================================================================

export type CourierListItem = {
  id: string;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  plate: string | null;
  status: CourierStatus;
  active: boolean;
  email: string | null;
  current_order_number: number | null;
};

/** Motoboys cadastrados (tela do Admin). */
export async function listCouriers(): Promise<CourierListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couriers")
    .select("id, name, phone, vehicle_type, plate, status, active, profiles(email), deliveries(status, orders(order_number))")
    .order("active", { ascending: false })
    .order("name");
  if (error) fail("os motoboys", error.message);

  return data.map((c) => {
    const active = (c.deliveries as unknown as { status: DeliveryStatus; orders: { order_number: number } | null }[])
      .find((d) => d.status === "accepted" || d.status === "picked_up");
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      vehicle_type: c.vehicle_type,
      plate: c.plate,
      status: c.status,
      active: c.active,
      email: one(c.profiles as unknown as { email: string } | null)?.email ?? null,
      current_order_number: one(active?.orders)?.order_number ?? null,
    };
  });
}

export type ActiveDelivery = {
  id: string;
  status: DeliveryStatus;
  offered_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  order_id: string;
  order_number: number;
  neighborhood: string | null;
  total: number;
  payment_method: PaymentMethod;
  courier_name: string | null;
};

/** Corridas em andamento (Admin e Operador). */
export async function listActiveDeliveries(): Promise<ActiveDelivery[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, status, offered_at, accepted_at, picked_up_at, order_id, orders(order_number, address_snapshot, total, payment_method), couriers(name)")
    .in("status", ["offered", "accepted", "picked_up"])
    .order("offered_at");
  if (error) fail("as entregas", error.message);

  return data.map((d) => {
    const order = one(d.orders as unknown as {
      order_number: number;
      address_snapshot: AddressSnapshot | null;
      total: number;
      payment_method: PaymentMethod;
    } | null);
    return {
      id: d.id,
      status: d.status,
      offered_at: d.offered_at,
      accepted_at: d.accepted_at,
      picked_up_at: d.picked_up_at,
      order_id: d.order_id,
      order_number: order?.order_number ?? 0,
      neighborhood: order?.address_snapshot?.neighborhood ?? null,
      total: order?.total ?? 0,
      payment_method: order?.payment_method ?? "pix",
      courier_name: one(d.couriers as unknown as { name: string } | null)?.name ?? null,
    };
  });
}

/** Situação dos motoboys ativos (Admin e Operador). */
export async function listCourierStatuses(): Promise<{ id: string; name: string; status: CourierStatus }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couriers")
    .select("id, name, status")
    .eq("active", true)
    .order("name");
  if (error) fail("os motoboys", error.message);
  return data;
}

// =====================================================================
// App do motoboy
// =====================================================================

export type CourierOffer = {
  delivery_id: string;
  order_number: number;
  neighborhood: string | null;
  payment_method: PaymentMethod;
  total: number;
  change_for: number | null;
  offered_at: string;
};

export type CourierCurrent = {
  delivery_id: string;
  delivery_status: "accepted" | "picked_up";
  accepted_at: string;
  picked_up_at: string | null;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  address: AddressSnapshot;
  notes: string | null;
  payment_method: PaymentMethod;
  total: number;
  change_for: number | null;
  amount_to_collect: number;
  items: { name: string; quantity: number }[];
};

export type CourierHome = {
  courier: { name: string; status: CourierStatus };
  current: CourierCurrent | null;
  offers: CourierOffer[];
};

/** null quando o login não tem cadastro de motoboy (ou está desativado). */
export async function getCourierHome(): Promise<CourierHome | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_courier_home");
  if (error?.code === "42501") return null;
  if (error) fail("as entregas", error.message);
  return data as unknown as CourierHome;
}

export type CourierHistoryItem = {
  order_number: number;
  delivered_at: string;
  neighborhood: string | null;
  payment_method: PaymentMethod;
  total: number;
};

export async function getCourierHistory(): Promise<CourierHistoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_courier_history");
  if (error) fail("o histórico", error.message);
  return data as unknown as CourierHistoryItem[];
}
