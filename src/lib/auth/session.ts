import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { homePathForRole, type UserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CurrentProfile = Tables<"profiles">;

/**
 * Retorna o perfil do usuário logado, validando o token no servidor do Auth.
 * Memoizado por requisição (layout + página não consultam duas vezes).
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
});

/**
 * Garante que existe um usuário logado, ativo e com um dos perfis permitidos.
 * Use em layouts, páginas, Server Actions e Route Handlers protegidos —
 * o proxy apenas redireciona visitantes sem sessão, não verifica perfil.
 */
export async function requireRole(
  allowed: readonly UserRole[],
  loginPath: string,
): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(loginPath);
  }

  if (!profile.active) {
    redirect(`/auth/signout?next=${encodeURIComponent(`${loginPath}?erro=inativo`)}`);
  }

  if (!allowed.includes(profile.role)) {
    redirect(`${homePathForRole(profile.role)}?erro=sem-permissao`);
  }

  return profile;
}
