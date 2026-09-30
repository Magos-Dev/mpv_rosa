"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { changeOwnPassword } from "@/lib/users/actions";
import { ownPasswordSchema, type OwnPasswordInput } from "@/lib/users/schemas";

const EMPTY: OwnPasswordInput = { current_password: "", new_password: "", confirm_password: "" };

/** "Minha senha": o próprio usuário troca a senha informando a atual. */
export function OwnPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { pending, run } = useServerAction();
  const form = useForm<OwnPasswordInput>({ resolver: zodResolver(ownPasswordSchema), defaultValues: EMPTY });
  const errors = form.formState.errors;
  const done = () => onOpenChange(false);

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Minha senha</DialogTitle>
          <DialogDescription>Para trocar, confirme a sua senha atual.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(() =>
            run(
              async () => {
                const r = await changeOwnPassword(form.getValues());
                if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
                return r;
              },
              { success: "Senha alterada.", onSuccess: done },
            ),
          )}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field label="Senha atual" htmlFor="own-current" error={errors.current_password?.message}>
            <Input id="own-current" type="password" autoComplete="current-password" {...form.register("current_password")} />
          </Field>
          <Field label="Nova senha" htmlFor="own-new" error={errors.new_password?.message} hint="Mínimo de 8 caracteres.">
            <Input id="own-new" type="password" autoComplete="new-password" {...form.register("new_password")} />
          </Field>
          <Field label="Repita a nova senha" htmlFor="own-confirm" error={errors.confirm_password?.message}>
            <Input id="own-confirm" type="password" autoComplete="new-password" {...form.register("confirm_password")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={done} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Trocar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
