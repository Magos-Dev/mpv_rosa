"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { revokeConsent, saveCustomerNotes } from "@/lib/customers/actions";

export function CustomerNotes({ customerId, initial }: { customerId: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== saved;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        rows={3}
        maxLength={1000}
        placeholder="Ex.: prefere sem cebola; portão com interfone quebrado…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Observações internas sobre o cliente"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Visível apenas para a equipe.</span>
        <Button
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveCustomerNotes(customerId, value);
              if (result.ok) {
                setSaved(value);
                toast.success("Observações salvas.");
              } else {
                toast.error(result.error);
              }
            })
          }
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

export function RevokeConsentButton({ customerId }: { customerId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Revogar consentimento
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revogar consentimento de marketing?</AlertDialogTitle>
          <AlertDialogDescription>
            Use quando o cliente pedir para não receber mais promoções. Ele deixa de aparecer na
            exportação. Se quiser voltar a receber, basta marcar a opção num próximo pedido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await revokeConsent(customerId);
                if (result.ok) toast.success("Consentimento revogado.");
                else toast.error(result.error);
              })
            }
          >
            Revogar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
