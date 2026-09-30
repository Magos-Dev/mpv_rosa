import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductConfigurator } from "@/components/menu/product-configurator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { firstParam } from "@/lib/auth/messages";
import { getPublicProduct } from "@/lib/catalog/queries";
import { formatBRL } from "@/lib/format";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function generateMetadata({
  params,
}: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = SLUG.test(slug) ? await getPublicProduct(slug) : null;
  return { title: product?.name ?? "Produto" };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/produto/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!SLUG.test(slug)) notFound();

  const product = await getPublicProduct(slug);
  if (!product) notFound();

  const hasPromo = product.promotional_price !== null;

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href={`/cardapio#categoria-${product.category.slug}`}>
          <ArrowLeft aria-hidden />
          {product.category.name}
        </Link>
      </Button>

      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
          />
        ) : (
          <UtensilsCrossed className="absolute inset-0 m-auto size-12 text-muted-foreground" aria-hidden />
        )}
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          {!product.available && <Badge variant="secondary">Esgotado</Badge>}
          {product.best_seller && <Badge variant="outline">Mais vendido</Badge>}
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{product.name}</h1>
        {product.description && (
          <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
        )}
        <div className="flex items-baseline gap-2">
          <span className={hasPromo ? "text-xl font-semibold text-primary" : "text-xl font-semibold"}>
            {formatBRL(hasPromo ? product.promotional_price! : product.price)}
          </span>
          {hasPromo && (
            <span className="text-muted-foreground line-through">{formatBRL(product.price)}</span>
          )}
        </div>
      </header>

      <ProductConfigurator product={product} editKey={firstParam(query.editar)} />
    </article>
  );
}
