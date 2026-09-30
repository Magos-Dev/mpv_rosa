import "server-only";

import { buildPushPayload, type VapidKeys } from "@block65/webcrypto-web-push";

import { createAdminClient } from "@/lib/supabase/admin";

// Envio de notificações Web Push (Etapa 7E). Roda no servidor com a
// service role, DEPOIS de a ação do usuário ter sido autorizada.

export type PushAudience = "staff" | "available_couriers";

export type PushNotice = {
  title: string;
  body: string;
  /** Página aberta ao tocar na notificação. */
  url: string;
  /** Notificações com a mesma tag se substituem (evita pilha repetida). */
  tag: string;
};

function vapidKeys(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return {
    subject: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pedidos.rosaerose.afweb.com.br",
    publicKey,
    privateKey,
  };
}

async function audienceUserIds(audience: PushAudience): Promise<string[]> {
  const admin = createAdminClient();
  if (audience === "staff") {
    const { data } = await admin.from("profiles").select("id").eq("active", true).in("role", ["admin", "operator"]);
    return (data ?? []).map((p) => p.id);
  }
  const { data } = await admin.from("couriers").select("user_id").eq("active", true).eq("status", "available");
  return (data ?? []).map((c) => c.user_id);
}

/**
 * Envia a notificação para todos os aparelhos inscritos do público.
 * Nunca lança erro: falhas são registradas e não afetam a ação principal.
 */
export async function sendPush(audience: PushAudience, notice: PushNotice): Promise<{ sent: number; removed: number }> {
  const vapid = vapidKeys();
  if (!vapid) {
    console.warn("[push] chaves VAPID ausentes: notificações desativadas");
    return { sent: 0, removed: 0 };
  }

  try {
    const userIds = await audienceUserIds(audience);
    if (userIds.length === 0) return { sent: 0, removed: 0 };

    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (!subs?.length) return { sent: 0, removed: 0 };

    let sent = 0;
    const expired: string[] = [];
    await Promise.allSettled(
      subs.map(async (s) => {
        const payload = await buildPushPayload(
          { data: notice, options: { ttl: 600, urgency: "high", topic: notice.tag.slice(0, 32) } },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
          vapid,
        );
        const res = await fetch(s.endpoint, payload);
        if (res.status === 404 || res.status === 410) expired.push(s.id); // aparelho desinscrito
        else if (res.ok) sent++;
        else console.warn("[push] recusado:", res.status, new URL(s.endpoint).host);
      }),
    );

    if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);
    if (sent) {
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", subs.filter((s) => !expired.includes(s.id)).map((s) => s.id));
    }
    return { sent, removed: expired.length };
  } catch (error) {
    console.error("[push] falha no envio:", error instanceof Error ? error.message : error);
    return { sent: 0, removed: 0 };
  }
}
