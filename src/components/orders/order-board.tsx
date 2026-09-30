"use client";

import { Bell, BellOff, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { OrderCard } from "@/components/orders/order-card";
import { PushToggle } from "@/components/push/push-toggle";
import { Button } from "@/components/ui/button";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import type { BoardOrder } from "@/lib/orders/admin-queries";
import type { MessageContext } from "@/lib/whatsapp/context";
import { BOARD_COLUMNS } from "@/lib/orders/labels";
import { playNewOrderSound, unlockSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUND_KEY = "rosaerose:board-sound:v1";

function readSoundPref() {
  try {
    return window.localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

export function OrderBoard({ orders, messages }: { orders: BoardOrder[]; messages: MessageContext }) {
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const [activeTab, setActiveTab] = useState(BOARD_COLUMNS[0].id);

  // Atualiza o "tempo desde o pedido" a cada 30s
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // A preferência de som só pode ser lida no navegador; o áudio em si
  // precisa de um clique para ser liberado (ver toggleSound).
  useEffect(() => {
    const id = setTimeout(() => setSoundOn(readSoundPref()), 0);
    return () => clearTimeout(id);
  }, []);

  const onNewOrder = useCallback(
    (orderNumber: number) => {
      toast.success(`Novo pedido #${orderNumber}!`, { duration: 8000 });
      if (soundOn) playNewOrderSound();
    },
    [soundOn],
  );
  const connection = useRealtimeOrders(onNewOrder);

  function toggleSound() {
    const next = !soundOn;
    if (next) {
      unlockSound();
      playNewOrderSound();
    }
    setSoundOn(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // ignorado
    }
  }

  const columns = BOARD_COLUMNS.map((column) => {
    const list = orders.filter((o) => column.statuses.includes(o.status));
    // Finalizados: mais recentes primeiro; demais: mais antigos primeiro (fila)
    if (column.id === "finalizados") list.reverse();
    return { ...column, orders: list };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            connection === "live" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
          )}
          role="status"
        >
          {connection === "live" ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
          {connection === "live"
            ? "Tempo real ativo"
            : connection === "connecting"
              ? "Conectando…"
              : "Sem tempo real (atualiza a cada minuto)"}
        </span>
        <Button variant="outline" size="sm" onClick={toggleSound} aria-pressed={soundOn}>
          {soundOn ? <Bell aria-hidden /> : <BellOff aria-hidden />}
          {soundOn ? "Som ligado" : "Som desligado"}
        </Button>
        <PushToggle audience="loja" />
      </div>

      {/* Celular: abas */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 xl:hidden" role="tablist" aria-label="Colunas">
        {columns.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={activeTab === c.id}
            onClick={() => setActiveTab(c.id)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
              activeTab === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-background",
            )}
          >
            {c.title}
            <span className="rounded-full bg-black/10 px-1.5 text-xs">{c.orders.length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {columns.map((column) => (
          <section
            key={column.id}
            aria-labelledby={`col-${column.id}`}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-xl bg-muted/50 p-2 xl:min-h-[60vh]",
              activeTab !== column.id && "hidden xl:flex",
            )}
          >
            <h2 id={`col-${column.id}`} className="flex items-center justify-between px-1 pt-1 text-sm font-semibold">
              {column.title}
              <span className="rounded-full bg-background px-2 py-0.5 text-xs">{column.orders.length}</span>
            </h2>
            {column.orders.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhum pedido</p>
            ) : (
              column.orders.map((order) => <OrderCard key={order.id} order={order} now={now} messages={messages} />)
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
