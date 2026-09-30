"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { EmptyState } from "@/components/feedback/empty-state";
import { Field, ToggleField } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { deleteDeliveryZone, saveDeliveryZone, setDeliveryZoneActive } from "@/lib/delivery-zones/actions";
import type { DeliveryZone } from "@/lib/delivery-zones/queries";
import { deliveryZoneSchema, type DeliveryZoneData, type DeliveryZoneInput } from "@/lib/delivery-zones/schema";
import { formatBRL, toMoneyInput } from "@/lib/format";

export function ZoneManager({ zones, defaultFee }: { zones: DeliveryZone[]; defaultFee: number }) {
  const { pending, run } = useServerAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | undefined>();
  const [deleting, setDeleting] = useState<DeliveryZone | null>(null);
  const activeCount = zones.filter((z) => z.active).length;
  const lastCity = zones[zones.length - 1]?.city ?? "";

  const openForm = (z?: DeliveryZone) => {
    setEditing(z);
    setOpen(true);
  };

  // Agrupa por cidade
  const byCity = zones.reduce<Record<string, DeliveryZone[]>>((acc, z) => {
    (acc[z.city] ??= []).push(z);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Taxas de entrega"
        description="Cadastre os bairros atendidos e a taxa de cada um. Bairros fora da lista não recebem entrega."
        actions={
          <Button size="lg" onClick={() => openForm()}>
            <Plus aria-hidden />
            Novo bairro
          </Button>
        }
      />

      <Alert>
        <MapPinned aria-hidden />
        <AlertDescription>
          {activeCount === 0
            ? `Nenhum bairro ativo: todas as entregas usam a taxa padrão de ${formatBRL(defaultFee)} (Configurações). Ao ativar o primeiro bairro, só os bairros da lista passam a receber entrega.`
            : `${activeCount} ${activeCount === 1 ? "bairro atendido" : "bairros atendidos"}. Endereços em outros bairros são recusados no checkout (o cliente pode retirar no local).`}
        </AlertDescription>
      </Alert>

      {zones.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Nenhum bairro cadastrado"
          description="Ex.: Centro — R$ 5,00 — 30 a 45 min."
          action={<Button onClick={() => openForm()}>Novo bairro</Button>}
        />
      ) : (
        Object.entries(byCity).map(([city, list]) => (
          <section key={city} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{city}</h2>
            <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
              {list.map((z) => (
                <li key={z.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{z.neighborhood}</p>
                      {!z.active && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {z.fee > 0 ? formatBRL(z.fee) : "Entrega grátis"}
                      {z.estimated_time && ` · ${z.estimated_time}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={z.active}
                      disabled={pending}
                      aria-label={z.active ? `Desativar ${z.neighborhood}` : `Ativar ${z.neighborhood}`}
                      onCheckedChange={(active) =>
                        run(() => setDeliveryZoneActive(z.id, active), {
                          success: active ? "Bairro ativado." : "Bairro desativado.",
                        })
                      }
                    />
                    <Button variant="ghost" size="icon-lg" aria-label={`Editar ${z.neighborhood}`} onClick={() => openForm(z)}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Excluir ${z.neighborhood}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(z)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ZoneDialog open={open} onOpenChange={setOpen} zone={editing} defaultCity={lastCity} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.neighborhood}?</AlertDialogTitle>
            <AlertDialogDescription>
              O bairro deixa de receber entregas. Pedidos antigos não mudam (a taxa cobrada fica registrada no pedido).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const id = deleting?.id;
                if (id) run(() => deleteDeliveryZone(id), { success: "Bairro excluído." });
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

function ZoneDialog({
  open,
  onOpenChange,
  zone,
  defaultCity,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zone?: DeliveryZone;
  defaultCity: string;
}) {
  const { pending, run } = useServerAction();
  const form = useForm<DeliveryZoneInput, unknown, DeliveryZoneData>({ resolver: zodResolver(deliveryZoneSchema) });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    form.reset({
      neighborhood: zone?.neighborhood ?? "",
      city: zone?.city ?? defaultCity,
      fee: zone ? toMoneyInput(zone.fee) : "",
      estimated_time: zone?.estimated_time ?? "",
      active: zone?.active ?? true,
    });
  }, [open, zone, defaultCity, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{zone ? `Editar ${zone.neighborhood}` : "Novo bairro"}</DialogTitle>
          <DialogDescription>Use o nome do bairro como aparece no CEP (acentos não importam).</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={form.handleSubmit(() =>
            run(
              async () => {
                const r = await saveDeliveryZone(zone?.id ?? null, form.getValues());
                if (!r.ok) applyServerFieldErrors(form.setError, r.fieldErrors);
                return r;
              },
              { success: "Bairro salvo.", onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bairro" htmlFor="z-hood" error={errors.neighborhood?.message}>
              <Input id="z-hood" placeholder="Centro" {...form.register("neighborhood")} />
            </Field>
            <Field label="Cidade" htmlFor="z-city" error={errors.city?.message}>
              <Input id="z-city" placeholder="São Paulo" {...form.register("city")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Taxa (R$)" htmlFor="z-fee" error={errors.fee?.message} hint="0 = entrega grátis">
              <Input id="z-fee" inputMode="decimal" placeholder="5,00" {...form.register("fee")} />
            </Field>
            <Field label="Tempo estimado" htmlFor="z-time" error={errors.estimated_time?.message} hint="Opcional">
              <Input id="z-time" placeholder="30–45 min" {...form.register("estimated_time")} />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <ToggleField label="Atendido" description="Desligue para parar de entregar temporariamente.">
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
