import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductForm } from "@/components/catalog/product-form";
import { PageHeader } from "@/components/layout/page-header";
import { firstParam } from "@/lib/auth/messages";
import { listCategoryOptions } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/produtos/novo">) {
  const params = await searchParams;
  const categories = await listCategoryOptions();
  if (categories.length === 0) redirect("/admin/categorias");

  const requested = firstParam(params.categoria);
  const defaultCategoryId = categories.some((c) => c.id === requested) ? requested : undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Novo produto"
        description="Depois de criar, você poderá cadastrar os adicionais."
      />
      <ProductForm categories={categories} defaultCategoryId={defaultCategoryId} />
    </div>
  );
}
