"use client";

import { Bike, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { CourierFormDialog } from "@/components/couriers/courier-form-dialog";
import { CourierStatusBadge } from "@/components/couriers/courier-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { setCourierActive } from "@/lib/couriers/admin-actions";
import type { CourierListItem } from "@/lib/couriers/queries";
import { formatPhone } from "@/lib/orders/schemas";

export function CourierManager({ couriers }: { couriers: CourierListItem[] }) {
  const { pending, run } = useServerAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourierListItem | undefined>();
  useRealtimeOrders(); // status dos motoboys ao vivo

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Motoboys"
        description="Cadastre os entregadores. Cada um recebe um acesso próprio ao app de entregas."
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus aria-hidden />
            Novo motoboy
          </Button>
        }
      />

      {couriers.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="Nenhum motoboy cadastrado"
          description="Cadastre o primeiro para poder chamar entregas pelo app."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Novo motoboy
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
          {couriers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.name}</p>
                  {c.active ? <CourierStatusBadge status={c.status} /> : <Badge variant="secondary">Desativado</Badge>}
                  {c.current_order_number && (
                    <Badge variant="outline">Pedido #{c.current_order_number}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {[c.phone && formatPhone(c.phone), c.vehicle_type, c.plate, c.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={c.active}
                    disabled={pending}
                    aria-label={c.active ? `Desativar ${c.name}` : `Ativar ${c.name}`}
                    onCheckedChange={(active) =>
                      run(() => setCourierActive(c.id, active), {
                        success: active ? "Motoboy ativado." : "Motoboy desativado — o acesso dele foi bloqueado.",
                      })
                    }
                  />
                  <span className="hidden sm:inline">Ativo</span>
                </label>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Editar ${c.name}`}
                  onClick={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CourierFormDialog open={formOpen} onOpenChange={setFormOpen} courier={editing} />
    </div>
  );
}
