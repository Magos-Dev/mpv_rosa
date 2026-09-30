"use client";

import { Ban, Loader2, XCircle } from "lucide-react";
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
import { changeOrderStatus } from "@/lib/orders/admin-actions";
import {
  canCancel,
  canRefuse,
  nextStep,
  type OrderStatus,
  type OrderType,
} from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

type StatusActionsProps = {
  orderId: string;
  orderNumber: number;
  orderType: OrderType;
  status: OrderStatus;
  /** "compact" no cartão do painel; "full" na página do pedido. */
  variant?: "compact" | "full";
};

export function StatusActions({
  orderId,
  orderNumber,
  orderType,
  status,
  variant = "compact",
}: StatusActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"cancelled" | "refused" | null>(null);
  const [reason, setReason] = useState("");
  const next = nextStep(orderType, status);

  function change(to: OrderStatus, reasonText?: string) {
    startTransition(async () => {
      const result = await changeOrderStatus({ orderId, to, expected: status, reason: reasonText });
      if (result.ok) {
        setDialog(null);
        setReason("");
        return;
      }
      toast.error(result.error);
      if (result.stale) router.refresh();
    });
  }

  return (
    <>
      <div className={cn("flex gap-2", variant === "full" ? "flex-wrap" : "items-center")}>
        {next && (
          <Button
            size={variant === "full" ? "lg" : "default"}
            className={cn(variant === "compact" ? "h-10 flex-1" : "h-12 px-6 text-base")}
            disabled={pending}
            onClick={() => change(next.status)}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {next.label}
          </Button>
        )}
        {variant === "full" && canRefuse(status) && (
          <Button variant="outline" size="lg" className="h-12" disabled={pending} onClick={() => setDialog("refused")}>
            <Ban aria-hidden />
            Recusar
          </Button>
        )}
        {canCancel(status) && (
          <Button
            variant={variant === "full" ? "outline" : "ghost"}
            size={variant === "full" ? "lg" : "icon-lg"}
            className={cn("text-destructive hover:text-destructive", variant === "full" && "h-12")}
            disabled={pending}
            aria-label={`Cancelar pedido #${orderNumber}`}
            title="Cancelar pedido"
            onClick={() => setDialog("cancelled")}
          >
            <XCircle aria-hidden />
            {variant === "full" && "Cancelar pedido"}
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
