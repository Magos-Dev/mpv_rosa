import { z } from "zod";

import { parseMoney } from "@/lib/format";
import { normalizePhone } from "@/lib/orders/schemas";

const optionalPhone = z
  .string()
  .nullable()
  .transform((v) => (v ? normalizePhone(v) : ""))
  .refine((v) => v === "" || /^[1-9]{2}9?\d{8}$/.test(v), "Telefone inválido (use DDD + número).")
  .transform((v) => (v ? v : null));

const money = z
  .union([z.string(), z.number()])
  .transform((v) => parseMoney(v) ?? 0)
  .refine((v) => !Number.isNaN(v), "Valor inválido.")
  .refine((v) => v >= 0 && v <= 99999.99, "Valor fora do permitido.");

export const settingsSchema = z.object({
  store_name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  address: z
    .string()
    .trim()
    .max(300, "Máximo de 300 caracteres.")
    .nullable()
    .transform((v) => (v ? v : null)),
  minimum_order: money,
  default_delivery_fee: money,
  accepting_orders: z.boolean(),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsData = z.output<typeof settingsSchema>;
