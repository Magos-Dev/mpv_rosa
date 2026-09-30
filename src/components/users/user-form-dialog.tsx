"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, type Control } from "react-hook-form";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { createStaffUser, resetStaffPassword, updateStaffUser } from "@/lib/users/actions";
import type { StaffUser } from "@/lib/users/queries";
import {
  passwordResetSchema,
  staffCreateSchema,
  staffUpdateSchema,
  type PasswordResetInput,
  type StaffCreateData,
  type StaffCreateInput,
  type StaffUpdateData,
  type StaffUpdateInput,
} from "@/lib/users/schemas";

const ROLE_HINT = {
  operator: "Pedidos, clientes e entregas. Não vê faturamento nem altera cardápio e configurações.",
  admin: "Acesso total, inclusive cardápio, marketing, configurações e usuários.",
} as const;

function RoleField({
  control,
  error,
  disabled,
  hint,
}: {
  control: Control<StaffCreateInput> | Control<StaffUpdateInput>;
  error?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Controller
      control={control as Control<StaffUpdateInput>}
      name="role"
      render={({ field }) => (
        <Field
          label="Perfil"
          htmlFor="u-role"
          error={error}
          hint={hint ?? (field.value ? ROLE_HINT[field.value] : undefined)}
        >
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id="u-role" className="w-full">
              <SelectValue placeholder="Escolha o perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operator">Operador</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  isSelf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: StaffUser;
  isSelf?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Altere o nome ou o perfil de acesso."
              : "Cria o acesso ao painel. Passe o e-mail e a senha para a pessoa; ela pode trocar a senha depois em “Minha senha”."}
          </DialogDescription>
        </DialogHeader>
        {user ? (
          <EditForm user={user} isSelf={Boolean(isSelf)} open={open} onDone={() => onOpenChange(false)} />
        ) : (
          <CreateForm open={open} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { pending, run } = useServerAction();
  const form = useForm<StaffCreateInput, unknown, StaffCreateData>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: { name: "", email: "", role: "operator", password: "" },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <form
      onSubmit={form.handleSubmit(() =>
        run(
          async () => {
            const r = await createStaffUser(form.getValues());
            if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
            return r;
          },
          { success: "Usuário cadastrado.", onSuccess: onDone },
        ),
      )}
      className="flex flex-col gap-4"
      noValidate
    >
      <Field label="Nome" htmlFor="u-name" error={errors.name?.message}>
        <Input id="u-name" {...form.register("name")} />
      </Field>
      <Field label="E-mail de acesso" htmlFor="u-email" error={errors.email?.message}>
        <Input id="u-email" type="email" autoComplete="off" {...form.register("email")} />
      </Field>
      <RoleField control={form.control} error={errors.role?.message} />
      <Field label="Senha inicial" htmlFor="u-pass" error={errors.password?.message} hint="Mínimo de 8 caracteres.">
        <Input id="u-pass" type="text" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Cadastrar
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ user, isSelf, open, onDone }: { user: StaffUser; isSelf: boolean; open: boolean; onDone: () => void }) {
  const { pending, run } = useServerAction();
  const form = useForm<StaffUpdateInput, unknown, StaffUpdateData>({
    resolver: zodResolver(staffUpdateSchema),
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset({ name: user.name, role: user.role });
  }, [open, user, form]);

  return (
    <form
      onSubmit={form.handleSubmit(() =>
        run(
          async () => {
            const r = await updateStaffUser(user.id, form.getValues());
            if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
            return r;
          },
          { success: "Usuário atualizado.", onSuccess: onDone },
        ),
      )}
      className="flex flex-col gap-4"
      noValidate
    >
      <p className="text-sm text-muted-foreground">Acesso: {user.email}</p>
      <Field label="Nome" htmlFor="u-name" error={errors.name?.message}>
        <Input id="u-name" {...form.register("name")} />
      </Field>
      <RoleField
        control={form.control}
        error={errors.role?.message}
        disabled={isSelf}
        hint={isSelf ? "Você não pode alterar o seu próprio perfil." : undefined}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: StaffUser;
}) {
  const { pending, run } = useServerAction();
  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { password: "" },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset({ password: "" });
  }, [open, form]);

  if (!user) return null;
  const done = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Define uma nova senha para {user.name}. Passe a senha para a pessoa; ela pode trocá-la depois em “Minha senha”.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(() =>
            run(
              async () => {
                const r = await resetStaffPassword(user.id, form.getValues());
                if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
                return r;
              },
              { success: "Senha redefinida.", onSuccess: done },
            ),
          )}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field label="Nova senha" htmlFor="u-reset" error={errors.password?.message} hint="Mínimo de 8 caracteres.">
            <Input id="u-reset" type="text" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={done} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Redefinir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
