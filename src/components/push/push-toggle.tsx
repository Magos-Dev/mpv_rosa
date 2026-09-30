"use client";

import { Bell, BellOff, BellRing, Loader2, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deletePushSubscription, savePushSubscription } from "@/lib/push/actions";
import { cn } from "@/lib/utils";

// Ativar/desativar notificações neste aparelho (Etapa 7E).

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function PushToggle({ audience, className }: { audience: "loja" | "entregador"; className?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!vapidKey || !("serviceWorker" in navigator)) next = "unsupported";
      else if (!("PushManager" in window)) next = isIos() && !isStandalone() ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        next = sub && Notification.permission === "granted" ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(vapidKey) }));
      const result = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setState("on");
      toast.success(
        audience === "loja"
          ? "Notificações ativadas: você será avisado de novos pedidos."
          : "Notificações ativadas: você será avisado de novas entregas.",
      );
    } catch (error) {
      console.error("[push] ativar:", error);
      toast.error("Não foi possível ativar as notificações neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Notificações desativadas neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "ios-install") {
    return (
      <p className={cn("flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground", className)}>
        <Share className="mt-0.5 size-4 shrink-0" aria-hidden />
        No iPhone, para receber notificações: toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra pelo
        ícone e ative aqui.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <BellOff className="size-4" aria-hidden />
        Notificações bloqueadas neste navegador. Libere nas configurações do site para ativar.
      </p>
    );
  }

  return state === "on" ? (
    <Button variant="outline" size="sm" className={className} disabled={busy} onClick={() => void disable()} aria-pressed>
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing aria-hidden />}
      Notificações ativadas
    </Button>
  ) : (
    <Button variant="outline" size="sm" className={className} disabled={busy} onClick={() => void enable()} aria-pressed={false}>
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Bell aria-hidden />}
      Ativar notificações
    </Button>
  );
}
