"use client";

import {
  Banknote,
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Power,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeRefresh } from "@/hooks/use-realtime-orders";
import {
  acceptDelivery,
  completeDelivery,
  pickupDelivery,
  setMyStatus,
} from "@/lib/couriers/courier-actions";
import type { CourierCurrent, CourierHome as HomeData, CourierOffer } from "@/lib/couriers/queries";
import { firstName, formatBRL } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/orders/labels";
import { formatPhone } from "@/lib/orders/schemas";
import { playNewOrderSound, unlockSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Outcome = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<Outcome>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (success) toast.success(success);
      } else {
        toast.error(result.error);
        router.refresh();
      }
    });
  }
  return { pending, run };
}

export function CourierHome({ data }: { data: HomeData }) {
  const { pending, run } = useAction();
  const status = data.courier.status;
  const connection = useRealtimeRefresh({
    channel: "courier-app",
    tables: ["deliveries", "couriers"],
    fallbackSeconds: 15,
  });

  // Alerta quando surge uma nova oferta
  const previousOffers = useRef(data.offers.length);
  useEffect(() => {
    if (data.offers.length > previousOffers.current) {
      playNewOrderSound();
      if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    }
    previousOffers.current = data.offers.length;
  }, [data.offers.length]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Olá, {firstName(data.courier.name)}
        </h1>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
            connection === "live" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
          )}
        >
          {connection === "live" ? <Wifi className="size-3" aria-hidden /> : <WifiOff className="size-3" aria-hidden />}
          {connection === "live" ? "Ao vivo" : "Atualiza a cada 15s"}
        </span>
      </div>

      <section aria-label="Seu status" className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Status</p>
        {status === "busy" ? (
          <div className="flex h-14 items-center justify-center rounded-xl bg-amber-100 text-base font-semibold text-amber-900">
            OCUPADO — em entrega
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              className={cn("h-14 text-base", status !== "available" && "bg-muted text-foreground hover:bg-muted/80")}
              aria-pressed={status === "available"}
              disabled={pending}
              onClick={() => {
                unlockSound();
                // Já selecionado: mantém a cor cheia (não desativa) e ignora o toque
                if (status !== "available") run(() => setMyStatus("available"), "Você está disponível.");
              }}
            >
              <CheckCircle2 aria-hidden />
              DISPONÍVEL
            </Button>
            <Button
              size="lg"
              variant={status === "offline" ? "default" : "outline"}
              className={cn("h-14 text-base", status === "offline" && "bg-foreground text-background hover:bg-foreground/90")}
              aria-pressed={status === "offline"}
              disabled={pending}
              onClick={() => {
                if (status !== "offline") run(() => setMyStatus("offline"), "Você está offline.");
              }}
            >
              <Power aria-hidden />
              OFFLINE
            </Button>
          </div>
        )}
      </section>

      {data.current ? (
        <CurrentDelivery current={data.current} pending={pending} run={run} />
      ) : (
        <section aria-label="Entregas disponíveis" className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Entregas disponíveis
          </p>
          {status !== "available" ? (
            <EmptyState
              icon={Power}
              title="Você está offline"
              description="Toque em DISPONÍVEL para receber entregas."
            />
          ) : data.offers.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma entrega no momento"
              description="Novas entregas aparecem aqui automaticamente."
            />
          ) : (
            data.offers.map((offer) => (
              <OfferCard key={offer.delivery_id} offer={offer} pending={pending} run={run} />
            ))
          )}
        </section>
      )}
    </div>
  );
}

type RunProps = { pending: boolean; run: (a: () => Promise<Outcome>, s?: string) => void };

