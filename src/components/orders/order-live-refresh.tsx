"use client";

import { useRealtimeOrders } from "@/hooks/use-realtime-orders";

/** Mantém a página de um pedido atualizada quando outro atendente muda o status. */
export function OrderLiveRefresh() {
  useRealtimeOrders();
  return null;
}
