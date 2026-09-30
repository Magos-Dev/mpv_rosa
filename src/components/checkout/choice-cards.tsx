"use client";

import type { LucideIcon } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type Choice<T extends string> = { value: T; label: string; description?: string; icon: LucideIcon };

type ChoiceCardsProps<T extends string> = {
  name: string;
  value: T | undefined;
  onChange: (value: T) => void;
  choices: Choice<T>[];
  columns?: 2 | 3;
  invalid?: boolean;
};

/** Opções grandes e fáceis de tocar (entrega/retirada, forma de pagamento). */
export function ChoiceCards<T extends string>({
  name,
  value,
  onChange,
  choices,
  columns = 2,
  invalid,
}: ChoiceCardsProps<T>) {
  return (
    <RadioGroup
      aria-label={name}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className={cn("grid gap-2", columns === 3 ? "sm:grid-cols-3" : "grid-cols-2")}
    >
      {choices.map((choice) => {
        const id = `${name}-${choice.value}`;
        const Icon = choice.icon;
        const checked = value === choice.value;
        return (
          <label
            key={choice.value}
            htmlFor={id}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 transition-colors",
              checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
              invalid && !checked && "border-destructive",
            )}
          >
            <RadioGroupItem id={id} value={choice.value} className="sr-only" />
            <Icon className={cn("size-5 shrink-0", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{choice.label}</span>
              {choice.description && (
                <span className="text-xs text-muted-foreground">{choice.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
