"use client";

import { Bike, Clock, Store } from "lucide-react";
import Link from "next/link";

import { StatusActions } from "@/components/orders/status-actions";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import type { BoardOrder } from "@/lib/orders/admin-queries";
import { isFinal, ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function elapsedLabel(minutes: number) {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h}h${String(minutes % 60).padStart(2, "0")}`;
}

export function OrderCard({ order, now }: { order: BoardOrder; now: number }) {
  const final = isFinal(order.status);
  const minutes = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60_000));
  // Alerta visual de atraso: 20 min amarelo, 40 min vermelho
  const tone = final ? "muted" : minutes >= 40 ? "late" : minutes >= 20 ? "warn" : "ok";

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-background p-3 shadow-xs",
        order.status === "new" && "border-primary/60 ring-1 ring-primary/30",
        (order.status === "cancelled" || order.status === "refused") && "opacity-60",
      )}
    >
      <Link href={`/admin/pedidos/${order.id}`} className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading text-lg font-semibold">#{order.order_number}</p>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              tone === "ok" && "bg-muted text-muted-foreground",
              tone === "warn" && "bg-amber-100 text-amber-800",
              tone === "late" && "bg-red-100 text-red-700",
              tone === "muted" && "text-muted-foreground",
            )}
            title="Tempo desde o pedido"
          >
            <Clock className="size-3" aria-hidden />
            {final ? time.format(new Date(order.updated_at)) : elapsedLabel(minutes)}
          </span>
        </div>
        <p className="truncate font-medium">{order.customer_name}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            {order.order_type === "delivery" ? (
              <Bike className="size-3.5" aria-hidden />
            ) : (
              <Store className="size-3.5" aria-hidden />
            )}
            {order.order_type === "delivery" ? (order.neighborhood ?? "Entrega") : "Retirada"}
          </span>
          <span>· {time.format(new Date(order.created_at))}</span>
          <span>
            · {order.item_count} {order.item_count === 1 ? "item" : "itens"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{formatBRL(order.total)}</span>
          <span className="text-xs text-muted-foreground">
            {PAYMENT_LABELS[order.payment_method]}
            {order.change_for ? ` · troco ${formatBRL(order.change_for)}` : ""}
          </span>
        </div>
        {!["new", "delivered", "picked_up"].includes(order.status) && (
          <Badge variant={final ? "secondary" : "outline"} className="self-start">
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        )}
      </Link>

      {!final && (
        <StatusActions
          orderId={order.id}
          orderNumber={order.order_number}
          orderType={order.order_type}
          status={order.status}
          delivery={order.delivery}
        />
      )}
    </article>
  );
}
