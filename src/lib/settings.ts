import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type StoreSettings = Tables<"settings">;

export const DEFAULT_STORE_NAME = "Cardápio Digital";

/** Configurações públicas da loja (linha única). Memoizado por requisição. */
export const getStoreSettings = cache(async (): Promise<StoreSettings | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();

  if (error) {
    console.error("[settings] falha ao carregar configurações:", error.message);
    return null;
  }
  return data;
});

export async function getStoreName(): Promise<string> {
  const settings = await getStoreSettings();
  return settings?.store_name ?? DEFAULT_STORE_NAME;
}
