"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cart, useCart, useHydrated, type CartLine, type CartOption } from "@/lib/cart/store";
import type { PublicProductDetail } from "@/lib/catalog/queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Group = PublicProductDetail["option_groups"][number];

type ProductConfiguratorProps = {
  product: PublicProductDetail;
  /** Chave do item do carrinho sendo editado (?editar=...). */
  editKey?: string;
};

function groupHint(group: Group) {
  if (group.required) {
    return group.min_choices === group.max_choices
      ? `Obrigatório · escolha ${group.max_choices}`
      : `Obrigatório · de ${group.min_choices} a ${group.max_choices}`;
  }
  return group.max_choices === 1 ? "Opcional · até 1" : `Opcional · até ${group.max_choices}`;
}

export function ProductConfigurator({ product, editKey }: ProductConfiguratorProps) {
  const { lines } = useCart();
  const editing = editKey ? lines.find((l) => l.key === editKey && l.product_id === product.id) : undefined;

  // O carrinho é lido do aparelho após montar: a `key` recria o formulário
  // com os valores do item quando ele fica disponível (modo edição).
  return <Configurator key={editing?.key ?? "novo"} product={product} editing={editing} />;
}

function Configurator({ product, editing }: { product: PublicProductDetail; editing?: CartLine }) {
  const router = useRouter();
  const hydrated = useHydrated();

  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    if (!editing) return {};
    const byGroup: Record<string, string[]> = {};
    for (const group of product.option_groups) {
      byGroup[group.id] = group.options
        .filter((o) => editing.options.some((e) => e.id === o.id))
        .map((o) => o.id);
    }
    return byGroup;
  });
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [showErrors, setShowErrors] = useState(false);

  const basePrice = product.promotional_price ?? product.price;

  const chosenOptions: CartOption[] = useMemo(
    () =>
      product.option_groups.flatMap((group) =>
        group.options
          .filter((o) => selected[group.id]?.includes(o.id))
          .map((o) => ({ id: o.id, group_name: group.name, name: o.name, price: o.additional_price })),
      ),
    [product.option_groups, selected],
  );

  const unitPrice = basePrice + chosenOptions.reduce((sum, o) => sum + o.price, 0);
  const missing = product.option_groups.filter(
    (g) => (selected[g.id]?.length ?? 0) < g.min_choices,
  );

  function toggle(group: Group, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.max_choices === 1) {
        // Comporta-se como "radio"; em grupo opcional, tocar de novo desmarca
        const next = current[0] === optionId && !group.required ? [] : [optionId];
        return { ...prev, [group.id]: next };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max_choices) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function submit() {
    if (missing.length > 0) {
      setShowErrors(true);
      document.getElementById(`grupo-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const line = {
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      image_url: product.image_url,
      base_price: basePrice,
      options: chosenOptions,
      quantity,
      notes: notes.trim() ? notes.trim().slice(0, 200) : null,
    };

    if (editing) {
      cart.replace(editing.key, line);
      toast.success("Item atualizado.");
      router.push("/carrinho");
      return;
    }

    cart.add(line);
    toast.success(`${product.name} adicionado ao carrinho.`, {
      action: { label: "Ver carrinho", onClick: () => router.push("/carrinho") },
    });
    router.push("/cardapio");
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      {product.option_groups.map((group) => {
        const chosen = selected[group.id] ?? [];
        const invalid = showErrors && chosen.length < group.min_choices;
        return (
          <section
            key={group.id}
            id={`grupo-${group.id}`}
            aria-labelledby={`grupo-${group.id}-titulo`}
            className="flex flex-col gap-2"
          >
            <div
              className={cn(
                "flex items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2",
                invalid && "bg-destructive/10 ring-1 ring-destructive",
              )}
            >
              <h2 id={`grupo-${group.id}-titulo`} className="font-medium">
                {group.name}
              </h2>
              <span className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
                {invalid ? `Escolha ${group.min_choices}` : groupHint(group)}
              </span>
            </div>
            <ul className="flex flex-col divide-y">
              {group.options.map((option) => {
                const isOn = chosen.includes(option.id);
                const limitReached = !isOn && group.max_choices > 1 && chosen.length >= group.max_choices;
                const disabled = !option.available || limitReached;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role={group.max_choices === 1 ? "radio" : "checkbox"}
                      aria-checked={isOn}
                      disabled={disabled}
                      onClick={() => toggle(group, option.id)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:opacity-50"
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center border",
                          group.max_choices === 1 ? "rounded-full" : "rounded-md",
                          isOn && "border-primary bg-primary text-primary-foreground",
                        )}
                        aria-hidden
                      >
                        {isOn && <Check className="size-3.5" />}
                      </span>
                      <span className={cn("flex-1", !option.available && "line-through")}>
                        {option.name}
                      </span>
                      <span className="text-muted-foreground">
                        {!option.available
                          ? "Indisponível"
                          : option.additional_price > 0
                            ? `+ ${formatBRL(option.additional_price)}`
                            : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="flex flex-col gap-2">
        <label htmlFor="item-notes" className="font-medium">
          Alguma observação?
        </label>
        <Textarea
          id="item-notes"
          rows={2}
          maxLength={200}
          placeholder="Ex.: retirar cebola"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      {/* Barra fixa com quantidade e botão */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex items-center rounded-lg border">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Diminuir quantidade"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center font-medium" aria-live="polite">
              {quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Aumentar quantidade"
              disabled={quantity >= 99}
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            >
              <Plus />
            </Button>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1 justify-between text-base"
            disabled={!product.available || !hydrated}
            onClick={submit}
          >
            <span>{!product.available ? "Esgotado" : editing ? "Atualizar item" : "Adicionar"}</span>
            {product.available && <span>{formatBRL(unitPrice * quantity)}</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
