"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AdminNav } from "@/components/layout/admin-nav";
import { Brand } from "@/components/layout/brand";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navigationForRole } from "@/config/navigation";
import type { UserRole } from "@/lib/auth/roles";

type AdminShellProps = {
  storeName: string;
  /** O menu é montado aqui (cliente): ícones não podem vir de um Server Component. */
  role: UserRole;
  user: { name: string; email: string; roleLabel: string };
  children: ReactNode;
};

export function AdminShell({ storeName, role, user, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = navigationForRole(role);

  return (
    <div className="flex min-h-dvh w-full bg-muted/30">
      {/* Desktop / tablet */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Brand name={storeName} subtitle="Painel administrativo" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNav sections={sections} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
          {/* Mobile */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-16 justify-center border-b px-4">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">Navegação do painel</SheetDescription>
                <Brand name={storeName} subtitle="Painel administrativo" />
              </SheetHeader>
              <div className="overflow-y-auto px-3 py-4">
                <AdminNav sections={sections} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Brand name={storeName} className="lg:hidden" />

          <div className="ml-auto">
            <UserMenu
              name={user.name}
              email={user.email}
              roleLabel={user.roleLabel}
              signOutRedirect="/admin/login"
            />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
