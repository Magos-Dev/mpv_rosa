import { z } from "zod";

import { parseMoney } from "@/lib/format";

// Validação do checkout: mesma regra no cliente (feedback imediato) e no
// servidor (Server Action). O banco (create_order) valida tudo de novo.

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Aceita "(11) 98765-4321", "+55 11 98765-4321"… → "11987654321" */
export function normalizePhone(value: string) {
  const digits = onlyDigits(value);
  return (digits.length === 12 || digits.length === 13) && digits.startsWith("55")
    ? digits.slice(2)
    : digits;
}

/** "11987654321" → "(11) 98765-4321" */
export function formatPhone(value: string) {
  const d = normalizePhone(value);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

const text = (max: number, message = `Máximo de ${max} caracteres.`) =>
  z.string().trim().max(max, message);

const optional = (max: number) =>
  text(max)
    .nullable()
    .transform((v) => (v ? v : null));

export const addressSchema = z.object({
  zip_code: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos.")
    .transform((v) => (v ? v : null)),
  street: text(160).min(1, "Informe a rua."),
  number: text(20).min(1, "Informe o número."),
  complement: optional(80),
  neighborhood: text(80).min(1, "Informe o bairro."),
  city: text(80).min(1, "Informe a cidade."),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "UF com 2 letras.")
    .transform((v) => (v ? v : null)),
  reference: optional(160),
});

/** Campos do endereço como vêm do formulário (validados só se for entrega). */
const rawAddressSchema = z.object({
  zip_code: z.string(),
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  reference: z.string().nullable(),
});

export const checkoutSchema = z
  .object({
    name: text(120).min(2, "Informe seu nome."),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((v) => /^[1-9]{2}9?\d{8}$/.test(v), "Informe um WhatsApp válido com DDD."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === "" || z.email().safeParse(v).success, "E-mail inválido.")
      .transform((v) => (v ? v : null)),
    order_type: z.enum(["delivery", "pickup"], "Escolha entrega ou retirada."),
    address: rawAddressSchema,
    payment_method: z.enum(["pix", "cash", "card_on_delivery"], "Escolha a forma de pagamento."),
    change_for: z
      .string()
      .transform((v) => parseMoney(v))
      .refine((v) => v === null || !Number.isNaN(v), "Valor inválido."),
    notes: optional(500),
    marketing_opt_in: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.order_type !== "delivery") return;
    const result = addressSchema.safeParse(data.address);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", path: ["address", ...issue.path], message: issue.message });
      }
    }
  })
  .transform((data) => ({
    ...data,
    address: data.order_type === "delivery" ? addressSchema.parse(data.address) : null,
    change_for: data.payment_method === "cash" ? data.change_for : null,
  }));

export type AddressInput = z.input<typeof rawAddressSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
