"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import type { NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";

type AdminNavProps = {
  sections: NavSection[];
  onNavigate?: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ sections, onNavigate }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu principal" className="flex flex-col gap-5">
      {sections.map((section, index) => (
        <div key={section.title ?? index} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            const baseClass =
              "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors";

            if (!item.available) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className={cn(baseClass, "cursor-not-allowed text-muted-foreground/60")}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="flex-1">{item.title}</span>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Em breve
                  </Badge>
                </span>
              );
            }

            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  baseClass,
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{item.title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
