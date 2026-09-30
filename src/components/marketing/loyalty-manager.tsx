"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, Loader2, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { EmptyState } from "@/components/feedback/empty-state";
import { Field, ToggleField } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { saveLoyaltyRule, setLoyaltyRuleActive } from "@/lib/marketing/actions";
import type { LoyaltyRule } from "@/lib/marketing/queries";
import { loyaltySchema, type LoyaltyData, type LoyaltyInput } from "@/lib/marketing/schemas";

type ProductOption = { id: string; name: string; active: boolean };

export function LoyaltyManager({ rules, products }: { rules: LoyaltyRule[]; products: ProductOption[] }) {
  const { pending, run } = useServerAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyRule | undefined>();

  const openForm = (rule?: LoyaltyRule) => {
    setEditing(rule);
    setOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Fidelidade"
        description="Ex.: a cada 10 pedidos, um brinde. O atendente é avisado no pedido que completa a meta."
        actions={
          <Button size="lg" onClick={() => openForm()}>
            <Plus aria-hidden />
            Nova regra
          </Button>
        }
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhuma regra de fidelidade"
          description="Crie uma regra para premiar os clientes que mais compram."
          action={<Button onClick={() => openForm()}>Nova regra</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{r.name}</p>
                  {r.active ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}
                </div>
                <p className="text-sm">
                  A cada <strong>{r.orders_required}</strong> pedidos: {r.reward_description}
                  {r.product_name && <span className="text-muted-foreground"> ({r.product_name})</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.rewards.available} brinde(s) aguardando · {r.rewards.redeemed} entregue(s)
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={r.active}
                  disabled={pending}
                  aria-label={r.active ? "Desativar regra" : "Ativar regra"}
                  onCheckedChange={(active) =>
                    run(() => setLoyaltyRuleActive(r.id, active), {
                      success: active ? "Regra ativada (as demais foram desativadas)." : "Regra desativada.",
                    })
                  }
                />
                Ativa
              </label>
              <Button variant="ghost" size="icon-lg" aria-label="Editar regra" onClick={() => openForm(r)}>
                <Pencil />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Apenas uma regra fica ativa por vez. Pedidos cancelados ou recusados não contam.
      </p>

      <LoyaltyDialog open={open} onOpenChange={setOpen} rule={editing} products={products} />
    </div>
  );
}

function LoyaltyDialog({
  open,
  onOpenChange,
  rule,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule?: LoyaltyRule;
  products: ProductOption[];
}) {
  const { pending, run } = useServerAction();
  const form = useForm<LoyaltyInput, unknown, LoyaltyData>({ resolver: zodResolver(loyaltySchema) });
  const errors = form.formState.errors;
  const rewardType = useWatch({ control: form.control, name: "reward_type" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: rule?.name ?? "Brinde a cada 10 pedidos",
      orders_required: rule?.orders_required ?? 10,
      reward_type: rule?.reward_type ?? "product",
      reward_product_id: rule?.reward_product_id ?? null,
      reward_description: rule?.reward_description ?? "",
      active: rule?.active ?? true,
    });
  }, [open, rule, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar regra" : "Nova regra de fidelidade"}</DialogTitle>
          <DialogDescription>O brinde é avisado ao atendente; o sistema não aplica automaticamente.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={form.handleSubmit(() =>
            run(
              async () => {
                const r = await saveLoyaltyRule(rule?.id ?? null, form.getValues());
                if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
                return r;
              },
              { success: "Regra salva.", onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <Field label="Nome da regra" htmlFor="l-name" error={errors.name?.message}>
            <Input id="l-name" {...form.register("name")} />
          </Field>
          <Field
            label="Quantidade de pedidos"
            htmlFor="l-count"
            error={errors.orders_required?.message}
            hint="O brinde vai no pedido que completa esse número."
          >
            <Input id="l-count" type="number" min={2} max={100} inputMode="numeric" {...form.register("orders_required")} />
          </Field>
          <Field label="Tipo de recompensa" error={errors.reward_type?.message}>
            <Controller
              control={form.control}
              name="reward_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="Tipo de recompensa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Produto grátis</SelectItem>
                    <SelectItem value="other">Outro brinde</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {rewardType === "product" && (
            <Field label="Produto" error={errors.reward_product_id?.message}>
              <Controller
                control={form.control}
                name="reward_product_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(v) => {
                      field.onChange(v);
                      if (!form.getValues("reward_description")) {
                        const name = products.find((p) => p.id === v)?.name;
                        if (name) form.setValue("reward_description", `${name} grátis`);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label="Produto do brinde">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {!p.active && " (arquivado)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}
          <Field
            label="Descrição do brinde"
            htmlFor="l-desc"
            error={errors.reward_description?.message}
            hint="Aparece no alerta para o atendente. Ex.: Refrigerante grátis"
          >
            <Input id="l-desc" {...form.register("reward_description")} />
          </Field>
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <ToggleField label="Ativa" description="Ativar esta regra desativa as outras.">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </ToggleField>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
