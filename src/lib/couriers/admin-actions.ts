"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  courierCreateSchema,
  courierUpdateSchema,
  type CourierCreateInput,
  type CourierUpdateInput,
} from "@/lib/couriers/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DENIED = { ok: false as const, error: "Você não tem permissão para esta ação." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Estas ações usam a service role (criar login exige a API admin do Auth).
// Por isso a verificação de ADMIN aqui é obrigatória e vem antes de tudo.
async function isAdmin() {
  const profile = await getCurrentProfile();
  return Boolean(profile?.active && profile.role === "admin");
}

function invalid(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false as const, error: "Verifique os campos destacados.", fieldErrors };
}

function revalidate() {
  revalidatePath("/admin/motoboys");
  revalidatePath("/admin/entregas");
}

export async function createCourier(input: CourierCreateInput): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const parsed = courierCreateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: c.email,
    password: c.password,
    email_confirm: true,
    app_metadata: { role: "courier" },
    user_metadata: { name: c.name },
  });

  if (authError || !created.user) {
    const message = authError?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      return { ok: false, error: "Já existe um usuário com este e-mail.", fieldErrors: { email: "E-mail já cadastrado." } };
    }
    if (/password/i.test(message)) {
      return { ok: false, error: "Senha fraca. Use pelo menos 8 caracteres.", fieldErrors: { password: "Senha fraca." } };
    }
    console.error("[couriers] criar login:", message);
    return { ok: false, error: "Não foi possível criar o login do motoboy." };
  }

  const userId = created.user.id;
  // O Auth grava app_metadata depois do INSERT: define o perfil explicitamente
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "courier", name: c.name, active: true })
    .eq("id", userId);
  const { error: courierError } = profileError
    ? { error: profileError }
    : await admin.from("couriers").insert({
        user_id: userId,
        name: c.name,
        phone: c.phone,
        vehicle_type: c.vehicle_type,
        plate: c.plate,
        status: "offline",
      });

  if (profileError || courierError) {
    // Desfaz para não deixar login sem cadastro de motoboy
    await admin.auth.admin.deleteUser(userId);
    console.error("[couriers] criar cadastro:", (profileError ?? courierError)?.message);
    return { ok: false, error: "Não foi possível cadastrar o motoboy. Tente novamente." };
  }

  revalidate();
  return { ok: true };
}

export async function updateCourier(id: string, input: CourierUpdateInput): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Motoboy inválido." };
  const parsed = courierUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;

  const admin = createAdminClient();
  const { data: courier, error } = await admin
    .from("couriers")
    .update({ name: c.name, phone: c.phone, vehicle_type: c.vehicle_type, plate: c.plate })
    .eq("id", id)
    .select("user_id")
    .maybeSingle();
  if (error || !courier) {
    console.error("[couriers] atualizar:", error?.message);
    return { ok: false, error: "Não foi possível salvar." };
  }

  await admin.from("profiles").update({ name: c.name }).eq("id", courier.user_id);
  if (c.new_password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(courier.user_id, { password: c.new_password });
    if (pwError) {
      console.error("[couriers] senha:", pwError.message);
      return { ok: false, error: "Dados salvos, mas não foi possível trocar a senha." };
    }
  }

  revalidate();
  return { ok: true };
}

/** Ativa/desativa: desativado não consegue entrar no app. */
export async function setCourierActive(id: string, active: boolean): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Motoboy inválido." };

  const admin = createAdminClient();
  if (!active) {
    const { count } = await admin
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .eq("courier_id", id)
      .in("status", ["accepted", "picked_up"]);
    if (count && count > 0) {
      return { ok: false, error: "Este motoboy está com uma entrega em andamento." };
    }
  }

  const { data: courier, error } = await admin
    .from("couriers")
    .update({ active, ...(active ? {} : { status: "offline" as const }) })
    .eq("id", id)
    .select("user_id")
    .maybeSingle();
  if (error || !courier) return { ok: false, error: "Não foi possível atualizar." };

  await admin.from("profiles").update({ active }).eq("id", courier.user_id);
  revalidate();
  return { ok: true };
}