function OfferCard({ offer, pending, run }: { offer: CourierOffer } & RunProps) {
  return (
    <Card className="gap-3 border-primary/40 py-4">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="font-heading text-lg font-semibold">Pedido #{offer.order_number}</p>
          <p className="font-semibold">{formatBRL(offer.total)}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Bairro</dt>
          <dd className="font-medium">{offer.neighborhood ?? "—"}</dd>
          <dt className="text-muted-foreground">Pagamento</dt>
          <dd>
            {PAYMENT_LABELS[offer.payment_method]}
            {offer.change_for ? ` · troco p/ ${formatBRL(offer.change_for)}` : ""}
          </dd>
        </dl>
        <Button
          size="lg"
          className="h-14 text-base"
          disabled={pending}
          onClick={() => run(() => acceptDelivery(offer.delivery_id), "Entrega aceita!")}
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          ACEITAR ENTREGA
        </Button>
      </CardContent>
    </Card>
  );
}

function CurrentDelivery({ current, pending, run }: { current: CourierCurrent } & RunProps) {
  const a = current.address;
  const line = `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}, ${a.neighborhood}, ${a.city}${a.state ? ` - ${a.state}` : ""}`;
  const query = encodeURIComponent(line);
  const pickedUp = current.delivery_status === "picked_up";

  return (
    <section aria-label="Entrega atual" className="flex flex-col gap-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Entrega atual</p>
      <Card className="gap-4 py-4">
        <CardHeader className="gap-1">
          <CardTitle className="font-heading text-xl">Pedido #{current.order_number}</CardTitle>
          <p className={cn("text-sm font-medium", pickedUp ? "text-primary" : "text-amber-700")}>
            {pickedUp ? "Em rota para o cliente" : "Vá até a loja retirar o pedido"}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{current.customer_name}</p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Endereço</p>
            <p className="font-medium">
              {a.street}, {a.number}
              {a.complement && ` — ${a.complement}`}
            </p>
            <p>
              {a.neighborhood} · {a.city}
            </p>
            {a.reference && <p className="text-sm">Referência: {a.reference}</p>}
          </div>

          {current.notes && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Obs.: {current.notes}</p>
          )}

          <div
            className={cn(
              "flex items-center gap-3 rounded-lg p-3",
              current.amount_to_collect > 0 ? "bg-emerald-50 text-emerald-900" : "bg-muted",
            )}
          >
            <Banknote className="size-6 shrink-0" aria-hidden />
            <p className="text-sm">
              {current.amount_to_collect > 0 ? (
                <>
                  <span className="block text-base font-semibold">
                    Receber {formatBRL(current.amount_to_collect)}
                  </span>
                  {PAYMENT_LABELS[current.payment_method]}
                  {current.change_for ? ` · levar troco para ${formatBRL(current.change_for)}` : ""}
                </>
              ) : (
                <span className="font-medium">Já pago via PIX — nada a receber</span>
              )}
            </p>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Itens ({current.items.reduce((s, i) => s + i.quantity, 0)})
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {current.items.map((item, i) => (
                <li key={i}>
                  {item.quantity}× {item.name}
                </li>
              ))}
            </ul>
          </details>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-12 flex-col gap-0.5 text-xs" asChild>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${query}`} target="_blank" rel="noopener noreferrer">
                <MapPin aria-hidden />
                Maps
              </a>
            </Button>
            <Button variant="outline" className="h-12 flex-col gap-0.5 text-xs" asChild>
              <a href={`https://waze.com/ul?q=${query}&navigate=yes`} target="_blank" rel="noopener noreferrer">
                <Navigation aria-hidden />
                Waze
              </a>
            </Button>
            <Button variant="outline" className="h-12 flex-col gap-0.5 text-xs" asChild>
              <a href={`tel:+55${current.customer_phone}`} aria-label={`Ligar para ${formatPhone(current.customer_phone)}`}>
                <Phone aria-hidden />
                Ligar
              </a>
            </Button>
          </div>

          {!pickedUp ? (
            <Button
              size="lg"
              className="h-14 text-base"
              disabled={pending}
              onClick={() => run(() => pickupDelivery(current.delivery_id), "Pedido retirado. Boa entrega!")}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              PEDIDO RETIRADO
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-14 bg-emerald-600 text-base text-white hover:bg-emerald-700"
              disabled={pending}
              onClick={() => run(() => completeDelivery(current.delivery_id), "Entrega concluída!")}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              ENTREGA CONCLUÍDA
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Algum problema? Ligue para a loja.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
