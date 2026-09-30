"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type RealtimeStatus = "connecting" | "live" | "offline";

/**
 * Escuta inserções/alterações na tabela de pedidos (Supabase Realtime,
 * respeitando o RLS) e recarrega os dados da página.
 */
export function useRealtimeOrders(onNewOrder?: (orderNumber: number) => void) {
  const router = useRouter();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onNewOrderRef = useRef(onNewOrder);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    // Agrupa vários eventos seguidos em um único recarregamento
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 300);
    };

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    // O Realtime precisa do token do usuário ANTES de assinar o canal;
    // sem ele a conexão é anônima e o RLS bloqueia os dados dos pedidos.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) void supabase.realtime.setAuth(session.access_token);
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setStatus("offline");
        return;
      }
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel("admin-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
          if (payload.eventType === "INSERT") {
            const number = (payload.new as { order_number?: number }).order_number;
            if (number) onNewOrderRef.current?.(number);
          }
          scheduleRefresh();
        })
        .subscribe((state) => {
          if (state === "SUBSCRIBED") setStatus("live");
          else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
            setStatus("offline");
          }
        });
    })();

    // Rede de segurança: recarrega a cada 60s mesmo sem eventos
    const fallback = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      clearInterval(fallback);
      authListener.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return status;
}
