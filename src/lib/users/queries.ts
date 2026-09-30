import "server-only";

import type { StaffRole } from "@/lib/users/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

/** Usuários do painel (Admin e Operador). Chamar só em páginas restritas ao Admin. */
export async function listStaffUsers(): Promise<StaffUser[]> {
  // RLS: apenas admin lê todos os perfis
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, active, created_at")
    .in("role", ["admin", "operator"])
    .order("active", { ascending: false })
    .order("name");
  if (error) {
    console.error("[users] listar:", error.message);
    throw new Error("Não foi possível carregar os usuários.");
  }
  if (data.length === 0) return [];

  // Último acesso vem do Auth (service role, somente leitura)
  const lastSignIn = new Map<string, string | null>();
  const { data: auth, error: authError } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  if (authError) console.error("[users] último acesso:", authError.message);
  for (const u of auth?.users ?? []) lastSignIn.set(u.id, u.last_sign_in_at ?? null);

  return data.map((p) => ({
    ...p,
    role: p.role as StaffRole,
    last_sign_in_at: lastSignIn.get(p.id) ?? null,
  }));
}
