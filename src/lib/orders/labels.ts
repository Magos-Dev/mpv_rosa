import type { Enums } from "@/types/database";

export type OrderStatus = Enums<"order_status">;
export type OrderType = Enums<"order_type">;
export type PaymentMethod = Enums<"payment_method">;
export type CourierStatus = Enums<"courier_status">;
export type DeliveryStatus = Enums<"delivery_status">;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Novo",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  awaiting_courier: "Aguardando motoboy",
  courier_assigned: "Motoboy a caminho",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  ready_for_pickup: "Pronto para retirada",
  picked_up: "Retirado",
  cancelled: "Cancelado",
  refused: "Recusado",
};

/** Fluxos da seção 8 do briefing (+ "Motoboy a caminho", seção 10). */
export const ORDER_FLOW: Record<OrderType, OrderStatus[]> = {
  delivery: [
    "new",
    "confirmed",
    "preparing",
    "ready",
    "awaiting_courier",
    "courier_assigned",
    "out_for_delivery",
    "delivered",
  ],
  pickup: ["new", "confirmed", "preparing", "ready_for_pickup", "picked_up"],
};

export const FINAL_STATUSES: OrderStatus[] = ["delivered", "picked_up", "cancelled", "refused"];

/**
 * Próximo passo MANUAL (mesmas regras de order_transition_allowed no banco).
 * Os passos com motoboy (chamar, aceitar, retirar, concluir) têm ações próprias.
 */
const MANUAL_NEXT: Record<OrderType, Partial<Record<OrderStatus, { status: OrderStatus; label: string }>>> = {
  delivery: {
    new: { status: "confirmed", label: "Confirmar" },
    confirmed: { status: "preparing", label: "Iniciar preparo" },
    preparing: { status: "ready", label: "Marcar pronto" },
    out_for_delivery: { status: "delivered", label: "Marcar entregue" },
  },
  pickup: {
    new: { status: "confirmed", label: "Confirmar" },
    confirmed: { status: "preparing", label: "Iniciar preparo" },
    preparing: { status: "ready_for_pickup", label: "Marcar pronto" },
    ready_for_pickup: { status: "picked_up", label: "Marcar retirado" },
  },
};

export function nextStep(type: OrderType, status: OrderStatus) {
  return MANUAL_NEXT[type][status] ?? null;
}

export const isFinal = (status: OrderStatus) => FINAL_STATUSES.includes(status);
export const canRefuse = (status: OrderStatus) => status === "new";
export const canCancel = (status: OrderStatus) => !isFinal(status);
/** Pedido de entrega pronto: pode chamar motoboy ou entregar sem o app. */
export const canDispatch = (type: OrderType, status: OrderStatus) => type === "delivery" && status === "ready";
/** Chamada de motoboy ativa (antes da retirada). */
export const hasActiveDispatch = (status: OrderStatus) =>
  status === "awaiting_courier" || status === "courier_assigned";

/** Colunas do painel (seção 9 do briefing). */
export const BOARD_COLUMNS: { id: string; title: string; statuses: OrderStatus[] }[] = [
  { id: "novos", title: "Novos", statuses: ["new"] },
  { id: "preparo", title: "Em preparo", statuses: ["confirmed", "preparing"] },
  { id: "prontos", title: "Prontos", statuses: ["ready", "ready_for_pickup"] },
  { id: "entrega", title: "Entrega", statuses: ["awaiting_courier", "courier_assigned", "out_for_delivery"] },
  { id: "finalizados", title: "Finalizados", statuses: ["delivered", "picked_up", "cancelled", "refused"] },
];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "Entrega",
  pickup: "Retirada no local",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card_on_delivery: "Cartão na entrega",
};

export const COURIER_STATUS_LABELS: Record<CourierStatus, string> = {
  available: "Disponível",
  busy: "Ocupado",
  offline: "Offline",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  offered: "Aguardando aceite",
  accepted: "Motoboy a caminho da loja",
  picked_up: "Em rota",
  delivered: "Entregue",
  cancelled: "Cancelada",
};
