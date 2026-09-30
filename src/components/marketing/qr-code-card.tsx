"use client";

import { Copy, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = [
  { value: "", label: "Sem origem" },
  { value: "mesa01", label: "Mesa 01" },
  { value: "balcao", label: "Balcão" },
  { value: "panfleto", label: "Panfleto" },
  { value: "embalagem", label: "Embalagem" },
  { value: "instagram", label: "Instagram" },
  { value: "ifood", label: "iFood" },
];

function sanitize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}

/** QR Code do cardápio (seção 17), gerado no navegador. */
export function QRCodeCard({ baseUrl }: { baseUrl: string }) {
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const url = useMemo(() => {
    const u = new URL("/cardapio", baseUrl);
    if (source) u.searchParams.set("src", source);
    return u.toString();
  }, [baseUrl, source]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: "M" })
      .then((data) => !cancelled && setPreview(data))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const fileName = `qrcode-cardapio${source ? `-${source}` : ""}`;

  async function downloadPng() {
    // Alta resolução para impressão
    const data = await QRCode.toDataURL(url, { width: 2048, margin: 4, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = data;
    a.download = `${fileName}.png`;
    a.click();
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(url, { type: "svg", margin: 4, errorCorrectionLevel: "M" });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${fileName}.svg`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="size-4" aria-hidden />
          Gerar QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Onde o QR Code será usado?</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setSource(p.value)}
                  aria-pressed={source === p.value}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    source === p.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Origem personalizada"
            htmlFor="qr-src"
            hint="Letras minúsculas, números, - ou _. Ex.: mesa12, evento-sabado"
          >
            <Input id="qr-src" value={source} maxLength={40} onChange={(e) => setSource(sanitize(e.target.value))} />
          </Field>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Endereço</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">{url}</code>
              <Button
                variant="outline"
                size="icon"
                aria-label="Copiar endereço"
                onClick={() => {
                  void navigator.clipboard?.writeText(url);
                  toast.success("Endereço copiado.");
                }}
              >
                <Copy />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void downloadPng()}>
              <Download aria-hidden />
              Baixar PNG
            </Button>
            <Button variant="outline" onClick={() => void downloadSvg()}>
              <Download aria-hidden />
              Baixar SVG (gráfica)
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-xl border bg-white p-3 md:w-64">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL gerada localmente
            <img src={preview} alt={`QR Code para ${url}`} className="size-56" />
          ) : (
            <div className="size-56 animate-pulse rounded bg-muted" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
