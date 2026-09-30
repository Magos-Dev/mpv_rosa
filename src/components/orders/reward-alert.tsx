"use client";

import { Gift, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { redeemLoyaltyReward } from "@/lib/orders/admin-actions";
import type { OrderReward } from "@/lib/orders/admin-queries";
import { cn } from "@/lib/utils";

/** Alerta de brinde de fidelidade (seção 13) — o atendente entrega e marca. */
export function RewardAlert({
  reward,
  orderId,
  compact = false,
}: {
  reward: OrderReward;
  orderId: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (reward.status === "expired") return null;

  if (reward.status === "redeemed") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Gift className="size-3.5" aria-hidden />
        Brinde entregue{reward.redeemed_by_name ? ` por ${reward.redeemed_by_name}` : ""}: {reward.reward_description}
      </p>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900",
        compact ? "p-2 text-xs" : "p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <p className="flex items-start gap-1.5">
        <Gift className={cn("shrink-0", compact ? "mt-px size-3.5" : "size-4")} aria-hidden />
        <span>
          <strong>CLIENTE ELEGÍVEL PARA BRINDE</strong>
          <span className="block">{reward.reward_description}</span>
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await redeemLoyaltyReward(reward.id, orderId);
            if (result.ok) toast.success("Brinde marcado como entregue.");
            else toast.error(result.error);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Brinde entregue
      </Button>
    </div>
  );
}
