"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { Field, ToggleField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { toMoneyInput } from "@/lib/format";
import { formatPhone } from "@/lib/orders/schemas";
import { updateSettings } from "@/lib/settings-actions";
import { settingsSchema, type SettingsData, type SettingsInput } from "@/lib/settings-schema";
import type { StoreSettings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const { pending, run } = useServerAction();
  const form = useForm<SettingsInput, unknown, SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      store_name: settings.store_name,
      phone: settings.phone ? formatPhone(settings.phone) : "",
      whatsapp: settings.whatsapp ? formatPhone(settings.whatsapp) : "",
      address: settings.address ?? "",
      minimum_order: toMoneyInput(settings.minimum_order),
      default_delivery_fee: toMoneyInput(settings.default_delivery_fee),
      accepting_orders: settings.accepting_orders,
    },
  });
  const errors = form.formState.errors;

  function onSubmit() {
    run(
      async () => {
        const result = await updateSettings(form.getValues());
        if (!result.ok) applyServerFieldErrors(form.setError, result.fieldErrors);
        return result;
      },
      { success: "Configurações salvas.", onSuccess: () => form.reset(form.getValues()) },
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funcionamento</CardTitle>
          <CardDescription>Controle se o cardápio aceita pedidos agora.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="accepting_orders"
            render={({ field }) => (
              <ToggleField
                label="Loja aberta — recebendo pedidos"
                description="Quando desligado, o cardápio mostra “Fechado” e não aceita pedidos."
              >
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </ToggleField>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Taxa de entrega (R$)"
            htmlFor="fee"
            error={errors.default_delivery_fee?.message}
            hint="Usada enquanto não houver bairros ativos em “Taxas de entrega”. Use 0 para grátis."
          >
            <Input id="fee" inputMode="decimal" {...form.register("default_delivery_fee")} />
          </Field>
          <Field
            label="Pedido mínimo (R$)"
            htmlFor="minimum"
            error={errors.minimum_order?.message}
            hint="Valor mínimo dos produtos. Use 0 para não exigir."
          >
            <Input id="minimum" inputMode="decimal" {...form.register("minimum_order")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estabelecimento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="store-name" error={errors.store_name?.message} className="sm:col-span-2">
            <Input id="store-name" {...form.register("store_name")} />
          </Field>
          <Field
            label="WhatsApp"
            htmlFor="whatsapp"
            error={errors.whatsapp?.message}
            hint="Exibido para o cliente no acompanhamento do pedido."
          >
            <Input id="whatsapp" type="tel" placeholder="(11) 98765-4321" {...form.register("whatsapp")} />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...form.register("phone")} />
          </Field>
          <Field label="Endereço" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
            <Textarea id="address" rows={2} {...form.register("address")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending || !form.formState.isDirty}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
