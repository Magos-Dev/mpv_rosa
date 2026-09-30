"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  ownPasswordSchema,
  passwordResetSchema,
  staffCreateSchema,
  staffUpdateSchema,
  type OwnPasswordInput,
  type PasswordResetInput,
  type StaffCreateInput,
  type StaffUpdateInput,
} from "@/lib/users/schemas";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LAST_ADMIN = "Não é possível remover ou desativar o último administrador ativo.";

// Estas ações usam a service role (a API admin do Auth exige). Por isso a
// verificação de ADMIN vem antes de tudo — igual às ações de motoboys.
async function currentAdmin() {
  const profile = await getCurrentProfile();
  return profile?.active && profile.role === "admin" ? profile : null;
}

function invalid(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false as const, error: "Verifique os campos destacados.", fieldErrors };
}

/** Garante que o alvo é um usuário do painel (motoboys são geridos em Motoboys). */
async function loadStaffTarget(id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, role, active")
    .eq("id", id)
    .in("role", ["admin", "operator"])
    .maybeSingle();
  return data;
}

function revalidate() {
  revalidatePath("/admin/usuarios");
}

export async function createStaffUser(input: StaffCreateInput): Promise<Result> {
  if (!(await currentAdmin())) return DENIED;
  const parsed = staffCreateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const u = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    app_metadata: { role: u.role },
    user_metadata: { name: u.name },
  });

  if (authError || !created.user) {
    const message = authError?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      return { ok: false, error: "Já existe um usuário com este e-mail.", fieldErrors: { email: "E-mail já cadastrado." } };
    }
    if (/password/i.test(message)) {
      return { ok: false, error: "Senha fraca. Use pelo menos 8 caracteres.", fieldErrors: { password: "Senha fraca." } };
    }
    console.error("[users] criar login:", message);
    return { ok: false, error: "Não foi possível criar o usuário." };
  }

  // O Auth grava app_metadata depois do INSERT: define o perfil explicitamente
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: u.role, name: u.name, active: true })
    .eq("id", created.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    console.error("[users] criar perfil:", profileError.message);
    return { ok: false, error: "Não foi possível cadastrar o usuário. Tente novamente." };
  }

  revalidate();
  return { ok: true };
}

export async function updateStaffUser(id: string, input: StaffUpdateInput): Promise<Result> {
  const me = await currentAdmin();
  if (!me) return DENIED;
  const parsed = staffUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const target = await loadStaffTarget(id);
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.id === me.id && parsed.data.role !== "admin") {
    return { ok: false, error: "Você não pode tirar o seu próprio acesso de administrador." };
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ name: parsed.data.name, role: parsed.data.role })
    .eq("id", target.id);
  if (error) {
    if (error.message.includes("último administrador")) return { ok: false, error: LAST_ADMIN };
    console.error("[users] atualizar:", error.message);
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidate();
  return { ok: true };
}

/** Desativado perde o acesso na hora: o painel confere "active" a cada requisição. */
export async function setStaffUserActive(id: string, active: boolean): Promise<Result> {
  const me = await currentAdmin();
  if (!me) return DENIED;
  const target = await loadStaffTarget(id);
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.id === me.id && !active) return { ok: false, error: "Você não pode desativar o seu próprio acesso." };

  const { error } = await createAdminClient().from("profiles").update({ active }).eq("id", target.id);
  if (error) {
    if (error.message.includes("último administrador")) return { ok: false, error: LAST_ADMIN };
    console.error("[users] ativar/desativar:", error.message);
    return { ok: false, error: "Não foi possível atualizar." };
  }

  revalidate();
  return { ok: true };
}

export async function resetStaffPassword(id: string, input: PasswordResetInput): Promise<Result> {
  if (!(await currentAdmin())) return DENIED;
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const target = await loadStaffTarget(id);
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  const { error } = await createAdminClient().auth.admin.updateUserById(target.id, { password: parsed.data.password });
  if (error) {
    console.error("[users] redefinir senha:", error.message);
    return { ok: false, error: "Não foi possível trocar a senha." };
  }
  return { ok: true };
}

/** "Minha senha": qualquer usuário ativo (inclusive motoboy), confirmando a senha atual. */
export async function changeOwnPassword(input: OwnPasswordInput): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me?.active) return DENIED;
  const parsed = ownPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Confere a senha atual num cliente isolado (não mexe nos cookies da sessão)
  const verifier = createSupabaseClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: check, error: checkError } = await verifier.auth.signInWithPassword({
    email: me.email,
    password: parsed.data.current_password,
  });
  if (checkError || check.user?.id !== me.id) {
    if (checkError && /rate|too many/i.test(checkError.message)) {
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    return { ok: false, error: "Senha atual incorreta.", fieldErrors: { current_password: "Senha atual incorreta." } };
  }
  // Encerra só a sessão temporária da verificação
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await createAdminClient().auth.admin.updateUserById(me.id, {
    password: parsed.data.new_password,
  });
  if (error) {
    console.error("[users] minha senha:", error.message);
    return { ok: false, error: "Não foi possível trocar a senha." };
  }

  // Trocar a senha encerra as sessões do usuário (inclusive em outros
  // aparelhos). Abre uma sessão nova aqui para ele continuar usando.
  const supabase = await createServerClient();
  const { error: relogError } = await supabase.auth.signInWithPassword({
    email: me.email,
    password: parsed.data.new_password,
  });
  if (relogError) console.error("[users] nova sessão:", relogError.message);
  return { ok: true };
}
