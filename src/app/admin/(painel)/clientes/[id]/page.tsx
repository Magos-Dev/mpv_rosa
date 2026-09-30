import { ArrowLeft, Gift, MapPin, MessageCircle, ShieldCheck, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerNotes, RevokeConsentButton } from "@/components/customers/customer-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomer } from "@/lib/customers/queries";
import { PromotionMessage } from "@/components/whatsapp/promotion-message";
import { firstName } from "@/lib/format";
import { getMessageContext } from "@/lib/whatsapp/context";
import { renderTemplate } from "@/lib/whatsapp/templates";
import { formatBRL } from "@/lib/format";
import { isFinal, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/orders/labels";
import { formatPhone } from "@/lib/orders/schemas";

export const metadata: Metadata = { title: "Cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const REWARD_LABELS = { available: "Disponível", redeemed: "Entregue", expired: "Expirado" } as const;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function CustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [c, messageContext] = await Promise.all([getCustomer(id), getMessageContext()]);
  if (!c) notFound();

  const ticket = c.total_orders > 0 ? c.total_spent / c.total_orders : 0;
  const lastOrder = c.orders[0]?.created_at ?? null;
  const availableRewards = c.rewards.filter((r) => r.status === "available");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/admin/clientes">
          <ArrowLeft aria-hidden />
          Clientes
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatPhone(c.phone)}
            {c.email && ` · ${c.email}`} · cliente desde {date.format(new Date(c.created_at))}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`https://wa.me/55${c.phone}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden />
            WhatsApp
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pedidos concluídos" value={c.total_orders} />
        <Stat label="Total gasto" value={formatBRL(c.total_spent)} />
        <Stat label="Ticket médio" value={formatBRL(ticket)} />
        <Stat label="Último pedido" value={lastOrder ? date.format(new Date(lastOrder)) : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {c.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido.</p>
              ) : (
                <ul className="flex flex-col divide-y text-sm">
                  {c.orders.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/admin/pedidos/${o.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40"
                      >
                        <span>
                          <span className="font-medium">#{o.order_number}</span>
                          <span className="ml-2 text-muted-foreground">
                            {dateTime.format(new Date(o.created_at))} · {ORDER_TYPE_LABELS[o.order_type]}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge
                            variant={
                              o.status === "cancelled" || o.status === "refused"
                                ? "destructive"
                                : isFinal(o.status)
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {ORDER_STATUS_LABELS[o.status]}
                          </Badge>
                          <span className="w-20 text-right tabular-nums">{formatBRL(o.total)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerNotes customerId={c.id} initial={c.notes} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="size-4" aria-hidden />
                Fidelidade
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {c.loyalty ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Pedidos válidos</dt>
                  <dd className="font-medium">
                    {c.loyalty.valid_orders}
                    {c.loyalty.open_orders > 0 && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        (+{c.loyalty.open_orders} em andamento)
                      </span>
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Próximo pedido</dt>
                  <dd className="font-medium">{c.loyalty.next_position}º</dd>
                  <dt className="text-muted-foreground">Benefício</dt>
                  <dd className="font-medium">
                    {c.loyalty.reward_description} (a cada {c.loyalty.orders_required})
                  </dd>
                </dl>
              ) : (
                <p className="text-muted-foreground">Nenhuma regra de fidelidade ativa.</p>
              )}
              {c.loyalty?.next_is_reward && (
                <p className="rounded-lg bg-amber-50 p-2 font-medium text-amber-900">
                  🎁 O próximo pedido ganha o brinde.
                </p>
              )}
              {availableRewards.length > 0 && (
                <p className="rounded-lg bg-amber-50 p-2 font-medium text-amber-900">
                  🎁 CLIENTE ELEGÍVEL PARA BRINDE: {availableRewards.length === 1 ? "1 brinde disponível" : `${availableRewards.length} brindes disponíveis`}
                </p>
              )}
              {c.rewards.length > 0 && (
                <ul className="flex flex-col gap-1 border-t pt-2">
                  {c.rewards.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2 text-xs">
                      <span>
                        {r.reward_description} · {date.format(new Date(r.created_at))}
                      </span>
                      <span className="text-muted-foreground">{REWARD_LABELS[r.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {c.marketing_opt_in ? (
                  <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
                ) : (
                  <ShieldOff className="size-4 text-muted-foreground" aria-hidden />
                )}
                Marketing (LGPD)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {c.marketing_opt_in ? (
                <>
                  <p>
                    Aceitou receber promoções em{" "}
                    {c.marketing_opt_in_at ? dateTime.format(new Date(c.marketing_opt_in_at)) : "—"}.
                  </p>
                  <PromotionMessage
                    customerId={c.id}
                    phone={c.phone}
                    lastSentAt={c.last_promotion_at}
                    initialText={renderTemplate(messageContext.templates.promotion, {
                      nome: firstName(c.name),
                      loja: messageContext.storeName,
                      cardapio: `${messageContext.siteUrl}/cardapio`,
                      endereco_loja: messageContext.storeAddress,
                    })}
                  />
                  <RevokeConsentButton customerId={c.id} />
                </>
              ) : (
                <p className="text-muted-foreground">
                  Sem consentimento para promoções.
                  {c.marketing_opt_out_at &&
                    ` Revogado em ${dateTime.format(new Date(c.marketing_opt_out_at))}.`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4" aria-hidden />
                Endereços
              </CardTitle>
            </CardHeader>
            <CardContent>
              {c.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Somente retiradas no local.</p>
              ) : (
                <ul className="flex flex-col gap-3 text-sm">
                  {c.addresses.map((a) => (
                    <li key={a.id}>
                      <p>
                        {a.street}, {a.number}
                        {a.complement && ` — ${a.complement}`}
                        {a.is_default && (
                          <Badge variant="outline" className="ml-2">
                            Padrão
                          </Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {a.neighborhood} · {a.city}
                        {a.state && `/${a.state}`}
                      </p>
                      {a.reference && <p className="text-xs text-muted-foreground">Ref.: {a.reference}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
