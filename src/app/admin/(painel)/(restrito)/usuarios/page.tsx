import type { Metadata } from "next";

import { UserManager } from "@/components/users/user-manager";
import { getCurrentProfile } from "@/lib/auth/session";
import { listStaffUsers } from "@/lib/users/queries";

export const metadata: Metadata = { title: "Usuários" };

// O layout (restrito) já exige perfil Admin
export default async function UsersPage() {
  const [users, me] = await Promise.all([listStaffUsers(), getCurrentProfile()]);
  return <UserManager users={users} currentUserId={me?.id ?? ""} />;
}
