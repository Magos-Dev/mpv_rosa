import { Check, XCircle } from "lucide-react";

import {
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type OrderType,
} from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

type OrderStatusTimelineProps = {
  orderType: OrderType;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
};

const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function OrderStatusTimeline({ orderType, status, history }: OrderStatusTimelineProps) {
  if (status === "cancelled" || status === "refused") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        <XCircle className="size-6 shrink-0" aria-hidden />
        <p className="font-medium">Pedido {ORDER_STATUS_LABELS[status].toLowerCase()}.</p>
      </div>
    );
  }

  const flow = ORDER_FLOW[orderType];
  const currentIndex = flow.indexOf(status);
  const reachedAt = (s: OrderStatus) => history.findLast((h) => h.status === s)?.at;

  return (
    <ol className="flex flex-col" aria-label="Andamento do pedido">
      {flow.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const at = reachedAt(step);
        return (
          <li key={step} className="flex gap-3" aria-current={current ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background",
                  current && "ring-4 ring-primary/20",
                )}
              >
                {done && <Check className="size-4" aria-hidden />}
              </span>
              {index < flow.length - 1 && (
                <span className={cn("w-0.5 flex-1 min-h-6", index < currentIndex ? "bg-primary" : "bg-muted")} />
              )}
            </div>
            <div className="flex flex-1 items-start justify-between gap-2 pb-5">
              <span className={cn("text-sm", current ? "font-semibold" : done ? "" : "text-muted-foreground")}>
                {ORDER_STATUS_LABELS[step]}
              </span>
              {done && at && (
                <time className="text-xs text-muted-foreground" dateTime={at}>
                  {time.format(new Date(at))}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
