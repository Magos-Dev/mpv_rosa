import { ArrowLeft, Info, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function choiceLabel(group: { required: boolean; min_choices: number; max_choices: number }) {
  if (group.required) {
    return group.min_choices === group.max_choices
      ? `Obrigatório · escolha ${group.max_choices}`
      : `Obrigatório · escolha de ${group.min_choices} a ${group.max_choices}`;
  }
  return group.max_choices === 1 ? "Opcional · até 1" : `Opcional · até ${group.max_choices}`;
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
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

      {product.option_groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <h2 className="font-medium">{group.name}</h2>
            <span className="text-xs text-muted-foreground">{choiceLabel(group)}</span>
          </div>
          <ul className="flex flex-col divide-y">
            {group.options.map((option) => (
              <li
                key={option.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <span className={option.available ? undefined : "text-muted-foreground line-through"}>
                  {option.name}
                </span>
                <span className="text-muted-foreground">
                  {option.available
                    ? option.additional_price > 0
                      ? `+ ${formatBRL(option.additional_price)}`
                      : "Grátis"
                    : "Indisponível"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" aria-hidden />
        Os pedidos online estarão disponíveis em breve.
      </p>
    </article>
  );
}
