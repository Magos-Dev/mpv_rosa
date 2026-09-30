"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type RealtimeStatus = "connecting" | "live" | "offline";

type Options = {
  channel: string;
  tables: string[];
  /** Chamado a cada inserção (antes de recarregar a página). */
  onInsert?: (table: string, row: Record<string, unknown>) => void;
  /** Recarrega periodicamente mesmo sem eventos (rede de segurança). */
  fallbackSeconds?: number;
};

/**
 * Escuta alterações nas tabelas (Supabase Realtime, respeitando o RLS)
 * e recarrega os dados da página.
 */
export function useRealtimeRefresh({ channel: channelName, tables, onInsert, fallbackSeconds = 60 }: Options) {
  const router = useRouter();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onInsertRef = useRef(onInsert);
  const tablesKey = tables.join(",");

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    // Agrupa vários eventos seguidos em um único recarregamento
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 300);
    };

    // O Realtime precisa do token do usuário ANTES de assinar o canal;
    // sem ele a conexão é anônima e o RLS bloqueia os dados.
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

      channel = supabase.channel(channelName);
      for (const table of tablesKey.split(",")) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          if (payload.eventType === "INSERT") {
            onInsertRef.current?.(table, payload.new as Record<string, unknown>);
          }
          scheduleRefresh();
        });
      }
      channel.subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("offline");
        }
      });
    })();

    const fallback = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, fallbackSeconds * 1000);

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      clearInterval(fallback);
      authListener.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router, channelName, tablesKey, fallbackSeconds]);

  return status;
}

/** Painel da loja: pedidos, corridas e motoboys. */
export function useRealtimeOrders(onNewOrder?: (orderNumber: number) => void) {
  return useRealtimeRefresh({
    channel: "admin-orders",
    tables: ["orders", "deliveries", "couriers"],
    onInsert: (table, row) => {
      if (table === "orders" && typeof row.order_number === "number") onNewOrder?.(row.order_number);
    },
  });
}
