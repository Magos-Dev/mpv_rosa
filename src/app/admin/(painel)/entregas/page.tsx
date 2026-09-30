import { Bike, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CourierStatusBadge } from "@/components/couriers/courier-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { OrderLiveRefresh } from "@/components/orders/order-live-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listActiveDeliveries, listCourierStatuses } from "@/lib/couriers/queries";
import { formatBRL } from "@/lib/format";
import { DELIVERY_STATUS_LABELS, PAYMENT_LABELS } from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entregas" };

const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function DeliveriesPage() {
  const [deliveries, couriers] = await Promise.all([listActiveDeliveries(), listCourierStatuses()]);
  const available = couriers.filter((c) => c.status === "available").length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <OrderLiveRefresh />
      <PageHeader
        title="Entregas"
        description="Corridas em andamento e situação dos motoboys. Atualiza automaticamente."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-label="Corridas em andamento" className="flex flex-col gap-3">
          {deliveries.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhuma entrega em andamento"
              description="Chame um motoboy pelo painel de pedidos quando um pedido de entrega ficar pronto."
            />
          ) : (
            deliveries.map((d) => (
              <Link
                key={d.id}
                href={`/admin/pedidos/${d.order_id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 hover:bg-muted/40"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-lg font-semibold">#{d.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.neighborhood ?? "—"} · {formatBRL(d.total)} · {PAYMENT_LABELS[d.payment_method]}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-sm">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      d.status === "offered" ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary",
                    )}
                  >
                    {DELIVERY_STATUS_LABELS[d.status]}
                  </span>
                  <span className="text-muted-foreground">
                    {d.courier_name ?? "Sem motoboy"} · chamado às {time.format(new Date(d.offered_at))}
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bike className="size-4" aria-hidden />
              Motoboys
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {available} {available === 1 ? "disponível" : "disponíveis"}
            </p>
          </CardHeader>
          <CardContent>
            {couriers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum motoboy ativo cadastrado.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {couriers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    <CourierStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
