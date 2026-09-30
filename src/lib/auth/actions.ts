"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  COURIER_ROLES,
  homePathForRole,
  safeRedirectPath,
  STAFF_ROLES,
  type UserRole,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type LoginArea = "staff" | "courier";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  email?: string;
};

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
  next: z.string().optional(),
});

const AREA_CONFIG: Record<LoginArea, { roles: readonly UserRole[]; home: string }> = {
  staff: { roles: STAFF_ROLES, home: "/admin" },
  courier: { roles: COURIER_ROLES, home: "/entregador" },
};

export async function signIn(
  area: LoginArea,
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  const rawEmail = String(formData.get("email") ?? "");

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "email" || field === "password") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, email: rawEmail };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "E-mail ou senha incorretos.", email };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { error: "Seu acesso está desativado. Fale com o administrador.", email };
  }

  const config = AREA_CONFIG[area];
  if (!config.roles.includes(profile.role)) {
    await supabase.auth.signOut();
    const correctLogin =
      profile.role === "courier" ? "o acesso do entregador" : "o acesso do painel administrativo";
    return { error: `Este usuário não tem acesso a esta área. Use ${correctLogin}.`, email };
  }

  // Só aceita "next" que pertença à área deste login (e não seja o próprio login)
  const target = safeRedirectPath(next, homePathForRole(profile.role));
  const belongsToArea =
    target.startsWith(`${config.home}/`) && !target.startsWith(`${config.home}/login`);
  redirect(belongsToArea ? target : config.home);
}
