import { ArrowLeft, Bike, ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderLiveRefresh } from "@/components/orders/order-live-refresh";
import { RewardAlert } from "@/components/orders/reward-alert";
import { StatusActions } from "@/components/orders/status-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { getAdminOrder } from "@/lib/orders/admin-queries";
import {
  DELIVERY_STATUS_LABELS,
  isFinal,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_LABELS,
} from "@/lib/orders/labels";
import { formatPhone } from "@/lib/orders/schemas";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const a = order.address;
  const addressLine = a
    ? `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}, ${a.neighborhood}, ${a.city}${a.state ? ` - ${a.state}` : ""}`
    : null;
  const mapsUrl = addressLine
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
    : null;
  const phone = order.customer.phone;
  const cancelled = order.status === "cancelled" || order.status === "refused";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <OrderLiveRefresh />

      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/admin/pedidos">
          <ArrowLeft aria-hidden />
          Pedidos
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Pedido #{order.order_number}</h1>
        <Badge variant={cancelled ? "destructive" : isFinal(order.status) ? "secondary" : "default"}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
        <Badge variant="outline">{ORDER_TYPE_LABELS[order.order_type]}</Badge>
        <span className="text-sm text-muted-foreground">{dateTime.format(new Date(order.created_at))}</span>
      </div>

      {cancelled && order.cancellation_reason && (
        <Alert variant="destructive">
          <AlertDescription>Motivo: {order.cancellation_reason}</AlertDescription>
        </Alert>
      )}

      {order.reward && <RewardAlert reward={order.reward} orderId={order.id} />}

      {!isFinal(order.status) && (
        <StatusActions
          orderId={order.id}
          orderNumber={order.order_number}
          orderType={order.order_type}
          status={order.status}
          delivery={order.delivery}
          variant="full"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-3 first:pt-0">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">
                      <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-sm">{item.quantity}×</span>
                      {item.name}
                    </p>
                    {item.options.map((o) => (
                      <p key={o.id} className="text-sm text-muted-foreground">
                        + {o.name}
                        {o.additional_price > 0 && ` (${formatBRL(o.additional_price)})`}
                      </p>
                    ))}
                    {item.notes && (
                      <p className="text-sm font-medium text-amber-700">Obs.: {item.notes}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm">{formatBRL(item.total)}</span>
                </li>
              ))}
            </ul>
            {order.customer_notes && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-medium">Observação do pedido:</span> {order.customer_notes}
              </p>
            )}
            <dl className="flex flex-col gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatBRL(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Desconto{order.coupon_code ? ` (cupom ${order.coupon_code})` : ""}
                  </dt>
                  <dd>− {formatBRL(order.discount)}</dd>
                </div>
              )}
              {order.order_type === "delivery" && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Taxa de entrega</dt>
                  <dd>
                    {order.delivery_fee > 0
                      ? formatBRL(order.delivery_fee)
                      : order.coupon_code
                        ? `Grátis (cupom ${order.coupon_code})`
                        : "Grátis"}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatBRL(order.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pagamento</dt>
                <dd>
                  {PAYMENT_LABELS[order.payment_method]}
                  {order.change_for && ` · troco para ${formatBRL(order.change_for)}`}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <Link
                  href={`/admin/clientes/${order.customer.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {order.customer.name}
                </Link>
                <p className="text-muted-foreground">{formatPhone(phone)}</p>
                {order.customer.email && <p className="text-muted-foreground">{order.customer.email}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá, ${order.customer.name.split(" ")[0]}! Sobre o seu pedido #${order.order_number}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle aria-hidden />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:+55${phone}`}>
                    <Phone aria-hidden />
                    Ligar
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ORDER_TYPE_LABELS[order.order_type]}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {a ? (
                <>
                  <p>
                    {a.street}, {a.number}
                    {a.complement && ` — ${a.complement}`}
                    <br />
                    {a.neighborhood} · {a.city}
                    {a.state && `/${a.state}`}
                    {a.zip_code && <span className="block text-muted-foreground">CEP {a.zip_code.replace(/(\d{5})(\d{3})/, "$1-$2")}</span>}
                  </p>
                  {a.reference && <p className="text-muted-foreground">Ref.: {a.reference}</p>}
                  {mapsUrl && (
                    <Button variant="outline" size="sm" className="self-start" asChild>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin aria-hidden />
                        Abrir no Maps
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <p>O cliente vai retirar no balcão.</p>
              )}
              {order.source && <p className="text-muted-foreground">Origem: {order.source}</p>}
              <Button variant="ghost" size="sm" className="self-start" asChild>
                <Link href={`/pedido/${order.public_token}`} target="_blank">
                  <ExternalLink aria-hidden />
                  Página do cliente
                </Link>
              </Button>
            </CardContent>
          </Card>

          {order.delivery && order.delivery.status !== "cancelled" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bike className="size-4" aria-hidden />
                  Motoboy
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="font-medium">{order.delivery.courier_name ?? "Aguardando aceite"}</p>
                <p className="text-muted-foreground">{DELIVERY_STATUS_LABELS[order.delivery.status]}</p>
                {order.delivery.courier_phone && (
                  <Button variant="outline" size="sm" className="self-start" asChild>
                    <a href={`tel:+55${order.delivery.courier_phone}`}>
                      <Phone aria-hidden />
                      Ligar para o motoboy
                    </a>
                  </Button>
                )}
                <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <dt>Chamado</dt>
                  <dd>{time.format(new Date(order.delivery.offered_at))}</dd>
                  {order.delivery.accepted_at && (
                    <>
                      <dt>Aceito</dt>
                      <dd>{time.format(new Date(order.delivery.accepted_at))}</dd>
                    </>
                  )}
                  {order.delivery.picked_up_at && (
                    <>
                      <dt>Retirado</dt>
                      <dd>{time.format(new Date(order.delivery.picked_up_at))}</dd>
                    </>
                  )}
                  {order.delivery.delivered_at && (
                    <>
                      <dt>Entregue</dt>
                      <dd>{time.format(new Date(order.delivery.delivered_at))}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 text-sm">
                {order.history.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <time className="w-12 shrink-0 text-muted-foreground" dateTime={h.created_at}>
                      {time.format(new Date(h.created_at))}
                    </time>
                    <div>
                      <p className="font-medium">{ORDER_STATUS_LABELS[h.new_status]}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.changed_by_name ?? "Cliente (pedido criado)"}
                      </p>
                      {h.reason && <p className="text-xs">Motivo: {h.reason}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
