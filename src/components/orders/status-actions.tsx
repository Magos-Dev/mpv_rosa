"use client";

import { Ban, Bike, Loader2, Undo2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelDispatch, changeOrderStatus, dispatchDelivery } from "@/lib/orders/admin-actions";
import {
  canCancel,
  canDispatch,
  canRefuse,
  hasActiveDispatch,
  nextStep,
  type DeliveryStatus,
  type OrderStatus,
  type OrderType,
} from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

type StatusActionsProps = {
  orderId: string;
  orderNumber: number;
  orderType: OrderType;
  status: OrderStatus;
  delivery?: { status: DeliveryStatus; courier_name: string | null } | null;
  /** "compact" no cartão do painel; "full" na página do pedido. */
  variant?: "compact" | "full";
};

type Outcome = { ok: true } | { ok: false; error: string; stale?: boolean };

export function StatusActions({
  orderId,
  orderNumber,
  orderType,
  status,
  delivery,
  variant = "compact",
}: StatusActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"cancelled" | "refused" | null>(null);
  const [reason, setReason] = useState("");
  const next = nextStep(orderType, status);
  const full = variant === "full";

  function run(action: () => Promise<Outcome>, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onOk?.();
        return;
      }
      toast.error(result.error);
      if (result.stale) router.refresh();
    });
  }

  const change = (to: OrderStatus, reasonText?: string) =>
    run(
      () => changeOrderStatus({ orderId, to, expected: status, reason: reasonText }),
      () => {
        setDialog(null);
        setReason("");
      },
    );

  function callCourier() {
    startTransition(async () => {
      const result = await dispatchDelivery(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.available_couriers === 0) {
        toast.warning("Nenhum motoboy disponível agora. A corrida fica aguardando alguém aceitar.");
      } else {
        toast.success(`Corrida oferecida a ${result.data.available_couriers} motoboy(s).`);
      }
    });
  }

  const primaryClass = full ? "h-12 px-6 text-base" : "h-10 flex-1";

  return (
    <>
      <div className={cn("flex flex-col gap-2", full && "sm:flex-row sm:flex-wrap sm:items-center")}>
        {hasActiveDispatch(status) && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Bike className="size-4" aria-hidden />
            {delivery?.status === "accepted" && delivery.courier_name
              ? `${delivery.courier_name} a caminho da loja`
              : "Aguardando um motoboy aceitar…"}
          </p>
        )}
        {status === "out_for_delivery" && delivery?.status === "picked_up" && delivery.courier_name && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Bike className="size-4" aria-hidden />
            Em rota com {delivery.courier_name}
          </p>
        )}

        <div className={cn("flex gap-2", full ? "flex-wrap" : "items-center")}>
          {canDispatch(orderType, status) && (
            <Button size={full ? "lg" : "default"} className={primaryClass} disabled={pending} onClick={callCourier}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Bike aria-hidden />}
              Chamar motoboy
            </Button>
          )}
          {next && (
            <Button size={full ? "lg" : "default"} className={primaryClass} disabled={pending} onClick={() => change(next.status)}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {next.label}
            </Button>
          )}
          {hasActiveDispatch(status) && (
            <Button
              variant="outline"
              size={full ? "lg" : "default"}
              className={cn(full ? "h-12" : "h-10 flex-1")}
              disabled={pending}
              onClick={() => run(() => cancelDispatch(orderId), () => toast.success("Chamada cancelada. O pedido voltou para Prontos."))}
            >
              <Undo2 aria-hidden />
              Cancelar chamada
            </Button>
          )}
          {full && canRefuse(status) && (
            <Button variant="outline" size="lg" className="h-12" disabled={pending} onClick={() => setDialog("refused")}>
              <Ban aria-hidden />
              Recusar
            </Button>
          )}
          {canCancel(status) && (
            <Button
              variant={full ? "outline" : "ghost"}
              size={full ? "lg" : "icon-lg"}
              className={cn("text-destructive hover:text-destructive", full && "h-12")}
              disabled={pending}
              aria-label={`Cancelar pedido #${orderNumber}`}
              title="Cancelar pedido"
              onClick={() => setDialog("cancelled")}
            >
              <XCircle aria-hidden />
              {full && "Cancelar pedido"}
            </Button>
          )}
        </div>

        {canDispatch(orderType, status) && (
          <Button
            variant="link"
            size="sm"
            className="h-auto self-start p-0 text-muted-foreground"
            disabled={pending}
            onClick={() => change("out_for_delivery")}
          >
            Entregar sem o app (saiu para entrega)
          </Button>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && !pending && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "refused" ? "Recusar" : "Cancelar"} pedido #{orderNumber}?
            </DialogTitle>
            <DialogDescription>
              Informe o motivo. Ele fica registrado no histórico do pedido.
              {hasActiveDispatch(status) || status === "out_for_delivery"
                ? " A corrida do motoboy também será cancelada."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            rows={3}
            maxLength={300}
            placeholder={dialog === "refused" ? "Ex.: fora da área de entrega" : "Ex.: cliente desistiu"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Motivo"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Voltar
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={pending || reason.trim().length < 3}
              onClick={() => dialog && change(dialog, reason)}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {dialog === "refused" ? "Recusar pedido" : "Cancelar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
