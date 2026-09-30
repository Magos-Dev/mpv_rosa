import type { Enums } from "@/types/database";

export type OrderStatus = Enums<"order_status">;
export type OrderType = Enums<"order_type">;
export type PaymentMethod = Enums<"payment_method">;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Novo",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  awaiting_courier: "Aguardando motoboy",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  ready_for_pickup: "Pronto para retirada",
  picked_up: "Retirado",
  cancelled: "Cancelado",
  refused: "Recusado",
};

/** Fluxos da seção 8 do briefing. */
export const ORDER_FLOW: Record<OrderType, OrderStatus[]> = {
  delivery: ["new", "confirmed", "preparing", "ready", "awaiting_courier", "out_for_delivery", "delivered"],
  pickup: ["new", "confirmed", "preparing", "ready_for_pickup", "picked_up"],
};

export const FINAL_STATUSES: OrderStatus[] = ["delivered", "picked_up", "cancelled", "refused"];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "Entrega",
  pickup: "Retirada no local",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card_on_delivery: "Cartão na entrega",
};
