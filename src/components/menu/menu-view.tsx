"use client";

import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/menu/product-card";
import { Input } from "@/components/ui/input";
import type { PublicCategory, PublicProduct } from "@/lib/catalog/queries";
import { cn } from "@/lib/utils";

type Section = { id: string; name: string; products: PublicProduct[] };

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Cardápio com abas de categoria (âncoras) e busca local.
 * Seções virtuais "Mais pedidos" e "Promoções" aparecem quando houver itens.
 */
export function MenuView({ categories }: { categories: PublicCategory[] }) {
  const [query, setQuery] = useState("");

  const sections = useMemo<Section[]>(() => {
    const all = categories.flatMap((c) => c.products);
    const virtual: Section[] = [
      { id: "mais-pedidos", name: "Mais pedidos", products: all.filter((p) => p.best_seller && p.available) },
      {
        id: "promocoes",
        name: "Promoções",
        products: all.filter((p) => p.promotional_price !== null && p.available),
      },
    ].filter((s) => s.products.length > 0);

    // Prefixo evita colisão com as seções virtuais (ex.: categoria "Promoções")
    return [
      ...virtual,
      ...categories.map((c) => ({ id: `categoria-${c.slug}`, name: c.name, products: c.products })),
    ];
  }, [categories]);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return null;
    return categories
      .flatMap((c) => c.products)
      .filter((p) => normalize(`${p.name} ${p.description ?? ""}`).includes(term));
  }, [categories, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Buscar no cardápio…"
          aria-label="Buscar no cardápio"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 pl-9 text-base"
        />
      </div>

      {results ? (
        results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <SearchX className="size-8" aria-hidden />
            <p>Nenhum item encontrado para “{query.trim()}”.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )
      ) : (
        <>
          <nav
            aria-label="Categorias"
            className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur"
          >
            <ul className="flex gap-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap",
                      "hover:bg-muted",
                    )}
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {sections.map((s) => (
            <section key={s.id} id={s.id} className="flex scroll-mt-16 flex-col gap-3">
              <h2 className="font-heading text-lg font-semibold">{s.name}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {s.products.map((p) => (
                  <ProductCard key={`${s.id}-${p.id}`} product={p} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
