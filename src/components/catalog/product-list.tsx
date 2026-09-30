"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Package,
  Pencil,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import {
  moveProduct,
  setProductActive,
  setProductAvailable,
} from "@/lib/catalog/actions";
import type { ProductWithCategory } from "@/lib/catalog/queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductListProps = {
  products: ProductWithCategory[];
  /** Setas de ordenação só fazem sentido na lista completa de ativos. */
  canReorder: boolean;
};

export function ProductList({ products, canReorder }: ProductListProps) {
  const { pending, run } = useServerAction();

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
      {products.map((product, index) => {
        const prev = products[index - 1];
        const next = products[index + 1];
        const firstInCategory = prev?.category_id !== product.category_id;
        const lastInCategory = next?.category_id !== product.category_id;

        return (
          <li key={product.id} className="flex flex-col">
            {firstInCategory && (
              <p className="bg-muted/50 px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {product.category?.name ?? "Sem categoria"}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 p-3 md:flex-nowrap">
              {canReorder && (
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mover ${product.name} para cima`}
                    disabled={pending || firstInCategory}
                    onClick={() => run(() => moveProduct(product.id, "up"))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mover ${product.name} para baixo`}
                    disabled={pending || lastInCategory}
                    onClick={() => run(() => moveProduct(product.id, "down"))}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              )}

              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {product.image_url ? (
                  <Image src={product.image_url} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <Package className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="truncate font-medium underline-offset-4 hover:underline"
                >
                  {product.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                  {product.promotional_price !== null ? (
                    <>
                      <span className="font-medium text-primary">
                        {formatBRL(product.promotional_price)}
                      </span>
                      <span className="text-muted-foreground line-through">
                        {formatBRL(product.price)}
                      </span>
                    </>
                  ) : (
                    <span>{formatBRL(product.price)}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!product.active && <Badge variant="secondary">Arquivado</Badge>}
                  {product.featured && <Badge variant="outline">Destaque</Badge>}
                  {product.best_seller && <Badge variant="outline">Mais vendido</Badge>}
                </div>
              </div>

              <div className="flex w-full items-center gap-1 md:w-auto">
                {product.active && (
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 flex-1 md:w-32 md:flex-none",
                      product.available
                        ? "border-emerald-600/30 text-emerald-700 hover:text-emerald-800"
                        : "border-destructive/30 text-destructive hover:text-destructive",
                    )}
                    disabled={pending}
                    aria-label={
                      product.available
                        ? `${product.name}: disponível. Marcar como esgotado`
                        : `${product.name}: esgotado. Marcar como disponível`
                    }
                    onClick={() =>
                      run(() => setProductAvailable(product.id, !product.available), {
                        success: product.available
                          ? `${product.name} marcado como esgotado.`
                          : `${product.name} disponível novamente.`,
                      })
                    }
                  >
                    {product.available ? "Disponível" : "Esgotado"}
                  </Button>
                )}

                <Button variant="ghost" size="icon-lg" asChild>
                  <Link href={`/admin/produtos/${product.id}`} aria-label={`Editar ${product.name}`}>
                    <Pencil />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-lg"
                  disabled={pending}
                  aria-label={product.active ? `Arquivar ${product.name}` : `Reativar ${product.name}`}
                  title={product.active ? "Arquivar" : "Reativar"}
                  onClick={() =>
                    run(() => setProductActive(product.id, !product.active), {
                      success: product.active ? "Produto arquivado." : "Produto reativado.",
                    })
                  }
                >
                  {product.active ? <Archive /> : <ArchiveRestore />}
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
