import { AlertCircle, ArrowRight, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messageFromQuery } from "@/lib/auth/messages";
import { getCurrentProfile } from "@/lib/auth/session";
import { firstName, formatBRL } from "@/lib/format";
import { getDashboardStats } from "@/lib/orders/admin-queries";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const [params, profile, settings, stats] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    getStoreSettings(),
    getDashboardStats(),
  ]);
  const notice = messageFromQuery(params.erro);

  // O layout já garantiu o acesso; profile nunca é nulo aqui.
  if (!profile) return null;
  const isAdmin = profile.role === "admin";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {notice && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Olá, {firstName(profile.name)}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="size-4" aria-hidden />
            {settings?.store_name}
            <Badge variant={settings?.accepting_orders ? "default" : "secondary"}>
              {settings?.accepting_orders ? "Aberta" : "Fechada"}
            </Badge>
            {isAdmin && (
              <Link href="/admin/configuracoes" className="underline-offset-4 hover:underline">
                alterar
              </Link>
            )}
          </div>
        </div>
        <Button size="lg" asChild>
          <Link href="/admin/pedidos">
            Ver pedidos
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pedidos em andamento" value={stats.in_progress} />
        <Stat label="Entregas em andamento" value={stats.deliveries_in_progress} />
        <Stat label="Pedidos hoje" value={stats.orders_today} />
        <Stat label="Pedidos no mês" value={stats.orders_month} />
        {isAdmin && stats.revenue_today !== null && (
          <>
            <Stat label="Faturamento hoje" value={formatBRL(stats.revenue_today)} />
            <Stat label="Faturamento do mês" value={formatBRL(stats.revenue_month ?? 0)} />
            <Stat label="Ticket médio (mês)" value={formatBRL(stats.average_ticket_month ?? 0)} />
          </>
        )}
        <Stat label="Clientes novos (mês)" value={stats.new_customers_month} />
        <Stat
          label="Clientes recorrentes"
          value={stats.recurring_customers}
          hint="2 ou mais pedidos concluídos"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos mais pedidos (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há pedidos neste mês.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {stats.top_products.map((p, i) => (
                  <li key={p.name} className="flex justify-between gap-2">
                    <span>
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="tabular-nums">{p.quantity} un.</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes com mais pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aparecem aqui quando houver pedidos entregues ou retirados.
              </p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {stats.top_customers.map((c, i) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      {c.name}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {c.total_orders} {c.total_orders === 1 ? "pedido" : "pedidos"}
                      {c.total_spent !== null && ` · ${formatBRL(c.total_spent)}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
