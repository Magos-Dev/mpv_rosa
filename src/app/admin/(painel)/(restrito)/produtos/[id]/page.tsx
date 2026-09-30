import { Archive, ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OptionGroupsEditor } from "@/components/catalog/option-groups-editor";
import { ProductForm } from "@/components/catalog/product-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getProductForEdit,
  listCategoryOptions,
  listProductsWithOptionGroups,
} from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Editar produto" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: PageProps<"/admin/produtos/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [product, categories, copySources] = await Promise.all([
    getProductForEdit(id),
    listCategoryOptions(),
    listProductsWithOptionGroups(id),
  ]);
  if (!product) notFound();

  const { option_groups, ...productData } = product;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/admin/produtos">
          <ArrowLeft aria-hidden />
          Produtos
        </Link>
      </Button>

      <PageHeader
        title={product.name}
        actions={
          product.active && (
            <Button variant="outline" asChild>
              <Link href={`/produto/${product.slug}`} target="_blank">
                <ExternalLink aria-hidden />
                Ver no cardápio
              </Link>
            </Button>
          )
        }
      />

      {!product.active && (
        <Alert>
          <Archive aria-hidden />
          <AlertDescription>
            Este produto está arquivado e não aparece no cardápio. Reative-o na lista de produtos.
          </AlertDescription>
        </Alert>
      )}

      <ProductForm categories={categories} product={productData} />
      <OptionGroupsEditor productId={product.id} groups={option_groups} copySources={copySources} />
    </div>
  );
}
