import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente com service role — IGNORA RLS.
 * Use somente no servidor, para operações administrativas que já tiveram
 * a autorização verificada no código (ex.: criar usuários internos).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
