"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { CategoryFormDialog } from "@/components/catalog/category-form-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import {
  deleteCategory,
  moveCategory,
  setCategoryActive,
} from "@/lib/catalog/actions";
import type { Category, CategoryWithCount } from "@/lib/catalog/queries";

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const { pending, run } = useServerAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const [deleting, setDeleting] = useState<CategoryWithCount | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Categorias"
        description="Organize o cardápio. Use as setas para definir a ordem de exibição."
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus aria-hidden />
            Nova categoria
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria cadastrada"
          description="Crie a primeira categoria para começar a montar o cardápio."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Nova categoria
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Mover ${category.name} para cima`}
                  disabled={pending || index === 0}
                  onClick={() => run(() => moveCategory(category.id, "up"))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Mover ${category.name} para baixo`}
                  disabled={pending || index === categories.length - 1}
                  onClick={() => run(() => moveCategory(category.id, "down"))}
                >
                  <ArrowDown />
                </Button>
              </div>

              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {category.image_url ? (
                  <Image src={category.image_url} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <Tags className="absolute inset-0 m-auto size-5 text-muted-foreground" aria-hidden />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{category.name}</p>
                  {!category.active && <Badge variant="secondary">Inativa</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {category.product_count === 1 ? "1 produto" : `${category.product_count} produtos`}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-1">
                <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={category.active}
                    disabled={pending}
                    aria-label={category.active ? "Desativar categoria" : "Ativar categoria"}
                    onCheckedChange={(active) =>
                      run(() => setCategoryActive(category.id, active), {
                        success: active ? "Categoria ativada." : "Categoria desativada.",
                      })
                    }
                  />
                  <span className="hidden sm:inline">Ativa</span>
                </label>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => openEdit(category)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Excluir ${category.name}`}
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => setDeleting(category)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.product_count > 0
                ? "Esta categoria possui produtos e não pode ser excluída. Desative-a para escondê-la do cardápio."
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deleting && deleting.product_count === 0 && (
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  const id = deleting.id;
                  run(() => deleteCategory(id), { success: "Categoria excluída." });
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
