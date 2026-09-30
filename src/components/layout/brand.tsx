import { UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandProps = {
  name: string;
  subtitle?: string;
  className?: string;
};

export function Brand({ name, subtitle, className }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <UtensilsCrossed className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-heading text-sm font-semibold">{name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
