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

// Rótulo do botão que leva ao próximo status (mesmas regras de
// order_transition_allowed no banco)
const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirmar",
  preparing: "Iniciar preparo",
  ready: "Marcar pronto",
  ready_for_pickup: "Marcar pronto",
  awaiting_courier: "Aguardar motoboy",
  out_for_delivery: "Saiu para entrega",
  delivered: "Marcar entregue",
  picked_up: "Marcar retirado",
};

export function nextStep(type: OrderType, status: OrderStatus) {
  const flow = ORDER_FLOW[type];
  const index = flow.indexOf(status);
  if (index < 0 || index === flow.length - 1) return null;
  const next = flow[index + 1];
  return { status: next, label: NEXT_ACTION_LABELS[next] ?? ORDER_STATUS_LABELS[next] };
}

export const isFinal = (status: OrderStatus) => FINAL_STATUSES.includes(status);
export const canRefuse = (status: OrderStatus) => status === "new";
export const canCancel = (status: OrderStatus) => !isFinal(status);

/** Colunas do painel (seção 9 do briefing). */
export const BOARD_COLUMNS: { id: string; title: string; statuses: OrderStatus[] }[] = [
  { id: "novos", title: "Novos", statuses: ["new"] },
  { id: "preparo", title: "Em preparo", statuses: ["confirmed", "preparing"] },
  { id: "prontos", title: "Prontos", statuses: ["ready", "ready_for_pickup"] },
  { id: "entrega", title: "Entrega", statuses: ["awaiting_courier", "out_for_delivery"] },
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
