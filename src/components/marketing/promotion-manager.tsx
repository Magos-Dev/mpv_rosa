"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BadgePercent, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { deletePromotion, savePromotion, setPromotionActive } from "@/lib/marketing/actions";
import type { Promotion } from "@/lib/marketing/queries";
import { isoToLocal, promotionSchema, type PromotionData, type PromotionInput } from "@/lib/marketing/schemas";
import { cn } from "@/lib/utils";

type Targets = {
  products: { id: string; name: string; active: boolean }[];
  categories: { id: string; name: string; active: boolean }[];
};

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function describe(p: Promotion) {
  if (p.type === "percent") return `${Number(p.value).toLocaleString("pt-BR")}% de desconto`;
  if (p.type === "fixed") return `${formatBRL(p.value)} de desconto`;
  return `por ${formatBRL(p.value)}`;
}

function statusOf(p: Promotion, now: number) {
  if (!p.active) return { label: "Inativa", tone: "bg-muted text-muted-foreground" };
  if (now < new Date(p.starts_at).getTime()) return { label: "Agendada", tone: "bg-sky-100 text-sky-800" };
  if (now > new Date(p.ends_at).getTime()) return { label: "Encerrada", tone: "bg-muted text-muted-foreground" };
  return { label: "Vigente", tone: "bg-emerald-100 text-emerald-800" };
}

export function PromotionManager({ promotions, targets }: { promotions: Promotion[]; targets: Targets }) {
  const { pending, run } = useServerAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | undefined>();
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [now] = useState(() => Date.now());

  const openForm = (p?: Promotion) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Promoções"
        description="Descontos por produto ou categoria, com período e horário opcional. Aplicados automaticamente no cardápio e no pedido."
        actions={
          <Button size="lg" onClick={() => openForm()}>
            <Plus aria-hidden />
            Nova promoção
          </Button>
        }
      />

      {promotions.length === 0 ? (
        <EmptyState
          icon={BadgePercent}
          title="Nenhuma promoção"
          description='Ex.: "20% de desconto em hambúrgueres" ou "X-Bacon por R$ 27,90".'
          action={<Button onClick={() => openForm()}>Nova promoção</Button>}
        />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
          {promotions.map((p) => {
            const st = statusOf(p, now);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.tone)}>{st.label}</span>
                  </div>
                  <p className="text-sm">
                    {p.product_id ? "Produto" : "Categoria"} <strong>{p.target_name ?? "—"}</strong>: {describe(p)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime.format(new Date(p.starts_at))} até {dateTime.format(new Date(p.ends_at))}
                    {p.daily_start && ` · diariamente das ${p.daily_start.slice(0, 5)} às ${p.daily_end?.slice(0, 5)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={p.active}
                    disabled={pending}
                    aria-label={p.active ? "Desativar promoção" : "Ativar promoção"}
                    onCheckedChange={(active) =>
                      run(() => setPromotionActive(p.id, active), {
                        success: active ? "Promoção ativada." : "Promoção desativada.",
                      })
                    }
                  />
                  <Button variant="ghost" size="icon-lg" aria-label="Editar promoção" onClick={() => openForm(p)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Excluir promoção"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Se houver mais de uma promoção para o mesmo produto, vale o menor preço. Adicionais não têm desconto.
      </p>

      <PromotionDialog open={open} onOpenChange={setOpen} promotion={editing} targets={targets} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Pedidos já feitos não mudam (o preço pago fica registrado no pedido).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const id = deleting?.id;
                if (id) run(() => deletePromotion(id), { success: "Promoção excluída." });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function defaultDates() {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
  return { starts_at: isoToLocal(start.toISOString()), ends_at: isoToLocal(end.toISOString()) };
}

function PromotionDialog({
  open,
  onOpenChange,
  promotion,
  targets,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promotion?: Promotion;
  targets: Targets;
}) {
  const { pending, run } = useServerAction();
  const form = useForm<PromotionInput, unknown, PromotionData>({ resolver: zodResolver(promotionSchema) });
  const errors = form.formState.errors;
  const [target, type, hasWindow] = useWatch({ control: form.control, name: ["target", "type", "has_window"] });

  useEffect(() => {
    if (!open) return;
    const p = promotion;
    const dates = defaultDates();
    form.reset({
      name: p?.name ?? "",
      type: p?.type ?? "percent",
      value: p ? toMoneyInput(p.value) : "",
      target: p?.category_id ? "category" : "product",
      product_id: p?.product_id ?? null,
      category_id: p?.category_id ?? null,
      starts_at: p ? isoToLocal(p.starts_at) : dates.starts_at,
      ends_at: p ? isoToLocal(p.ends_at) : dates.ends_at,
      has_window: Boolean(p?.daily_start),
      daily_start: p?.daily_start?.slice(0, 5) ?? "18:00",
      daily_end: p?.daily_end?.slice(0, 5) ?? "20:00",
      active: p?.active ?? true,
    });
  }, [open, promotion, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{promotion ? "Editar promoção" : "Nova promoção"}</DialogTitle>
          <DialogDescription>Vale somente enquanto estiver ativa e dentro do período.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={form.handleSubmit(() =>
            run(
              async () => {
                const r = await savePromotion(promotion?.id ?? null, form.getValues());
                if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
                return r;
              },
              { success: "Promoção salva.", onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <Field label="Nome" htmlFor="p-name" error={errors.name?.message}>
            <Input id="p-name" placeholder="Ex.: Semana do hambúrguer" {...form.register("name")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Aplicar em" error={undefined}>
              <Controller
                control={form.control}
                name="target"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Aplicar em">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Um produto</SelectItem>
                      <SelectItem value="category">Uma categoria</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {target === "product" ? (
              <Field label="Produto" error={errors.product_id?.message}>
                <Controller
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-label="Produto">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {targets.products.filter((p) => p.active).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : (
              <Field label="Categoria" error={errors.category_id?.message}>
                <Controller
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-label="Categoria">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {targets.categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de desconto" error={errors.type?.message}>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-label="Tipo de desconto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$ a menos)</SelectItem>
                      <SelectItem value="promotional_price" disabled={target !== "product"}>
                        Preço promocional (R$)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              label={type === "percent" ? "Percentual" : type === "fixed" ? "Desconto (R$)" : "Novo preço (R$)"}
              htmlFor="p-value"
              error={errors.value?.message}
            >
              <Input id="p-value" inputMode="decimal" placeholder={type === "percent" ? "20" : "27,90"} {...form.register("value")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Início" htmlFor="p-start" error={errors.starts_at?.message}>
              <Input id="p-start" type="datetime-local" {...form.register("starts_at")} />
            </Field>
            <Field label="Fim" htmlFor="p-end" error={errors.ends_at?.message}>
              <Input id="p-end" type="datetime-local" {...form.register("ends_at")} />
            </Field>
          </div>

          <Controller
            control={form.control}
            name="has_window"
            render={({ field }) => (
              <ToggleField label="Somente em um horário" description="Ex.: happy hour das 18h às 20h, todos os dias do período.">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </ToggleField>
            )}
          />
          {hasWindow && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Das" htmlFor="p-ds" error={errors.daily_start?.message}>
                <Input id="p-ds" type="time" {...form.register("daily_start")} />
              </Field>
              <Field label="Até" htmlFor="p-de" error={errors.daily_end?.message}>
                <Input id="p-de" type="time" {...form.register("daily_end")} />
              </Field>
            </div>
          )}

          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <ToggleField label="Ativa">
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
