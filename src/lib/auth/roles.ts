import type { Enums } from "@/types/database";

export type UserRole = Enums<"user_role">;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  courier: "Motoboy",
};

/** Perfis que acessam o painel administrativo (/admin). */
export const STAFF_ROLES: readonly UserRole[] = ["admin", "operator"];

/** Perfis que acessam o app do entregador (/entregador). */
export const COURIER_ROLES: readonly UserRole[] = ["courier"];

export const LOGIN_PATHS = {
  staff: "/admin/login",
  courier: "/entregador/login",
} as const;

/** Página inicial de cada perfil após o login. */
export function homePathForRole(role: UserRole): string {
  return role === "courier" ? "/entregador" : "/admin";
}

export function loginPathForRole(role: UserRole): string {
  return role === "courier" ? LOGIN_PATHS.courier : LOGIN_PATHS.staff;
}

/**
 * Aceita apenas caminhos relativos internos, evitando open redirect
 * (ex.: "//site-malicioso.com" ou "https://...").
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
