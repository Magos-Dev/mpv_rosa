"use server";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

/** Inscreve este aparelho para receber notificações (usuário logado). */
export async function savePushSubscription(input: unknown, userAgent: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile?.active) return { ok: false, error: "Você não tem permissão para esta ação." };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Inscrição de notificação inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: userAgent.slice(0, 300),
  });
  if (error) {
    console.error("[push] inscrever:", error.code, error.message);
    return { ok: false, error: "Não foi possível ativar as notificações." };
  }
  return { ok: true };
}

/** Remove a inscrição deste aparelho (RLS: só a própria). */
export async function deletePushSubscription(endpoint: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile?.active) return { ok: false, error: "Você não tem permissão para esta ação." };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: "Não foi possível desativar as notificações." };
  return { ok: true };
}
