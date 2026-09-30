"use client";

import { Loader2, MessageCircle, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { saveTemplates } from "@/lib/whatsapp/actions";
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  TEMPLATE_FIELDS,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  type TemplateKey,
  type Templates,
  type TemplateVars,
} from "@/lib/whatsapp/templates";

const EXAMPLE: TemplateVars = {
  nome: "Marina",
  pedido: "1055",
  total: "R$ 34,90",
  link: "https://pedidos…/pedido/…",
  motoboy: "Carlos",
  motivo: "cliente desistiu",
  brinde: "Refrigerante grátis",
  loja: "Rosa e Rose",
  endereco_loja: "Rua Exemplo, 123",
  cardapio: "https://pedidos…/cardapio",
};

export function WhatsAppTemplatesForm({ initial }: { initial: Templates }) {
  const { pending, run } = useServerAction();
  const [values, setValues] = useState<Templates>(initial);
  const [saved, setSaved] = useState<Templates>(initial);
  const [preview, setPreview] = useState<TemplateKey | null>(null);
  const dirty = TEMPLATE_KEYS.some((k) => values[k] !== saved[k]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4" aria-hidden />
          Mensagens do WhatsApp
        </CardTitle>
        <CardDescription>
          Textos usados nos botões “Avisar cliente”. O atendente abre o WhatsApp com a mensagem pronta e envia.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="rounded-lg bg-muted/60 p-3 text-xs">
          <p className="mb-1 font-medium">Campos disponíveis:</p>
          <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
            {TEMPLATE_FIELDS.map((f) => (
              <li key={f.key}>
                <code className="font-mono">{f.key}</code> <span className="text-muted-foreground">— {f.description}</span>
              </li>
            ))}
          </ul>
        </div>

        {TEMPLATE_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`tpl-${key}`} className="text-sm font-medium">
                {TEMPLATE_LABELS[key]}
              </label>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(preview === key ? null : key)}>
                  {preview === key ? "Ocultar exemplo" : "Ver exemplo"}
                </Button>
                {values[key] !== DEFAULT_TEMPLATES[key] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setValues((v) => ({ ...v, [key]: DEFAULT_TEMPLATES[key] }))}
                  >
                    <RotateCcw aria-hidden />
                    Restaurar padrão
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id={`tpl-${key}`}
              rows={3}
              maxLength={1000}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
            {preview === key && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm whitespace-pre-line text-emerald-950">
                {renderTemplate(values[key], EXAMPLE)}
              </p>
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!dirty || pending}
            onClick={() =>
              run(() => saveTemplates(values), {
                success: "Mensagens salvas.",
                onSuccess: () => setSaved(values),
              })
            }
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar mensagens
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
