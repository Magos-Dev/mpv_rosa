import Image from "next/image";

import { cn } from "@/lib/utils";

import logo from "../../../public/logo.png";

type BrandProps = {
  name: string;
  subtitle?: string;
  className?: string;
};

export function Brand({ name, subtitle, className }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image src={logo} alt={name} priority className="h-10 w-auto shrink-0" />
      {subtitle && (
        <p className="min-w-0 truncate border-l pl-2.5 text-xs leading-tight text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
