"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { captureSource } from "@/lib/cart/memory";
import { useCart, useHydrated } from "@/lib/cart/store";
import { formatBRL } from "@/lib/format";

/** Ícone do carrinho no cabeçalho, com contador. */
export function CartButton() {
  const { count } = useCart();
  const hydrated = useHydrated();

  return (
    <Button variant="ghost" size="icon-lg" className="relative" asChild>
      <Link href="/carrinho" aria-label={`Carrinho${hydrated && count ? ` com ${count} itens` : ""}`}>
        <ShoppingBag className="size-5" />
        {hydrated && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

// Páginas que já têm sua própria barra inferior ou não precisam dela
const HIDE_BAR_ON = ["/carrinho", "/checkout", "/pedido", "/produto", "/privacidade"];

/** Barra fixa "Ver carrinho" no rodapé do cardápio. */
export function CartBar() {
  const pathname = usePathname();
  const { count, subtotal } = useCart();
  const hydrated = useHydrated();

  if (!hydrated || count === 0 || HIDE_BAR_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur">
      <Button asChild size="lg" className="mx-auto flex h-12 w-full max-w-3xl justify-between text-base">
        <Link href="/carrinho">
          <span className="flex items-center gap-2">
            <ShoppingBag aria-hidden />
            Ver carrinho · {count} {count === 1 ? "item" : "itens"}
          </span>
          <span>{formatBRL(subtotal)}</span>
        </Link>
      </Button>
    </div>
  );
}

/** Guarda a origem do acesso (?src=mesa01) para registrar no pedido. */
export function SourceCapture() {
  const searchParams = useSearchParams();
  const src = searchParams.get("src");
  useEffect(() => {
    captureSource(src);
  }, [src]);
  return null;
}
