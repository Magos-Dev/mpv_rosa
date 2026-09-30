"use client";

import { Bike, KeyRound, Pencil, Plus, UserCog } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PasswordResetDialog, UserFormDialog } from "@/components/users/user-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { setStaffUserActive } from "@/lib/users/actions";
import type { StaffUser } from "@/lib/users/queries";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function UserManager({ users, currentUserId }: { users: StaffUser[]; currentUserId: string }) {
  const { pending, run } = useServerAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | undefined>();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState<StaffUser | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Usuários"
        description="Quem acessa o painel. Administrador tem acesso total; Operador cuida de pedidos, clientes e entregas."
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus aria-hidden />
            Novo usuário
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState icon={UserCog} title="Nenhum usuário" description="Cadastre quem vai usar o painel." />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{u.name}</p>
                    <Badge variant={u.role === "admin" ? "default" : "outline"}>{ROLE_LABELS[u.role]}</Badge>
                    {!u.active && <Badge variant="secondary">Desativado</Badge>}
                    {isSelf && <Badge variant="secondary">Você</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {u.email} ·{" "}
                    {u.last_sign_in_at ? `último acesso ${dateTime.format(new Date(u.last_sign_in_at))}` : "nunca entrou"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={u.active}
                      disabled={pending || isSelf}
                      aria-label={u.active ? `Desativar ${u.name}` : `Ativar ${u.name}`}
                      onCheckedChange={(active) =>
                        run(() => setStaffUserActive(u.id, active), {
                          success: active ? "Usuário reativado." : "Usuário desativado — o acesso foi bloqueado.",
                        })
                      }
                    />
                    <span className="hidden sm:inline">Ativo</span>
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Redefinir senha de ${u.name}`}
                    title="Redefinir senha"
                    onClick={() => {
                      setResetting(u);
                      setResetOpen(true);
                    }}
                  >
                    <KeyRound />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Editar ${u.name}`}
                    title="Editar"
                    onClick={() => {
                      setEditing(u);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bike className="size-4" aria-hidden />
        <span>
          Motoboys são cadastrados em{" "}
          <Link href="/admin/motoboys" className="font-medium text-primary underline-offset-4 hover:underline">
            Motoboys
          </Link>
          {"."}
        </span>
      </p>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        isSelf={editing?.id === currentUserId}
      />
      <PasswordResetDialog open={resetOpen} onOpenChange={setResetOpen} user={resetting} />
    </div>
  );
}
