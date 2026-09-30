import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/orders/auto-refresh";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import {
  FINAL_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_LABELS,
} from "@/lib/orders/labels";
import { getOrderByToken } from "@/lib/orders/queries";
import { getStoreSettings } from "@/lib/settings";

// Link privado: não indexar
export const metadata: Metadata = { title: "Acompanhar pedido", robots: { index: false, follow: false } };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function OrderTrackingPage({ params }: PageProps<"/pedido/[token]">) {
  const { token } = await params;
  const [order, settings] = await Promise.all([getOrderByToken(token), getStoreSettings()]);
  if (!order) notFound();

  const final = FINAL_STATUSES.includes(order.status);
  const whatsapp = settings?.whatsapp?.replace(/\D/g, "");
  const address = order.address;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <AutoRefresh seconds={15} enabled={!final} />

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{dateTime.format(new Date(order.created_at))}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Pedido #{order.order_number}
        </h1>
        <p className="text-muted-foreground">
          {order.status === "new"
            ? `Obrigado, ${order.customer_name.split(" ")[0]}! Recebemos seu pedido e em instantes ele será confirmado.`
            : `Status: ${ORDER_STATUS_LABELS[order.status]}`}
        </p>
        {!final && (
          <p className="text-xs text-muted-foreground">Esta página se atualiza automaticamente.</p>
        )}
      </div>

      <Card>
        <CardContent className="pt-0">
          <OrderStatusTimeline orderType={order.order_type} status={order.status} history={order.history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ul className="flex flex-col gap-2">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {item.quantity}× {item.name}
                  {item.options.length > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {item.options.map((o) => o.name).join(", ")}
                    </span>
                  )}
                  {item.notes && (
                    <span className="block text-xs text-muted-foreground italic">“{item.notes}”</span>
                  )}
                </span>
                <span className="shrink-0">{formatBRL(item.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t pt-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatBRL(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Desconto</dt>
                <dd>− {formatBRL(order.discount)}</dd>
              </div>
            )}
            {order.order_type === "delivery" && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Taxa de entrega</dt>
                <dd>{order.delivery_fee > 0 ? formatBRL(order.delivery_fee) : "Grátis"}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatBRL(order.total)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-0 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{ORDER_TYPE_LABELS[order.order_type]}</p>
            {address ? (
              <p>
                {address.street}, {address.number}
                {address.complement && ` — ${address.complement}`}
                <br />
                {address.neighborhood} · {address.city}
                {address.state && `/${address.state}`}
                {address.reference && (
                  <span className="block text-muted-foreground">Ref.: {address.reference}</span>
                )}
              </p>
            ) : (
              <p>Retire no balcão quando estiver pronto.</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Pagamento</p>
            <p>
              {PAYMENT_LABELS[order.payment_method]}
              {order.change_for && ` · troco para ${formatBRL(order.change_for)}`}
            </p>
          </div>
          {order.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Observações</p>
              <p className="whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        {whatsapp && (
          <Button variant="outline" size="lg" asChild>
            <a
              href={`https://wa.me/55${whatsapp}?text=${encodeURIComponent(`Olá! Sobre o pedido #${order.order_number}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden />
              Falar no WhatsApp
            </a>
          </Button>
        )}
        <Button variant="ghost" size="lg" asChild>
          <Link href="/cardapio">Voltar ao cardápio</Link>
        </Button>
      </div>
    </div>
  );
}
