"use client";

import { useTransition } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Executa uma Server Action mostrando toast de sucesso/erro.
 * A própria action chama revalidatePath, então a tela atualiza sozinha.
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition();

  function run<R extends Result>(
    action: () => Promise<R>,
    options: { success?: string; onSuccess?: (result: R & { ok: true }) => void } = {},
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (options.success) toast.success(options.success);
          options.onSuccess?.(result as R & { ok: true });
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error(error);
        toast.error("Falha de conexão. Tente novamente.");
      }
    });
  }

  return { pending, run };
}

/** Copia os erros de campo retornados pelo servidor para o react-hook-form. */
export function applyServerFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string> | undefined,
) {
  if (!fieldErrors) return;
  for (const [field, message] of Object.entries(fieldErrors)) {
    setError(field as Path<T>, { type: "server", message });
  }
}
