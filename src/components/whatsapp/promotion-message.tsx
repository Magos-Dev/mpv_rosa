"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { logMessage } from "@/lib/whatsapp/actions";
import { whatsappLink } from "@/lib/whatsapp/templates";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

/** Promoção individual pelo WhatsApp — só para clientes com consentimento (LGPD). */
export function PromotionMessage({
  customerId,
  phone,
  initialText,
  lastSentAt,
}: {
  customerId: string;
  phone: string;
  initialText: string;
  lastSentAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialText);

  function send() {
    window.open(whatsappLink(phone, text), "_blank", "noopener,noreferrer");
    setOpen(false);
    void logMessage({ customerId, template: "promotion" }).then((r) => {
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-700 hover:text-emerald-800">
            <MessageCircle aria-hidden />
            Enviar promoção pelo WhatsApp
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promoção pelo WhatsApp</DialogTitle>
            <DialogDescription>Ajuste o texto se quiser. O WhatsApp abre com a mensagem pronta para você enviar.</DialogDescription>
          </DialogHeader>
          <Textarea rows={7} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} aria-label="Mensagem" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={send} disabled={!text.trim()}>
              <MessageCircle aria-hidden />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {lastSentAt && (
        <span className="text-xs text-muted-foreground">Última promoção enviada em {dateTime.format(new Date(lastSentAt))}</span>
      )}
    </div>
  );
}
