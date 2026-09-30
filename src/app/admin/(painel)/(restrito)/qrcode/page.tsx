import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { PageHeader } from "@/components/layout/page-header";
import { QRCodeCard } from "@/components/marketing/qr-code-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSourceStats } from "@/lib/marketing/queries";

export const metadata: Metadata = { title: "QR Code" };

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

/** Endereço público do site: NEXT_PUBLIC_SITE_URL ou o domínio da requisição atual. */
async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function QRCodePage() {
  const [baseUrl, stats] = await Promise.all([siteUrl(), getSourceStats()]);
  const total = stats.reduce((s, x) => s + x.orders, 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="QR Code"
        description="Imprima para mesas, balcão, panfletos e embalagens. A origem mostra de onde vêm os pedidos."
      />
      <QRCodeCard baseUrl={baseUrl} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" aria-hidden />
            De onde vêm os pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há pedidos.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {stats.map((s) => (
                <li key={s.source} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{s.source}</span>
                    <span className="tabular-nums">
                      {s.orders} {s.orders === 1 ? "pedido" : "pedidos"}
                      <span className="ml-2 text-xs text-muted-foreground">último em {date.format(new Date(s.last_order_at))}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.orders / total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            “direto” = acessos sem origem (link comum). Pedidos cancelados não entram.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
