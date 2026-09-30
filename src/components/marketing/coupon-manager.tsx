"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { EmptyState } from "@/components/feedback/empty-state";
import { Field, ToggleField } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { formatBRL, toMoneyInput } from "@/lib/format";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/lib/marketing/actions";
import type { Coupon } from "@/lib/marketing/queries";
import { couponSchema, isoToLocal, type CouponData, type CouponInput } from "@/lib/marketing/schemas";
import { cn } from "@/lib/utils";

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function describe(c: Coupon) {
  if (c.type === "percent") return `${Number(c.value).toLocaleString("pt-BR")}% de desconto`;
  if (c.type === "fixed") return `${formatBRL(c.value)} de desconto`;
  return "Entrega grátis";
}

function statusOf(c: Coupon, now: number) {
  if (!c.active) return { label: "Inativo", tone: "bg-muted text-muted-foreground" };
  if (now < new Date(c.starts_at).getTime()) return { label: "Agendado", tone: "bg-sky-100 text-sky-800" };
  if (c.expires_at && now > new Date(c.expires_at).getTime()) return { label: "Expirado", tone: "bg-muted text-muted-foreground" };
  if (c.usage_limit && c.used >= c.usage_limit) return { label: "Esgotado", tone: "bg-amber-100 text-amber-800" };
  return { label: "Válido", tone: "bg-emerald-100 text-emerald-800" };
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const { pending, run } = useServerAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | undefined>();
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [now] = useState(() => Date.now());

  const openForm = (c?: Coupon) => {
    setEditing(c);
    setOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Cupons"
        description="O cliente digita o código no checkout. Validade, pedido mínimo e limites são conferidos no servidor."
        actions={
          <Button size="lg" onClick={() => openForm()}>
            <Plus aria-hidden />
            Novo cupom
          </Button>
        }
      />

      {coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Nenhum cupom"
          description="Ex.: PRIMEIRACOMPRA10 com 10% de desconto, 1 uso por cliente."
          action={<Button onClick={() => openForm()}>Novo cupom</Button>}
        />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
          {coupons.map((c) => {
            const st = statusOf(c, now);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono font-semibold tracking-wide">{c.code}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.tone)}>{st.label}</span>
                  </div>
                  <p className="text-sm">
                    {describe(c)}
                    {c.minimum_order > 0 && ` · mínimo ${formatBRL(c.minimum_order)}`}
                    {c.description && <span className="text-muted-foreground"> · {c.description}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usado {c.used}
                    {c.usage_limit ? `/${c.usage_limit}` : ""} vez(es)
                    {c.usage_per_customer ? ` · ${c.usage_per_customer} por cliente` : ""}
                    {c.expires_at ? ` · válido até ${date.format(new Date(c.expires_at))}` : " · sem validade"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={c.active}
                    disabled={pending}
                    aria-label={c.active ? "Desativar cupom" : "Ativar cupom"}
                    onCheckedChange={(active) =>
                      run(() => setCouponActive(c.id, active), { success: active ? "Cupom ativado." : "Cupom desativado." })
                    }
                  />
                  <Button variant="ghost" size="icon-lg" aria-label="Editar cupom" onClick={() => openForm(c)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Excluir cupom"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(c)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Pedidos cancelados ou recusados não contam no uso dos cupons.</p>

      <CouponDialog open={open} onOpenChange={setOpen} coupon={editing} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o cupom {deleting?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.used > 0
                ? "Este cupom já foi usado e não pode ser excluído. Desative-o para impedir novos usos."
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deleting && deleting.used === 0 && (
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  const id = deleting.id;
                  run(() => deleteCoupon(id), { success: "Cupom excluído." });
                }}
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CouponDialog({ open, onOpenChange, coupon }: { open: boolean; onOpenChange: (v: boolean) => void; coupon?: Coupon }) {
  const { pending, run } = useServerAction();
  const form = useForm<CouponInput, unknown, CouponData>({ resolver: zodResolver(couponSchema) });
  const errors = form.formState.errors;
  const type = useWatch({ control: form.control, name: "type" });

  useEffect(() => {
    if (!open) return;
    const c = coupon;
    form.reset({
      code: c?.code ?? "",
      description: c?.description ?? "",
      type: c?.type ?? "percent",
      value: c && c.type !== "free_delivery" ? toMoneyInput(c.value) : "",
      minimum_order: toMoneyInput(c?.minimum_order ?? 0),
      usage_limit: c?.usage_limit?.toString() ?? "",
      usage_per_customer: c?.usage_per_customer?.toString() ?? "1",
      starts_at: isoToLocal(c?.starts_at ?? new Date().toISOString()),
      expires_at: isoToLocal(c?.expires_at),
      active: c?.active ?? true,
    });
  }, [open, coupon, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{coupon ? `Editar ${coupon.code}` : "Novo cupom"}</DialogTitle>
          <DialogDescription>Deixe os limites vazios para “sem limite”.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={form.handleSubmit(() =>
            run(
              async () => {
                const r = await saveCoupon(coupon?.id ?? null, form.getValues());
                if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
                return r;
              },
              { success: "Cupom salvo.", onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <Field label="Código" htmlFor="c-code" error={errors.code?.message}>
            <Input id="c-code" className="font-mono uppercase" placeholder="PRIMEIRACOMPRA10" {...form.register("code")} />
          </Field>
          <Field label="Descrição (opcional)" htmlFor="c-desc" error={errors.description?.message}>
            <Input id="c-desc" placeholder="Ex.: 10% na primeira compra" {...form.register("description")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo" error={errors.type?.message}>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Tipo de cupom">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      <SelectItem value="free_delivery">Entrega grátis</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {type !== "free_delivery" && (
              <Field label={type === "percent" ? "Percentual" : "Desconto (R$)"} htmlFor="c-value" error={errors.value?.message}>
                <Input id="c-value" inputMode="decimal" placeholder={type === "percent" ? "10" : "5,00"} {...form.register("value")} />
              </Field>
            )}
          </div>
          <Field label="Pedido mínimo (R$)" htmlFor="c-min" error={errors.minimum_order?.message} hint="Use 0 para não exigir.">
            <Input id="c-min" inputMode="decimal" {...form.register("minimum_order")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Limite total de usos" htmlFor="c-limit" error={errors.usage_limit?.message}>
              <Input id="c-limit" type="number" min={1} inputMode="numeric" placeholder="Sem limite" {...form.register("usage_limit")} />
            </Field>
            <Field label="Usos por cliente" htmlFor="c-per" error={errors.usage_per_customer?.message}>
              <Input id="c-per" type="number" min={1} inputMode="numeric" placeholder="Sem limite" {...form.register("usage_per_customer")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Início" htmlFor="c-start" error={errors.starts_at?.message}>
              <Input id="c-start" type="datetime-local" {...form.register("starts_at")} />
            </Field>
            <Field label="Validade (opcional)" htmlFor="c-exp" error={errors.expires_at?.message}>
              <Input id="c-exp" type="datetime-local" {...form.register("expires_at")} />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <ToggleField label="Ativo">
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
