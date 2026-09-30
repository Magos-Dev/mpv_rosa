"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { settingsSchema, type SettingsInput } from "@/lib/settings-schema";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateSettings(input: SettingsInput): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile?.active || profile.role !== "admin") {
    return { ok: false, error: "Você não tem permissão para esta ação." };
  }

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .update(parsed.data)
    .not("id", "is", null)
    .select("id");

  if (error || !data?.length) {
    console.error("[settings] update:", error?.message ?? "nenhuma linha atualizada");
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  // Dados da loja aparecem em todo o site
  revalidatePath("/", "layout");
  return { ok: true };
}
