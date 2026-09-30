import type { Metadata } from "next";

import { Brand } from "@/components/layout/brand";
import { UserMenu } from "@/components/layout/user-menu";
import { COURIER_ROLES, LOGIN_PATHS, ROLE_LABELS } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { getStoreName } from "@/lib/settings";

export const metadata: Metadata = {
  title: { template: "%s — Entregador", default: "Entregador" },
};

export default async function CourierLayout({ children }: LayoutProps<"/entregador">) {
  const profile = await requireRole(COURIER_ROLES, LOGIN_PATHS.courier);
  const storeName = await getStoreName();

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center gap-3 px-4">
          <Brand name={storeName} subtitle="Entregador" />
          <div className="ml-auto">
            <UserMenu
              name={profile.name}
              email={profile.email}
              roleLabel={ROLE_LABELS[profile.role]}
              signOutRedirect={LOGIN_PATHS.courier}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
