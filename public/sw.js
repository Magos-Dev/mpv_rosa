/* Service worker — notificações Web Push (Etapa 7E).
 * Recebe a mensagem enviada pelo servidor e mostra a notificação;
 * ao tocar, abre (ou foca) a página indicada. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const isCourier = typeof data.url === "string" && data.url.startsWith("/entregador");
  event.waitUntil(
    self.registration.showNotification(data.title || "Rosa Rose", {
      body: data.body || "",
      icon: isCourier ? "/icons/entregador-192.png" : "/icons/painel-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      vibrate: [200, 100, 200],
      // Só caminhos internos (nunca abre site externo)
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const same = windows.find((w) => w.url === target);
      if (same) return same.focus();
      const any = windows.find((w) => new URL(w.url).origin === self.location.origin && "navigate" in w);
      if (any) {
        await any.focus();
        return any.navigate(target);
      }
      return self.clients.openWindow(target);
    })(),
  );
});
