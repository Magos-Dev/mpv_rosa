"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { ImageUpload } from "@/components/catalog/image-upload";
import { Field, ToggleField } from "@/components/forms/field";
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
import { Textarea } from "@/components/ui/textarea";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { createCategory, updateCategory } from "@/lib/catalog/actions";
import type { Category } from "@/lib/catalog/queries";
import { categorySchema, type CategoryData, type CategoryInput } from "@/lib/catalog/schemas";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = nova categoria. */
  category?: Category;
};

function toFormValues(category?: Category): CategoryInput {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    image_url: category?.image_url ?? null,
    active: category?.active ?? true,
  };
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const { pending, run } = useServerAction();
  const form = useForm<CategoryInput, unknown, CategoryData>({
    resolver: zodResolver(categorySchema),
    defaultValues: toFormValues(category),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(category));
  }, [open, category, form]);

  const errors = form.formState.errors;

  function onSubmit(values: CategoryData) {
    run(
      async () => {
        const result = category
          ? await updateCategory(category.id, values)
          : await createCategory(values);
        if (!result.ok) applyServerFieldErrors(form.setError, result.fieldErrors);
        return result;
      },
      {
        success: category ? "Categoria atualizada." : "Categoria criada.",
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            Categorias organizam o cardápio (ex.: Hambúrgueres, Bebidas).
          </DialogDescription>
        </DialogHeader>

        <form
          id="category-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field label="Nome" htmlFor="category-name" error={errors.name?.message}>
            <Input
              id="category-name"
              autoFocus
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </Field>

          <Field
            label="Descrição (opcional)"
            htmlFor="category-description"
            error={errors.description?.message}
          >
            <Textarea id="category-description" rows={2} {...form.register("description")} />
          </Field>

          <Controller
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <ImageUpload
                label="Imagem (opcional)"
                folder="categories"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <ToggleField label="Ativa" description="Categorias inativas não aparecem no cardápio.">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </ToggleField>
            )}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
