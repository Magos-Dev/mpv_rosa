import { COURIER_STATUS_LABELS, type CourierStatus } from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

const STYLES: Record<CourierStatus, string> = {
  available: "bg-emerald-100 text-emerald-800",
  busy: "bg-amber-100 text-amber-800",
  offline: "bg-muted text-muted-foreground",
};

export function CourierStatusBadge({ status }: { status: CourierStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {COURIER_STATUS_LABELS[status]}
    </span>
  );
}
