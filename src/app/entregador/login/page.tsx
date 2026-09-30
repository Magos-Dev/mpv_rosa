import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { LoginShell } from "@/components/auth/login-shell";
import { firstParam, messageFromQuery } from "@/lib/auth/messages";
import { homePathForRole } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/auth/session";
import { getStoreName } from "@/lib/settings";

export const metadata: Metadata = { title: "Entrar — Entregador" };

export default async function CourierLoginPage({ searchParams }: PageProps<"/entregador/login">) {
  const params = await searchParams;

  const profile = await getCurrentProfile();
  if (profile?.active) {
    redirect(homePathForRole(profile.role));
  }

  const storeName = await getStoreName();

  return (
    <LoginShell
      storeName={storeName}
      title="Área do entregador"
      description="Entre com o acesso fornecido pelo estabelecimento."
    >
      <LoginForm
        area="courier"
        next={firstParam(params.next)}
        notice={messageFromQuery(params.erro)}
      />
    </LoginShell>
  );
}
