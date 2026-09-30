import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { PublicProduct } from "@/lib/catalog/queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: PublicProduct }) {
  const hasPromo = product.promotional_price !== null;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn(
        "group flex gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/40",
        !product.available && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap gap-1">
          {!product.available && <Badge variant="secondary">Esgotado</Badge>}
          {product.best_seller && <Badge variant="outline">Mais vendido</Badge>}
        </div>
        <h3 className="font-medium leading-snug">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className={cn("font-semibold", hasPromo && "text-primary")}>
            {formatBRL(hasPromo ? product.promotional_price! : product.price)}
          </span>
          {hasPromo && (
            <span className="text-sm text-muted-foreground line-through">
              {formatBRL(product.price)}
            </span>
          )}
        </div>
      </div>

      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-28">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="112px"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <UtensilsCrossed className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
    </Link>
  );
}
