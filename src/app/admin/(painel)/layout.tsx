import type { Metadata } from "next";

import { AdminShell } from "@/components/layout/admin-shell";
import { LOGIN_PATHS, ROLE_LABELS, STAFF_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { getStoreName } from "@/lib/settings";

export const metadata: Metadata = {
  title: { template: "%s — Painel", default: "Painel" },
};

export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireRole(STAFF_ROLES, LOGIN_PATHS.staff);
  const storeName = await getStoreName();

  return (
    <AdminShell
      storeName={storeName}
      role={profile.role}
      user={{ name: profile.name, email: profile.email, roleLabel: ROLE_LABELS[profile.role] }}
    >
      {children}
    </AdminShell>
  );
}
