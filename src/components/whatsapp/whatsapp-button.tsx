"use client";

import { Check, ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageLog } from "@/lib/orders/admin-queries";
import { cn } from "@/lib/utils";
import { logMessage } from "@/lib/whatsapp/actions";
import { TEMPLATE_LABELS, whatsappLink, type TemplateKey } from "@/lib/whatsapp/templates";

export type MessageOption = { key: TemplateKey; text: string };

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

type Props = {
  phone: string;
  orderId?: string;
  customerId?: string;
  options: MessageOption[];
  sent: MessageLog[];
  /** compact: botão rápido com a mensagem sugerida (Kanban). full: menu com todas. */
  variant?: "compact" | "full";
};

/**
 * Abre o WhatsApp da loja com a mensagem pronta (o atendente envia) e
 * registra o aviso. A janela é aberta no próprio clique para não ser
 * bloqueada pelo navegador.
 */
export function WhatsAppButton({ phone, orderId, customerId, options, sent, variant = "full" }: Props) {
  if (options.length === 0) return null;

  function open(option: MessageOption) {
    window.open(whatsappLink(phone, option.text), "_blank", "noopener,noreferrer");
    void logMessage({ orderId, customerId, template: option.key }).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  const lastSent = (key: TemplateKey) => sent.find((m) => m.template === key);

  if (variant === "compact") {
    const option = options[0];
    const done = lastSent(option.key);
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-8 gap-1.5 text-xs", done ? "border-emerald-300 text-emerald-700" : "border-emerald-500 text-emerald-700")}
        title={done ? `Avisado por ${done.sent_by_name ?? "—"} às ${time.format(new Date(done.created_at))}` : TEMPLATE_LABELS[option.key]}
        onClick={() => open(option)}
      >
        {done ? <Check className="size-3.5" aria-hidden /> : <MessageCircle className="size-3.5" aria-hidden />}
        {done ? "Avisado" : `Avisar: ${TEMPLATE_LABELS[option.key]}`}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="border-emerald-500 text-emerald-700 hover:text-emerald-800">
          <MessageCircle aria-hidden />
          Avisar cliente pelo WhatsApp
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Abre o WhatsApp com o texto pronto — confira e toque em Enviar.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const done = lastSent(option.key);
          return (
            <DropdownMenuItem key={option.key} onSelect={() => open(option)} className="flex items-start gap-2">
              {done ? (
                <Check className="mt-0.5 size-4 text-emerald-600" aria-hidden />
              ) : (
                <MessageCircle className="mt-0.5 size-4" aria-hidden />
              )}
              <span className="flex flex-col">
                <span>{TEMPLATE_LABELS[option.key]}</span>
                {done && (
                  <span className="text-xs text-muted-foreground">
                    avisado por {done.sent_by_name ?? "—"} às {time.format(new Date(done.created_at))}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
