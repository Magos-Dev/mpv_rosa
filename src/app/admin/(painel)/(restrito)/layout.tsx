import { LOGIN_PATHS } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";

/**
 * Rotas exclusivas do ADMIN (cardápio, motoboys, marketing, configurações,
 * usuários). Toda página criada dentro de (restrito) herda esta proteção;
 * operadores são redirecionados para /admin com aviso.
 */
export default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"], LOGIN_PATHS.staff);
  return children;
}
