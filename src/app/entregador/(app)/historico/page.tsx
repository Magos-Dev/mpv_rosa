import { History } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/feedback/empty-state";
import { getCourierHistory } from "@/lib/couriers/queries";
import { formatBRL } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Histórico" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function CourierHistoryPage() {
  const history = await getCourierHistory();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Histórico</h1>
      {history.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma entrega concluída ainda" />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {history.length} {history.length === 1 ? "entrega concluída" : "entregas concluídas"}
          </p>
          <ul className="flex flex-col divide-y rounded-xl border bg-background">
            {history.map((h) => (
              <li key={h.order_number} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">Pedido #{h.order_number}</p>
                  <p className="text-muted-foreground">
                    {h.neighborhood ?? "—"} · {dateTime.format(new Date(h.delivered_at))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatBRL(h.total)}</p>
                  <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[h.payment_method]}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
