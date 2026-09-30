import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { LoginShell } from "@/components/auth/login-shell";
import { firstParam, messageFromQuery } from "@/lib/auth/messages";
import { homePathForRole } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/auth/session";
import { getStoreName } from "@/lib/settings";

export const metadata: Metadata = { title: "Entrar — Painel" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;

  // Já logado e ativo: vai direto para a área do seu perfil
  const profile = await getCurrentProfile();
  if (profile?.active) {
    redirect(homePathForRole(profile.role));
  }

  const storeName = await getStoreName();

  return (
    <LoginShell
      storeName={storeName}
      title="Painel administrativo"
      description="Acesso para administradores e operadores."
    >
      <LoginForm
        area="staff"
        next={firstParam(params.next)}
        notice={messageFromQuery(params.erro)}
      />
    </LoginShell>
  );
}
