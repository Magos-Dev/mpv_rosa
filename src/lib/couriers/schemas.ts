import { z } from "zod";

import { normalizePhone } from "@/lib/orders/schemas";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .nullable()
    .transform((v) => (v ? v : null));

const phone = z
  .string()
  .nullable()
  .transform((v) => (v ? normalizePhone(v) : ""))
  .refine((v) => v === "" || /^[1-9]{2}9?\d{8}$/.test(v), "Telefone inválido (DDD + número).")
  .transform((v) => (v ? v : null));

const password = z.string().min(8, "Mínimo de 8 caracteres.").max(72, "Máximo de 72 caracteres.");

const base = {
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
  phone,
  vehicle_type: optional(40),
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .max(10, "Placa inválida.")
    .nullable()
    .transform((v) => (v ? v : null)),
};

export const courierCreateSchema = z.object({
  ...base,
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  password,
});

export const courierUpdateSchema = z.object({
  ...base,
  /** Opcional: define uma nova senha. */
  new_password: z
    .string()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (v.length >= 8 && v.length <= 72), "Mínimo de 8 caracteres."),
});

export type CourierCreateInput = z.input<typeof courierCreateSchema>;
export type CourierCreateData = z.output<typeof courierCreateSchema>;
export type CourierUpdateInput = z.input<typeof courierUpdateSchema>;
export type CourierUpdateData = z.output<typeof courierUpdateSchema>;
