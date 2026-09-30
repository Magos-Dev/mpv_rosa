import { z } from "zod";

import { parseMoney } from "@/lib/format";

// ---------------------------------------------------------------------
// Datas: os campos <input type="datetime-local"> representam o horário
// de São Paulo (sem horário de verão desde 2019: UTC-03:00).
// ---------------------------------------------------------------------
export function localToIso(value: string): string {
  return new Date(`${value}:00-03:00`).toISOString();
}

export function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const requiredDate = (label: string) =>
  z.string().regex(LOCAL_DT, `Informe ${label}.`).transform(localToIso);

const optionalDate = z
  .string()
  .nullable()
  .refine((v) => !v || LOCAL_DT.test(v), "Data inválida.")
  .transform((v) => (v ? localToIso(v) : null));

const money = (label: string, { allowZero = false } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => parseMoney(v))
    .refine((v) => v !== null && !Number.isNaN(v), `Informe ${label}.`)
    .transform((v) => v as number)
    .refine((v) => (allowZero ? v >= 0 : v > 0), allowZero ? "Não pode ser negativo." : "Deve ser maior que zero.")
    .refine((v) => v <= 99999.99, "Valor muito alto.");

const optionalInt = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === "" || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 100000), "Use um número inteiro maior que zero.");

// =====================================================================
// Fidelidade
// =====================================================================
export const loyaltySchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome.").max(120),
    orders_required: z.coerce
      .number<string | number>()
      .int("Número inteiro.")
      .min(2, "Mínimo 2 pedidos.")
      .max(100, "Máximo 100 pedidos."),
    reward_type: z.enum(["product", "other"]),
    reward_product_id: z
      .string()
      .nullable()
      .transform((v) => (v ? v : null)),
    reward_description: z.string().trim().min(1, "Descreva o brinde.").max(160),
    active: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.reward_type === "product" && !d.reward_product_id) {
      ctx.addIssue({ code: "custom", path: ["reward_product_id"], message: "Selecione o produto." });
    }
    if (d.reward_product_id && !z.uuid().safeParse(d.reward_product_id).success) {
      ctx.addIssue({ code: "custom", path: ["reward_product_id"], message: "Produto inválido." });
    }
  })
  .transform((d) => ({ ...d, reward_product_id: d.reward_type === "product" ? d.reward_product_id : null }));

export type LoyaltyInput = z.input<typeof loyaltySchema>;
export type LoyaltyData = z.output<typeof loyaltySchema>;

// =====================================================================
// Promoções
// =====================================================================
export const promotionSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome.").max(120),
    type: z.enum(["percent", "fixed", "promotional_price"]),
    value: money("o valor"),
    target: z.enum(["product", "category"]),
    product_id: z.string().nullable(),
    category_id: z.string().nullable(),
    starts_at: requiredDate("o início"),
    ends_at: requiredDate("o fim"),
    has_window: z.boolean(),
    daily_start: z.string().nullable(),
    daily_end: z.string().nullable(),
    active: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (d.target === "product" && !z.uuid().safeParse(d.product_id).success) add("product_id", "Selecione o produto.");
    if (d.target === "category" && !z.uuid().safeParse(d.category_id).success) add("category_id", "Selecione a categoria.");
    if (d.type === "promotional_price" && d.target !== "product") {
      add("type", "Preço promocional só vale para um produto específico.");
    }
    if (d.type === "percent" && d.value >= 100) add("value", "O percentual deve ser menor que 100.");
    if (new Date(d.ends_at) <= new Date(d.starts_at)) add("ends_at", "O fim deve ser depois do início.");
    if (d.has_window) {
      if (!d.daily_start || !TIME.test(d.daily_start)) add("daily_start", "Horário inválido.");
      if (!d.daily_end || !TIME.test(d.daily_end)) add("daily_end", "Horário inválido.");
      if (d.daily_start && d.daily_start === d.daily_end) add("daily_end", "Início e fim não podem ser iguais.");
    }
  })
  .transform((d) => ({
    name: d.name,
    type: d.type,
    value: d.value,
    product_id: d.target === "product" ? d.product_id : null,
    category_id: d.target === "category" ? d.category_id : null,
    starts_at: d.starts_at,
    ends_at: d.ends_at,
    daily_start: d.has_window ? d.daily_start : null,
    daily_end: d.has_window ? d.daily_end : null,
    active: d.active,
  }));

export type PromotionInput = z.input<typeof promotionSchema>;
export type PromotionData = z.output<typeof promotionSchema>;

// =====================================================================
// Cupons
// =====================================================================
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use de 3 a 30 letras, números, - ou _ (sem espaços)."),
    description: z
      .string()
      .trim()
      .max(160)
      .nullable()
      .transform((v) => (v ? v : null)),
    type: z.enum(["percent", "fixed", "free_delivery"]),
    value: z.union([z.string(), z.number()]).transform((v) => parseMoney(v) ?? 0),
    minimum_order: money("o pedido mínimo", { allowZero: true }),
    usage_limit: optionalInt,
    usage_per_customer: optionalInt,
    starts_at: requiredDate("o início"),
    expires_at: optionalDate,
    active: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (Number.isNaN(d.value)) add("value", "Valor inválido.");
    else if (d.type !== "free_delivery" && d.value <= 0) add("value", "Informe o valor do desconto.");
    else if (d.type === "percent" && d.value > 100) add("value", "Máximo 100%.");
    if (d.expires_at && new Date(d.expires_at) <= new Date(d.starts_at)) add("expires_at", "A validade deve ser depois do início.");
  })
  .transform((d) => ({ ...d, value: d.type === "free_delivery" ? 0 : d.value }));

export type CouponInput = z.input<typeof couponSchema>;
export type CouponData = z.output<typeof couponSchema>;
