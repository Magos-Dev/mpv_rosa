import "server-only";

import { cache } from "react";

import type { DeliveryZoneOption } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/** Bairros atendidos (ativos) para o checkout. Lista vazia = taxa padrão. */
export const listActiveZones = cache(async (): Promise<DeliveryZoneOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, neighborhood, city, fee, estimated_time")
    .eq("active", true)
    .order("city")
    .order("neighborhood");
  if (error) {
    console.error("[zones] listar:", error.message);
    throw new Error("Não foi possível carregar as áreas de entrega.");
  }
  return data;
});

export type DeliveryZone = Tables<"delivery_zones">;

/** Todos os bairros (tela do Admin). */
export async function listAllZones(): Promise<DeliveryZone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("*")
    .order("city")
    .order("neighborhood");
  if (error) {
    console.error("[zones] listar todos:", error.message);
    throw new Error("Não foi possível carregar as áreas de entrega.");
  }
  return data;
}
