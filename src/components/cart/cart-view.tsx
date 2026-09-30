"use client";

import { AlertCircle, Loader2, Minus, Pencil, Plus, ShoppingBag, Trash2, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuote } from "@/hooks/use-quote";
import { cart, lineUnitPrice, useCart, useHydrated } from "@/lib/cart/store";
import { formatBRL } from "@/lib/format";

type CartViewProps = {
  accepting: boolean;
  deliveryFee: number;
  minimumOrder: number;
};

export function CartView({ accepting, deliveryFee, minimumOrder }: CartViewProps) {
  const hydrated = useHydrated();
  const { lines } = useCart();
  const quote = useQuote(lines, "pickup", hydrated);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Seu carrinho está vazio"
        description="Escolha seus itens no cardápio."
        action={
          <Button asChild size="lg">
            <Link href="/cardapio">Ver cardápio</Link>
          </Button>
        }
      />
    );
  }

  // Valores oficiais do servidor; enquanto carrega, usa a estimativa local
  const subtotal =
    quote.status === "ready"
      ? quote.quote.subtotal
      : lines.reduce((s, l) => s + lineUnitPrice(l) * l.quantity, 0);
  const belowMinimum = subtotal < minimumOrder;
  const canContinue = accepting && quote.status === "ready" && !belowMinimum;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <ul className="flex flex-col divide-y rounded-xl border bg-background">
        {lines.map((line, index) => (
          <li key={line.key} className="flex gap-3 p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {line.image_url ? (
                <Image src={line.image_url} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <UtensilsCrossed className="absolute inset-0 m-auto size-5 text-muted-foreground" aria-hidden />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug">{line.name}</p>
                <p className="shrink-0 font-medium">
                  {formatBRL(
                    quote.status === "ready"
                      ? (quote.quote.items[index]?.total ?? 0)
                      : lineUnitPrice(line) * line.quantity,
                  )}
                </p>
              </div>
              {line.options.length > 0 && (
                <ul className="text-sm text-muted-foreground">
                  {line.options.map((o) => (
                    <li key={o.id}>
                      + {o.name}
                      {o.price > 0 && ` (${formatBRL(o.price)})`}
                    </li>
                  ))}
                </ul>
              )}
              {line.notes && <p className="text-sm text-muted-foreground italic">“{line.notes}”</p>}

              <div className="mt-1 flex items-center gap-1">
                <div className="flex items-center rounded-lg border">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Diminuir ${line.name}`}
                    onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                  >
                    {line.quantity === 1 ? <Trash2 /> : <Minus />}
                  </Button>
                  <span className="w-7 text-center text-sm font-medium">{line.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Aumentar ${line.name}`}
                    disabled={line.quantity >= 99}
                    onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                  >
                    <Plus />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/produto/${line.slug}?editar=${line.key}`}>
                    <Pencil aria-hidden />
                    Editar
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => cart.remove(line.key)}
                >
                  Remover
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Button variant="outline" asChild className="self-start">
        <Link href="/cardapio">
          <Plus aria-hidden />
          Adicionar mais itens
        </Link>
      </Button>

      {quote.status === "error" && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>
            {quote.error} Ajuste o carrinho para continuar.
          </AlertDescription>
        </Alert>
      )}

      <dl className="flex flex-col gap-2 rounded-xl border bg-background p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="flex items-center gap-2">
            {quote.status === "loading" && <Loader2 className="size-3.5 animate-spin" aria-label="Atualizando" />}
            {formatBRL(subtotal)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Taxa de entrega</dt>
          <dd>{deliveryFee > 0 ? formatBRL(deliveryFee) : "Grátis"}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total com entrega</dt>
          <dd>{formatBRL(subtotal + deliveryFee)}</dd>
        </div>
        <p className="text-xs text-muted-foreground">
          Na retirada no local não há taxa de entrega. Tem cupom de desconto? Aplique na próxima
          etapa.
        </p>
      </dl>

      {belowMinimum && (
        <p className="text-sm text-destructive">
          O pedido mínimo é de {formatBRL(minimumOrder)}.
        </p>
      )}
      {!accepting && (
        <p className="text-sm text-destructive">
          A loja está fechada no momento. Você poderá finalizar quando abrirmos.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur">
        <Button
          asChild={canContinue}
          size="lg"
          className="mx-auto flex h-12 w-full max-w-3xl text-base"
          disabled={!canContinue}
        >
          {canContinue ? <Link href="/checkout">Continuar</Link> : <span>Continuar</span>}
        </Button>
      </div>
    </div>
  );
}
