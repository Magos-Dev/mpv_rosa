"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { ImageUpload } from "@/components/catalog/image-upload";
import { Field, ToggleField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { createProduct, updateProduct } from "@/lib/catalog/actions";
import type { Product } from "@/lib/catalog/queries";
import { productSchema, type ProductData, type ProductInput } from "@/lib/catalog/schemas";
import { toMoneyInput } from "@/lib/format";

type ProductFormProps = {
  categories: { id: string; name: string; active: boolean }[];
  /** Ausente = novo produto. */
  product?: Product;
  defaultCategoryId?: string;
};

export function ProductForm({ categories, product, defaultCategoryId }: ProductFormProps) {
  const router = useRouter();
  const { pending, run } = useServerAction();

  const form = useForm<ProductInput, unknown, ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      category_id: product?.category_id ?? defaultCategoryId ?? "",
      description: product?.description ?? "",
      image_url: product?.image_url ?? null,
      price: toMoneyInput(product?.price),
      promotional_price: toMoneyInput(product?.promotional_price),
      available: product?.available ?? true,
      featured: product?.featured ?? false,
      best_seller: product?.best_seller ?? false,
    },
  });

  const errors = form.formState.errors;

  function onSubmit(values: ProductData) {
    if (product) {
      run(
        async () => {
          const result = await updateProduct(product.id, values);
          if (!result.ok) applyServerFieldErrors(form.setError, result.fieldErrors);
          return result;
        },
        { success: "Produto salvo.", onSuccess: () => form.reset(form.getValues()) },
      );
      return;
    }

    run(
      async () => {
        const result = await createProduct(values);
        if (!result.ok) applyServerFieldErrors(form.setError, result.fieldErrors);
        return result;
      },
      {
        success: "Produto criado. Agora você pode adicionar os adicionais.",
        onSuccess: (result) => router.push(`/admin/produtos/${result.data.id}`),
      },
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Nome" htmlFor="product-name" error={errors.name?.message}>
              <Input
                id="product-name"
                placeholder="Ex.: X-Bacon"
                aria-invalid={Boolean(errors.name)}
                {...form.register("name")}
              />
            </Field>

            <Field label="Categoria" error={errors.category_id?.message}>
              <Controller
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="w-full"
                      aria-label="Categoria"
                      aria-invalid={Boolean(errors.category_id)}
                    >
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {!c.active && " (inativa)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="Descrição"
              htmlFor="product-description"
              error={errors.description?.message}
              hint="Ingredientes e detalhes que ajudam o cliente a escolher."
            >
              <Textarea id="product-description" rows={3} {...form.register("description")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Preço (R$)"
                htmlFor="product-price"
                error={errors.price?.message}
              >
                <Input
                  id="product-price"
                  inputMode="decimal"
                  placeholder="29,90"
                  aria-invalid={Boolean(errors.price)}
                  {...form.register("price")}
                />
              </Field>
              <Field
                label="Preço promocional (R$)"
                htmlFor="product-promo"
                error={errors.promotional_price?.message}
                hint="Opcional. Deixe vazio se não houver."
              >
                <Input
                  id="product-promo"
                  inputMode="decimal"
                  placeholder="24,90"
                  aria-invalid={Boolean(errors.promotional_price)}
                  {...form.register("promotional_price")}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-0">
              <Controller
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <ImageUpload folder="products" value={field.value} onChange={field.onChange} />
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exibição</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Controller
                control={form.control}
                name="available"
                render={({ field }) => (
                  <ToggleField label="Disponível" description="Desligue quando estiver esgotado.">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </ToggleField>
                )}
              />
              <Controller
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <ToggleField label="Destaque" description="Aparece em evidência no cardápio.">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </ToggleField>
                )}
              />
              <Controller
                control={form.control}
                name="best_seller"
                render={({ field }) => (
                  <ToggleField label="Mais vendido" description="Exibe o selo “Mais vendido”.">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </ToggleField>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={() => router.push("/admin/produtos")}>
          {product ? "Voltar" : "Cancelar"}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {product ? "Salvar produto" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}
