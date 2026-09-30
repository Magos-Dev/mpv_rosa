import { Download, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { firstParam } from "@/lib/auth/messages";
import { getCurrentProfile } from "@/lib/auth/session";
import { listCustomers, type CustomerSort } from "@/lib/customers/queries";
import { formatBRL } from "@/lib/format";
import { formatPhone } from "@/lib/orders/schemas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clientes" };

const SORTS: { value: CustomerSort; label: string }[] = [
  { value: "recentes", label: "Recentes" },
  { value: "pedidos", label: "Mais pedidos" },
  { value: "gasto", label: "Maior gasto" },
  { value: "nome", label: "Nome" },
];

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  const params = await searchParams;
  const search = firstParam(params.q)?.trim().slice(0, 80) || undefined;
  const rawSort = firstParam(params.ordenar);
  const sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as CustomerSort) : "recentes";
  const [customers, profile] = await Promise.all([listCustomers({ search, sort }), getCurrentProfile()]);

  const sortHref = (value: CustomerSort) => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (value !== "recentes") sp.set("ordenar", value);
    const s = sp.toString();
    return s ? `/admin/clientes?${s}` : "/admin/clientes";
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Base de clientes criada automaticamente a partir dos pedidos."
        actions={
          profile?.role === "admin" && (
            <Button variant="outline" asChild>
              <a href="/admin/clientes/exportar" download>
                <Download aria-hidden />
                Exportar com consentimento (CSV)
              </a>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative flex-1" action="/admin/clientes">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por nome, WhatsApp ou e-mail…"
            aria-label="Buscar cliente"
            className="h-10 pl-9"
          />
          {sort !== "recentes" && <input type="hidden" name="ordenar" value={sort} />}
        </form>
        <nav aria-label="Ordenar" className="flex flex-wrap gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={sortHref(s.value)}
              aria-current={sort === s.value ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                sort === s.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          description={search ? "Tente outra busca." : "Os clientes aparecem aqui quando fazem o primeiro pedido."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="hidden bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase md:table-header-group">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">WhatsApp</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 text-right font-medium">Pedidos</th>
                <th className="px-4 py-2 text-right font-medium">Total gasto</th>
                <th className="px-4 py-2 text-right font-medium">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr key={c.id} className="flex flex-col gap-0.5 p-3 hover:bg-muted/40 md:table-row md:p-0">
                  <td className="md:px-4 md:py-3">
                    <Link href={`/admin/clientes/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground md:px-4 md:py-3 md:text-foreground">{formatPhone(c.phone)}</td>
                  <td className="truncate text-muted-foreground md:max-w-56 md:px-4 md:py-3">{c.email ?? "—"}</td>
                  <td className="md:px-4 md:py-3 md:text-right">
                    <span className="md:hidden">Pedidos: </span>
                    {c.total_orders}
                  </td>
                  <td className="md:px-4 md:py-3 md:text-right">
                    <span className="md:hidden">Total gasto: </span>
                    {formatBRL(c.total_spent)}
                  </td>
                  <td className="text-muted-foreground md:px-4 md:py-3 md:text-right">
                    <span className="md:hidden">Último pedido: </span>
                    {c.last_order_at ? date.format(new Date(c.last_order_at)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        “Pedidos” e “Total gasto” contam apenas pedidos entregues ou retirados.
      </p>
    </div>
  );
}
