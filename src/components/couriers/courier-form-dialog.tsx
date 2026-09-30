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
import { createCourier, updateCourier } from "@/lib/couriers/admin-actions";
import type { CourierListItem } from "@/lib/couriers/queries";
import {
  courierCreateSchema,
  courierUpdateSchema,
  type CourierCreateData,
  type CourierCreateInput,
  type CourierUpdateData,
  type CourierUpdateInput,
} from "@/lib/couriers/schemas";
import { formatPhone } from "@/lib/orders/schemas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courier?: CourierListItem;
};

export function CourierFormDialog({ open, onOpenChange, courier }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{courier ? "Editar motoboy" : "Novo motoboy"}</DialogTitle>
          <DialogDescription>
            {courier
              ? "Altere os dados. Preencha a nova senha só se quiser trocá-la."
              : "Cria o acesso do motoboy ao app de entregas. Passe o e-mail e a senha para ele."}
          </DialogDescription>
        </DialogHeader>
        {courier ? (
          <EditForm courier={courier} open={open} onDone={() => onOpenChange(false)} />
        ) : (
          <CreateForm open={open} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommonFields({
  register,
  errors,
}: {
  register: (name: "name" | "phone" | "vehicle_type" | "plate") => object;
  errors: Partial<Record<string, { message?: string }>>;
}) {
  return (
    <>
      <Field label="Nome" htmlFor="c-name" error={errors.name?.message}>
        <Input id="c-name" {...register("name")} />
      </Field>
      <Field label="Telefone" htmlFor="c-phone" error={errors.phone?.message}>
        <Input id="c-phone" type="tel" placeholder="(11) 98765-4321" {...register("phone")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Veículo" htmlFor="c-vehicle" error={errors.vehicle_type?.message}>
          <Input id="c-vehicle" placeholder="Moto, bicicleta…" {...register("vehicle_type")} />
        </Field>
        <Field label="Placa" htmlFor="c-plate" error={errors.plate?.message}>
          <Input id="c-plate" className="uppercase" {...register("plate")} />
        </Field>
      </div>
    </>
  );
}

function CreateForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { pending, run } = useServerAction();
  const form = useForm<CourierCreateInput, unknown, CourierCreateData>({
    resolver: zodResolver(courierCreateSchema),
    defaultValues: { name: "", phone: "", vehicle_type: "", plate: "", email: "", password: "" },
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
            const r = await createCourier(form.getValues());
            if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
            return r;
          },
          { success: "Motoboy cadastrado.", onSuccess: onDone },
        ),
      )}
      className="flex flex-col gap-4"
      noValidate
    >
      <CommonFields register={(n) => form.register(n)} errors={errors} />
      <Field label="E-mail de acesso" htmlFor="c-email" error={errors.email?.message}>
        <Input id="c-email" type="email" autoComplete="off" {...form.register("email")} />
      </Field>
      <Field label="Senha inicial" htmlFor="c-pass" error={errors.password?.message} hint="Mínimo de 8 caracteres.">
        <Input id="c-pass" type="text" autoComplete="new-password" {...form.register("password")} />
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

function EditForm({ courier, open, onDone }: { courier: CourierListItem; open: boolean; onDone: () => void }) {
  const { pending, run } = useServerAction();
  const form = useForm<CourierUpdateInput, unknown, CourierUpdateData>({
    resolver: zodResolver(courierUpdateSchema),
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) {
      form.reset({
        name: courier.name,
        phone: courier.phone ? formatPhone(courier.phone) : "",
        vehicle_type: courier.vehicle_type ?? "",
        plate: courier.plate ?? "",
        new_password: "",
      });
    }
  }, [open, courier, form]);

  return (
    <form
      onSubmit={form.handleSubmit(() =>
        run(
          async () => {
            const r = await updateCourier(courier.id, form.getValues());
            if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
            return r;
          },
          { success: "Motoboy atualizado.", onSuccess: onDone },
        ),
      )}
      className="flex flex-col gap-4"
      noValidate
    >
      {courier.email && <p className="text-sm text-muted-foreground">Acesso: {courier.email}</p>}
      <CommonFields register={(n) => form.register(n)} errors={errors} />
      <Field label="Nova senha (opcional)" htmlFor="c-newpass" error={errors.new_password?.message}>
        <Input id="c-newpass" type="text" autoComplete="new-password" {...form.register("new_password")} />
      </Field>
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
