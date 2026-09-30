import { Package, Plus, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductFilters } from "@/components/catalog/product-filters";
import { ProductList } from "@/components/catalog/product-list";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { firstParam } from "@/lib/auth/messages";
import {
  listCategoryOptions,
  listProducts,
  type ProductStatusFilter,
} from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Produtos" };

const STATUSES: ProductStatusFilter[] = ["ativos", "esgotados", "arquivados"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  const params = await searchParams;
  const rawStatus = firstParam(params.status);
  const status = STATUSES.includes(rawStatus as ProductStatusFilter)
    ? (rawStatus as ProductStatusFilter)
    : "ativos";
  const rawCategory = firstParam(params.categoria);
  const categoryId = rawCategory && UUID.test(rawCategory) ? rawCategory : undefined;
  const search = firstParam(params.q)?.trim().slice(0, 80) || undefined;

  const [categories, products] = await Promise.all([
    listCategoryOptions(),
    listProducts({ categoryId, search, status }),
  ]);

  const filtered = Boolean(categoryId || search || status !== "ativos");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Produtos"
        description="Cadastre produtos e marque rapidamente o que está esgotado."
        actions={
          categories.length > 0 && (
            <Button size="lg" asChild>
              <Link href="/admin/produtos/novo">
                <Plus aria-hidden />
                Novo produto
              </Link>
            </Button>
          )
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Crie uma categoria primeiro"
          description="Todo produto pertence a uma categoria."
          action={
            <Button asChild>
              <Link href="/admin/categorias">Ir para categorias</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ProductFilters categories={categories} />

          {products.length === 0 ? (
            <EmptyState
              icon={Package}
              title={filtered ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              description={
                filtered
                  ? "Ajuste a busca ou os filtros."
                  : "Cadastre o primeiro produto do cardápio."
              }
              action={
                !filtered && (
                  <Button asChild>
                    <Link href="/admin/produtos/novo">
                      <Plus aria-hidden />
                      Novo produto
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <ProductList products={products} canReorder={status === "ativos" && !search} />
          )}
        </>
      )}
    </div>
  );
}
