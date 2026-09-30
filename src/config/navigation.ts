import {
  BadgePercent,
  Bike,
  ClipboardList,
  Cog,
  Gift,
  LayoutDashboard,
  type LucideIcon,
  Package,
  QrCode,
  Tags,
  Ticket,
  Truck,
  UserCog,
  Users,
} from "lucide-react";

import type { UserRole } from "@/lib/auth/roles";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: readonly UserRole[];
  /** false = módulo de etapa futura: aparece desabilitado com "Em breve". */
  available: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const ALL_STAFF: readonly UserRole[] = ["admin", "operator"];
const ADMIN_ONLY: readonly UserRole[] = ["admin"];

// Menu da seção 18 do briefing. Operador: pedidos, clientes e entregas.
export const ADMIN_NAVIGATION: NavSection[] = [
  {
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ALL_STAFF, available: true },
      { title: "Pedidos", href: "/admin/pedidos", icon: ClipboardList, roles: ALL_STAFF, available: true },
    ],
  },
  {
    title: "Cardápio",
    items: [
      { title: "Categorias", href: "/admin/categorias", icon: Tags, roles: ADMIN_ONLY, available: true },
      // Adicionais são gerenciados dentro de cada produto
      { title: "Produtos", href: "/admin/produtos", icon: Package, roles: ADMIN_ONLY, available: true },
    ],
  },
  {
    title: "Operação",
    items: [
      { title: "Clientes", href: "/admin/clientes", icon: Users, roles: ALL_STAFF, available: true },
      { title: "Entregas", href: "/admin/entregas", icon: Truck, roles: ALL_STAFF, available: true },
      { title: "Motoboys", href: "/admin/motoboys", icon: Bike, roles: ADMIN_ONLY, available: true },
    ],
  },
  {
    title: "Marketing",
    items: [
      { title: "Promoções", href: "/admin/promocoes", icon: BadgePercent, roles: ADMIN_ONLY, available: true },
      { title: "Cupons", href: "/admin/cupons", icon: Ticket, roles: ADMIN_ONLY, available: true },
      { title: "Fidelidade", href: "/admin/fidelidade", icon: Gift, roles: ADMIN_ONLY, available: true },
      { title: "QR Code", href: "/admin/qrcode", icon: QrCode, roles: ADMIN_ONLY, available: true },
    ],
  },
  {
    title: "Sistema",
    items: [
      { title: "Configurações", href: "/admin/configuracoes", icon: Cog, roles: ADMIN_ONLY, available: true },
      { title: "Usuários", href: "/admin/usuarios", icon: UserCog, roles: ADMIN_ONLY, available: false },
    ],
  },
];

export function navigationForRole(role: UserRole): NavSection[] {
  return ADMIN_NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
