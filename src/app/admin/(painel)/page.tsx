import { AlertCircle, BarChart3, Store } from "lucide-react";
import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { messageFromQuery } from "@/lib/auth/messages";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/auth/session";
import { firstName } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const [params, profile, settings] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    getStoreSettings(),
  ]);
  const notice = messageFromQuery(params.erro);

  // O layout já garantiu o acesso; profile nunca é nulo aqui.
  if (!profile) return null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {notice && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Olá, {firstName(profile.name)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Você está conectado como {ROLE_LABELS[profile.role].toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="size-4 text-muted-foreground" aria-hidden />
              Estabelecimento
            </CardTitle>
            <CardDescription>Dados atuais das configurações da loja.</CardDescription>
          </CardHeader>
          <CardContent>
            {settings ? (
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Nome</dt>
                  <dd className="truncate font-medium">{settings.store_name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Recebendo pedidos</dt>
                  <dd>
                    {settings.accepting_orders ? (
                      <Badge>Sim</Badge>
                    ) : (
                      <Badge variant="secondary">Não</Badge>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-destructive">
                Não foi possível carregar as configurações da loja.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
              Indicadores
            </CardTitle>
            <CardDescription>Pedidos, faturamento e clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Os indicadores aparecerão aqui quando o módulo de pedidos estiver ativo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
