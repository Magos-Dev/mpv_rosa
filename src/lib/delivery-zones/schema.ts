import { z } from "zod";

import { parseMoney } from "@/lib/format";

/** Mesma normalização do banco (_norm_place): sem acento, minúsculo, espaços simples. */
export function normPlace(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export const deliveryZoneSchema = z.object({
  neighborhood: z.string().trim().min(1, "Informe o bairro.").max(80, "Máximo de 80 caracteres."),
  city: z.string().trim().min(1, "Informe a cidade.").max(80, "Máximo de 80 caracteres."),
  fee: z
    .union([z.string(), z.number()])
    .transform((v) => parseMoney(v))
    .refine((v) => v !== null && !Number.isNaN(v), "Informe a taxa (use 0 para grátis).")
    .transform((v) => v as number)
    .refine((v) => v >= 0 && v <= 9999.99, "Taxa inválida."),
  estimated_time: z
    .string()
    .trim()
    .max(40, "Máximo de 40 caracteres.")
    .nullable()
    .transform((v) => (v ? v : null)),
  active: z.boolean(),
});

export type DeliveryZoneInput = z.input<typeof deliveryZoneSchema>;
export type DeliveryZoneData = z.output<typeof deliveryZoneSchema>;
